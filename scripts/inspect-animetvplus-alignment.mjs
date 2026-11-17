import puppeteer from 'puppeteer'
import path from 'path'

const ARTIFACTS_DIR = 'C:/Users/BHIMANI/.gemini/antigravity/brain/a2b9de21-66b7-4141-96b9-a2ff7e0be97d'

async function inspectAlignment() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()

  // Test Desktop (1440x900)
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto('http://localhost:5174#home', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1000))

  // Open Hero slide or One Piece
  console.log('Navigating to One Piece or first anime player...')
  await page.evaluate(() => {
    // Directly navigate to detail or player by finding a card
    const card = document.querySelector('.anime-card, .cinema-card, .hero-slide')
    if (card) {
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
      card.dispatchEvent(clickEvent)
    }
  })
  await new Promise(r => setTimeout(r, 1500))

  // Click Watch Now in detail view
  await page.evaluate(() => {
    const watchBtn = document.querySelector('.detail-hero__actions button, button.btn--primary')
    if (watchBtn) watchBtn.click()
  })
  await new Promise(r => setTimeout(r, 2500))

  // Capture desktop player screenshot
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'player_alignment_desktop.png') })
  console.log('Captured player_alignment_desktop.png')

  // Inspect iframe and stage bounding box
  const stageMetrics = await page.evaluate(() => {
    const stage = document.querySelector('.cinema-player__stage')
    const iframe = document.querySelector('.cinema-player__iframe')
    const container = document.querySelector('.cinema-player__viewport, .cinema-player__stage-container')
    const loader = document.querySelector('.player-loader')
    return {
      hasStage: !!stage,
      hasIframe: !!iframe,
      stageRect: stage?.getBoundingClientRect(),
      iframeRect: iframe?.getBoundingClientRect(),
      containerRect: container?.getBoundingClientRect(),
      iframeSrc: iframe?.getAttribute('src'),
      loaderState: loader?.className,
      loaderActive: loader?.classList.contains('player-loader--active')
    }
  })
  console.log('Desktop Stage Metrics:', stageMetrics)

  // Test Mobile (375x667)
  await page.setViewport({ width: 375, height: 667, isMobile: true })
  await new Promise(r => setTimeout(r, 1000))
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'player_alignment_mobile.png') })
  console.log('Captured player_alignment_mobile.png')

  const mobileMetrics = await page.evaluate(() => {
    const stage = document.querySelector('.cinema-player__stage')
    const iframe = document.querySelector('.cinema-player__iframe')
    return {
      stageRect: stage?.getBoundingClientRect(),
      iframeRect: iframe?.getBoundingClientRect(),
    }
  })
  console.log('Mobile Stage Metrics:', mobileMetrics)

  await browser.close()
}

inspectAlignment().catch(console.error)
