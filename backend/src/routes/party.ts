import { Router, type Response } from 'express'
import crypto from 'node:crypto'
import type { Server } from 'socket.io'
import prisma from '../db/client.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { partyJoinRateLimiter } from '../middleware/rateLimit.js'
import { sendError, sendSuccess, AppError, ErrorCode } from '../utils/response.js'
import { destroyRoomService } from '../services/partyDestruction.js'
import { clearHostGraceTimer } from '../services/partyHostGrace.js'
import type {
  CreatePartyRoomInput,
  JoinPartyRoomInput,
  ReenterPartyRoomInput,
  PartyRoomDetails,
  PartyPlaybackState,
  PartyParticipant,
  PartyMessage,
} from '../types/party.js'

function getParamString(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || ''
  return param || ''
}

export function createPartyRouter(io?: Server): Router {
  const router = Router()

  function hashInviteToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  function generateRoomCode(): string {
    // 8-character uppercase alphanumeric code (excluding ambiguous chars 0, O, 1, I)
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    const bytes = crypto.randomBytes(8)
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i] % chars.length]
    }
    return code
  }

  // Helper to format room details response
  function formatRoomDetails(room: any, hostInviteToken?: string): PartyRoomDetails {
    const playback: PartyPlaybackState = {
      roomId: room.id,
      mediaType: room.mediaType,
      anilistId: room.anilistId,
      episodeNumber: room.episodeNumber,
      audioType: room.audioType,
      serverId: room.serverId,
      stateRevision: room.stateRevision,
      lastEventId: room.lastEventId,
      updatedAt: room.updatedAt instanceof Date ? room.updatedAt.toISOString() : room.updatedAt,
      updatedBy: room.lastUpdatedBy
        ? {
            userId: room.lastUpdatedBy.id,
            username: room.lastUpdatedBy.username,
            displayName: room.lastUpdatedBy.displayName,
          }
        : {
            userId: room.owner.id,
            username: room.owner.username,
            displayName: room.owner.displayName,
          },
    }

    const participants: PartyParticipant[] = (room.participants || []).map((p: any) => ({
      id: p.id,
      roomId: p.roomId,
      userId: p.userId,
      role: p.role,
      status: p.status,
      joinedAt: p.joinedAt instanceof Date ? p.joinedAt.toISOString() : p.joinedAt,
      lastSeenAt: p.lastSeenAt instanceof Date ? p.lastSeenAt.toISOString() : p.lastSeenAt,
      user: {
        id: p.user.id,
        username: p.user.username,
        displayName: p.user.displayName,
        avatar: p.user.avatar,
      },
    }))

    const messages: PartyMessage[] = (room.messages || []).map((m: any) => ({
      id: m.id,
      roomId: m.roomId,
      userId: m.userId,
      content: m.content,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      user: {
        id: m.user.id,
        username: m.user.username,
        displayName: m.user.displayName,
        avatar: m.user.avatar,
      },
    }))

    return {
      id: room.id,
      code: room.code,
      inviteToken: hostInviteToken,
      ownerId: room.ownerId,
      mediaType: room.mediaType,
      maxParticipants: room.maxParticipants,
      playback,
      participants,
      messages,
      createdAt: room.createdAt instanceof Date ? room.createdAt.toISOString() : room.createdAt,
      expiresAt: room.expiresAt instanceof Date ? room.expiresAt.toISOString() : room.expiresAt,
    }
  }

  /*
   * -------------------------------------------------------------
   * POST /api/party/rooms — Create a new Party Room
   * -------------------------------------------------------------
   */
  router.post('/rooms', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!
      const body = req.body as CreatePartyRoomInput

      const anilistId = Number(body.anilistId)
      if (!anilistId || isNaN(anilistId)) {
        return sendError(res, 'Valid anilistId is required.', ErrorCode.BAD_REQUEST, 400)
      }

      const mediaType = body.mediaType === 'movie' ? 'movie' : 'tv'
      const episodeNumber = Math.max(1, Number(body.episodeNumber) || 1)
      const audioType = body.audioType === 'dub' ? 'dub' : 'sub'
      const serverId =
        body.serverId === 'server2' || body.serverId === 'server3' || body.serverId === 'server4'
          ? body.serverId
          : 'server1'

      // Generate credentials
      const code = generateRoomCode()
      const inviteToken = crypto.randomBytes(32).toString('hex')
      const inviteTokenHash = hashInviteToken(inviteToken)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24-hour TTL

      const createdRoom = await prisma.$transaction(
        async (tx) => {
        // Create Room row
        const room = await tx.partyRoom.create({
          data: {
            code,
            inviteTokenHash,
            ownerId: user.id,
            mediaType,
            anilistId,
            episodeNumber,
            audioType,
            serverId,
            stateRevision: 1,
            lastEventId: crypto.randomUUID(),
            lastUpdatedById: user.id,
            status: 'ACTIVE',
            maxParticipants: 10,
            expiresAt,
          },
          include: {
            owner: true,
            lastUpdatedBy: true,
          },
        })

        // Create Host participant row
        await tx.partyParticipant.create({
          data: {
            roomId: room.id,
            userId: user.id,
            role: 'HOST',
            status: 'ACTIVE',
          },
        })

        return room
      }, { timeout: 25000, maxWait: 20000 })

      // Fetch complete room with participant
      const fullRoom = await prisma.partyRoom.findUnique({
        where: { id: createdRoom.id },
        include: {
          owner: true,
          lastUpdatedBy: true,
          participants: {
            where: { status: 'ACTIVE' },
            include: { user: true },
          },
          messages: {
            take: 50,
            orderBy: { createdAt: 'asc' },
            include: { user: true },
          },
        },
      })

      return sendSuccess(res, formatRoomDetails(fullRoom, inviteToken), undefined, 201)
    } catch (err) {
      console.error('[partyRouter] Create room error:', err)
      return sendError(res, 'Failed to create watch party.', ErrorCode.INTERNAL_ERROR, 500)
    }
  })

  /*
   * -------------------------------------------------------------
   * POST /api/party/rooms/join — Join a Party Room via token or code
   * -------------------------------------------------------------
   */
  router.post(
    '/rooms/join',
    requireAuth,
    partyJoinRateLimiter(),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const user = req.user!
        const { tokenOrCode } = req.body as JoinPartyRoomInput

        if (!tokenOrCode || typeof tokenOrCode !== 'string') {
          return sendError(res, 'Invite token or room code is required.', ErrorCode.BAD_REQUEST, 400)
        }

        const trimmed = tokenOrCode.trim()
        const isToken = trimmed.length >= 32
        const tokenHash = isToken ? hashInviteToken(trimmed) : null
        const normalizedCode = trimmed.toUpperCase()

        const roomResult = await prisma.$transaction(async (tx) => {
          // Parent-first row lock
          const rooms = await tx.$queryRaw<any[]>`
            SELECT r.*
            FROM "party_rooms" r
            WHERE (${isToken} = true AND r."inviteTokenHash" = ${tokenHash})
               OR (${isToken} = false AND UPPER(r."code") = ${normalizedCode})
            LIMIT 1
            FOR UPDATE;
          `
          const room = rooms[0]
          if (!room || new Date(room.expiresAt) <= new Date()) {
            throw new AppError('Watch party does not exist or has expired.', ErrorCode.NOT_FOUND, 404)
          }

          // Check if user is currently kicked
          const participants = await tx.$queryRaw<any[]>`
            SELECT "id", "role", "status"
            FROM "party_participants"
            WHERE "roomId" = ${room.id} AND "userId" = ${user.id}
            FOR UPDATE;
          `
          const existingParticipant = participants[0]
          if (existingParticipant && existingParticipant.status === 'KICKED') {
            throw new AppError(
              'You have been removed from this watch party and cannot rejoin.',
              ErrorCode.FORBIDDEN,
              403,
            )
          }

          // Capacity check: count active participants
          const activeCountResult = await tx.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count
            FROM "party_participants"
            WHERE "roomId" = ${room.id} AND "status" = 'ACTIVE';
          `
          const activeCount = Number(activeCountResult[0].count)

          // If user is already active, allow idempotent join
          const isAlreadyActive = existingParticipant && existingParticipant.status === 'ACTIVE'
          if (!isAlreadyActive && activeCount >= room.maxParticipants) {
            throw new AppError(
              'Watch party is full (maximum 10 participants).',
              ErrorCode.CONFLICT,
              409,
            )
          }

          // Upsert participant to ACTIVE
          if (existingParticipant) {
            await tx.$executeRaw`
              UPDATE "party_participants"
              SET "status" = 'ACTIVE',
                  "lastSeenAt" = CURRENT_TIMESTAMP
              WHERE "id" = ${existingParticipant.id};
            `
          } else {
            const role = room.ownerId === user.id ? 'HOST' : 'MEMBER'
            await tx.partyParticipant.create({
              data: {
                roomId: room.id,
                userId: user.id,
                role,
                status: 'ACTIVE',
              },
            })
          }

          return room
        }, { timeout: 25000, maxWait: 20000 })

        // Fetch full room state for joined response
        const fullRoom = await prisma.partyRoom.findUnique({
          where: { id: roomResult.id },
          include: {
            owner: true,
            lastUpdatedBy: true,
            participants: {
              where: { status: 'ACTIVE' },
              include: { user: true },
            },
            messages: {
              take: 50,
              orderBy: { createdAt: 'asc' },
              include: { user: true },
            },
          },
        })

        // Notify room via socket if io available
        if (io) {
          io.to(`party:${roomResult.id}`).emit('participant:joined', {
            roomId: roomResult.id,
            participant: {
              userId: user.id,
              username: user.username,
              displayName: user.displayName,
              avatar: user.avatar,
              role: roomResult.ownerId === user.id ? 'HOST' : 'MEMBER',
            },
          })
        }

        return sendSuccess(res, formatRoomDetails(fullRoom))
      } catch (err: any) {
        if (err instanceof AppError) {
          return sendError(res, err.message, err.code, err.statusCode)
        }
        console.error('[partyRouter] Join room error:', err)
        return sendError(res, 'Failed to join watch party.', ErrorCode.INTERNAL_ERROR, 500)
      }
    },
  )

  /*
   * -------------------------------------------------------------
   * POST /api/party/rooms/reenter — Host Re-entry during 60s Grace
   * -------------------------------------------------------------
   */
  router.post('/rooms/reenter', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!
      const { roomId } = req.body as ReenterPartyRoomInput

      if (!roomId) {
        return sendError(res, 'Room ID is required.', ErrorCode.BAD_REQUEST, 400)
      }

      let isExpired = false

      const room = await prisma.$transaction(async (tx) => {
        // Parent row lock
        const rooms = await tx.$queryRaw<any[]>`
          SELECT "id", "ownerId", "hostGraceExpiresAt", "expiresAt"
          FROM "party_rooms"
          WHERE "id" = ${roomId}
          FOR UPDATE;
        `
        const r = rooms[0]
        if (!r) {
          return null
        }

        if (r.ownerId !== user.id) {
          throw new AppError('Only the watch party host can re-enter this party as host.', ErrorCode.FORBIDDEN, 403)
        }

        // Check if grace period or TTL has expired
        const graceExpired = r.hostGraceExpiresAt && new Date(r.hostGraceExpiresAt) <= new Date()
        const ttlExpired = new Date(r.expiresAt) <= new Date()

        if (graceExpired || ttlExpired) {
          // Expired: delete inside transaction and mark expired
          await tx.$executeRaw`DELETE FROM "party_rooms" WHERE "id" = ${roomId};`
          isExpired = true
          return null
        }

        // Host re-entered successfully before deadline: clear grace and restore ACTIVE
        await tx.$executeRaw`
          UPDATE "party_rooms"
          SET "hostGraceExpiresAt" = NULL,
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${roomId};
        `

        await tx.$executeRaw`
          UPDATE "party_participants"
          SET "status" = 'ACTIVE',
              "lastSeenAt" = CURRENT_TIMESTAMP
          WHERE "roomId" = ${roomId} AND "userId" = ${user.id};
        `

        return r
      }, { timeout: 25000, maxWait: 20000 })

      if (isExpired || !room) {
        return sendError(
          res,
          'Watch party has ended: Host grace period expired.',
          ErrorCode.NOT_FOUND,
          404,
        )
      }

      // Clear in-memory timer
      clearHostGraceTimer(roomId)

      // Notify participants via socket
      if (io) {
        io.to(`party:${roomId}`).emit('host:reconnected', {
          roomId,
          hostUserId: user.id,
          message: 'Host has reconnected! Watch party resumed.',
        })
      }

      const fullRoom = await prisma.partyRoom.findUnique({
        where: { id: roomId },
        include: {
          owner: true,
          lastUpdatedBy: true,
          participants: {
            where: { status: 'ACTIVE' },
            include: { user: true },
          },
          messages: {
            take: 50,
            orderBy: { createdAt: 'asc' },
            include: { user: true },
          },
        },
      })

      return sendSuccess(res, formatRoomDetails(fullRoom))
    } catch (err: any) {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.code, err.statusCode)
      }
      console.error('[partyRouter] Host re-entry error:', err)
      return sendError(res, 'Failed to re-enter watch party.', ErrorCode.INTERNAL_ERROR, 500)
    }
  })

  /*
   * -------------------------------------------------------------
   * GET /api/party/rooms/:roomId — Room Details
   * -------------------------------------------------------------
   */
  router.get('/rooms/:roomId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!
      const roomId = getParamString(req.params.roomId)

      const room = await prisma.partyRoom.findUnique({
        where: { id: roomId },
        include: {
          owner: true,
          lastUpdatedBy: true,
          participants: {
            where: { status: 'ACTIVE' },
            include: { user: true },
          },
          messages: {
            take: 50,
            orderBy: { createdAt: 'asc' },
            include: { user: true },
          },
        },
      })

      if (!room || new Date(room.expiresAt) <= new Date()) {
        return sendError(res, 'Watch party not found or has ended.', ErrorCode.NOT_FOUND, 404)
      }

      // Check caller is active participant or owner
      const isParticipant =
        room.ownerId === user.id ||
        (room as any).participants.some((p: any) => p.userId === user.id)
      if (!isParticipant) {
        return sendError(res, 'You are not an active member of this watch party.', ErrorCode.FORBIDDEN, 403)
      }

      return sendSuccess(res, formatRoomDetails(room))
    } catch (err) {
      console.error('[partyRouter] Get room details error:', err)
      return sendError(res, 'Failed to fetch watch party details.', ErrorCode.INTERNAL_ERROR, 500)
    }
  })

  /*
   * -------------------------------------------------------------
   * POST /api/party/rooms/:roomId/rotate-token — Host rotates invite token
   * -------------------------------------------------------------
   */
  router.post('/rooms/:roomId/rotate-token', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!
      const roomId = getParamString(req.params.roomId)

      const newInviteToken = crypto.randomBytes(32).toString('hex')
      const newHash = hashInviteToken(newInviteToken)

      const updated = await prisma.$transaction(async (tx) => {
        const rooms = await tx.$queryRaw<any[]>`
          SELECT "id", "ownerId" FROM "party_rooms" WHERE "id" = ${roomId} FOR UPDATE;
        `
        const room = rooms[0]
        if (!room) {
          throw new AppError('Watch party not found.', ErrorCode.NOT_FOUND, 404)
        }
        if (room.ownerId !== user.id) {
          throw new AppError('Only the watch party host can rotate invite links.', ErrorCode.FORBIDDEN, 403)
        }

        await tx.$executeRaw`
          UPDATE "party_rooms"
          SET "inviteTokenHash" = ${newHash},
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${roomId};
        `
        return true
      }, { timeout: 25000, maxWait: 20000 })

      return sendSuccess(res, {
        roomId,
        inviteToken: newInviteToken,
        message: 'Invite link rotated successfully. Previous invite links are now invalid.',
      })
    } catch (err: any) {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.code, err.statusCode)
      }
      console.error('[partyRouter] Rotate token error:', err)
      return sendError(res, 'Failed to rotate invite link.', ErrorCode.INTERNAL_ERROR, 500)
    }
  })

  /*
   * -------------------------------------------------------------
   * POST /api/party/rooms/:roomId/leave — Leave Room
   * -------------------------------------------------------------
   */
  router.post('/rooms/:roomId/leave', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!
      const roomId = getParamString(req.params.roomId)

      let shouldDestroy = false

      await prisma.$transaction(async (tx) => {
        // Parent row lock
        const rooms = await tx.$queryRaw<any[]>`
          SELECT "id", "ownerId" FROM "party_rooms" WHERE "id" = ${roomId} FOR UPDATE;
        `
        const room = rooms[0]
        if (!room) {
          return // Room already gone
        }

        if (room.ownerId === user.id) {
          // Host leave: triggers complete room destruction
          shouldDestroy = true
        } else {
          // Member leave: mark LEFT, does NOT destroy room
          await tx.$executeRaw`
            UPDATE "party_participants"
            SET "status" = 'LEFT',
                "lastSeenAt" = CURRENT_TIMESTAMP
            WHERE "roomId" = ${roomId} AND "userId" = ${user.id};
          `
        }
      }, { timeout: 25000, maxWait: 20000 })

      if (shouldDestroy) {
        await destroyRoomService(io, {
          roomId,
          triggeredByUserId: user.id,
          reason: 'HOST_LEFT',
        })
        return sendSuccess(res, { message: 'Watch party closed: Host left the room.' })
      }

      // Member leave broadcast
      if (io) {
        io.to(`party:${roomId}`).emit('participant:left', {
          roomId,
          userId: user.id,
          username: user.username,
        })
      }

      return sendSuccess(res, { message: 'You have left the watch party.' })
    } catch (err: any) {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.code, err.statusCode)
      }
      console.error('[partyRouter] Leave room error:', err)
      return sendError(res, 'Failed to leave watch party.', ErrorCode.INTERNAL_ERROR, 500)
    }
  })

  /*
   * -------------------------------------------------------------
   * POST /api/party/rooms/:roomId/kick — Host Kicks Participant
   * -------------------------------------------------------------
   */
  router.post('/rooms/:roomId/kick', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!
      const roomId = getParamString(req.params.roomId)
      const { targetUserId } = req.body

      if (!targetUserId) {
        return sendError(res, 'Target user ID is required.', ErrorCode.BAD_REQUEST, 400)
      }
      if (targetUserId === user.id) {
        return sendError(res, 'Host cannot kick themselves.', ErrorCode.BAD_REQUEST, 400)
      }

      await prisma.$transaction(async (tx) => {
        // Parent row lock
        const rooms = await tx.$queryRaw<any[]>`
          SELECT "id", "ownerId" FROM "party_rooms" WHERE "id" = ${roomId} FOR UPDATE;
        `
        const room = rooms[0]
        if (!room) {
          throw new AppError('Watch party not found.', ErrorCode.NOT_FOUND, 404)
        }
        if (room.ownerId !== user.id) {
          throw new AppError('Only the watch party host can kick members.', ErrorCode.FORBIDDEN, 403)
        }

        // Lock participant and set to KICKED
        const participants = await tx.$queryRaw<any[]>`
          SELECT "id" FROM "party_participants"
          WHERE "roomId" = ${roomId} AND "userId" = ${targetUserId}
          FOR UPDATE;
        `
        if (!participants || participants.length === 0) {
          throw new AppError('Target participant not found in this room.', ErrorCode.NOT_FOUND, 404)
        }

        await tx.$executeRaw`
          UPDATE "party_participants"
          SET "status" = 'KICKED',
              "lastSeenAt" = CURRENT_TIMESTAMP
          WHERE "roomId" = ${roomId} AND "userId" = ${targetUserId};
        `
      }, { timeout: 25000, maxWait: 20000 })

      // Notify and evict kicked user
      if (io) {
        const roomChannel = `party:${roomId}`
        io.to(roomChannel).emit('participant:kicked', {
          roomId,
          targetUserId,
          message: 'A participant has been removed by the host.',
        })

        // Revoke and evict kicked user sockets
        const sockets = await io.in(roomChannel).fetchSockets()
        for (const s of sockets) {
          if (s.data.user?.id === targetUserId) {
            const revoked = s.data.revokedRooms as Set<string> | undefined
            if (revoked) {
              revoked.add(roomId)
            } else {
              s.data.revokedRooms = new Set([roomId])
            }
            s.emit('party:revoked', {
              roomId,
              reason: 'MEMBERSHIP_REVOKED',
              message: 'You have been removed from this watch party.',
            })
            s.leave(roomChannel)
          }
        }
      }

      return sendSuccess(res, { message: 'Participant removed successfully.' })
    } catch (err: any) {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.code, err.statusCode)
      }
      console.error('[partyRouter] Kick participant error:', err)
      return sendError(res, 'Failed to kick participant.', ErrorCode.INTERNAL_ERROR, 500)
    }
  })

  /*
   * -------------------------------------------------------------
   * DELETE /api/party/rooms/:roomId & POST /api/party/rooms/:roomId/close — Host Closes Party
   * -------------------------------------------------------------
   */
  const handleCloseRoom = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!
      const roomId = getParamString(req.params.roomId)

      await destroyRoomService(io, {
        roomId,
        triggeredByUserId: user.id,
        reason: 'HOST_CLOSED',
      })

      return sendSuccess(res, { closed: true, message: 'Watch party closed successfully.' })
    } catch (err: any) {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.code, err.statusCode)
      }
      console.error('[partyRouter] Close room error:', err)
      return sendError(res, 'Failed to close watch party.', ErrorCode.INTERNAL_ERROR, 500)
    }
  }

  router.delete('/rooms/:roomId', requireAuth, handleCloseRoom)
  router.post('/rooms/:roomId/close', requireAuth, handleCloseRoom)

  return router
}

export default createPartyRouter
