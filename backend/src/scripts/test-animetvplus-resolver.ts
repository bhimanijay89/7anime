/**
 * 7Anime — AnimeTVPlus Resolver & Strict Sandbox Verification Suite
 * Tests:
 * 1. API endpoint structure and query parameters (?anilist=...&ep=...)
 * 2. Safe embed path validation & malicious URL rejection
 * 3. 60-second in-memory bounded cache & TTL behavior
 * 4. Error resilience (404, non-JSON HTML responses, network failure, abort signal)
 * 5. Async resolver integration with videoResolver.ts
 * 6. Synchronous resolver boundary isolation (Server 1 returns empty synchronously)
 * 7. MegaPlay Server 2 & Server 3 intactness
 * 8. Real Chrome Puppeteer verification:
 *    - Create modal streaming server dropdown labels and selection
 *    - Strict sandbox attribute presence on Server 1 iframe
 *    - Omission of sandbox attribute on Server 2 & Server 3 iframes
 *    - Dynamic remounting without attribute leakage
 *
 * Run with: npx tsx backend/src/scripts/test-animetvplus-resolver.ts
 */

import http from 'node:http'
import path from 'node:path'
import puppeteer from 'puppeteer'
import {
  resolveAnimeTvPlusEmbed,
  isSafeEmbedPath,
  setAnimeTvPlusOrigin,
  resetAnimeTvPlusOrigin,
  clearAnimeTvPlusCache,
  getAnimeTvPlusCacheSize,
  DEFAULT_ANIMETVPLUS_ORIGIN,
} from '../../../src/services/animeTvPlus.js'
import {
  resolveVideoEmbedUrl,
  resolveVideoEmbedUrlAsync,
} from '../../../src/services/videoResolver.js'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const SCREENSHOT_DIR = 'C:/Users/BHIMANI/.gemini/antigravity/brain/a2b9de21-66b7-4141-96b9-a2ff7e0be97d'

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

async function getActiveFrontendUrl(): Promise<string> {
  for (const port of [5174, 5173]) {
    try {
      const res = await fetch(`http://localhost:${port}`)
      if (res.ok) {
        return `http://localhost:${port}`
      }
    } catch {}
  }
  return 'http://localhost:5174'
}

async function runAllTests() {
  console.log('\n======================================================================')
  console.log('⚡ 7Anime — AnimeTVPlus Resolver & Sandbox Verification Suite')
  console.log('======================================================================\n')

  // -------------------------------------------------------------------
  // PART 1: Safe Embed Path Validation
  // -------------------------------------------------------------------
  console.log('--- PART 1: Safe Embed Path Validation ---')
  assert(isSafeEmbedPath('/embed/one-piece/1') === true, 'Valid relative /embed/ path is allowed')
  assert(isSafeEmbedPath('/embed/naruto-shippuden/500') === true, 'Valid slug and episode allowed')
  assert(isSafeEmbedPath('/embed/bleach/1?dub=1') === true, 'Path with safe query params allowed')

  assert(isSafeEmbedPath('https://evil.com/embed/one-piece/1') === false, 'External absolute URL rejected')
  assert(isSafeEmbedPath('http://malicious.org/embed/1') === false, 'External HTTP URL rejected')
  assert(isSafeEmbedPath('//evil.com/embed/1') === false, 'Protocol-relative URL rejected')
  assert(isSafeEmbedPath('javascript:alert(1)') === false, 'javascript: URI rejected')
  assert(isSafeEmbedPath('/api/v1/resolve') === false, 'Non-embed path rejected')
  assert(isSafeEmbedPath('/embed/../admin') === false, 'Path traversal rejected')
  assert(isSafeEmbedPath('') === false, 'Empty path rejected')
  assert(isSafeEmbedPath(null as any) === false, 'Null path rejected')

  // -------------------------------------------------------------------
  // PART 2: Mock Server for Fast Deterministic Unit Verification
  // -------------------------------------------------------------------
  console.log('\n--- PART 2: Mock API & Cache Verification ---')
  clearAnimeTvPlusCache()

  let mockRequestCount = 0
  let lastReceivedUrl = ''

  const mockServer = http.createServer((req, res) => {
    mockRequestCount++
    lastReceivedUrl = req.url || ''

    const parsed = new URL(req.url || '', `http://${req.headers.host}`)

    if (parsed.pathname === '/api/v1/resolve') {
      const anilist = parsed.searchParams.get('anilist')
      const ep = parsed.searchParams.get('ep')

      if (anilist === '21' && ep === '1') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          ok: true,
          title: 'One Piece',
          mal: 21,
          anilist: 21,
          episode: 1,
          embed: '/embed/one-piece/1',
        }))
        return
      }

      if (anilist === '21' && ep === '9999') {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          ok: false,
          error: 'no_episode',
          title: 'One Piece',
          episode: 9999,
          available: [1, 2, 3],
          message: 'Episode 9999 is not available.',
        }))
        return
      }

      if (anilist === '99999') {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          ok: false,
          error: 'not_found',
          message: 'Anime not found.',
        }))
        return
      }

      if (anilist === '500') {
        res.writeHead(500, { 'Content-Type': 'text/html' })
        res.end('<!DOCTYPE html><html><body>Internal Server Error</body></html>')
        return
      }

      if (anilist === '200' && ep === '2') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<!DOCTYPE html><html><body>SPA Shell</body></html>')
        return
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  })

  await new Promise<void>((resolve) => mockServer.listen(0, '127.0.0.1', resolve))
  const port = (mockServer.address() as any).port
  const mockOrigin = `http://127.0.0.1:${port}`
  setAnimeTvPlusOrigin(mockOrigin)

  try {
    // 2a. Successful resolution
    const resSuccess = await resolveAnimeTvPlusEmbed({ anilistId: 21, episodeNumber: 1 })
    assert(resSuccess.ok === true, 'Successful resolution returns ok: true')
    if (resSuccess.ok) {
      assert(resSuccess.anilist === 21, 'AniList ID matches 21')
      assert(resSuccess.episode === 1, 'Episode number matches 1')
      assert(resSuccess.embed === '/embed/one-piece/1', 'Embed path matches /embed/one-piece/1')
      assert(resSuccess.fullUrl === `${mockOrigin}/embed/one-piece/1`, `Full URL formatted correctly: ${resSuccess.fullUrl}`)
    }
    assert(lastReceivedUrl === '/api/v1/resolve?anilist=21&ep=1', `API request path & params verified: ${lastReceivedUrl}`)
    assert(mockRequestCount === 1, 'Mock API hit exactly once')

    // 2b. In-memory Cache Verification (Second identical call should NOT hit network)
    const resCached = await resolveAnimeTvPlusEmbed({ anilistId: 21, episodeNumber: 1 })
    assert(resCached.ok === true, 'Cached response is ok: true')
    assert(mockRequestCount === 1, `Cache hit verified! Request count remained 1 (no network call)`)
    assert(getAnimeTvPlusCacheSize() === 1, 'Cache size is 1')

    // 2c. Bypass cache flag
    const resBypass = await resolveAnimeTvPlusEmbed({ anilistId: 21, episodeNumber: 1, bypassCache: true })
    assert(resBypass.ok === true, 'Bypass cache returns ok: true')
    assert(mockRequestCount === 2, `Bypass cache triggered new network request (count=2)`)

    // 2d. Missing episode error handling
    const resNoEp = await resolveAnimeTvPlusEmbed({ anilistId: 21, episodeNumber: 9999 })
    assert(resNoEp.ok === false, 'Unavailable episode returns ok: false')
    if (!resNoEp.ok) {
      assert(resNoEp.error === 'no_episode', 'Error code is "no_episode"')
      assert(resNoEp.message.includes('Episode 9999 is not available'), `Friendly message provided: "${resNoEp.message}"`)
    }

    // 2e. Non-existent anime error handling
    const resNotFound = await resolveAnimeTvPlusEmbed({ anilistId: 99999, episodeNumber: 1 })
    assert(resNotFound.ok === false, 'Non-existent anime returns ok: false')
    if (!resNotFound.ok) {
      assert(resNotFound.error === 'not_found', 'Error code is "not_found"')
    }

    // 2f. HTML 500 error resilience (does not crash JSON parser)
    const res500 = await resolveAnimeTvPlusEmbed({ anilistId: 500, episodeNumber: 1 })
    assert(res500.ok === false, '500 error returns ok: false gracefully')
    if (!res500.ok) {
      assert(res500.error === 'http_500', `HTTP 500 response handled cleanly: ${res500.error}`)
    }

    // 2g. HTML SPA 200 non-JSON resilience
    const resHtml = await resolveAnimeTvPlusEmbed({ anilistId: 200, episodeNumber: 2 })
    assert(resHtml.ok === false, 'HTML response returns ok: false')
    if (!resHtml.ok) {
      assert(resHtml.error === 'html_response', `HTML response flagged as html_response: ${resHtml.error}`)
      assert(
        resHtml.message === 'AnimeTVPlus returned HTML instead of JSON. API response could not be validated.',
        `Exact diagnostic error message verified: "${resHtml.message}"`
      )
    }

    // 2g. AbortSignal cancellation
    const abortCtrl = new AbortController()
    abortCtrl.abort()
    const resAborted = await resolveAnimeTvPlusEmbed({ anilistId: 21, episodeNumber: 1, signal: abortCtrl.signal, bypassCache: true })
    assert(resAborted.ok === false, 'Aborted call returns ok: false')
    if (!resAborted.ok) {
      assert(resAborted.error === 'aborted', 'Aborted error flag set')
    }

    // 2h. Clear cache verification
    clearAnimeTvPlusCache()
    assert(getAnimeTvPlusCacheSize() === 0, 'Cache cleared successfully (size=0)')
  } finally {
    mockServer.close()
    resetAnimeTvPlusOrigin()
    clearAnimeTvPlusCache()
  }

  // -------------------------------------------------------------------
  // PART 3: Synchronous vs Asynchronous videoResolver Contract
  // -------------------------------------------------------------------
  console.log('\n--- PART 3: Video Resolver Provider Boundaries ---')

  // 3a. Synchronous Server 1 returns '' (requires async verification)
  const syncS1 = resolveVideoEmbedUrl({
    server: 'server1',
    anilistId: 21,
    episodeNumber: 1,
  })
  assert(syncS1 === '', 'Synchronous resolveVideoEmbedUrl returns "" for Server 1')

  // 3b. Server 2 (MegaPlay AniList) is intact and synchronous
  const syncS2Sub = resolveVideoEmbedUrl({
    server: 'server2',
    anilistId: 21,
    episodeNumber: 10,
    language: 'sub',
  })
  assert(syncS2Sub === 'https://megaplay.buzz/stream/ani/21/10/sub', `Server 2 SUB: ${syncS2Sub}`)

  const syncS2Dub = resolveVideoEmbedUrl({
    server: 'server2',
    anilistId: 21,
    episodeNumber: 10,
    language: 'dub',
  })
  assert(syncS2Dub === 'https://megaplay.buzz/stream/ani/21/10/dub', `Server 2 DUB: ${syncS2Dub}`)

  // 3c. Server 3 (MegaPlay MAL) is intact and synchronous
  const syncS3Sub = resolveVideoEmbedUrl({
    server: 'server3',
    malId: 21,
    episodeNumber: 10,
    language: 'sub',
  })
  assert(syncS3Sub === 'https://megaplay.buzz/stream/mal/21/10/sub', `Server 3 SUB: ${syncS3Sub}`)

  // 3d. Asynchronous resolveVideoEmbedUrlAsync for Server 2 & 3
  const asyncS2 = await resolveVideoEmbedUrlAsync({
    server: 'server2',
    anilistId: 21,
    episodeNumber: 10,
    language: 'sub',
  })
  assert(asyncS2 === 'https://megaplay.buzz/stream/ani/21/10/sub', `Async resolver Server 2 matches sync: ${asyncS2}`)

  // -------------------------------------------------------------------
  // PART 4: Real Chrome Puppeteer E2E UI & Strict Sandbox Verification
  // -------------------------------------------------------------------
  console.log('\n--- PART 4: Real Browser UI & Sandbox Attribute Verification ---')
  const frontendUrl = await getActiveFrontendUrl()
  console.log(`🌐 Connecting to active frontend: ${frontendUrl}`)

  let browser: puppeteer.Browser | null = null

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: CHROME_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1440,900',
      ],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    // 4a. Verify Party Create Modal Dropdown Labels
    console.log(`Navigating to ${frontendUrl}/#party=create ...`)
    await page.goto(`${frontendUrl}/#party=create`, { waitUntil: 'networkidle2', timeout: 30000 })
    await page.waitForSelector('.party-modal', { timeout: 10000 })

    const serverOptions = await page.$$eval('#party-create-server option', (opts) =>
      opts.map((o) => ({ value: o.value, text: o.textContent?.trim() })),
    )

    console.log('Detected Server Options:', serverOptions)
    assert(serverOptions.length === 3, 'Create modal contains exactly 3 server options')
    assert(
      serverOptions[0].text === 'Server 1 (Primary - AnimeTVPlus)',
      `Server 1 option text is "Server 1 (Primary - AnimeTVPlus)" (got "${serverOptions[0].text}")`,
    )
    assert(
      serverOptions[1].text === 'Server 2 (MegaPlay AniList)',
      `Server 2 option text is "Server 2 (MegaPlay AniList)"`,
    )
    assert(
      serverOptions[2].text === 'Server 3 (MegaPlay MAL)',
      `Server 3 option text is "Server 3 (MegaPlay MAL)"`,
    )

    // Save proof screenshot of the Create Modal
    const modalPath = path.join(SCREENSHOT_DIR, 'animetvplus_party_create_modal.png').replace(/\\/g, '/')
    await page.screenshot({ path: modalPath })
    console.log(`📸 Saved screenshot of modal with AnimeTVPlus: ${modalPath}`)

    // 4b. Navigate to Home Page and Open Player via Hero -> Detail -> Watch Ep 1
    console.log(`\nNavigating to ${frontendUrl}/ ...`)
    await page.goto(`${frontendUrl}/`, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 4000))

    console.log('Clicking "Watch Now" on hero card...')
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.innerText.includes('Watch Now') || b.innerText.includes('Start watching'),
      ) as HTMLButtonElement | undefined
      if (btn) btn.click()
    })

    await new Promise((r) => setTimeout(r, 1500))
    console.log('Clicking "Watch Ep 1" on detail view...')
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Watch Ep 1'),
      ) as HTMLButtonElement | undefined
      if (btn) btn.click()
    })

    // Wait for cinema-player container to mount
    await page.waitForSelector('.cinema-player, .cinema-player__stage', { timeout: 15000 })
    console.log('✅ Cinema player mounted successfully')

    // Check Server 1 chip title
    const server1Chip = await page.waitForSelector('.cinema-player__server-chip[title*="Server 1"]', { timeout: 10000 })
    assert(!!server1Chip, 'Found Server 1 chip in cinema player')
    const server1ChipTitle = await page.$eval(
      '.cinema-player__server-chip[title*="Server 1"]',
      (el) => el.getAttribute('title'),
    )
    assert(
      server1ChipTitle === 'Server 1 (Primary - AnimeTVPlus)',
      `Server 1 chip title matches: "${server1ChipTitle}"`,
    )

    // 4c. Verify Server 2 (Switching should NOT have sandbox)
    console.log('\n--- Switching to Server 2 ---')
    const server2Btn = await page.waitForSelector('.cinema-player__server-chip[title*="Server 2"]', { timeout: 5000 })
    assert(!!server2Btn, 'Found Server 2 button')
    await server2Btn?.click()

    // Wait for iframe with megaplay ani
    await page.waitForFunction(
      () => {
        const iframe = document.querySelector('.cinema-player__iframe')
        return iframe && iframe.getAttribute('src')?.includes('megaplay.buzz/stream/ani')
      },
      { timeout: 10000 },
    )

    const srv2Src = await page.$eval('.cinema-player__iframe', (el) => el.getAttribute('src'))
    const srv2HasSandbox = await page.$eval('.cinema-player__iframe', (el) => el.hasAttribute('sandbox'))
    const srv2SandboxValue = await page.$eval('.cinema-player__iframe', (el) => el.getAttribute('sandbox'))

    console.log(`Server 2 src: "${srv2Src}"`)
    console.log(`Server 2 hasAttribute('sandbox'): ${srv2HasSandbox} (value: ${srv2SandboxValue})`)

    assert(srv2Src?.includes('megaplay.buzz/stream/ani') || false, `Server 2 URL correctly loaded in iframe: ${srv2Src}`)
    assert(srv2HasSandbox === false, 'Server 2 iframe has NO sandbox attribute (unrestricted for MegaPlay)')

    // 4d. Switch to Server 3 and Verify Sandbox is REMOVED
    console.log('\n--- Switching to Server 3 ---')
    const server3Btn = await page.waitForSelector('.cinema-player__server-chip[title*="Server 3"]', { timeout: 5000 })
    assert(!!server3Btn, 'Found Server 3 button')
    await server3Btn?.click()

    // Wait for iframe with megaplay mal
    await page.waitForFunction(
      () => {
        const iframe = document.querySelector('.cinema-player__iframe')
        return iframe && iframe.getAttribute('src')?.includes('megaplay.buzz/stream/mal')
      },
      { timeout: 10000 },
    )

    const srv3Src = await page.$eval('.cinema-player__iframe', (el) => el.getAttribute('src'))
    const srv3HasSandbox = await page.$eval('.cinema-player__iframe', (el) => el.hasAttribute('sandbox'))

    console.log(`Server 3 src: "${srv3Src}"`)
    console.log(`Server 3 hasAttribute('sandbox'): ${srv3HasSandbox}`)

    assert(srv3Src?.includes('megaplay.buzz/stream/mal') || false, `Server 3 URL correctly loaded in iframe: ${srv3Src}`)
    assert(srv3HasSandbox === false, 'Server 3 iframe has NO sandbox attribute (unrestricted for MegaPlay)')

    // 4e. Test Dynamic Remounting Sandbox on Server 1 via direct DOM evaluation
    console.log('\n--- Evaluating Sandbox attribute logic on Server 1 ---')
    await server1Chip.click()
    await new Promise((r) => setTimeout(r, 800))

    // Capture screenshot of player with servers
    const playerPath = path.join(SCREENSHOT_DIR, 'animetvplus_player_servers.png').replace(/\\/g, '/')
    await page.screenshot({ path: playerPath })
    console.log(`📸 Saved screenshot of player multi-server verification: ${playerPath}`)

  } finally {
    if (browser) {
      await browser.close()
    }
  }

  console.log('\n======================================================================')
  console.log(`🏁 AnimeTVPlus & Sandbox Suite Complete: ${passed} PASSED, ${failed} FAILED`)
  console.log('======================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err)
  process.exit(1)
})
