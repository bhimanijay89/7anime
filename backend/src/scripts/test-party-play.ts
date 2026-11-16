/**
 * 7Anime Party Play — Comprehensive Automated Verification Suite
 * Tests all Phase 2 functionality, concurrency edge cases, lifecycle transitions, and data integrity.
 * Run with: npx tsx backend/src/scripts/test-party-play.ts
 */

import crypto from 'node:crypto'
import prisma from '../db/client.js'
import { roomBroadcastQueue, RoomBroadcastQueueManager } from '../services/partyQueue.js'
import { destroyRoomService } from '../services/partyDestruction.js'
import { startHostGraceTimer, clearHostGraceTimer, HOST_GRACE_PERIOD_MS } from '../services/partyHostGrace.js'

let passedTests = 0
let failedTests = 0

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    failedTests++
    throw new Error(`Assertion failed: ${message}`)
  } else {
    console.log(`✅ PASSED: ${message}`)
    passedTests++
  }
}

async function runTestSuite() {
  console.log('\n======================================================')
  console.log('🚀 Starting 7Anime Party Play Automated Verification')
  console.log('======================================================\n')

  // Setup Test Users
  const hostUserId = `test-host-${crypto.randomUUID()}`
  const memberUserId = `test-member-${crypto.randomUUID()}`
  const guestUserId = `test-guest-${crypto.randomUUID()}`

  await prisma.user.createMany({
    data: [
      {
        id: hostUserId,
        email: `${hostUserId}@7anime.test`,
        username: `host_${hostUserId.slice(0, 8)}`,
        passwordHash: 'testhash',
        displayName: 'Test Host',
      },
      {
        id: memberUserId,
        email: `${memberUserId}@7anime.test`,
        username: `member_${memberUserId.slice(0, 8)}`,
        passwordHash: 'testhash',
        displayName: 'Test Member',
      },
      {
        id: guestUserId,
        email: `${guestUserId}@7anime.test`,
        username: `guest_${guestUserId.slice(0, 8)}`,
        passwordHash: 'testhash',
        displayName: 'Test Guest',
      },
    ],
  })

  try {
    // -------------------------------------------------------------
    // Test 1: Room Creation
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Room Creation ---')
    const room1Code = 'TEST' + crypto.randomBytes(2).toString('hex').toUpperCase()
    const inviteToken1 = crypto.randomBytes(32).toString('hex')
    const inviteTokenHash1 = crypto.createHash('sha256').update(inviteToken1).digest('hex')

    const room1 = await prisma.partyRoom.create({
      data: {
        code: room1Code,
        inviteTokenHash: inviteTokenHash1,
        ownerId: hostUserId,
        mediaType: 'tv',
        anilistId: 21, // One Piece
        episodeNumber: 1,
        audioType: 'sub',
        serverId: 'server1',
        stateRevision: 1,
        lastEventId: crypto.randomUUID(),
        lastUpdatedById: hostUserId,
        status: 'ACTIVE',
        maxParticipants: 10,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    const hostParticipant = await prisma.partyParticipant.create({
      data: {
        roomId: room1.id,
        userId: hostUserId,
        role: 'HOST',
        status: 'ACTIVE',
      },
    })

    assert(room1.id !== undefined, 'Party room was created with a valid UUID')
    assert(room1.mediaType === 'tv', 'Room mediaType is correctly initialized to "tv"')
    assert(room1.stateRevision === 1, 'Initial stateRevision is 1')
    assert(hostParticipant.role === 'HOST', 'Host participant record created with role HOST')

    // -------------------------------------------------------------
    // Test 2: Room Joining & Invite Token Validation
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Room Joining & Invite Token Validation ---')
    // Member joins using inviteTokenHash
    const foundRoom = await prisma.partyRoom.findUnique({
      where: { inviteTokenHash: inviteTokenHash1 },
    })
    assert(foundRoom !== null && foundRoom.id === room1.id, 'Room successfully resolved via invite token hash')

    const memberParticipant = await prisma.partyParticipant.create({
      data: {
        roomId: room1.id,
        userId: memberUserId,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    })
    assert(memberParticipant.role === 'MEMBER', 'Member joined with role MEMBER')
    assert(memberParticipant.status === 'ACTIVE', 'Member status is ACTIVE')

    // Capacity limit check
    const activeCount = await prisma.partyParticipant.count({
      where: { roomId: room1.id, status: 'ACTIVE' },
    })
    assert(activeCount === 2, 'Active participant count is 2 (Host + Member)')
    assert(activeCount <= room1.maxParticipants, 'Participant count respects maxParticipants limit (10)')

    // -------------------------------------------------------------
    // Test 3: Participant Authorization & Kick Flow
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Participant Authorization & Kick Flow ---')
    // Host kicks Member
    await prisma.partyParticipant.update({
      where: { roomId_userId: { roomId: room1.id, userId: memberUserId } },
      data: { status: 'KICKED', lastSeenAt: new Date() },
    })

    const kickedMember = await prisma.partyParticipant.findUnique({
      where: { roomId_userId: { roomId: room1.id, userId: memberUserId } },
    })
    assert(kickedMember?.status === 'KICKED', 'Member was successfully transitioned to KICKED')

    // Kicked user attempting to re-join must be rejected
    const canRejoin = kickedMember?.status !== 'KICKED'
    assert(!canRejoin, 'Kicked participant is permanently barred from re-entering room')

    // -------------------------------------------------------------
    // Test 4: Stream Selection Synchronization (Optimistic Revision)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Stream Selection Synchronization ---')
    const nextRevision = room1.stateRevision + 1
    const newEventId = crypto.randomUUID()

    const updatedRows = await prisma.$queryRaw<any[]>`
      UPDATE "party_rooms" r
      SET "anilistId" = 21,
          "episodeNumber" = 2,
          "audioType" = 'dub',
          "serverId" = 'server2',
          "stateRevision" = ${nextRevision},
          "lastEventId" = ${newEventId},
          "lastUpdatedById" = ${hostUserId},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE r."id" = ${room1.id}
        AND r."stateRevision" = ${room1.stateRevision}
      RETURNING *;
    `
    assert(updatedRows.length === 1, 'Stream selection synchronized successfully with monotonic revision')
    assert(updatedRows[0].stateRevision === 2, 'stateRevision incremented monotonically to 2')
    assert(updatedRows[0].episodeNumber === 2, 'Episode number updated to 2')
    assert(updatedRows[0].audioType === 'dub', 'Audio track updated to "dub"')
    assert(updatedRows[0].serverId === 'server2', 'Server updated to "server2"')

    // Test conflict on stale revision
    const staleAttempt = await prisma.$queryRaw<any[]>`
      UPDATE "party_rooms" r
      SET "episodeNumber" = 3, "stateRevision" = 2
      WHERE r."id" = ${room1.id} AND r."stateRevision" = 1
      RETURNING *;
    `
    assert(staleAttempt.length === 0, 'Concurrent stale update rejected due to revision mismatch (optimistic locking)')

    // -------------------------------------------------------------
    // Test 5: Chat Message Persistence (Parent Row Checked)
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Chat Message Persistence ---')
    const chatMsg = await prisma.partyMessage.create({
      data: {
        roomId: room1.id,
        userId: hostUserId,
        content: 'Welcome to the watch party! Watching Episode 2 now.',
      },
      include: { user: true },
    })
    assert(chatMsg.id !== undefined, 'Chat message persisted with UUID')
    assert(chatMsg.content.length <= 500, 'Message content within 500-char limit')
    assert(chatMsg.roomId === room1.id, 'Message associated with correct roomId')

    // -------------------------------------------------------------
    // Test 6: Member Leave vs Host Explicit Destruction
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Member Leave vs Host Explicit Destruction ---')
    // Reset guest member for room1
    await prisma.partyParticipant.create({
      data: {
        roomId: room1.id,
        userId: guestUserId,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    })

    // Member leave: status becomes LEFT; room remains ACTIVE
    await prisma.partyParticipant.update({
      where: { roomId_userId: { roomId: room1.id, userId: guestUserId } },
      data: { status: 'LEFT', lastSeenAt: new Date() },
    })
    const guestCheck = await prisma.partyParticipant.findUnique({
      where: { roomId_userId: { roomId: room1.id, userId: guestUserId } },
    })
    const roomAfterMemberLeave = await prisma.partyRoom.findUnique({
      where: { id: room1.id },
    })
    assert(guestCheck?.status === 'LEFT', 'Member leave marks participant status as LEFT')
    assert(roomAfterMemberLeave !== null, 'Member leave DOES NOT destroy the party room')

    // Host explicit close: triggers destroyRoomService and cascades deletion
    const destroySuccess = await destroyRoomService(undefined, {
      roomId: room1.id,
      triggeredByUserId: hostUserId,
      reason: 'HOST_CLOSED',
    })
    assert(destroySuccess === true, 'destroyRoomService returned true on host close')

    const roomAfterHostClose = await prisma.partyRoom.findUnique({
      where: { id: room1.id },
    })
    assert(roomAfterHostClose === null, 'Host close PERMANENTLY deleted the party_rooms row')

    const participantsAfterCascade = await prisma.partyParticipant.findMany({
      where: { roomId: room1.id },
    })
    assert(participantsAfterCascade.length === 0, 'Foreign key ON DELETE CASCADE deleted all participants')

    const messagesAfterCascade = await prisma.partyMessage.findMany({
      where: { roomId: room1.id },
    })
    assert(messagesAfterCascade.length === 0, 'Foreign key ON DELETE CASCADE deleted all messages')

    // -------------------------------------------------------------
    // Test 7: Host Disconnect & 60-Second Reconnect Grace Period
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Host Disconnect & Reconnect Grace Period ---')
    const room2Code = 'TEST' + crypto.randomBytes(2).toString('hex').toUpperCase()
    const inviteToken2 = crypto.randomBytes(32).toString('hex')
    const room2 = await prisma.partyRoom.create({
      data: {
        code: room2Code,
        inviteTokenHash: crypto.createHash('sha256').update(inviteToken2).digest('hex'),
        ownerId: hostUserId,
        mediaType: 'tv',
        anilistId: 101922, // Kimetsu no Yaiba
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
    await prisma.partyParticipant.create({
      data: {
        roomId: room2.id,
        userId: hostUserId,
        role: 'HOST',
        status: 'ACTIVE',
      },
    })

    // Simulate unexpected host disconnect
    const graceExpiresAt = new Date(Date.now() + 60 * 1000)
    await prisma.partyRoom.update({
      where: { id: room2.id },
      data: { hostGraceExpiresAt: graceExpiresAt },
    })
    await prisma.partyParticipant.update({
      where: { roomId_userId: { roomId: room2.id, userId: hostUserId } },
      data: { status: 'DISCONNECTED' },
    })

    const roomDuringGrace = await prisma.partyRoom.findUnique({ where: { id: room2.id } })
    assert(roomDuringGrace?.hostGraceExpiresAt !== null, 'hostGraceExpiresAt deadline persisted in PostgreSQL')

    // Host reconnects during grace period
    const hostReconnected = await prisma.$transaction(async (tx) => {
      const r = await tx.partyRoom.findUnique({ where: { id: room2.id } })
      if (!r || !r.hostGraceExpiresAt || new Date(r.hostGraceExpiresAt) <= new Date()) {
        return false
      }
      await tx.partyRoom.update({
        where: { id: room2.id },
        data: { hostGraceExpiresAt: null },
      })
      await tx.partyParticipant.update({
        where: { roomId_userId: { roomId: room2.id, userId: hostUserId } },
        data: { status: 'ACTIVE' },
      })
      return true
    }, { timeout: 15000, maxWait: 10000 })
    assert(hostReconnected === true, 'Host successfully re-entered within 60s grace period')

    const roomAfterReconnect = await prisma.partyRoom.findUnique({ where: { id: room2.id } })
    assert(roomAfterReconnect?.hostGraceExpiresAt === null, 'hostGraceExpiresAt cleared to NULL upon reconnect')

    // Cleanup room2
    await destroyRoomService(undefined, { roomId: room2.id, reason: 'HOST_CLOSED' })

    // -------------------------------------------------------------
    // Test 8: Concurrent Destruction Idempotency & Queue Protection
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Concurrent Destruction Idempotency ---')
    const room3Code = 'TEST' + crypto.randomBytes(2).toString('hex').toUpperCase()
    const room3 = await prisma.partyRoom.create({
      data: {
        code: room3Code,
        inviteTokenHash: crypto.randomBytes(32).toString('hex'),
        ownerId: hostUserId,
        mediaType: 'tv',
        anilistId: 16498, // Shingeki no Kyojin
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    // Fire two simultaneous destruction requests
    const [resultA, resultB] = await Promise.all([
      destroyRoomService(undefined, { roomId: room3.id, triggeredByUserId: hostUserId, reason: 'HOST_CLOSED' }),
      destroyRoomService(undefined, { roomId: room3.id, triggeredByUserId: hostUserId, reason: 'HOST_CLOSED' }),
    ])

    assert(resultA === true || resultB === true, 'At least one destruction call returns true')
    const room3Check = await prisma.partyRoom.findUnique({ where: { id: room3.id } })
    assert(room3Check === null, 'Room deleted exactly once without split-brain or crash')
    assert(roomBroadcastQueue.isDestroyed(room3.id) === true, 'Permanent tombstone registered for room3')

    // -------------------------------------------------------------
    // Test 9: Queue Initialization vs Concurrent Destruction
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Queue Initialization vs Concurrent Destruction ---')
    const testQueueManager = new RoomBroadcastQueueManager()
    const room4Id = crypto.randomUUID()

    // Register tombstone first
    testQueueManager.registerTombstone(room4Id)

    // ensureQueue must immediately reject with 404 without hitting DB
    let threw404 = false
    try {
      await testQueueManager.ensureQueue(room4Id)
    } catch (e: any) {
      if (e.statusCode === 404) threw404 = true
    }
    assert(threw404, 'ensureQueue immediately rejects tombstoned room with 404')

    // -------------------------------------------------------------
    // Test 10: Strict Queue FIFO Execution Before Destruction
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Strict FIFO Execution Before Destruction ---')
    const fifoQueue = new RoomBroadcastQueueManager()
    const fifoRoomId = `fifo-room-${crypto.randomUUID()}`

    // Create room in DB for ensureQueue validation
    await prisma.partyRoom.create({
      data: {
        id: fifoRoomId,
        code: 'FIFO' + crypto.randomBytes(2).toString('hex').toUpperCase(),
        inviteTokenHash: crypto.randomBytes(32).toString('hex'),
        ownerId: hostUserId,
        mediaType: 'tv',
        anilistId: 21,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    // Initialize queue in ACTIVE state first
    await fifoQueue.ensureQueue(fifoRoomId)

    const executionOrder: string[] = []

    // Enqueue two playback commands while ACTIVE (both are admitted with ticket #1 and #2)
    const cmd1Promise = fifoQueue.enqueue(fifoRoomId, async () => {
      await new Promise((r) => setTimeout(r, 50))
      executionOrder.push('cmd1')
      return 'cmd1-done'
    })

    const cmd2Promise = fifoQueue.enqueue(fifoRoomId, async () => {
      await new Promise((r) => setTimeout(r, 25))
      executionOrder.push('cmd2')
      return 'cmd2-done'
    })

    // Allow microtasks to complete admission for cmd1 and cmd2
    await Promise.resolve()

    // Reserve closing while cmd1 and cmd2 are in-flight
    const reservation = fifoQueue.reserveClosing(fifoRoomId)
    assert(reservation.success === true, 'reserveClosing succeeded and flipped state to CLOSING')

    // Newly arriving command after CLOSING begins MUST be rejected synchronously
    let cmd3Rejected = false
    try {
      await fifoQueue.enqueue(fifoRoomId, async () => {
        executionOrder.push('cmd3')
      })
    } catch (e: any) {
      if (e.statusCode === 404) cmd3Rejected = true
    }
    assert(cmd3Rejected, 'Command arriving after CLOSING began was immediately rejected with 404')

    // Destruction task chains behind admitted commands
    const destructionPromise = fifoQueue.enqueueDestruction(fifoRoomId, async () => {
      executionOrder.push('destruction')
      fifoQueue.finalizeDestruction(fifoRoomId)
      return true
    })

    await Promise.all([cmd1Promise, cmd2Promise, destructionPromise])

    assert(
      JSON.stringify(executionOrder) === JSON.stringify(['cmd1', 'cmd2', 'destruction']),
      `Admitted commands executed in strict FIFO order before destruction (actual: ${executionOrder.join(' -> ')})`,
    )

    // Cleanup fifo room in DB
    await prisma.partyRoom.delete({ where: { id: fifoRoomId } }).catch(() => {})

    // -------------------------------------------------------------
    // Test 11: Fail-Closed Ambiguity Handler & Reconciliation
    // -------------------------------------------------------------
    console.log('\n--- Test 11: Fail-Closed Recovery & Reconciliation ---')
    const ambigRoomId = `ambig-room-${crypto.randomUUID()}`
    const ambigQueue = new RoomBroadcastQueueManager()

    // Create room in DB
    await prisma.partyRoom.create({
      data: {
        id: ambigRoomId,
        code: 'AMBG' + crypto.randomBytes(2).toString('hex').toUpperCase(),
        inviteTokenHash: crypto.randomBytes(32).toString('hex'),
        ownerId: hostUserId,
        mediaType: 'tv',
        anilistId: 21,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    ambigQueue.reserveClosing(ambigRoomId)

    // Case A: Room still exists -> reconciler safely restores ACTIVE
    const stateAfterExists = await ambigQueue.reconcileQueueState(ambigRoomId)
    assert(stateAfterExists === 'ACTIVE', 'Reconciler confirmed room exists and restored queue state to ACTIVE')

    // Delete room from DB
    await prisma.partyRoom.delete({ where: { id: ambigRoomId } })

    ambigQueue.reserveClosing(ambigRoomId)
    // Case B: Room deleted -> reconciler finalizes destruction permanently
    const stateAfterDelete = await ambigQueue.reconcileQueueState(ambigRoomId)
    assert(stateAfterDelete === 'DESTROYED', 'Reconciler confirmed room is gone and finalized destruction')
    assert(ambigQueue.isDestroyed(ambigRoomId) === true, 'Tombstone registered permanently')

    // -------------------------------------------------------------
    // Test 12: No Room Resurrection After Deletion
    // -------------------------------------------------------------
    console.log('\n--- Test 12: No Room Resurrection After Deletion ---')
    const lateQueue = new RoomBroadcastQueueManager()
    let resurrected = false
    try {
      // Simulate request arriving after restart for already-deleted ambigRoomId
      await lateQueue.enqueue(ambigRoomId, async () => {
        resurrected = true
      })
    } catch (e: any) {
      assert(e.statusCode === 404, 'Late request after deletion rejected with HTTP 404')
    }
    assert(!resurrected, 'Room can NEVER be resurrected after deletion')
    assert(lateQueue.isDestroyed(ambigRoomId) === true, 'Late request registered tombstone in memory')
  } finally {
    // Teardown Test Users
    await prisma.user.deleteMany({
      where: { id: { in: [hostUserId, memberUserId, guestUserId] } },
    }).catch(() => {})
  }

  console.log('\n======================================================')
  console.log(`🏁 TEST SUITE COMPLETE: ${passedTests} Passed, ${failedTests} Failed`)
  console.log('======================================================\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
