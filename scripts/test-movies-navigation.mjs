import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import puppeteer from 'puppeteer'
import animeRouter from '../backend/dist/routes/anime.js'

async function run() {
  console.log('--- TESTING MOVIES NAVIGATION & VIEW ---')
  const app = express()
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json())
  app.use('/api', animeRouter)
  app.use(express.static('dist'))

  const server = await new Promise(resolve => {
    const s = app.listen(4173, '127.0.0.1', () => resolve(s))
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

    // Test 1: Direct load / refresh on http://127.0.0.1:4173/#movies
    console.log('\nTest 1: Direct load on http://127.0.0.1:4173/#movies (browser refresh preservation)...')
    await page.goto('http://127.0.0.1:4173/#movies', { waitUntil: 'domcontentloaded' })
    const moviesViewEl = await page.waitForSelector('.movies-view', { timeout: 15000 })
    assert(Boolean(moviesViewEl), 'Dedicated .movies-view rendered on direct load with /#movies')

    const movieActive = await page.$eval('.desktop-nav a[href="#movies"]', el => el.classList.contains('active'))
    assert(movieActive, 'Movies navigation button has .active class on direct /#movies load')

    const homeActive = await page.$eval('.desktop-nav a[href="#home"]', el => el.classList.contains('active'))
    assert(!homeActive, 'Home navigation button is NOT active when on /#movies')

    const headingText = await page.$eval('.movies-view__header h1', el => el.textContent)
    assert(headingText.includes('Anime Movies'), `Header displays correct title: "${headingText}"`)

    // Allow movie cards to populate
    console.log('Waiting for movie cards to render in .movies-grid...')
    await page.waitForSelector('.movies-grid .anime-card', { timeout: 15000 })
    const movieCardsCount = await page.$$eval('.movies-grid .anime-card', cards => cards.length)
    assert(movieCardsCount > 0, `Movies grid rendered ${movieCardsCount} movie cards`)

    // Wait for images to load
    await new Promise(r => setTimeout(r, 2000))

    // Screenshot of Movies Page (hero & spotlight)
    const screenshotPath = path.resolve('docs/screenshots/movies_page.png')
    await page.screenshot({ path: screenshotPath })
    console.log(`Saved screenshot: ${screenshotPath}`)

    // Screenshot of Movies Grid
    await page.evaluate(() => {
      document.querySelector('.movies-toolbar')?.scrollIntoView({ behavior: 'instant' })
    })
    await new Promise(r => setTimeout(r, 1000))
    const gridScreenshotPath = path.resolve('docs/screenshots/movies_grid.png')
    await page.screenshot({ path: gridScreenshotPath })
    console.log(`Saved screenshot: ${gridScreenshotPath}`)

    // Test 2: Clicking Home
    console.log('\nTest 2: Clicking Home in navbar...')
    await page.click('.desktop-nav a[href="#home"]')
    await page.waitForSelector('.hero-top10', { timeout: 10000 })
    const isHomeActiveAfterClick = await page.$eval('.desktop-nav a[href="#home"]', el => el.classList.contains('active'))
    assert(isHomeActiveAfterClick, 'Home button becomes active after clicking Home')
    const isMoviesActiveAfterHome = await page.$eval('.desktop-nav a[href="#movies"]', el => el.classList.contains('active'))
    assert(!isMoviesActiveAfterHome, 'Movies button is no longer active after clicking Home')

    // Test 3: Clicking Movies
    console.log('\nTest 3: Clicking Movies in navbar...')
    await page.click('.desktop-nav a[href="#movies"]')
    await page.waitForSelector('.movies-view', { timeout: 10000 })
    const isMoviesActiveAgain = await page.$eval('.desktop-nav a[href="#movies"]', el => el.classList.contains('active'))
    assert(isMoviesActiveAgain, 'Movies button becomes active after clicking Movies')
    const urlHash = await page.evaluate(() => window.location.hash)
    assert(urlHash === '#movies', `URL hash is synchronized to #movies (got: ${urlHash})`)

    // Test 4: Browser Back navigation
    console.log('\nTest 4: Browser Back button...')
    await page.goBack()
    await page.waitForSelector('.hero-top10', { timeout: 10000 })
    const isHomeActiveAfterBack = await page.$eval('.desktop-nav a[href="#home"]', el => el.classList.contains('active'))
    assert(isHomeActiveAfterBack, 'Browser back returns to Home and Home navbar item is active')

    // Test 5: Browser Forward navigation
    console.log('\nTest 5: Browser Forward button...')
    await page.goForward()
    await page.waitForSelector('.movies-view', { timeout: 10000 })
    const isMoviesActiveAfterForward = await page.$eval('.desktop-nav a[href="#movies"]', el => el.classList.contains('active'))
    assert(isMoviesActiveAfterForward, 'Browser forward returns to Movies and Movies navbar item is active')

    // Test 6: Clicking a movie card opens Detail view
    console.log('\nTest 6: Clicking a movie card to open Detail view...')
    await new Promise(r => setTimeout(r, 1000))
    const firstMovieTitle = await page.$eval('.movies-grid .anime-card:first-child h3', el => el.textContent || '')
    await page.click('.movies-grid .anime-card:first-child')
    console.log(`Clicked movie card: "${firstMovieTitle}"`)
    const detailEl = await page.waitForSelector('.anime-detail, .detail-hero', { timeout: 15000 })
    assert(Boolean(detailEl), 'Movie card successfully opens anime detail page')

    console.log('\n=======================================')
    console.log(allPassed ? 'ALL MOVIES NAVIGATION TESTS PASSED!' : 'SOME TESTS FAILED!')
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

