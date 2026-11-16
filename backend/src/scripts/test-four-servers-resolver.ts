/**
 * 7Anime — Four-Server Resolver & Iframe Sandbox Verification Suite
 *
 * Verifies:
 * 1. Exact URL generation for all 4 servers with distinct MAL and AniList IDs.
 * 2. AnimeTVPlus always uses fixed path: /home/embed/
 * 3. Episode number clamping and formatting.
 * 4. MegaPlay sub/dub audio language formatting.
 * 5. Rejection of missing/invalid IDs (never produces undefined, null, NaN).
 * 6. Real browser test: AnimeTVPlus mounts with strict sandbox, MegaPlay mounts with NO sandbox.
 * 7. Server switching unmounts old iframe and mounts correct new component in same player container.
 */

import puppeteer from 'puppeteer'
import path from 'path'
import {
  resolveVideoEmbedUrl,
  ANIMETVPLUS_EMBED_BASE,
  MEGAPLAY_STREAM_BASE,
  isValidPositiveIntegerId,
  getServerProvider,
} from '../../../src/services/videoResolver.js'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    process.exit(1)
  }
  console.log(`✅ PASSED: ${message}`)
}

async function runTests() {
  console.log('======================================================================')
  console.log('⚡ 7Anime — Four-Server Resolver & Iframe Sandbox Verification Suite')
  console.log('======================================================================\n')

  const MAL_ID = 21         // One Piece on MAL
  const ANILIST_ID = 1535   // Death Note on AniList (intentionally distinct from MAL_ID)
  const EPISODE = 5

  // ------------------------------------------------------------------
  // PART 1: Four Server URL Patterns with Distinct IDs
  // ------------------------------------------------------------------
  console.log('--- PART 1: Four Server URL Patterns with Distinct IDs ---')

  const urlServer1 = resolveVideoEmbedUrl({
    server: 'server1',
    malId: MAL_ID,
    anilistId: ANILIST_ID,
    episodeNumber: EPISODE,
    language: 'sub',
  })
  console.log(`Server 1 (AnimeTVPlus MAL): ${urlServer1}`)
  assert(
    urlServer1 === `https://embed.animetvplus.site/home/embed/mal/${MAL_ID}/${EPISODE}`,
    `Server 1 exact URL match: ${urlServer1}`
  )
  assert(urlServer1.startsWith(ANIMETVPLUS_EMBED_BASE), 'Server 1 uses mandatory /home/embed/ base')
  assert(urlServer1.includes(`/mal/${MAL_ID}/`), 'Server 1 uses MAL ID')
  assert(!urlServer1.includes(String(ANILIST_ID)), 'Server 1 does NOT use AniList ID')

  const urlServer2 = resolveVideoEmbedUrl({
    server: 'server2',
    malId: MAL_ID,
    anilistId: ANILIST_ID,
    episodeNumber: EPISODE,
    language: 'sub',
  })
  console.log(`Server 2 (AnimeTVPlus AniList): ${urlServer2}`)
  assert(
    urlServer2 === `https://embed.animetvplus.site/home/embed/anilist/${ANILIST_ID}/${EPISODE}`,
    `Server 2 exact URL match: ${urlServer2}`
  )
  assert(urlServer2.startsWith(ANIMETVPLUS_EMBED_BASE), 'Server 2 uses mandatory /home/embed/ base')
  assert(urlServer2.includes(`/anilist/${ANILIST_ID}/`), 'Server 2 uses AniList ID')
  assert(!urlServer2.includes(`/mal/`), 'Server 2 does NOT use MAL path')

  const urlServer3Sub = resolveVideoEmbedUrl({
    server: 'server3',
    malId: MAL_ID,
    anilistId: ANILIST_ID,
    episodeNumber: EPISODE,
    language: 'sub',
  })
  console.log(`Server 3 SUB (MegaPlay AniList): ${urlServer3Sub}`)
  assert(
    urlServer3Sub === `https://megaplay.buzz/stream/ani/${ANILIST_ID}/${EPISODE}/sub`,
    `Server 3 SUB exact URL match: ${urlServer3Sub}`
  )

  const urlServer3Dub = resolveVideoEmbedUrl({
    server: 'server3',
    malId: MAL_ID,
    anilistId: ANILIST_ID,
    episodeNumber: EPISODE,
    language: 'dub',
  })
  console.log(`Server 3 DUB (MegaPlay AniList): ${urlServer3Dub}`)
  assert(
    urlServer3Dub === `https://megaplay.buzz/stream/ani/${ANILIST_ID}/${EPISODE}/dub`,
    `Server 3 DUB exact URL match: ${urlServer3Dub}`
  )

  const urlServer4Sub = resolveVideoEmbedUrl({
    server: 'server4',
    malId: MAL_ID,
    anilistId: ANILIST_ID,
    episodeNumber: EPISODE,
    language: 'sub',
  })
  console.log(`Server 4 SUB (MegaPlay MAL): ${urlServer4Sub}`)
  assert(
    urlServer4Sub === `https://megaplay.buzz/stream/mal/${MAL_ID}/${EPISODE}/sub`,
    `Server 4 SUB exact URL match: ${urlServer4Sub}`
  )

  const urlServer4Dub = resolveVideoEmbedUrl({
    server: 'server4',
    malId: MAL_ID,
    anilistId: ANILIST_ID,
    episodeNumber: EPISODE,
    language: 'dub',
  })
  console.log(`Server 4 DUB (MegaPlay MAL): ${urlServer4Dub}`)
  assert(
    urlServer4Dub === `https://megaplay.buzz/stream/mal/${MAL_ID}/${EPISODE}/dub`,
    `Server 4 DUB exact URL match: ${urlServer4Dub}`
  )

  // ------------------------------------------------------------------
  // PART 2: ID Validation & Missing ID Error Handling
  // ------------------------------------------------------------------
  console.log('\n--- PART 2: ID Validation & Missing ID Error Handling ---')

  assert(isValidPositiveIntegerId(21) === true, 'Positive integer ID is valid')
  assert(isValidPositiveIntegerId('21') === true, 'Positive string integer ID is valid')
  assert(isValidPositiveIntegerId(0) === false, '0 is invalid ID')
  assert(isValidPositiveIntegerId(-5) === false, 'Negative number is invalid ID')
  assert(isValidPositiveIntegerId(NaN) === false, 'NaN is invalid ID')
  assert(isValidPositiveIntegerId(null) === false, 'null is invalid ID')
  assert(isValidPositiveIntegerId(undefined) === false, 'undefined is invalid ID')
  assert(isValidPositiveIntegerId('abc') === false, 'String abc is invalid ID')

  // Missing MAL ID on Server 1 -> must return ""
  const missingMalServer1 = resolveVideoEmbedUrl({
    server: 'server1',
    malId: null,
    anilistId: ANILIST_ID,
    episodeNumber: 1,
  })
  assert(missingMalServer1 === '', 'Server 1 with null malId returns empty string')

  // Missing MAL ID on Server 4 -> must return ""
  const missingMalServer4 = resolveVideoEmbedUrl({
    server: 'server4',
    malId: undefined,
    anilistId: ANILIST_ID,
    episodeNumber: 1,
  })
  assert(missingMalServer4 === '', 'Server 4 with undefined malId returns empty string')

  // Missing AniList ID on Server 2 -> must return ""
  const missingAniServer2 = resolveVideoEmbedUrl({
    server: 'server2',
    malId: MAL_ID,
    anilistId: null as any,
    episodeNumber: 1,
  })
  assert(missingAniServer2 === '', 'Server 2 with null anilistId returns empty string')

  // Missing AniList ID on Server 3 -> must return ""
  const missingAniServer3 = resolveVideoEmbedUrl({
    server: 'server3',
    malId: MAL_ID,
    anilistId: undefined as any,
    episodeNumber: 1,
  })
  assert(missingAniServer3 === '', 'Server 3 with undefined anilistId returns empty string')

  // Episode clamping
  const clampedZero = resolveVideoEmbedUrl({
    server: 'server1',
    malId: MAL_ID,
    anilistId: ANILIST_ID,
    episodeNumber: 0,
  })
  assert(clampedZero.endsWith('/1'), 'Episode 0 clamps to episode 1')

  const clampedNegative = resolveVideoEmbedUrl({
    server: 'server2',
    malId: MAL_ID,
    anilistId: ANILIST_ID,
    episodeNumber: -10,
  })
  assert(clampedNegative.endsWith('/1'), 'Episode -10 clamps to episode 1')

  // ------------------------------------------------------------------
  // PART 3: Provider Identification
  // ------------------------------------------------------------------
  console.log('\n--- PART 3: Provider Identification ---')
  assert(getServerProvider('server1') === 'AnimeTVPlus', 'Server 1 provider is AnimeTVPlus')
  assert(getServerProvider('server2') === 'AnimeTVPlus', 'Server 2 provider is AnimeTVPlus')
  assert(getServerProvider('server3') === 'MegaPlay', 'Server 3 provider is MegaPlay')
  assert(getServerProvider('server4') === 'MegaPlay', 'Server 4 provider is MegaPlay')
  assert(getServerProvider('unknown') === null, 'Unknown server provider is null')

  // ------------------------------------------------------------------
  // PART 4: Real Browser UI, Iframe Mounting & Sandbox Testing
  // ------------------------------------------------------------------
  console.log('\n--- PART 4: Real Browser UI & Sandbox Attribute Verification ---')
  const FRONTEND_URL = 'http://localhost:5174'
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    // 1. Check Party Create Modal
    console.log(`🌐 Navigating to ${FRONTEND_URL}/#party=create ...`)
    await page.goto(`${FRONTEND_URL}/#party=create`, { waitUntil: 'networkidle2', timeout: 30000 })
    await page.waitForSelector('.party-modal', { timeout: 10000 })

    const modalServerOptions = await page.$$eval(
      '#party-create-server option',
      opts => opts.map(o => ({ value: o.getAttribute('value'), text: o.textContent?.trim() }))
    )
    console.log('Detected Server Options in Create Modal:', modalServerOptions)
    assert(modalServerOptions.length === 4, `Create modal contains exactly 4 server options (got ${modalServerOptions.length})`)
    assert(modalServerOptions.some(o => o.value === 'server1'), 'Server 1 option exists')
    assert(modalServerOptions.some(o => o.value === 'server2'), 'Server 2 option exists')
    assert(modalServerOptions.some(o => o.value === 'server3'), 'Server 3 option exists')
    assert(modalServerOptions.some(o => o.value === 'server4'), 'Server 4 option exists')

    // 2. Navigate to Cinema Player
    console.log(`\nNavigating to ${FRONTEND_URL}/ ...`)
    await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle2', timeout: 30000 })
    
    // Wait for the hero "Start watching" or card button to be present and enabled
    console.log('Waiting for hero "Start watching" button...')
    await page.waitForFunction(
      () => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          b => b.innerText.includes('Start watching') || b.innerText.includes('Watch Now')
        ) as HTMLButtonElement | undefined
        return btn && !btn.disabled
      },
      { timeout: 20000 }
    )

    console.log('Clicking "Start watching" / "Watch Now" on hero...')
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.innerText.includes('Start watching') || b.innerText.includes('Watch Now'),
      ) as HTMLButtonElement | undefined
      if (btn) btn.click()
    })

    // Wait for detail view to finish loading and "Watch Ep 1" to appear
    console.log('Waiting for "Watch Ep 1" on detail view...')
    await page.waitForFunction(
      () => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          b => b.innerText.includes('Watch Ep 1')
        ) as HTMLButtonElement | undefined
        return Boolean(btn)
      },
      { timeout: 20000 }
    )

    console.log('Clicking "Watch Ep 1" on detail view...')
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Watch Ep 1'),
      ) as HTMLButtonElement | undefined
      if (btn) btn.click()
    })

    // Wait for cinema-player container to mount
    console.log('Waiting for cinema player stage to mount...')
    await page.waitForSelector('.cinema-player, .cinema-player__stage', { timeout: 20000 })
    console.log('✅ Cinema player mounted successfully')

    // Wait for server chips
    await page.waitForSelector('.cinema-player__server-chip', { timeout: 10000 })

    // Verify all 4 server buttons exist
    const serverButtons = await page.$$eval('.cinema-player__server-chip', btns =>
      btns.map(b => ({ title: b.getAttribute('title'), text: b.textContent?.trim() }))
    )
    console.log('Detected Player Server Chips:', serverButtons)
    assert(serverButtons.length === 4, `Player contains 4 server chips (got ${serverButtons.length})`)

    // Verify Server 1 (AnimeTVPlus MAL): Strict Sandbox
    console.log('\n--- Testing Server 1 (AnimeTVPlus MAL) ---')
    const s1Btn = await page.waitForSelector('.cinema-player__server-chip[title*="Server 1"]', { timeout: 5000 })
    await s1Btn?.click()
    await page.waitForSelector('.cinema-player__iframe', { timeout: 10000 })

    const s1Sandbox = await page.$eval('.cinema-player__iframe', el => el.getAttribute('sandbox'))
    const s1Src = await page.$eval('.cinema-player__iframe', el => el.getAttribute('src'))
    console.log(`Server 1 Sandbox attribute: "${s1Sandbox}"`)
    console.log(`Server 1 src: "${s1Src}"`)
    assert(
      s1Sandbox === 'allow-scripts allow-forms allow-presentation',
      'Server 1 iframe receives exact strict sandbox "allow-scripts allow-forms allow-presentation"'
    )
    assert(s1Src?.includes('/home/embed/mal/') || false, 'Server 1 uses AnimeTVPlus /home/embed/mal/ URL')

    // Verify Server 2 (AnimeTVPlus AniList): Strict Sandbox
    console.log('\n--- Testing Server 2 (AnimeTVPlus AniList) ---')
    const s2Btn = await page.waitForSelector('.cinema-player__server-chip[title*="Server 2"]', { timeout: 5000 })
    await s2Btn?.click()
    await new Promise(r => setTimeout(r, 1200))

    const s2Sandbox = await page.$eval('.cinema-player__iframe', el => el.getAttribute('sandbox'))
    const s2Src = await page.$eval('.cinema-player__iframe', el => el.getAttribute('src'))
    console.log(`Server 2 Sandbox attribute: "${s2Sandbox}"`)
    console.log(`Server 2 src: "${s2Src}"`)
    assert(
      s2Sandbox === 'allow-scripts allow-forms allow-presentation',
      'Server 2 iframe receives exact strict sandbox "allow-scripts allow-forms allow-presentation"'
    )
    assert(s2Src?.includes('/home/embed/anilist/') || false, 'Server 2 uses AnimeTVPlus /home/embed/anilist/ URL')

    // Verify Server 3 (MegaPlay AniList): NO Sandbox
    console.log('\n--- Testing Server 3 (MegaPlay AniList) ---')
    const s3Btn = await page.waitForSelector('.cinema-player__server-chip[title*="Server 3"]', { timeout: 5000 })
    await s3Btn?.click()
    await new Promise(r => setTimeout(r, 1200))

    const s3HasSandbox = await page.$eval('.cinema-player__iframe', el => el.hasAttribute('sandbox'))
    const s3Src = await page.$eval('.cinema-player__iframe', el => el.getAttribute('src'))
    console.log(`Server 3 hasAttribute('sandbox'): ${s3HasSandbox}`)
    console.log(`Server 3 src: "${s3Src}"`)
    assert(s3HasSandbox === false, 'Server 3 iframe has NO sandbox attribute')
    assert(s3Src.includes('megaplay.buzz/stream/ani/') || false, 'Server 3 loaded MegaPlay AniList URL')

    // Verify Server 4 (MegaPlay MAL): NO Sandbox
    console.log('\n--- Testing Server 4 (MegaPlay MAL) ---')
    const s4Btn = await page.waitForSelector('.cinema-player__server-chip[title*="Server 4"]', { timeout: 5000 })
    await s4Btn?.click()
    await new Promise(r => setTimeout(r, 1200))

    const s4HasSandbox = await page.$eval('.cinema-player__iframe', el => el.hasAttribute('sandbox'))
    const s4Src = await page.$eval('.cinema-player__iframe', el => el.getAttribute('src'))
    console.log(`Server 4 hasAttribute('sandbox'): ${s4HasSandbox}`)
    console.log(`Server 4 src: "${s4Src}"`)
    assert(s4HasSandbox === false, 'Server 4 iframe has NO sandbox attribute')
    assert(s4Src.includes('megaplay.buzz/stream/mal/') || false, 'Server 4 loaded MegaPlay MAL URL')

    // Screenshot of player with 4 servers
    const artifactPath = path.resolve('C:/Users/BHIMANI/.gemini/antigravity/brain/a2b9de21-66b7-4141-96b9-a2ff7e0be97d/four_servers_player_verification.png')
    await page.screenshot({ path: artifactPath })
    console.log(`📸 Saved screenshot: ${artifactPath}`)

  } finally {
    await browser.close()
  }

  console.log('\n======================================================================')
  console.log('🏁 All 4-Server Resolver & Sandbox Verification Tests PASSED (100%)')
  console.log('======================================================================\n')
}

runTests().catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
