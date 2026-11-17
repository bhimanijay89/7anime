import puppeteer from 'puppeteer'
import path from 'path'

const ARTIFACTS_DIR = 'C:/Users/BHIMANI/.gemini/antigravity/brain/a2b9de21-66b7-4141-96b9-a2ff7e0be97d'

async function testPlayerOnVercel(isMobile) {
  const mode = isMobile ? 'Mobile' : 'Desktop'
  console.log(`\n==================================================`)
  console.log(`Testing Player on Vercel: ${mode}`)
  console.log(`==================================================`)

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    if (isMobile) {
      await page.setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36')
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    } else {
      await page.setViewport({ width: 1440, height: 900 })
    }

    const consoleErrors = []
    const failedRequests = []
    const allRequests = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  [${mode} CONSOLE ERROR] ${msg.text()}`)
        consoleErrors.push(msg.text())
      }
    })

    page.on('pageerror', err => {
      console.log(`  [${mode} PAGE ERROR] ${err.message}`)
    })

    page.on('requestfailed', req => {
      failedRequests.push({
        url: req.url(),
        failure: req.failure()?.errorText,
      })
      console.log(`  [${mode} REQ FAILED] ${req.url()} (${req.failure()?.errorText})`)
    })

    page.on('response', res => {
      const url = res.url()
      const status = res.status()
      if (url.includes('animetvplus') || url.includes('megaplay') || status >= 400) {
        allRequests.push({ url, status, headers: res.headers() })
        console.log(`  [${mode} HTTP ${status}] ${url}`)
      }
    })

    console.log(`Navigating to https://7anime-tv.vercel.app ...`)
    await page.goto('https://7anime-tv.vercel.app', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))

    // Click an anime card
    console.log('Clicking first anime card...')
    const clickedTitle = await page.evaluate(() => {
      const card = document.querySelector('.anime-card, .cinema-card')
      const title = card?.querySelector('.anime-card__title, h3, h4')?.textContent?.trim()
      if (card) {
        card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      }
      return title
    })
    console.log('Clicked card title:', clickedTitle)
    await new Promise(r => setTimeout(r, 2000))

    // Click Watch Now button
    console.log('Clicking Watch Now button...')
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent?.includes('Watch Ep') || b.textContent?.includes('Watch Now')
      )
      if (btn) btn.click()
    })
    await new Promise(r => setTimeout(r, 3000))

    // Take screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `player_${mode.toLowerCase()}_test.png`) })

    // Inspect player state
    const playerState = await page.evaluate(() => {
      const iframe = document.querySelector('iframe')
      const servers = Array.from(document.querySelectorAll('.cinema-player__server-btn, .server-btn, .party-bar__server-btn')).map(b => ({
        text: b.textContent?.trim(),
        active: b.classList.contains('active'),
      }))
      const title = document.querySelector('.cinema-player__title, h1, h2')?.textContent?.trim()
      return {
        hasIframe: !!iframe,
        iframeSrc: iframe?.src || null,
        iframeSandbox: iframe?.getAttribute('sandbox') || null,
        iframeWidth: iframe?.offsetWidth,
        iframeHeight: iframe?.offsetHeight,
        servers,
        title,
      }
    })

    console.log(`[${mode} Player State]:`, JSON.stringify(playerState, null, 2))

    // Test Server 2 if available
    console.log('Testing Server 2 click...')
    const switchedServer2 = await page.evaluate(() => {
      const srv2Btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Server 2')
      if (srv2Btn) {
        srv2Btn.click()
        return true
      }
      return false
    })
    console.log('Clicked Server 2 button:', switchedServer2)
    await new Promise(r => setTimeout(r, 3000))

    const server2IframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector('iframe')
      return iframe?.src || null
    })
    console.log(`[${mode} Server 2 Iframe Src]:`, server2IframeSrc)

    return {
      mode,
      consoleErrors,
      failedRequests,
      playerState,
      server2IframeSrc,
    }
  } finally {
    await browser.close()
  }
}

async function run() {
  await testPlayerOnVercel(false) // Desktop
  await testPlayerOnVercel(true)  // Mobile
}

run().catch(console.error)
