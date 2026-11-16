/**
 * 7Anime Party Play — Full HTTP REST Integration Verification Suite
 * Tests actual Express endpoints, authentication, input validation, headers, and status codes.
 * Run with: npx tsx backend/src/scripts/test-party-api.ts
 */

import http from 'node:http'
import crypto from 'node:crypto'
import express from 'express'
import cors from 'cors'
import prisma from '../db/client.js'
import { createPartyRouter } from '../routes/party.js'

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

async function runApiTests() {
  console.log('\n======================================================')
  console.log('🌐 Starting Party Play REST API Integration Tests')
  console.log('======================================================\n')

  // Setup express test app with party router
  const testApp = express()
  testApp.use(express.json())
  testApp.use('/api/party', createPartyRouter())

  const testServer = http.createServer(testApp)
  await new Promise<void>((resolve) => testServer.listen(0, resolve))
  const port = (testServer.address() as any).port
  const baseUrl = `http://localhost:${port}/api/party`

  const hostUserId = `api-host-${crypto.randomUUID()}`
  const memberUserId = `api-member-${crypto.randomUUID()}`
  const hostSessionToken = `token-host-${crypto.randomUUID()}`
  const memberSessionToken = `token-member-${crypto.randomUUID()}`

  try {
    // Create users & sessions
    await prisma.user.createMany({
      data: [
        {
          id: hostUserId,
          email: `${hostUserId}@test.com`,
          username: `host_${hostUserId.slice(0, 8)}`,
          passwordHash: 'hash',
        },
        {
          id: memberUserId,
          email: `${memberUserId}@test.com`,
          username: `member_${memberUserId.slice(0, 8)}`,
          passwordHash: 'hash',
        },
      ],
    })

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.session.createMany({
      data: [
        {
          userId: hostUserId,
          tokenHash: crypto.createHash('sha256').update(hostSessionToken).digest('hex'),
          expiresAt,
        },
        {
          userId: memberUserId,
          tokenHash: crypto.createHash('sha256').update(memberSessionToken).digest('hex'),
          expiresAt,
        },
      ],
    })

    // 1. Unauthorized request without Bearer token must return 401
    console.log('--- Test 1: Unauthorized Protection ---')
    const unauthRes = await fetch(`${baseUrl}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anilistId: 21 }),
    })
    assert(unauthRes.status === 401, 'POST /api/party/rooms without auth returns 401')

    // 2. Create Room
    console.log('\n--- Test 2: Create Party Room ---')
    const createRes = await fetch(`${baseUrl}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostSessionToken}`,
      },
      body: JSON.stringify({
        anilistId: 21,
        mediaType: 'tv',
        episodeNumber: 1,
        audioType: 'sub',
        serverId: 'server1',
      }),
    })
    assert(createRes.status === 201, 'POST /api/party/rooms returns 201 Created')
    const createData = (await createRes.json()) as any
    assert(createData.ok === true, 'Response body ok === true')
    assert(createData.data.id !== undefined, 'Returns party room ID')
    assert(createData.data.inviteToken !== undefined, 'Host receives unhashed inviteToken on creation')
    assert(createData.data.code.length === 8, '8-character room convenience code generated')
    const createdRoomId = createData.data.id
    const inviteToken = createData.data.inviteToken
    const roomCode = createData.data.code

    // 3. Member Join via inviteToken
    console.log('\n--- Test 3: Member Join via Invite Token ---')
    const joinRes = await fetch(`${baseUrl}/rooms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberSessionToken}`,
      },
      body: JSON.stringify({ tokenOrCode: inviteToken }),
    })
    assert(joinRes.status === 200, 'POST /api/party/rooms/join returns 200 OK')
    const joinData = (await joinRes.json()) as any
    assert(joinData.data.participants.length === 2, 'Room now has 2 active participants')
    assert(joinData.data.inviteToken === undefined, 'Member DOES NOT receive inviteToken (secrets protected)')

    // 4. Get Room Details
    console.log('\n--- Test 4: Get Room Details ---')
    const getRes = await fetch(`${baseUrl}/rooms/${createdRoomId}`, {
      headers: { Authorization: `Bearer ${memberSessionToken}` },
    })
    assert(getRes.status === 200, 'GET /api/party/rooms/:roomId returns 200 OK')
    const getData = (await getRes.json()) as any
    assert(getData.data.playback.anilistId === 21, 'Playback state matches anilistId: 21')

    // 5. Host Rotates Token
    console.log('\n--- Test 5: Rotate Invite Token ---')
    const rotateRes = await fetch(`${baseUrl}/rooms/${createdRoomId}/rotate-token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostSessionToken}` },
    })
    assert(rotateRes.status === 200, 'POST /api/party/rooms/:roomId/rotate-token returns 200')
    const rotateData = (await rotateRes.json()) as any
    assert(rotateData.data.inviteToken !== inviteToken, 'New token differs from old token')

    // Old token must fail join
    const oldJoinRes = await fetch(`${baseUrl}/rooms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberSessionToken}`,
      },
      body: JSON.stringify({ tokenOrCode: inviteToken }),
    })
    assert(oldJoinRes.status === 404, 'Joining with old rotated token returns 404')

    // 6. Host Kicks Member
    console.log('\n--- Test 6: Host Kicks Member ---')
    const kickRes = await fetch(`${baseUrl}/rooms/${createdRoomId}/kick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostSessionToken}`,
      },
      body: JSON.stringify({ targetUserId: memberUserId }),
    })
    assert(kickRes.status === 200, 'POST /api/party/rooms/:roomId/kick returns 200')

    // Kicked member cannot rejoin even with valid code
    const kickedJoinRes = await fetch(`${baseUrl}/rooms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberSessionToken}`,
      },
      body: JSON.stringify({ tokenOrCode: roomCode }),
    })
    assert(kickedJoinRes.status === 403, 'Kicked member is rejected with 403 on rejoin attempt')

    // 7. Host Closes Room
    console.log('\n--- Test 7: Host Closes Party ---')
    const closeRes = await fetch(`${baseUrl}/rooms/${createdRoomId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hostSessionToken}` },
    })
    assert(closeRes.status === 200, 'DELETE /api/party/rooms/:roomId returns 200')

    // Room must now be 404
    const postCloseGet = await fetch(`${baseUrl}/rooms/${createdRoomId}`, {
      headers: { Authorization: `Bearer ${hostSessionToken}` },
    })
    assert(postCloseGet.status === 404, 'Room details return 404 after closure')
  } finally {
    testServer.close()
    await prisma.user.deleteMany({
      where: { id: { in: [hostUserId, memberUserId] } },
    }).catch(() => {})
  }

  console.log('\n======================================================')
  console.log(`🏁 API TEST SUITE COMPLETE: ${passed} Passed, ${failed} Failed`)
  console.log('======================================================\n')

  if (failed > 0) process.exit(1)
}

runApiTests().catch((e) => {
  console.error('Fatal API test error:', e)
  process.exit(1)
})
