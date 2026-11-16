import type { Server } from 'socket.io'
import prisma from '../db/client.js'
import { destroyRoomService } from './partyDestruction.js'

// In-memory host disconnect grace timers (60 seconds)
const hostGraceTimers = new Map<string, NodeJS.Timeout>()

export const HOST_GRACE_PERIOD_MS = 60 * 1000 // 60 seconds

export function isHostInGracePeriod(roomId: string): boolean {
  return hostGraceTimers.has(roomId)
}

export function clearHostGraceTimer(roomId: string): void {
  const timer = hostGraceTimers.get(roomId)
  if (timer) {
    clearTimeout(timer)
    hostGraceTimers.delete(roomId)
  }
}

/**
 * Initiates an atomic 60-second host grace period.
 * Persists hostGraceExpiresAt to PostgreSQL for process restart resilience,
 * updates participant status to DISCONNECTED, and arms in-memory timer.
 */
export async function startHostGraceTimer(
  io: Server | undefined,
  roomId: string,
  hostUserId: string,
): Promise<void> {
  // Clear any existing timer
  clearHostGraceTimer(roomId)

  const graceExpiresAt = new Date(Date.now() + HOST_GRACE_PERIOD_MS)

  // 1. Transactionally update PostgreSQL state under parent row lock
  try {
    await prisma.$transaction(async (tx) => {
      // Parent-first row lock
      const rooms = await tx.$queryRaw<Array<{ id: string; ownerId: string }>>`
        SELECT "id", "ownerId"
        FROM "party_rooms"
        WHERE "id" = ${roomId}
        FOR UPDATE;
      `
      const room = rooms[0]
      if (!room || room.ownerId !== hostUserId) {
        return // Room already deleted or owner mismatch
      }

      await tx.$executeRaw`
        UPDATE "party_rooms"
        SET "hostGraceExpiresAt" = ${graceExpiresAt},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${roomId};
      `

      await tx.$executeRaw`
        UPDATE "party_participants"
        SET "status" = 'DISCONNECTED',
            "lastSeenAt" = CURRENT_TIMESTAMP
        WHERE "roomId" = ${roomId} AND "userId" = ${hostUserId};
      `
    }, { timeout: 25000, maxWait: 20000 })
  } catch (err) {
    console.error(`[partyHostGrace] Error persisting host grace deadline for room ${roomId}:`, err)
  }

  // 2. Broadcast host disconnected warning to remaining participants
  if (io) {
    io.to(`party:${roomId}`).emit('host:disconnected', {
      roomId,
      hostUserId,
      graceExpiresAt: graceExpiresAt.toISOString(),
      gracePeriodSeconds: 60,
      message: 'Host has temporarily disconnected. Room will close in 60s if host does not return.',
    })
  }

  // 3. Arm in-memory timer to destroy room upon expiry
  const timeout = setTimeout(async () => {
    hostGraceTimers.delete(roomId)
    try {
      console.log(`[partyHostGrace] 60-second grace period expired for host in room ${roomId}. Destroying room.`)
      await destroyRoomService(io, {
        roomId,
        reason: 'HOST_GRACE_EXPIRED',
      })
    } catch (destroyErr) {
      console.error(`[partyHostGrace] Failed to destroy room ${roomId} after grace expiry:`, destroyErr)
    }
  }, HOST_GRACE_PERIOD_MS)

  hostGraceTimers.set(roomId, timeout)
}
