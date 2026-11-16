import prisma from '../db/client.js'
import { AppError, ErrorCode } from '../utils/response.js'

export type RoomQueueState = 'ACTIVE' | 'CLOSING' | 'DESTROYED'

export interface RoomQueueEntry {
  state: RoomQueueState
  promise: Promise<void>
  pendingCount: number
  admissionSeq: number
  destructionPromise?: Promise<boolean>
}

/**
 * Authoritative in-memory FIFO queue manager for 7Anime Party Play.
 * Coordinates command admission, serialized execution, and permanent room destruction.
 */
export class RoomBroadcastQueueManager {
  private queues = new Map<string, RoomQueueEntry>()
  private destroyedRooms = new Set<string>() // Fast-path in-memory tombstones (process-local cache)
  private initPromises = new Map<string, Promise<RoomQueueEntry>>() // Single-flight post-restart initialization deduplication
  private isShuttingDown = false

  isDestroyed(roomId: string): boolean {
    return this.destroyedRooms.has(roomId)
  }

  getQueueState(roomId: string): RoomQueueState | 'NOT_INITIALIZED' {
    if (this.destroyedRooms.has(roomId)) return 'DESTROYED'
    const entry = this.queues.get(roomId)
    return entry ? entry.state : 'NOT_INITIALIZED'
  }

  registerTombstone(roomId: string): void {
    this.destroyedRooms.add(roomId)
    this.queues.delete(roomId)
    this.initPromises.delete(roomId)
  }

  /**
   * 1. Race-Safe Single-Flight Queue Initialization (PostgreSQL Authority)
   * Ensures that after backend restart, rooms are verified against PostgreSQL before
   * creating an in-memory queue, and concurrent first requests do not instantiate duplicate queues.
   *
   * CRITICAL GUARANTEE: Never performs async DB queries while holding a synchronous lock.
   * Rechecks tombstone and existing queue state after async DB query before storing.
   * Never overwrites an existing CLOSING or DESTROYED entry!
   */
  async ensureQueue(roomId: string): Promise<RoomQueueEntry> {
    // Step 1: Check fast-path in-memory tombstone
    if (this.destroyedRooms.has(roomId)) {
      throw new AppError('Watch party has been closed.', ErrorCode.NOT_FOUND, 404)
    }

    // Step 2: Check whether an active queue already exists
    const existing = this.queues.get(roomId)
    if (existing) {
      if (existing.state !== 'ACTIVE') {
        throw new AppError('Watch party is closing or closed.', ErrorCode.NOT_FOUND, 404)
      }
      return existing
    }

    // Step 3: Single-flight deduplication: concurrent first requests share ONE initPromise
    let initPromise = this.initPromises.get(roomId)
    if (!initPromise) {
      initPromise = (async () => {
        try {
          // Validate existence and expiration against PostgreSQL (the ultimate source of truth)
          const room = await prisma.partyRoom.findUnique({
            where: { id: roomId },
            select: { id: true, expiresAt: true },
          })

          if (!room || new Date(room.expiresAt) <= new Date()) {
            this.registerTombstone(roomId)
            throw new AppError('Watch party does not exist or has expired.', ErrorCode.NOT_FOUND, 404)
          }

          // Step 4: CRITICAL CONCURRENCY CHECK: Re-verify state after async DB check
          // If a destruction or close reservation occurred while DB query was in-flight,
          // NEVER overwrite or resurrect the room!
          if (this.destroyedRooms.has(roomId)) {
            throw new AppError('Watch party has been closed.', ErrorCode.NOT_FOUND, 404)
          }

          const currentEntry = this.queues.get(roomId)
          if (currentEntry) {
            if (currentEntry.state !== 'ACTIVE') {
              throw new AppError('Watch party is closing or closed.', ErrorCode.NOT_FOUND, 404)
            }
            return currentEntry
          }

          // Instantiation: Create new ACTIVE queue entry
          const newEntry: RoomQueueEntry = {
            state: 'ACTIVE',
            promise: Promise.resolve(),
            pendingCount: 0,
            admissionSeq: 0,
          }
          this.queues.set(roomId, newEntry)
          return newEntry
        } finally {
          this.initPromises.delete(roomId)
        }
      })()
      this.initPromises.set(roomId, initPromise)
    }

    return initPromise
  }

  /**
   * 2. Atomic Destruction Reservation: Transitions ACTIVE -> CLOSING
   * Rejects subsequent playback admissions immediately.
   * If already CLOSING, concurrent destruction callers share the existing destructionPromise.
   */
  reserveClosing(roomId: string): {
    success: boolean
    state?: RoomQueueState
    destructionPromise?: Promise<boolean>
  } {
    if (this.destroyedRooms.has(roomId)) {
      return { success: false, state: 'DESTROYED' }
    }

    this.initPromises.delete(roomId)

    let entry = this.queues.get(roomId)
    if (!entry) {
      entry = {
        state: 'CLOSING',
        promise: Promise.resolve(),
        pendingCount: 0,
        admissionSeq: 0,
      }
      this.queues.set(roomId, entry)
      return { success: true }
    }

    if (entry.state !== 'ACTIVE') {
      // Already CLOSING or DESTROYED; return shared destructionPromise for concurrent callers
      return {
        success: false,
        state: entry.state,
        destructionPromise: entry.destructionPromise,
      }
    }

    entry.state = 'CLOSING'
    return { success: true }
  }

  /**
   * Rollback closing state to ACTIVE on confirmed pre-commit failure.
   * Only called when empirical probe proves the room row still exists in PostgreSQL.
   */
  rollbackClosing(roomId: string): void {
    const entry = this.queues.get(roomId)
    if (entry && !this.destroyedRooms.has(roomId)) {
      entry.state = 'ACTIVE'
      delete entry.destructionPromise
    }
  }

  /**
   * Bounded retry reconciler for rooms stuck in CLOSING after an unreachable database.
   * Never restores ACTIVE without confirming room still exists and is valid in PostgreSQL.
   */
  async reconcileQueueState(
    roomId: string,
    maxRetries = 3,
    initialDelayMs = 250,
  ): Promise<RoomQueueState> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const room = await prisma.partyRoom.findUnique({
          where: { id: roomId },
          select: { id: true, expiresAt: true },
        })

        if (!room || new Date(room.expiresAt) <= new Date()) {
          // Room was actually deleted by PostgreSQL; finalize destruction permanently
          this.finalizeDestruction(roomId)
          return 'DESTROYED'
        }

        // Room still exists and is valid: safe to restore ACTIVE
        this.rollbackClosing(roomId)
        return 'ACTIVE'
      } catch (err) {
        if (attempt === maxRetries) {
          // Exhausted retries: keep FAIL-CLOSED in CLOSING state
          console.error(
            `[partyQueue] Reconciler failed after ${maxRetries} attempts for room ${roomId}. Room kept fail-closed in CLOSING.`,
            err,
          )
          return 'CLOSING'
        }
        await new Promise((resolve) =>
          setTimeout(resolve, initialDelayMs * Math.pow(2, attempt - 1)),
        )
      }
    }
    return 'CLOSING'
  }

  /**
   * 3. Enqueue Playback Command: Strict Admission vs Execution Separation
   * Independently validates caller authorization per-request before admission.
   * Admitted commands execute in FIFO sequence even if queue transitions to CLOSING.
   */
  async enqueue<T>(
    roomId: string,
    action: () => Promise<T>,
    callerValidator?: () => Promise<boolean>,
  ): Promise<T> {
    if (this.isShuttingDown) {
      throw new AppError('Server is shutting down.', ErrorCode.SERVICE_UNAVAILABLE, 503)
    }

    // Step 1: Check fast-path in-memory tombstone
    if (this.destroyedRooms.has(roomId)) {
      throw new AppError('Watch party has been closed.', ErrorCode.NOT_FOUND, 404)
    }

    // Step 2: Acquire queue (fast-path from memory or single-flight async init)
    let entry = this.queues.get(roomId)
    if (!entry) {
      entry = await this.ensureQueue(roomId)
    }

    // Step 3: ADMISSION RULE: Reject new commands arriving while room is CLOSING or DESTROYED
    if (entry.state !== 'ACTIVE') {
      throw new AppError('Watch party is closing or closed.', ErrorCode.NOT_FOUND, 404)
    }

    // Step 3: PER-REQUEST AUTHORIZATION: Independently validate every caller
    if (callerValidator) {
      const isAuthorized = await callerValidator()
      if (!isAuthorized) {
        throw new AppError('Caller is not authorized for this party room.', ErrorCode.FORBIDDEN, 403)
      }
    }

    // Step 4: Re-check queue state after async caller authorization
    if (entry.state !== 'ACTIVE' || this.destroyedRooms.has(roomId)) {
      throw new AppError('Watch party is closing or closed.', ErrorCode.NOT_FOUND, 404)
    }

    // Command accepted! Assign monotonic admission ticket
    const ticketId = ++entry.admissionSeq
    entry.pendingCount++

    return new Promise<T>((resolve, reject) => {
      entry.promise = entry.promise
        .then(async () => {
          // EXECUTION RULE: Admitted command executes even if state transitioned to CLOSING.
          // It is rejected ONLY if the room was already permanently DESTROYED or tombstoned.
          if (entry.state === 'DESTROYED' || this.destroyedRooms.has(roomId)) {
            throw new AppError('Watch party has been closed.', ErrorCode.NOT_FOUND, 404)
          }

          // Executes database transaction AND emits broadcast inside this serialized FIFO turn
          const result = await action()
          resolve(result)
        })
        .catch((err) => reject(err))
        .finally(() => {
          const current = this.queues.get(roomId)
          if (current === entry) {
            current.pendingCount--
            if (current.state === 'DESTROYED' && current.pendingCount <= 0) {
              this.queues.delete(roomId)
            }
          }
        })
    })
  }

  /**
   * 4. Enqueue Destruction Task: Chains behind admitted playback commands.
   * Ensures all previously admitted commands commit and broadcast before party:closed.
   */
  enqueueDestruction(
    roomId: string,
    action: () => Promise<boolean>,
  ): Promise<boolean> {
    let entry = this.queues.get(roomId)
    if (!entry) {
      entry = {
        state: 'CLOSING',
        promise: Promise.resolve(),
        pendingCount: 0,
        admissionSeq: 0,
      }
      this.queues.set(roomId, entry)
    }

    entry.state = 'CLOSING'
    entry.pendingCount++

    const destructionPromise = new Promise<boolean>((resolve, reject) => {
      entry!.promise = entry!.promise
        .then(async () => {
          const result = await action()
          resolve(result)
        })
        .catch((err) => reject(err))
        .finally(() => {
          const current = this.queues.get(roomId)
          if (current === entry) {
            current.pendingCount--
            if (current.state === 'DESTROYED' && current.pendingCount <= 0) {
              this.queues.delete(roomId)
            }
          }
        })
    })

    entry.destructionPromise = destructionPromise
    return destructionPromise
  }

  /**
   * 5. Finalize Destruction: Transitions CLOSING -> DESTROYED and registers tombstone
   */
  finalizeDestruction(roomId: string): void {
    this.destroyedRooms.add(roomId)
    this.initPromises.delete(roomId)
    const entry = this.queues.get(roomId)
    if (entry) {
      entry.state = 'DESTROYED'
      if (entry.pendingCount <= 0) {
        this.queues.delete(roomId)
      }
    }
  }

  async drainAndShutdown(timeoutMs = 5000): Promise<void> {
    this.isShuttingDown = true
    const allPending = Array.from(this.queues.values()).map((e) => e.promise)
    await Promise.race([
      Promise.allSettled(allPending),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ])
    this.queues.clear()
    this.initPromises.clear()
  }
}

export const roomBroadcastQueue = new RoomBroadcastQueueManager()
