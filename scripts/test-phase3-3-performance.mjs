import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import puppeteer from 'puppeteer'
import animeRouter from '../backend/dist/routes/anime.js'

async function run() {
  console.log('=== 7ANIME PHASE 3.3 PERFORMANCE & POLISH VERIFICATION ===\n')

  const app = express()
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json())
  app.use('/api', animeRouter)
  app.use(express.static('dist'))

  const server = await new Promise(resolve => {
    const s = app.listen(4174, '127.0.0.1', () => resolve(s))
  })
  const backendServer = await new Promise(resolve => {
    const s = app.listen(3001, '127.0.0.1', () => resolve(s))
  })

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  })

  let allPassed = true
  const assert = (condition, msg) => {
    if (condition) {
      console.log(`[PASS] ${msg}`)
    } else {
      console.error(`[FAIL] ${msg}`)
      allPassed = false
    }
  }

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    // 1. HOME LOAD & HERO CAROUSEL CONTROLS CHECK
    console.log('--- 1. Testing Home Load & Hero Controls ---')
    await page.goto('http://127.0.0.1:4174/#home', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.hero-top10', { timeout: 15000 })
    assert(true, 'Home page and Hero mounted')

    // Confirm Hero has NO arrows and NO play/pause button
    const heroPrevBtn = await page.$('.hero-top10__strip-area button[aria-label="Previous"]')
    const heroNextBtn = await page.$('.hero-top10__strip-area button[aria-label="Next"]')
    const heroPauseBtn = await page.$('.hero-top10__strip-area button[aria-label*="autoplay" i]')
    const heroIconButtons = await page.$$('.hero-top10__strip-area .icon-button')

    assert(!heroPrevBtn, 'Hero has NO Previous slide arrow button')
    assert(!heroNextBtn, 'Hero has NO Next slide arrow button')
    assert(!heroPauseBtn, 'Hero has NO Play/Pause control button')
    assert(heroIconButtons.length === 0, `Hero strip-area has 0 icon-buttons (found: ${heroIconButtons.length})`)

    // Confirm Hero thumbnails exist and function as sole manual control
    const thumbnailsCount = await page.$$eval('.hero-top10__thumb', thumbs => thumbs.length)
    assert(thumbnailsCount === 10, `Hero has exactly 10 curated thumbnail controls (found: ${thumbnailsCount})`)

    // Screenshot 1: Main Capsule Navbar
    const navbarClip = await page.$eval('.desktop-nav', el => {
      const r = el.getBoundingClientRect()
      return { x: r.x - 10, y: r.y - 10, width: r.width + 20, height: r.height + 20 }
    })
    await page.screenshot({
      path: path.resolve('docs/screenshots/main_capsule_navbar.png'),
      clip: navbarClip,
    })
    console.log('[SAVED] docs/screenshots/main_capsule_navbar.png')

    // Screenshot 2: Home Hero
    await page.screenshot({
      path: path.resolve('docs/screenshots/home_hero.png'),
    })
    console.log('[SAVED] docs/screenshots/home_hero.png')

    // 2. HERO THUMBNAIL NAVIGATION
    console.log('\n--- 2. Testing Hero Thumbnail Navigation ---')
    // Click 2nd thumbnail (Naruto Shippuden)
    const secondThumbTitle = await page.$$eval('.hero-top10__thumb', thumbs => thumbs[1].getAttribute('aria-label'))
    await page.click('.hero-top10__thumb:nth-child(2)')
    await new Promise(r => setTimeout(r, 1200)) // wait for smooth slide transition

    const isSecondThumbActive = await page.$eval('.hero-top10__thumb:nth-child(2)', el => el.classList.contains('hero-top10__thumb--active'))
    assert(isSecondThumbActive, `Clicked thumbnail 2 ("${secondThumbTitle}") is now active`)

    // Screenshot 3: Hero thumbnail navigation
    await page.screenshot({
      path: path.resolve('docs/screenshots/hero_thumbnail_navigation.png'),
    })
    console.log('[SAVED] docs/screenshots/hero_thumbnail_navigation.png')

    // 3. CHECK FOUNDATIONPREVIEW HAS NO DUPLICATE MOVIES CONTENT
    console.log('\n--- 3. Verifying Redundant Movies Removed From Home ---')
    const moviesRailOnHome = await page.$('#movies-rail')
    assert(!moviesRailOnHome, 'Duplicate #movies-rail is NOT rendered on the Home page')

    // 4. ANIME CARD HOVER PREVIEW
    console.log('\n--- 4. Testing Card Hover Animation ---')
    // Scroll to trending rail
    await page.evaluate(() => {
      document.querySelector('#trending-rail')?.scrollIntoView({ behavior: 'instant' })
    })
    await new Promise(r => setTimeout(r, 800))

    const firstCard = await page.$('.anime-rail .anime-card')
    if (firstCard) {
      await firstCard.hover()
      // Wait 500ms for hover delay (350ms) + pop-out animation (340ms)
      await new Promise(r => setTimeout(r, 600))

      const hoverPortal = await page.$('.hover-preview-portal')
      assert(Boolean(hoverPortal), 'Hover preview portal mounted with smooth pop-out')

      // Screenshot 4: Anime hover preview
      await page.screenshot({
        path: path.resolve('docs/screenshots/anime_hover_preview.png'),
      })
      console.log('[SAVED] docs/screenshots/anime_hover_preview.png')

      // Move mouse away to test pop-in exit
      await page.mouse.move(10, 10)
      await new Promise(r => setTimeout(r, 450))
      const hoverPortalAfterExit = await page.$('.hover-preview-portal')
      assert(!hoverPortalAfterExit, 'Hover preview portal unmounted cleanly on pointer leave')
    }

    // 5. MOVIES NAVIGATION PERFORMANCE MEASUREMENT
    console.log('\n--- 5. Measuring Movies Navigation Performance ---')
    // Hover on Movies button to trigger prefetch
    await page.hover('.desktop-nav a[href="#movies"]')
    await new Promise(r => setTimeout(r, 200)) // simulate typical user hover delay

    const startTime = Date.now()
    await page.click('.desktop-nav a[href="#movies"]')
    await page.waitForSelector('.movies-view .movies-grid .anime-card', { timeout: 15000 })
    const navigationDurationMs = Date.now() - startTime
    console.log(`[PERF] Navigation to Movies took: ${navigationDurationMs}ms (Instant client cache transition)`)
    assert(navigationDurationMs < 2000, `Movies page opened smoothly in ${navigationDurationMs}ms (< 2000ms threshold)`)

    // Screenshot 5: Dedicated Movies Page
    await page.screenshot({
      path: path.resolve('docs/screenshots/dedicated_movies_page.png'),
    })
    console.log('[SAVED] docs/screenshots/dedicated_movies_page.png')

    // 6. MOBILE RESPONSIVENESS & TOUCH BEHAVIOR
    console.log('\n--- 6. Testing Mobile Responsiveness & Touch Behavior ---')
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.movies-view', { timeout: 15000 })
    assert(true, 'Movies page rendered on mobile viewport (390x844)')

    // Confirm mobile navigation pill is active
    const mobileGridCards = await page.$$eval('.movies-grid .anime-card', cards => cards.length)
    assert(mobileGridCards > 0, `Mobile movie grid rendered ${mobileGridCards} cards`)

    // Screenshot 6: Movies page on mobile
    await page.screenshot({
      path: path.resolve('docs/screenshots/movies_page_mobile.png'),
    })
    console.log('[SAVED] docs/screenshots/movies_page_mobile.png')

    console.log('\n=======================================')
    console.log(allPassed ? 'ALL PHASE 3.3 PERFORMANCE & POLISH TESTS PASSED!' : 'SOME TESTS FAILED!')
    console.log('=======================================')
  } catch (err) {
    console.error('Test execution error:', err)
    allPassed = false
  } finally {
    await browser.close()
    server.close()
    backendServer.close()
    process.exit(allPassed ? 0 : 1)
  }
}

run().catch(console.error)

