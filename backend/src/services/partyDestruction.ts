import type { Server } from 'socket.io'
import prisma from '../db/client.js'
import { AppError, ErrorCode } from '../utils/response.js'
import { roomBroadcastQueue } from './partyQueue.js'
import { clearHostGraceTimer } from './partyHostGrace.js'

export interface DestroyRoomOptions {
  roomId: string
  triggeredByUserId?: string
  reason:
    | 'HOST_CLOSED'
    | 'HOST_LEFT'
    | 'HOST_STREAM_CLOSED'
    | 'HOST_GRACE_EXPIRED'
    | 'MOVIE_ENDED'
    | 'AUTO_EXPIRED'
}

/**
 * Authoritative Atomic Room Destruction Service.
 * Implements hard deletion with cascading cleanup and fail-closed reconciliation.
 */
export async function destroyRoomService(
  io: Server | undefined,
  options: DestroyRoomOptions,
): Promise<boolean> {
  const { roomId, triggeredByUserId, reason } = options

  // 1. Fast Tombstone & In-Memory Check (Idempotent)
  if (roomBroadcastQueue.isDestroyed(roomId)) {
    return false
  }

  // 2. Pre-Authorization Check: Validate caller authorization before reserving or poisoning queue
  if (triggeredByUserId) {
    const room = await prisma.partyRoom.findUnique({
      where: { id: roomId },
      select: { ownerId: true },
    })
    if (!room || room.ownerId !== triggeredByUserId) {
      throw new AppError('Only the watch party host can destroy this room.', ErrorCode.FORBIDDEN, 403)
    }
  }

  // 3. Reserve Queue Closing State (ACTIVE -> CLOSING)
  // Rejects any subsequent playback commands arriving from this point forward.
  // If already CLOSING, concurrent callers await the same destructionPromise.
  const reservation = roomBroadcastQueue.reserveClosing(roomId)
  if (!reservation.success) {
    if (reservation.state === 'CLOSING' && reservation.destructionPromise) {
      await reservation.destructionPromise
      return true
    }
    return false // Already permanently DESTROYED
  }

  // 4. Clear any pending host disconnect timer
  clearHostGraceTimer(roomId)

  // 5. Serialize Entire Destruction Lifecycle Inside the Per-Room FIFO Queue
  return roomBroadcastQueue.enqueueDestruction(roomId, async () => {
    let deletionCommitted = false

    // --- PHASE 1: DATABASE TRANSACTION (UNDER COMMIT BOUNDARY) ---
    try {
      deletionCommitted = await prisma.$transaction(async (tx) => {
        // Parent-first exclusive row lock
        const rooms = await tx.$queryRaw<Array<{
          id: string
          ownerId: string
          hostGraceExpiresAt: Date | null
          expiresAt: Date
        }>>`
          SELECT "id", "ownerId", "hostGraceExpiresAt", "expiresAt"
          FROM "party_rooms"
          WHERE "id" = ${roomId}
          FOR UPDATE;
        `
        const room = rooms[0]
        if (!room) {
          return false // Already deleted by concurrent sweep or leave
        }

        // Authoritative permission re-validation under lock
        if (triggeredByUserId && room.ownerId !== triggeredByUserId) {
          throw new AppError('Only the watch party host can destroy this room.', ErrorCode.FORBIDDEN, 403)
        }

        // Revalidate expiration under lock if trigger is AUTO_EXPIRED or HOST_GRACE_EXPIRED
        if (reason === 'AUTO_EXPIRED' || reason === 'HOST_GRACE_EXPIRED') {
          const isGraceExpired =
            room.hostGraceExpiresAt && new Date(room.hostGraceExpiresAt) <= new Date()
          const isTtlExpired = new Date(room.expiresAt) <= new Date()
          if (!isGraceExpired && !isTtlExpired) {
            // Room was renewed by host reconnect in the meantime! Abort deletion safely.
            return false
          }
        }

        // Hard DELETE room row (cascades to participants, messages automatically)
        await tx.$executeRaw`DELETE FROM "party_rooms" WHERE "id" = ${roomId};`
        return true
      }, { timeout: 25000, maxWait: 20000 })
    } catch (dbError) {
      // PRE-COMMIT / AMBIGUOUS COMMIT ERROR RECOVERY:
      // In a distributed DB environment, a network drop during COMMIT can leave the state ambiguous.
      // We MUST NOT blindly rollback to ACTIVE without empirical PostgreSQL reconciliation.
      console.error(
        `[partyDestruction] Error during destruction transaction for room ${roomId}, initiating reconciliation probe:`,
        dbError,
      )

      try {
        // Reconciliation Probe against PostgreSQL truth
        const probe = await prisma.partyRoom.findUnique({
          where: { id: roomId },
          select: { id: true },
        })

        if (probe !== null) {
          // CONFIRMED ROLLBACK: Room confirmed to still exist in PostgreSQL.
          // Safely rollback queue state from CLOSING back to ACTIVE.
          roomBroadcastQueue.rollbackClosing(roomId)
          throw dbError
        } else {
          // CONFIRMED COMMIT: Room no longer exists (deletion committed before connection dropped)!
          console.info(`[partyDestruction] Reconciliation probe confirmed room ${roomId} was deleted despite commit error.`)
          deletionCommitted = true
        }
      } catch (probeError) {
        if (probeError === dbError) {
          throw dbError
        }
        // FAIL-CLOSED: PostgreSQL is completely unreachable.
        // Queue MUST REMAIN in CLOSING state (fail-closed) to prevent resurrecting a destroyed room.
        console.error(
          `[partyDestruction] CRITICAL: PostgreSQL unreachable during destruction reconciliation probe for room ${roomId}. Room kept fail-closed in CLOSING.`,
          probeError,
        )
        // Trigger bounded background retry reconciler
        void roomBroadcastQueue.reconcileQueueState(roomId)
        throw dbError
      }
    }

    if (!deletionCommitted) {
      // Room was not deleted (e.g. renewed room or already deleted by concurrent task)
      const exists = await prisma.partyRoom.findUnique({
        where: { id: roomId },
        select: { id: true },
      })
      if (exists) {
        roomBroadcastQueue.rollbackClosing(roomId) // Room was renewed! Revert queue to ACTIVE.
        return false
      } else {
        roomBroadcastQueue.finalizeDestruction(roomId) // Room was already deleted.
        return false
      }
    }

    // =========================================================================
    // COMMIT BOUNDARY REACHED: PostgreSQL deletion is 100% committed to disk.
    // Register permanent tombstone IMMEDIATELY before notifications or eviction.
    // =========================================================================
    roomBroadcastQueue.finalizeDestruction(roomId)

    // --- PHASE 2: BEST-EFFORT SOCKET NOTIFICATION & EVICTION ---
    try {
      if (io) {
        const roomChannel = `party:${roomId}`
        io.to(roomChannel).emit('party:closed', {
          roomId,
          reason,
          message:
            reason === 'HOST_GRACE_EXPIRED' || reason === 'AUTO_EXPIRED'
              ? 'Watch party destroyed: Host disconnected and grace period expired.'
              : reason === 'HOST_LEFT'
              ? 'Watch party destroyed: Host left the party.'
              : reason === 'HOST_STREAM_CLOSED'
              ? 'Watch party destroyed: Host closed the player stream.'
              : 'Watch party closed by host.',
          timestamp: new Date().toISOString(),
        })

        // Socket Eviction and Revocation
        const roomSockets = await io.in(roomChannel).fetchSockets()
        for (const s of roomSockets) {
          const revoked = s.data.revokedRooms as Set<string> | undefined
          if (revoked) {
            revoked.add(roomId)
          } else {
            s.data.revokedRooms = new Set([roomId])
          }
          s.leave(roomChannel)
        }
      }
    } catch (notificationError) {
      console.warn(`[partyDestruction] Socket notification failed for destroyed room ${roomId}:`, notificationError)
    }

    return true
  })
}
