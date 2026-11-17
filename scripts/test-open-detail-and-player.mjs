import puppeteer from 'puppeteer'
import path from 'path'

const ARTIFACTS_DIR = 'C:/Users/BHIMANI/.gemini/antigravity/brain/a2b9de21-66b7-4141-96b9-a2ff7e0be97d'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()))
  page.on('pageerror', err => console.error('[BROWSER ERR]', err.message))

  await page.goto('http://localhost:5174#home', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1000))

  // Find a card or hero button to click
  console.log('Finding anime card to click...')
  const cardTitle = await page.evaluate(() => {
    const card = document.querySelector('.anime-card, .cinema-card')
    const title = card?.querySelector('.anime-card__title, h3, h4')?.textContent?.trim()
    if (card) {
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
      card.dispatchEvent(clickEvent)
    }
    return title
  })
  console.log('Clicked card with title:', cardTitle)
  await new Promise(r => setTimeout(r, 1500))

  // Take screenshot of detail view
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'debug_detail_view.png') })

  const detailState = await page.evaluate(() => {
    const heading = document.querySelector('.anime-detail h1, .detail-hero__title, .detail-hero__logo')?.textContent?.trim()
    const epHeading = document.querySelector('.episode-section h2, .episode-empty h2')?.textContent?.trim()
    const isUnavailable = document.body.textContent.includes('Episodes unavailable')
    const epCards = document.querySelectorAll('.episode-card, .episode-item').length
    return { heading, epHeading, isUnavailable, epCards }
  })
  console.log('Detail State:', detailState)

  // Click Watch Ep 1
  const watchEp1Btn = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.detail-hero__actions button, button')).find(b => b.textContent?.includes('Watch Ep') || b.textContent?.includes('Watch Now'))
    if (btn) {
      btn.click()
      return btn.textContent?.trim()
    }
    return null
  })
  console.log('Clicked watch button:', watchEp1Btn)
  await new Promise(r => setTimeout(r, 2000))

  // Take screenshot of player view
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'debug_player_view.png') })

  const playerState = await page.evaluate(() => {
    const isPreparing = document.body.textContent.includes('Preparing your episode')
    const loader = document.querySelector('.player-loader')
    const stage = document.querySelector('.cinema-player__stage')
    const iframe = document.querySelector('.cinema-player__iframe')
    const epTitle = document.querySelector('.cinema-player__ep-title')?.textContent?.trim()
    const iframeSrc = iframe?.getAttribute('src')
    return {
      isPreparing,
      loaderClass: loader?.className,
      loaderActive: loader?.classList.contains('player-loader--active'),
      stageDimensions: stage ? { width: stage.clientWidth, height: stage.clientHeight } : null,
      iframeDimensions: iframe ? { width: iframe.clientWidth, height: iframe.clientHeight } : null,
      epTitle,
      iframeSrc
    }
  })
  console.log('Player State:', playerState)

  await browser.close()
}

run().catch(console.error)
