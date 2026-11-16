import { Server, Socket } from 'socket.io'
import crypto from 'node:crypto'
import prisma from '../db/client.js'
import { roomBroadcastQueue } from '../services/partyQueue.js'
import { destroyRoomService } from '../services/partyDestruction.js'
import { startHostGraceTimer, clearHostGraceTimer } from '../services/partyHostGrace.js'
import type {
  PlaybackSyncPayload,
  SendChatPayload,
  SendReactionPayload,
  PartyPlaybackState,
  PartyServerId,
  PartyAudioType,
} from '../types/party.js'

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: {
      id: string
      username: string
      displayName: string | null
      avatar: string | null
    }
    revokedRooms?: Set<string>
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function setupPartySockets(io: Server): void {
  // 1. Socket Authentication Middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      let token: string | undefined = socket.handshake.auth?.token

      if (!token && socket.handshake.headers.authorization?.startsWith('Bearer ')) {
        token = socket.handshake.headers.authorization.slice(7).trim()
      }

      if (!token && socket.handshake.headers.cookie) {
        const cookieToken = socket.handshake.headers.cookie
          .split(';')
          .map((v) => v.trim())
          .find((v) => v.startsWith('sevenanime_session='))
        if (cookieToken) {
          token = cookieToken.split('=')[1]
        }
      }

      if (!token) {
        return next(new Error('Authentication token required.'))
      }

      const tokenHash = hashToken(token)
      const session = await prisma.session.findUnique({
        where: { tokenHash },
        include: { user: true },
      })

      if (!session || session.expiresAt <= new Date()) {
        return next(new Error('Invalid or expired session.'))
      }

      socket.data.user = {
        id: session.user.id,
        username: session.user.username,
        displayName: session.user.displayName,
        avatar: session.user.avatar,
      }
      socket.data.revokedRooms = new Set<string>()

      next()
    } catch (err) {
      console.error('[partySocket] Socket auth error:', err)
      next(new Error('Authentication failed.'))
    }
  })

  // 2. Real-Time Connection & Event Subscriptions
  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user
    if (!user) {
      socket.disconnect(true)
      return
    }

    /*
     * -------------------------------------------------------------
     * party:join — Attach socket to room channel
     * -------------------------------------------------------------
     */
    socket.on('party:join', async (payload: { roomId: string }) => {
      try {
        const { roomId } = payload
        if (!roomId) return

        if (socket.data.revokedRooms?.has(roomId) || roomBroadcastQueue.isDestroyed(roomId)) {
          socket.emit('party:error', {
            code: 'ROOM_NOT_FOUND',
            message: 'Watch party does not exist or has ended.',
          })
          return
        }

        // Verify active participant in database
        const participant = await prisma.partyParticipant.findFirst({
          where: { roomId, userId: user.id },
          include: { room: true },
        })

        if (!participant || participant.status === 'KICKED') {
          socket.emit('party:error', {
            code: 'MEMBERSHIP_REVOKED',
            message: 'You are not authorized to join this watch party channel.',
          })
          return
        }

        if (new Date(participant.room.expiresAt) <= new Date()) {
          socket.emit('party:error', {
            code: 'ROOM_NOT_FOUND',
            message: 'Watch party has expired.',
          })
          return
        }

        // If host was in grace period and returned, clear grace timer
        if (participant.role === 'HOST') {
          clearHostGraceTimer(roomId)
        }

        const roomChannel = `party:${roomId}`
        socket.join(roomChannel)

        // Mark active
        await prisma.partyParticipant.update({
          where: { id: participant.id },
          data: { status: 'ACTIVE', lastSeenAt: new Date() },
        })

        socket.emit('party:joined-success', { roomId })
      } catch (err) {
        console.error('[partySocket] party:join error:', err)
        socket.emit('party:error', {
          code: 'INTERNAL_ERROR',
          message: 'Failed to join watch party channel.',
        })
      }
    })

    /*
     * -------------------------------------------------------------
     * playback:sync-stream — Synchronize episode, server, audio
     * -------------------------------------------------------------
     */
    socket.on('playback:sync-stream', async (payload: PlaybackSyncPayload) => {
      const { roomId, anilistId, episodeNumber, audioType, serverId, expectedRevision } = payload

      if (!roomId) return

      if (typeof expectedRevision !== 'number' || Number.isNaN(expectedRevision)) {
        socket.emit('party:error', {
          code: 'INVALID_PAYLOAD',
          message: 'expectedRevision must be a valid number.',
        })
        return
      }

      if (
        serverId !== 'server1' &&
        serverId !== 'server2' &&
        serverId !== 'server3' &&
        serverId !== 'server4'
      ) {
        socket.emit('party:error', {
          code: 'INVALID_SERVER_ID',
          message: 'Invalid server ID. Supported servers are server1, server2, server3, server4.',
        })
        return
      }

      if (audioType !== 'sub' && audioType !== 'dub') {
        socket.emit('party:error', {
          code: 'INVALID_AUDIO_TYPE',
          message: 'Invalid audio type. Supported types are sub, dub.',
        })
        return
      }

      if (typeof episodeNumber !== 'number' || episodeNumber < 1 || Number.isNaN(episodeNumber)) {
        socket.emit('party:error', {
          code: 'INVALID_EPISODE_NUMBER',
          message: 'episodeNumber must be a positive integer.',
        })
        return
      }

      if (typeof anilistId !== 'number' || anilistId <= 0 || Number.isNaN(anilistId)) {
        socket.emit('party:error', {
          code: 'INVALID_ANILIST_ID',
          message: 'anilistId must be a positive integer.',
        })
        return
      }

      if (socket.data.revokedRooms?.has(roomId) || roomBroadcastQueue.isDestroyed(roomId)) {
        socket.emit('party:error', {
          code: 'ROOM_NOT_FOUND',
          message: 'Watch party has ended.',
        })
        return
      }

      try {
        // Serialized within queue: Single-flight PostgreSQL validation + Admitted only if active
        await roomBroadcastQueue.enqueue(
          roomId,
          async () => {
            const nextRevision = expectedRevision + 1
            const newEventId = crypto.randomUUID()

            // 1. Database Transaction with row capture (PostgreSQL is ultimate authority)
            const updatedRows = await prisma.$queryRaw<Array<{
              id: string
              mediaType: string
              anilistId: number
              episodeNumber: number
              audioType: string
              serverId: string
              stateRevision: number
              lastEventId: string
              updatedAt: Date
            }>>`
              UPDATE "party_rooms" r
              SET 
                "anilistId" = ${anilistId},
                "episodeNumber" = ${episodeNumber},
                "audioType" = ${audioType},
                "serverId" = ${serverId},
                "stateRevision" = ${nextRevision},
                "lastEventId" = ${newEventId},
                "lastUpdatedById" = ${user.id},
                "updatedAt" = CURRENT_TIMESTAMP
              WHERE r."id" = ${roomId}
                AND r."expiresAt" > CURRENT_TIMESTAMP
                AND r."stateRevision" = ${expectedRevision}
                AND EXISTS (
                  SELECT 1 FROM "party_participants" p
                  WHERE p."roomId" = r."id"
                    AND p."userId" = ${user.id}
                    AND p."status" = 'ACTIVE'
                )
              RETURNING *;
            `

            // 2. If 0 rows updated: reconcile against PostgreSQL truth
            if (!updatedRows || updatedRows.length === 0) {
              const currentRoom = await prisma.partyRoom.findUnique({
                where: { id: roomId },
                include: { lastUpdatedBy: true, owner: true },
              })

              if (!currentRoom || new Date(currentRoom.expiresAt) <= new Date()) {
                roomBroadcastQueue.registerTombstone(roomId)
                socket.emit('party:error', {
                  code: 'ROOM_NOT_FOUND',
                  message: 'Watch party does not exist or has ended.',
                })
                return
              }

              // State conflict: emit authoritative current state
              const authoritativeState: PartyPlaybackState = {
                roomId: currentRoom.id,
                mediaType: currentRoom.mediaType as 'movie' | 'tv',
                anilistId: currentRoom.anilistId,
                episodeNumber: currentRoom.episodeNumber,
                audioType: currentRoom.audioType as PartyAudioType,
                serverId: currentRoom.serverId as PartyServerId,
                stateRevision: currentRoom.stateRevision,
                lastEventId: currentRoom.lastEventId,
                updatedAt: currentRoom.updatedAt.toISOString(),
                updatedBy: {
                  userId: currentRoom.lastUpdatedBy?.id || currentRoom.owner.id,
                  username: currentRoom.lastUpdatedBy?.username || currentRoom.owner.username,
                  displayName: currentRoom.lastUpdatedBy?.displayName || currentRoom.owner.displayName,
                },
              }
              socket.emit('playback:updated', authoritativeState)
              return
            }

            const committedRoom = updatedRows[0]
            const authoritativeState: PartyPlaybackState = {
              roomId: committedRoom.id,
              mediaType: committedRoom.mediaType as 'movie' | 'tv',
              anilistId: committedRoom.anilistId,
              episodeNumber: committedRoom.episodeNumber,
              audioType: committedRoom.audioType as PartyAudioType,
              serverId: committedRoom.serverId as PartyServerId,
              stateRevision: committedRoom.stateRevision,
              lastEventId: committedRoom.lastEventId,
              updatedAt: committedRoom.updatedAt.toISOString(),
              updatedBy: {
                userId: user.id,
                username: user.username,
                displayName: user.displayName,
              },
            }

            // 3. Playback Broadcast placed inside serialized queue action strictly after DB commit
            io.to(`party:${roomId}`).emit('playback:updated', authoritativeState)
          },
          // Independent per-request caller validation
          async () => {
            const p = await prisma.partyParticipant.findFirst({
              where: { roomId, userId: user.id, status: 'ACTIVE' },
              select: { id: true },
            })
            return !!p
          },
        )
      } catch (err: any) {
        console.error('[partySocket] playback:sync-stream error:', err)
        socket.emit('party:error', {
          code: 'SYNC_FAILED',
          message: err?.message || 'Failed to synchronize stream selection.',
        })
      }
    })

    /*
     * -------------------------------------------------------------
     * chat:send — Send message in party chat
     * -------------------------------------------------------------
     */
    socket.on('chat:send', async (payload: SendChatPayload) => {
      const { roomId, content } = payload
      if (!roomId || !content || typeof content !== 'string') return

      const trimmed = content.trim().slice(0, 500)
      if (trimmed.length === 0) return

      if (socket.data.revokedRooms?.has(roomId) || roomBroadcastQueue.isDestroyed(roomId)) {
        return
      }

      try {
        const message = await prisma.$transaction(async (tx) => {
          // Parent-first row check
          const rooms = await tx.$queryRaw<any[]>`
            SELECT "id", "expiresAt" FROM "party_rooms" WHERE "id" = ${roomId} FOR SHARE;
          `
          const room = rooms[0]
          if (!room || new Date(room.expiresAt) <= new Date()) {
            throw new Error('Room expired')
          }

          // Verify participant active
          const participants = await tx.$queryRaw<any[]>`
            SELECT "id", "status" FROM "party_participants"
            WHERE "roomId" = ${roomId} AND "userId" = ${user.id}
            FOR SHARE;
          `
          const p = participants[0]
          if (!p || p.status !== 'ACTIVE') {
            throw new Error('Participant not active')
          }

          return tx.partyMessage.create({
            data: {
              roomId,
              userId: user.id,
              content: trimmed,
            },
            include: {
              user: {
                select: { id: true, username: true, displayName: true, avatar: true },
              },
            },
          })
        })

        io.to(`party:${roomId}`).emit('chat:message', {
          id: message.id,
          roomId: message.roomId,
          userId: message.userId,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          user: message.user,
        })
      } catch (err) {
        console.error('[partySocket] chat:send error:', err)
      }
    })

    /*
     * -------------------------------------------------------------
     * reaction:send — Floating ephemeral reaction burst
     * -------------------------------------------------------------
     */
    socket.on('reaction:send', async (payload: SendReactionPayload) => {
      const { roomId, emoji } = payload
      if (!roomId || !emoji) return

      if (socket.data.revokedRooms?.has(roomId) || roomBroadcastQueue.isDestroyed(roomId)) {
        return
      }

      // Quick membership verification
      const p = await prisma.partyParticipant.findFirst({
        where: { roomId, userId: user.id, status: 'ACTIVE' },
        select: { id: true },
      })
      if (!p) return

      // Ephemeral broadcast to room channel
      io.to(`party:${roomId}`).emit('reaction:burst', {
        roomId,
        userId: user.id,
        username: user.username,
        emoji: emoji.slice(0, 10),
        timestamp: new Date().toISOString(),
      })
    })

    /*
     * -------------------------------------------------------------
     * disconnecting — Handle host or member disconnect
     * -------------------------------------------------------------
     */
    socket.on('disconnecting', async () => {
      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('party:'))

      for (const channel of rooms) {
        const roomId = channel.replace('party:', '')

        try {
          // Check if socket user is the host
          const room = await prisma.partyRoom.findUnique({
            where: { id: roomId },
            select: { id: true, ownerId: true },
          })

          if (room && room.ownerId === user.id) {
            // Host unexpectedly disconnected: initiate atomic 60-second grace period
            console.log(`[partySocket] Host ${user.id} disconnected from room ${roomId}. Initiating 60s grace timer.`)
            void startHostGraceTimer(io, roomId, user.id)
          } else if (room) {
            // Member disconnected: mark DISCONNECTED
            await prisma.partyParticipant.updateMany({
              where: { roomId, userId: user.id, status: 'ACTIVE' },
              data: { status: 'DISCONNECTED', lastSeenAt: new Date() },
            })

            socket.to(channel).emit('participant:disconnected', {
              roomId,
              userId: user.id,
              username: user.username,
            })
          }
        } catch (err) {
          console.error(`[partySocket] Disconnect cleanup error for room ${roomId}:`, err)
        }
      }
    })
  })
}

export default setupPartySockets
