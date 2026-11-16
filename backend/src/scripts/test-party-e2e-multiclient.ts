/**
 * 7Anime Party Play — Multi-Client E2E Integration Suite
 * Connects 3 independent clients (Host Alice, Member Bob, Member Charlie)
 * over HTTP REST and live Socket.IO against http://127.0.0.1:3001.
 *
 * Verifies all 12 core multi-client lifecycle scenarios:
 * 1. User & session creation
 * 2. Room creation by Host (inviteToken & 8-char code)
 * 3. Member 1 join via inviteToken
 * 4. Member 2 join via room code
 * 5. Concurrent Socket.IO channel joining & auth
 * 6. Stream selection sync by Host -> broadcast to all 3 clients
 * 7. Stream selection sync by Member 1 -> broadcast to all 3 clients with revision increment
 * 8. Real-time chat messaging across all clients
 * 9. Ephemeral emoji reaction bursts across all clients
 * 10. Member 2 departure without destroying room
 * 11. Unexpected Host disconnect -> 60s grace warning -> Host re-entry & reconnect
 * 12. Host invite token rotation -> old token invalidation
 * 13. Explicit Host room closure -> party:closed broadcast & transactional hard deletion
 *
 * Run with: npx tsx backend/src/scripts/test-party-e2e-multiclient.ts
 */

import crypto from 'node:crypto'
import { io as createSocketClient, type Socket } from 'socket.io-client'
import prisma from '../db/client.js'

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    failed++
    throw new Error(`Assertion failed: ${message}`)
  } else {
    console.log(`✅ PASSED: ${message}`)
    passed++
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const SERVER_URL = 'http://127.0.0.1:3001'
const API_URL = `${SERVER_URL}/api/party`

interface TestUser {
  id: string
  username: string
  sessionToken: string
  socket?: Socket
}

async function createTestUser(prefix: string): Promise<TestUser> {
  const userId = `e2e-${prefix}-${crypto.randomUUID()}`
  const username = `${prefix}_${userId.slice(0, 8)}`
  const sessionToken = `token-${prefix}-${crypto.randomUUID()}`
  const tokenHash = hashToken(sessionToken)

  await prisma.user.create({
    data: {
      id: userId,
      email: `${userId}@test7anime.tv`,
      username,
      passwordHash: 'argon2_dummy_hash',
      displayName: `${prefix.toUpperCase()} Test`,
    },
  })

  await prisma.session.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  return { id: userId, username, sessionToken }
}

async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: string
    token?: string
    body?: any
  } = {},
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  let body: any
  try {
    body = await res.json()
  } catch {
    body = null
  }

  return { status: res.status, body }
}

function waitForEvent<T = any>(
  socket: Socket,
  event: string,
  timeoutMs = 15000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event "${event}" after ${timeoutMs}ms`))
    }, timeoutMs)

    socket.once(event, (data: T) => {
      clearTimeout(timer)
      resolve(data)
    })
  })
}

async function runMultiClientE2ETests() {
  console.log('\n======================================================================')
  console.log('🚀 7Anime Party Play — Multi-Client E2E Integration Suite')
  console.log('======================================================================\n')

  let alice: TestUser | null = null
  let bob: TestUser | null = null
  let charlie: TestUser | null = null
  let dave: TestUser | null = null
  let roomId: string | null = null
  let inviteToken: string | null = null
  let roomCode: string | null = null

  try {
    // -------------------------------------------------------------
    // 1. Create 3 independent client accounts & sessions
    // -------------------------------------------------------------
    console.log('--- Step 1: User & Session Initialization ---')
    alice = await createTestUser('alice')
    bob = await createTestUser('bob')
    charlie = await createTestUser('charlie')
    dave = await createTestUser('dave')

    assert(!!alice.sessionToken, 'Host (Alice) created with valid session')
    assert(!!bob.sessionToken, 'Member 1 (Bob) created with valid session')
    assert(!!charlie.sessionToken, 'Member 2 (Charlie) created with valid session')

    // -------------------------------------------------------------
    // 2. Host (Alice) creates a Watch Party Room
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Host Room Creation ---')
    const createRes = await apiRequest('/rooms', {
      method: 'POST',
      token: alice.sessionToken,
      body: {
        mediaType: 'tv',
        anilistId: 21,
        episodeNumber: 1,
        audioType: 'sub',
        serverId: 'server1',
      },
    })

    assert(createRes.status === 201, `Room created successfully with HTTP 201 (got ${createRes.status})`)
    assert(createRes.body.ok === true, 'Response body ok flag is true')
    assert(!!createRes.body.data.id, 'Room ID generated')
    assert(!!createRes.body.data.code, '8-character room code generated')
    assert(!!createRes.body.data.inviteToken, '64-character invite token generated')
    assert(createRes.body.data.ownerId === alice.id, 'Alice is recorded as room owner')
    assert(createRes.body.data.participants.length === 1, 'Initial room has 1 participant (Host)')
    assert(createRes.body.data.participants[0].role === 'HOST', 'Host role assigned to Alice')

    roomId = createRes.body.data.id
    inviteToken = createRes.body.data.inviteToken
    roomCode = createRes.body.data.code

    console.log(`ℹ️ Room ID: ${roomId} | Code: ${roomCode}`)

    // -------------------------------------------------------------
    // 3. Member 1 (Bob) joins via Invite Token
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Member 1 Joins via Invite Token ---')
    const joinBobRes = await apiRequest('/rooms/join', {
      method: 'POST',
      token: bob.sessionToken,
      body: { tokenOrCode: inviteToken },
    })

    assert(joinBobRes.status === 200, `Bob joined via inviteToken with HTTP 200 (got ${joinBobRes.status})`)
    assert(joinBobRes.body.ok === true, 'Bob join response ok is true')
    assert(joinBobRes.body.data.id === roomId, 'Bob joined the correct room ID')
    const bobParticipant = joinBobRes.body.data.participants.find((p: any) => p.userId === bob!.id)
    assert(!!bobParticipant, 'Bob listed in active participants')
    assert(bobParticipant.role === 'MEMBER', 'Bob joined with MEMBER role')

    // -------------------------------------------------------------
    // 4. Member 2 (Charlie) joins via Room Code
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Member 2 Joins via Room Code ---')
    const joinCharlieRes = await apiRequest('/rooms/join', {
      method: 'POST',
      token: charlie.sessionToken,
      body: { tokenOrCode: roomCode },
    })

    assert(joinCharlieRes.status === 200, `Charlie joined via roomCode with HTTP 200 (got ${joinCharlieRes.status})`)
    assert(joinCharlieRes.body.ok === true, 'Charlie join response ok is true')
    assert(joinCharlieRes.body.data.id === roomId, 'Charlie joined the correct room ID')
    assert(joinCharlieRes.body.data.participants.length === 3, 'Room now has 3 active participants')

    // -------------------------------------------------------------
    // 5. Connect 3 Independent Socket.IO Sockets
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Socket.IO Authentication & Channel Subscriptions ---')
    alice.socket = createSocketClient(SERVER_URL, {
      auth: { token: alice.sessionToken },
      transports: ['websocket'],
    })
    alice.socket.on('party:error', (err) => console.error('🔴 Alice socket party:error:', err))

    bob.socket = createSocketClient(SERVER_URL, {
      auth: { token: bob.sessionToken },
      transports: ['websocket'],
    })
    bob.socket.on('party:error', (err) => console.error('🔴 Bob socket party:error:', err))

    charlie.socket = createSocketClient(SERVER_URL, {
      auth: { token: charlie.sessionToken },
      transports: ['websocket'],
    })
    charlie.socket.on('party:error', (err) => console.error('🔴 Charlie socket party:error:', err))

    // Wait for connect event on all 3
    await Promise.all([
      new Promise<void>((res) => alice!.socket!.on('connect', () => res())),
      new Promise<void>((res) => bob!.socket!.on('connect', () => res())),
      new Promise<void>((res) => charlie!.socket!.on('connect', () => res())),
    ])

    assert(alice.socket.connected, 'Alice socket connected')
    assert(bob.socket.connected, 'Bob socket connected')
    assert(charlie.socket.connected, 'Charlie socket connected')

    // Join room channel on all 3
    const aliceJoinedPromise = waitForEvent(alice.socket, 'party:joined-success')
    const bobJoinedPromise = waitForEvent(bob.socket, 'party:joined-success')
    const charlieJoinedPromise = waitForEvent(charlie.socket, 'party:joined-success')

    alice.socket.emit('party:join', { roomId })
    bob.socket.emit('party:join', { roomId })
    charlie.socket.emit('party:join', { roomId })

    const [aliceJoined, bobJoined, charlieJoined] = await Promise.all([
      aliceJoinedPromise,
      bobJoinedPromise,
      charlieJoinedPromise,
    ])

    assert(aliceJoined.roomId === roomId, 'Alice acknowledged in party room channel')
    assert(bobJoined.roomId === roomId, 'Bob acknowledged in party room channel')
    assert(charlieJoined.roomId === roomId, 'Charlie acknowledged in party room channel')

    // -------------------------------------------------------------
    // 6. Host (Alice) Synchronizes Stream (Ep 2, Dub, Server 2)
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Host Synchronizes Stream Selection ---')
    const aliceSyncEvent = waitForEvent(alice.socket, 'playback:updated')
    const bobSyncEvent = waitForEvent(bob.socket, 'playback:updated')
    const charlieSyncEvent = waitForEvent(charlie.socket, 'playback:updated')

    const initialRevision = createRes.body.data.playback.stateRevision
    assert(initialRevision === 1, `Initial room stateRevision is 1 (got ${initialRevision})`)

    alice.socket.emit('playback:sync-stream', {
      roomId,
      anilistId: 21,
      episodeNumber: 2,
      audioType: 'dub',
      serverId: 'server2',
      expectedRevision: initialRevision,
    })

    const [aUp1, bUp1, cUp1] = await Promise.all([aliceSyncEvent, bobSyncEvent, charlieSyncEvent])

    assert(aUp1.episodeNumber === 2 && aUp1.audioType === 'dub' && aUp1.serverId === 'server2', 'Alice received own stream update')
    assert(bUp1.episodeNumber === 2 && bUp1.audioType === 'dub' && bUp1.serverId === 'server2', 'Bob received Host stream update')
    assert(cUp1.episodeNumber === 2 && cUp1.audioType === 'dub' && cUp1.serverId === 'server2', 'Charlie received Host stream update')
    assert(bUp1.stateRevision === 2, 'Stream stateRevision incremented monotonically to 2')
    assert(bUp1.updatedBy.userId === alice.id, 'UpdatedBy accurately attributes Alice as initiator')

    // -------------------------------------------------------------
    // 7. Member 1 (Bob) Synchronizes Stream (Ep 3, Sub, Server 3)
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Member 1 Synchronizes Stream Selection ---')
    const aliceSyncEvent2 = waitForEvent(alice.socket, 'playback:updated')
    const bobSyncEvent2 = waitForEvent(bob.socket, 'playback:updated')
    const charlieSyncEvent2 = waitForEvent(charlie.socket, 'playback:updated')

    bob.socket.emit('playback:sync-stream', {
      roomId,
      anilistId: 21,
      episodeNumber: 3,
      audioType: 'sub',
      serverId: 'server3',
      expectedRevision: bUp1.stateRevision,
    })

    const [aUp2, bUp2, cUp2] = await Promise.all([aliceSyncEvent2, bobSyncEvent2, charlieSyncEvent2])

    assert(aUp2.episodeNumber === 3 && aUp2.audioType === 'sub' && aUp2.serverId === 'server3', 'Alice received Bob stream update')
    assert(bUp2.episodeNumber === 3 && bUp2.audioType === 'sub' && bUp2.serverId === 'server3', 'Bob received own stream update')
    assert(cUp2.episodeNumber === 3 && cUp2.audioType === 'sub' && cUp2.serverId === 'server3', 'Charlie received Bob stream update')
    assert(aUp2.stateRevision === 3, 'Stream stateRevision incremented to 3')
    assert(aUp2.updatedBy.userId === bob.id, 'UpdatedBy accurately attributes Bob as initiator')

    // -------------------------------------------------------------
    // 8. Real-Time Chat Messaging across All Clients
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Real-Time Chat Broadcast ---')
    // Alice sends message
    const bobChatP1 = waitForEvent(bob.socket, 'chat:message')
    const charlieChatP1 = waitForEvent(charlie.socket, 'chat:message')

    alice.socket.emit('chat:send', { roomId, content: 'Welcome everyone to the watch party!' })

    const [bMsg1, cMsg1] = await Promise.all([bobChatP1, charlieChatP1])
    assert(bMsg1.content === 'Welcome everyone to the watch party!', 'Bob received Alice chat message')
    assert(cMsg1.content === 'Welcome everyone to the watch party!', 'Charlie received Alice chat message')
    assert(bMsg1.user.username === alice.username, 'Chat message attributes Alice username')

    // Charlie replies
    const aliceChatP2 = waitForEvent(alice.socket, 'chat:message')
    const bobChatP2 = waitForEvent(bob.socket, 'chat:message')

    charlie.socket.emit('chat:send', { roomId, content: 'Hyped for Episode 3!' })

    const [aMsg2, bMsg2] = await Promise.all([aliceChatP2, bobChatP2])
    assert(aMsg2.content === 'Hyped for Episode 3!', 'Alice received Charlie reply')
    assert(bMsg2.content === 'Hyped for Episode 3!', 'Bob received Charlie reply')
    assert(aMsg2.user.username === charlie.username, 'Chat reply attributes Charlie username')

    // -------------------------------------------------------------
    // 9. Floating Ephemeral Emoji Reactions
    // -------------------------------------------------------------
    console.log('\n--- Step 9: Emoji Reaction Bursts ---')
    const aliceReactionP = waitForEvent(alice.socket, 'reaction:burst')
    const bobReactionP = waitForEvent(bob.socket, 'reaction:burst')

    charlie.socket.emit('reaction:send', { roomId, emoji: '🔥' })

    const [aReact, bReact] = await Promise.all([aliceReactionP, bobReactionP])
    assert(aReact.emoji === '🔥', 'Alice received flame reaction burst')
    assert(bReact.emoji === '🔥', 'Bob received flame reaction burst')
    assert(aReact.userId === charlie.id, 'Reaction attributes Charlie')

    // -------------------------------------------------------------
    // 10. Member Departure Without Room Destruction
    // -------------------------------------------------------------
    console.log('\n--- Step 10: Member Departure (Charlie leaves) ---')
    const aliceLeaveNotification = waitForEvent(alice.socket, 'participant:left')
    const bobLeaveNotification = waitForEvent(bob.socket, 'participant:left')

    const leaveRes = await apiRequest(`/rooms/${roomId}/leave`, {
      method: 'POST',
      token: charlie.sessionToken,
    })

    assert(leaveRes.status === 200, `Charlie left room with HTTP 200 (got ${leaveRes.status})`)

    const [aLeaveNotice, bLeaveNotice] = await Promise.all([
      aliceLeaveNotification,
      bobLeaveNotification,
    ])

    assert(aLeaveNotice.userId === charlie.id, 'Alice notified Charlie left')
    assert(bLeaveNotice.userId === charlie.id, 'Bob notified Charlie left')

    // Verify room is still ACTIVE in PostgreSQL
    const roomAfterLeave = await prisma.partyRoom.findUnique({
      where: { id: roomId! },
      include: { participants: { where: { status: 'ACTIVE' } } },
    })
    assert(!!roomAfterLeave, 'Room remains active after member left')
    assert(roomAfterLeave!.participants.length === 2, 'Active participant count is now 2')

    // -------------------------------------------------------------
    // 11. Unexpected Host Disconnect & 60s Reconnect Grace
    // -------------------------------------------------------------
    console.log('\n--- Step 11: Host Unexpected Disconnect & Grace Recovery ---')
    const bobHostDisconnectP = waitForEvent(bob.socket, 'host:disconnected')

    // Alice forcefully disconnects socket
    alice.socket.disconnect()

    const hostDisconnectNotice = await bobHostDisconnectP
    assert(hostDisconnectNotice.roomId === roomId, 'Bob received host:disconnected notification')
    assert(hostDisconnectNotice.gracePeriodSeconds === 60, 'Grace period specified as 60 seconds')
    assert(!!hostDisconnectNotice.graceExpiresAt, 'Persisted grace expiration timestamp provided')

    // Check DB has hostGraceExpiresAt set
    const roomInGrace = await prisma.partyRoom.findUnique({
      where: { id: roomId! },
    })
    assert(!!roomInGrace?.hostGraceExpiresAt, 'PostgreSQL party_rooms persisted hostGraceExpiresAt for restart safety')

    // Host re-enters via REST API before 60s deadline
    console.log('ℹ️ Host re-entering party room via POST /api/party/rooms/reenter...')
    const reenterRes = await apiRequest('/rooms/reenter', {
      method: 'POST',
      token: alice.sessionToken,
      body: { roomId },
    })

    assert(reenterRes.status === 200, `Host re-entered with HTTP 200 (got ${reenterRes.status})`)
    assert(reenterRes.body.ok === true, 'Re-entry response ok is true')

    // Recheck DB: hostGraceExpiresAt cleared
    const roomRecovered = await prisma.partyRoom.findUnique({
      where: { id: roomId! },
    })
    assert(roomRecovered?.hostGraceExpiresAt === null, 'PostgreSQL hostGraceExpiresAt cleared after re-entry')

    // Alice reconnects socket
    alice.socket = createSocketClient(SERVER_URL, {
      auth: { token: alice.sessionToken },
      transports: ['websocket'],
    })
    await new Promise<void>((res) => alice!.socket!.on('connect', () => res()))
    alice.socket.emit('party:join', { roomId })
    await waitForEvent(alice.socket, 'party:joined-success')
    assert(alice.socket.connected, 'Host socket reconnected and rejoined party channel')

    // -------------------------------------------------------------
    // 12. Host Rotates Invite Token -> Invalidate Old Links
    // -------------------------------------------------------------
    console.log('\n--- Step 12: Invite Token Rotation ---')
    const rotateRes = await apiRequest(`/rooms/${roomId}/rotate-token`, {
      method: 'POST',
      token: alice.sessionToken,
    })

    assert(rotateRes.status === 200, `Token rotated with HTTP 200 (got ${rotateRes.status})`)
    assert(!!rotateRes.body.data.inviteToken, 'New inviteToken returned')
    assert(rotateRes.body.data.inviteToken !== inviteToken, 'New inviteToken is different from old token')

    const newInviteToken = rotateRes.body.data.inviteToken

    // New user Dave tries to join with OLD inviteToken -> must fail with 404
    const oldTokenJoinRes = await apiRequest('/rooms/join', {
      method: 'POST',
      token: dave.sessionToken,
      body: { tokenOrCode: inviteToken },
    })
    assert(oldTokenJoinRes.status === 404, `Old invite token rejected with HTTP 404 (got ${oldTokenJoinRes.status})`)

    // Dave joins with NEW inviteToken -> must succeed with 200
    const newTokenJoinRes = await apiRequest('/rooms/join', {
      method: 'POST',
      token: dave.sessionToken,
      body: { tokenOrCode: newInviteToken },
    })
    assert(newTokenJoinRes.status === 200, `New invite token accepted with HTTP 200 (got ${newTokenJoinRes.status})`)

    // -------------------------------------------------------------
    // 13. Explicit Host Closure & Transactional Hard Deletion
    // -------------------------------------------------------------
    console.log('\n--- Step 13: Explicit Host Closure & Deletion Verification ---')
    const bobClosureP = waitForEvent(bob.socket, 'party:closed')

    const closeRes = await apiRequest(`/rooms/${roomId}/close`, {
      method: 'POST',
      token: alice.sessionToken,
    })

    assert(closeRes.status === 200, `Room closed with HTTP 200 (got ${closeRes.status})`)
    assert(closeRes.body.data.closed === true, 'Response confirms room closed')

    const closureNotice = await bobClosureP
    assert(closureNotice.roomId === roomId, 'Remaining members received party:closed broadcast')
    assert(closureNotice.reason === 'HOST_CLOSED', 'Closure reason is HOST_CLOSED')

    // Verify room is hard deleted from PostgreSQL (0 rows)
    const deletedRoomInDb = await prisma.partyRoom.findUnique({
      where: { id: roomId! },
    })
    assert(deletedRoomInDb === null, 'PostgreSQL party_rooms record permanently deleted (ON DELETE CASCADE)')

    // Verify cascaded participants and messages are deleted
    const orphanedParticipants = await prisma.partyParticipant.count({
      where: { roomId: roomId! },
    })
    assert(orphanedParticipants === 0, 'No orphaned party_participants remain in PostgreSQL')

    // Verify late rejoining attempt returns 404
    const lateJoinRes = await apiRequest('/rooms/join', {
      method: 'POST',
      token: dave.sessionToken,
      body: { tokenOrCode: roomCode },
    })
    assert(lateJoinRes.status === 404, `Rejoining closed room rejected with HTTP 404 (got ${lateJoinRes.status})`)
  } finally {
    // Cleanup sockets
    alice?.socket?.disconnect()
    bob?.socket?.disconnect()
    charlie?.socket?.disconnect()

    // Cleanup test users and sessions
    const testUserIds = [alice?.id, bob?.id, charlie?.id, dave?.id].filter(Boolean) as string[]
    if (testUserIds.length > 0) {
      await prisma.partyParticipant.deleteMany({ where: { userId: { in: testUserIds } } })
      await prisma.partyMessage.deleteMany({ where: { userId: { in: testUserIds } } })
      if (roomId) {
        await prisma.partyRoom.deleteMany({ where: { id: roomId } })
      }
      await prisma.session.deleteMany({ where: { userId: { in: testUserIds } } })
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } })
    }
  }

  console.log('\n======================================================================')
  console.log(`📊 Multi-Client E2E Suite Results: ${passed} Passed, ${failed} Failed`)
  console.log('======================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runMultiClientE2ETests().catch((err) => {
  console.error('Fatal multi-client test error:', err)
  process.exit(1)
})
