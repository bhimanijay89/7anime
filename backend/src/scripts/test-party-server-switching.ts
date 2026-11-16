/**
 * 7Anime Party Play — Multi-Server Selection & Synchronization Verification Suite
 * Verifies Server 1 -> 2 -> 3 -> 1 transitions, host and member updates,
 * audio/episode preservation, invalid server rejection, and video embed resolution.
 * Run with: npx tsx backend/src/scripts/test-party-server-switching.ts
 */

import crypto from 'node:crypto'
import { io as createSocketClient, type Socket } from 'socket.io-client'
import prisma from '../db/client.js'
import { resolveVideoEmbedUrl } from '../../../src/services/videoResolver.js'

const SERVER_URL = 'http://localhost:3001'
const API_URL = `${SERVER_URL}/api/party`

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

interface TestUser {
  id: string
  username: string
  sessionToken: string
  socket?: Socket
}

async function createTestUser(role: string): Promise<TestUser> {
  const userId = `test-srv-${role}-${crypto.randomUUID()}`
  const username = `srv_${role}_${userId.slice(-6)}`
  const sessionToken = `sess-srv-${crypto.randomUUID()}`
  const tokenHash = hashToken(sessionToken)

  await prisma.user.create({
    data: {
      id: userId,
      email: `${userId}@test.com`,
      username,
      displayName: `Server Test ${role}`,
      passwordHash: 'test-hash',
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

async function runServerSwitchingTests() {
  console.log('\n======================================================================')
  console.log('🌐 7Anime Party Play — Multi-Server Selection & Sync Test Suite')
  console.log('======================================================================\n')

  let host: TestUser | null = null
  let member: TestUser | null = null
  let outsider: TestUser | null = null
  let roomId: string | null = null
  let roomCode: string | null = null

  try {
    // -------------------------------------------------------------
    // Setup Users
    // -------------------------------------------------------------
    console.log('--- Step 0: Setup Test Users ---')
    host = await createTestUser('host')
    member = await createTestUser('member')
    outsider = await createTestUser('outsider')
    assert(!!host.id && !!member.id, 'Created host and member users in PostgreSQL')

    // -------------------------------------------------------------
    // Step 1: Create Watch Party with Server 1 (Default)
    // -------------------------------------------------------------
    console.log('\n--- Step 1: Create Party Room with Server 1 (0vidads Primary) ---')
    const createRes = await apiRequest('/rooms', {
      method: 'POST',
      token: host.sessionToken,
      body: {
        anilistId: 21, // One Piece
        episodeNumber: 1,
        audioType: 'sub',
        serverId: 'server1',
      },
    })

    assert(createRes.status === 201, `Party room created with HTTP 201 (got ${createRes.status})`)
    roomId = createRes.body.data.id
    roomCode = createRes.body.data.code
    const inviteToken = createRes.body.data.inviteToken
    assert(createRes.body.data.playback.serverId === 'server1', 'Initial serverId is server1')
    assert(createRes.body.data.playback.stateRevision === 1, 'Initial stateRevision is 1')
    assert(createRes.body.data.playback.audioType === 'sub', 'Initial audioType is sub')
    assert(createRes.body.data.playback.episodeNumber === 1, 'Initial episodeNumber is 1')

    // -------------------------------------------------------------
    // Step 2: Member Joins Room
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Member Joins Watch Party ---')
    const joinRes = await apiRequest('/rooms/join', {
      method: 'POST',
      token: member.sessionToken,
      body: { tokenOrCode: inviteToken },
    })

    assert(joinRes.status === 200, `Member joined with HTTP 200 (got ${joinRes.status})`)
    assert(joinRes.body.data.playback.serverId === 'server1', 'Member receives active server1')

    // -------------------------------------------------------------
    // Step 3: Establish Socket.IO Real-time Connections
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Connect Sockets and Join Channel ---')
    host.socket = createSocketClient(SERVER_URL, {
      auth: { token: host.sessionToken },
      transports: ['websocket'],
      reconnection: false,
    })
    member.socket = createSocketClient(SERVER_URL, {
      auth: { token: member.sessionToken },
      transports: ['websocket'],
      reconnection: false,
    })

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        host!.socket!.once('connect', resolve)
        host!.socket!.once('connect_error', reject)
      }),
      new Promise<void>((resolve, reject) => {
        member!.socket!.once('connect', resolve)
        member!.socket!.once('connect_error', reject)
      }),
    ])
    assert(true, 'Host and Member sockets connected to backend')

    const hostJoinPromise = waitForEvent(host.socket, 'party:joined-success')
    const memberJoinPromise = waitForEvent(member.socket, 'party:joined-success')

    host.socket.emit('party:join', { roomId })
    member.socket.emit('party:join', { roomId })

    await Promise.all([hostJoinPromise, memberJoinPromise])
    assert(true, 'Both participants joined party socket room')

    // -------------------------------------------------------------
    // Step 4: Server 1 -> Server 2 (Host Switches to MegaPlay AniList)
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Host Switches Server 1 -> Server 2 (MegaPlay AniList) ---')
    let hostPlaybackPromise = waitForEvent(host.socket, 'playback:updated')
    let memberPlaybackPromise = waitForEvent(member.socket, 'playback:updated')

    host.socket.emit('playback:sync-stream', {
      roomId,
      anilistId: 21,
      episodeNumber: 1,
      audioType: 'sub',
      serverId: 'server2',
      expectedRevision: 1,
    })

    const [hUpdate1, mUpdate1] = await Promise.all([hostPlaybackPromise, memberPlaybackPromise])

    assert(hUpdate1.serverId === 'server2', 'Host received serverId: server2')
    assert(mUpdate1.serverId === 'server2', 'Member received serverId: server2 in real-time')
    assert(hUpdate1.stateRevision === 2, 'stateRevision incremented to 2')
    assert(mUpdate1.stateRevision === 2, 'Member sees stateRevision: 2')
    assert(hUpdate1.updatedBy.userId === host.id, 'updatedBy reflects Host')
    assert(hUpdate1.episodeNumber === 1, 'Episode 1 preserved')
    assert(hUpdate1.audioType === 'sub', 'Audio sub preserved')

    // Verify DB state
    const dbRoom1 = await prisma.partyRoom.findUnique({ where: { id: roomId! } })
    assert(dbRoom1?.serverId === 'server2', 'PostgreSQL party_rooms persisted serverId = server2')
    assert(dbRoom1?.stateRevision === 2, 'PostgreSQL party_rooms persisted stateRevision = 2')

    // -------------------------------------------------------------
    // Step 5: Server 2 -> Server 3 (Host Switches to MegaPlay MAL)
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Host Switches Server 2 -> Server 3 (MegaPlay MAL) ---')
    hostPlaybackPromise = waitForEvent(host.socket, 'playback:updated')
    memberPlaybackPromise = waitForEvent(member.socket, 'playback:updated')

    host.socket.emit('playback:sync-stream', {
      roomId,
      anilistId: 21,
      episodeNumber: 1,
      audioType: 'sub',
      serverId: 'server3',
      expectedRevision: 2,
    })

    const [hUpdate2, mUpdate2] = await Promise.all([hostPlaybackPromise, memberPlaybackPromise])

    assert(hUpdate2.serverId === 'server3', 'Host received serverId: server3')
    assert(mUpdate2.serverId === 'server3', 'Member received serverId: server3 in real-time')
    assert(hUpdate2.stateRevision === 3, 'stateRevision incremented to 3')
    assert(mUpdate2.stateRevision === 3, 'Member sees stateRevision: 3')

    const dbRoom2 = await prisma.partyRoom.findUnique({ where: { id: roomId! } })
    assert(dbRoom2?.serverId === 'server3', 'PostgreSQL party_rooms persisted serverId = server3')
    assert(dbRoom2?.stateRevision === 3, 'PostgreSQL party_rooms persisted stateRevision = 3')

    // -------------------------------------------------------------
    // Step 6: Server 3 -> Server 1 (Member Switches back to Server 1)
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Member Switches Server 3 -> Server 1 (0vidads Primary) ---')
    hostPlaybackPromise = waitForEvent(host.socket, 'playback:updated')
    memberPlaybackPromise = waitForEvent(member.socket, 'playback:updated')

    member.socket.emit('playback:sync-stream', {
      roomId,
      anilistId: 21,
      episodeNumber: 1,
      audioType: 'sub',
      serverId: 'server1',
      expectedRevision: 3,
    })

    const [hUpdate3, mUpdate3] = await Promise.all([hostPlaybackPromise, memberPlaybackPromise])

    assert(mUpdate3.serverId === 'server1', 'Member successfully switched back to server1')
    assert(hUpdate3.serverId === 'server1', 'Host received member server change to server1')
    assert(mUpdate3.stateRevision === 4, 'stateRevision incremented to 4')
    assert(hUpdate3.updatedBy.userId === member.id, 'updatedBy accurately shows Member userId')

    const dbRoom3 = await prisma.partyRoom.findUnique({ where: { id: roomId! } })
    assert(dbRoom3?.serverId === 'server1', 'PostgreSQL party_rooms persisted serverId = server1')
    assert(dbRoom3?.stateRevision === 4, 'PostgreSQL party_rooms persisted stateRevision = 4')

    // -------------------------------------------------------------
    // Step 7: Episode and Audio Preservation Across Server Changes
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Preservation of Episode and Audio across Server Changes ---')
    // First, sync to Episode 12 with audio: 'dub' on Server 1
    hostPlaybackPromise = waitForEvent(host.socket, 'playback:updated')
    memberPlaybackPromise = waitForEvent(member.socket, 'playback:updated')

    member.socket.emit('playback:sync-stream', {
      roomId,
      anilistId: 21,
      episodeNumber: 12,
      audioType: 'dub',
      serverId: 'server1',
      expectedRevision: 4,
    })

    const [, mEpChange] = await Promise.all([hostPlaybackPromise, memberPlaybackPromise])
    assert(mEpChange.episodeNumber === 12, 'Episode number changed to 12')
    assert(mEpChange.audioType === 'dub', 'Audio type changed to dub')
    assert(mEpChange.stateRevision === 5, 'stateRevision is 5')

    // Now switch from Server 1 -> Server 2 retaining Episode 12 and Dub
    hostPlaybackPromise = waitForEvent(host.socket, 'playback:updated')
    memberPlaybackPromise = waitForEvent(member.socket, 'playback:updated')

    host.socket.emit('playback:sync-stream', {
      roomId,
      anilistId: 21,
      episodeNumber: 12,
      audioType: 'dub',
      serverId: 'server2',
      expectedRevision: 5,
    })

    const [hRetain, mRetain] = await Promise.all([hostPlaybackPromise, memberPlaybackPromise])
    assert(hRetain.serverId === 'server2', 'Switched to server2')
    assert(hRetain.episodeNumber === 12, 'Episode 12 strictly preserved on server2')
    assert(hRetain.audioType === 'dub', 'Audio dub strictly preserved on server2')
    assert(mRetain.episodeNumber === 12, 'Member receives preserved Episode 12')
    assert(mRetain.audioType === 'dub', 'Member receives preserved Audio dub')
    assert(hRetain.stateRevision === 6, 'stateRevision is 6')

    // -------------------------------------------------------------
    // Step 8: Invalid Server ID Rejection
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Invalid Server ID Rejection ---')
    const errorPromise = waitForEvent(host.socket, 'party:error')

    host.socket.emit('playback:sync-stream', {
      roomId,
      anilistId: 21,
      episodeNumber: 12,
      audioType: 'dub',
      serverId: 'server999', // Invalid server
      expectedRevision: 6,
    })

    const srvError = await errorPromise
    assert(srvError.code === 'INVALID_SERVER_ID', `Invalid server rejected with INVALID_SERVER_ID (got ${srvError.code})`)

    // Confirm DB state was NOT mutated
    const dbRoomUnchanged = await prisma.partyRoom.findUnique({ where: { id: roomId! } })
    assert(dbRoomUnchanged?.serverId === 'server2', 'Server in DB remains server2 (no mutation)')
    assert(dbRoomUnchanged?.stateRevision === 6, 'Revision in DB remains 6 (no state drift)')

    // -------------------------------------------------------------
    // Step 9: Invalid Audio Type & Episode Rejection
    // -------------------------------------------------------------
    console.log('\n--- Step 9: Invalid Audio Type & Episode Number Rejection ---')
    const audioErrPromise = waitForEvent(host.socket, 'party:error')
    host.socket.emit('playback:sync-stream', {
      roomId,
      anilistId: 21,
      episodeNumber: 12,
      audioType: 'spanish_dub', // Invalid audio
      serverId: 'server1',
      expectedRevision: 6,
    })
    const audioErr = await audioErrPromise
    assert(audioErr.code === 'INVALID_AUDIO_TYPE', `Invalid audio rejected with INVALID_AUDIO_TYPE (got ${audioErr.code})`)

    const epErrPromise = waitForEvent(host.socket, 'party:error')
    host.socket.emit('playback:sync-stream', {
      roomId,
      anilistId: 21,
      episodeNumber: -5, // Invalid episode
      audioType: 'sub',
      serverId: 'server1',
      expectedRevision: 6,
    })
    const epErr = await epErrPromise
    assert(epErr.code === 'INVALID_EPISODE_NUMBER', `Invalid episode rejected with INVALID_EPISODE_NUMBER (got ${epErr.code})`)

    // -------------------------------------------------------------
    // Step 10: Unauthorized Non-Member Rejection
    // -------------------------------------------------------------
    console.log('\n--- Step 10: Unauthorized Non-Member Rejection ---')
    outsider.socket = createSocketClient(SERVER_URL, {
      auth: { token: outsider.sessionToken },
      transports: ['websocket'],
      reconnection: false,
    })
    await new Promise<void>((resolve) => outsider!.socket!.once('connect', resolve))

    // Outsider tries to sync stream in room without joining
    outsider.socket.emit('playback:sync-stream', {
      roomId,
      anilistId: 21,
      episodeNumber: 99,
      audioType: 'sub',
      serverId: 'server1',
      expectedRevision: 6,
    })

    // Wait a brief moment to ensure no state change happens in DB
    await new Promise((resolve) => setTimeout(resolve, 500))
    const dbRoomSecured = await prisma.partyRoom.findUnique({ where: { id: roomId! } })
    assert(dbRoomSecured?.stateRevision === 6, 'Outsider command did not increment stateRevision')
    assert(dbRoomSecured?.episodeNumber === 12, 'Outsider command did not mutate episode')
    assert(dbRoomSecured?.serverId === 'server2', 'Outsider command did not mutate serverId')

    // -------------------------------------------------------------
    // Step 11: Embed URL Resolution Verification for All Servers
    // -------------------------------------------------------------
    console.log('\n--- Step 11: Embed URL Resolution for All Servers ---')

    // Server 1 -> AnimeTVPlus (API-driven AniList primary, synchronous returns '' for async resolution)
    const srv1SyncUrl = resolveVideoEmbedUrl({
      server: 'server1',
      anilistId: 21,
      episodeNumber: 12,
      language: 'sub',
    })
    assert(
      srv1SyncUrl === '',
      `Server 1 returns empty synchronously for async AnimeTVPlus API resolution`,
    )

    // Server 2 -> MegaPlay AniList (SUB)
    const srv2UrlSub = resolveVideoEmbedUrl({
      server: 'server2',
      anilistId: 21,
      episodeNumber: 12,
      language: 'sub',
    })
    assert(
      srv2UrlSub === 'https://megaplay.buzz/stream/ani/21/12/sub',
      `Server 2 SUB embed matches MegaPlay AniList: ${srv2UrlSub}`,
    )

    // Server 2 -> MegaPlay AniList (DUB)
    const srv2UrlDub = resolveVideoEmbedUrl({
      server: 'server2',
      anilistId: 21,
      episodeNumber: 12,
      language: 'dub',
    })
    assert(
      srv2UrlDub === 'https://megaplay.buzz/stream/ani/21/12/dub',
      `Server 2 DUB embed matches MegaPlay AniList: ${srv2UrlDub}`,
    )

    // Server 3 -> MegaPlay MAL (SUB)
    const srv3UrlSub = resolveVideoEmbedUrl({
      server: 'server3',
      anilistId: 21,
      malId: 21,
      episodeNumber: 12,
      language: 'sub',
    })
    assert(
      srv3UrlSub === 'https://megaplay.buzz/stream/mal/21/12/sub',
      `Server 3 SUB embed matches MegaPlay MAL: ${srv3UrlSub}`,
    )

    // Server 3 -> MegaPlay MAL (DUB)
    const srv3UrlDub = resolveVideoEmbedUrl({
      server: 'server3',
      anilistId: 21,
      malId: 21,
      episodeNumber: 12,
      language: 'dub',
    })
    assert(
      srv3UrlDub === 'https://megaplay.buzz/stream/mal/21/12/dub',
      `Server 3 DUB embed matches MegaPlay MAL: ${srv3UrlDub}`,
    )

    // Invalid Server -> returns empty string
    const invalidSrvUrl = resolveVideoEmbedUrl({
      server: 'server999',
      anilistId: 21,
      episodeNumber: 1,
    })
    assert(invalidSrvUrl === '', 'Invalid server safely returns empty string without falling back')

    // -------------------------------------------------------------
    // Step 12: Host Closes Watch Party
    // -------------------------------------------------------------
    console.log('\n--- Step 12: Host Closes Watch Party ---')
    const closeRes = await apiRequest(`/rooms/${roomId}/close`, {
      method: 'POST',
      token: host.sessionToken,
    })
    assert(closeRes.status === 200, 'Host closed party room successfully')

    const dbRoomFinal = await prisma.partyRoom.findUnique({ where: { id: roomId! } })
    assert(dbRoomFinal === null, 'Room deleted from PostgreSQL on closure')

    console.log('\n======================================================================')
    console.log(`🎉 ALL MULTI-SERVER TESTS PASSED (${passed}/${passed + failed})`)
    console.log('======================================================================\n')
  } catch (err) {
    console.error('\n❌ TEST RUN ENCOUNTERED AN ERROR:', err)
  } finally {
    if (host?.socket?.connected) host.socket.disconnect()
    if (member?.socket?.connected) member.socket.disconnect()
    if (outsider?.socket?.connected) outsider.socket.disconnect()

    if (roomId) {
      await prisma.partyRoom.deleteMany({ where: { id: roomId } })
    }
    const testUserIds = [host?.id, member?.id, outsider?.id].filter(Boolean) as string[]
    if (testUserIds.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: testUserIds } } })
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } })
    }

    if (failed > 0) {
      process.exit(1)
    }
  }
}

runServerSwitchingTests()
