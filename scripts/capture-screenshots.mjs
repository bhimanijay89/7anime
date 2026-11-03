import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'
import animeRouter from '../backend/dist/routes/anime.js'

async function capture() {
  const screenshotDir = path.resolve('docs/screenshots')
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true })
  }

  console.log('1. Starting unified in-process test server on port 4173 and backend on port 3001...')
  const app = express()
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json())
  app.use('/api', animeRouter)
  app.use(express.static('dist'))

  const server = await new Promise((resolve) => {
    const s = app.listen(4173, '127.0.0.1', () => resolve(s))
  })
  const backendServer = await new Promise((resolve) => {
    const s = app.listen(3001, '127.0.0.1', () => resolve(s))
  })
  console.log('Frontend server listening on http://127.0.0.1:4173 and Backend on http://127.0.0.1:3001')

  console.log('2. Launching Puppeteer with installed Chrome...')
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,900',
      '--host-resolver-rules=MAP image.tmdb.org 169.150.207.217'
    ]
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    console.log('3. Navigating to http://127.0.0.1:4173 ...')
    await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded', timeout: 25000 })
    console.log('Waiting for .hero-top10 to render...')
    await page.waitForSelector('.hero-top10', { timeout: 35000 })
    console.log('.hero-top10 mounted, allowing logos to settle...')
    await new Promise(r => setTimeout(r, 4500))

    // Screenshot 0: Capsule Navbar
    console.log('4a. Capturing Capsule Navbar screenshot...')
    const navEl = await page.$('.desktop-nav')
    if (navEl) {
      await navEl.screenshot({ path: path.join(screenshotDir, 'capsule_navbar.png') })
      console.log('Saved docs/screenshots/capsule_navbar.png')
    }

    // Screenshot 1: Top 10 Hero (Default Slide 1)
    console.log('4b. Capturing Top 10 Hero screenshot...')
    const heroEl = await page.$('.hero-top10')
    if (heroEl) {
      await heroEl.screenshot({ path: path.join(screenshotDir, 'hero_top10.png') })
      console.log('Saved docs/screenshots/hero_top10.png')
    }

    // Click One Piece (thumbnail 3) on the Top 10 strip
    console.log('Clicking thumbnail #3 (One Piece) on Top 10 strip...')
    await page.evaluate(() => {
      const thumbs = Array.from(document.querySelectorAll('.hero-top10__thumb'))
      const opIdx = thumbs.findIndex(t => (t.getAttribute('aria-label') || t.innerText || '').toLowerCase().includes('one piece'))
      if (opIdx >= 0) thumbs[opIdx].click()
      else if (thumbs[2]) thumbs[2].click()
    })
    await new Promise(r => setTimeout(r, 3000))
    if (heroEl) {
      await heroEl.screenshot({ path: path.join(screenshotDir, 'hero_top10_onepiece.png') })
      console.log('Saved docs/screenshots/hero_top10_onepiece.png')
    }

    // Screenshot 2: Upcoming Anime Carousel
    console.log('5. Capturing Upcoming Anime carousel screenshot...')
    const upcomingEl = await page.$('.upcoming-hero')
    if (upcomingEl) {
      await upcomingEl.scrollIntoView()
      await new Promise(r => setTimeout(r, 1500))
      await upcomingEl.screenshot({ path: path.join(screenshotDir, 'upcoming_carousel.png') })
      console.log('Saved docs/screenshots/upcoming_carousel.png')
    } else {
      console.warn('Upcoming hero element not found')
    }

    // Screenshot 3: Anime Detail Page (One Piece)
    console.log('6. Navigating to Anime Detail Page for One Piece...')
    if (heroEl) {
      await heroEl.scrollIntoView()
      await new Promise(r => setTimeout(r, 800))
    }
    const heroAction = await page.$('.hero-top10__actions .button')
    if (heroAction) {
      await heroAction.click()
      await new Promise(r => setTimeout(r, 3500))
      console.log('Waiting for .detail-hero to mount...')
      const detailEl = await page.waitForSelector('.detail-hero', { timeout: 20000 })
      if (detailEl) {
        await new Promise(r => setTimeout(r, 2000))
        await detailEl.screenshot({ path: path.join(screenshotDir, 'anime_detail.png') })
        console.log('Saved docs/screenshots/anime_detail.png')
      }
    }
  } catch (err) {
    console.error('Error during screenshot capture:', err)
  } finally {
    await browser.close()
    server.close()
    backendServer.close()
    console.log('Screenshot capture process finished.')
    process.exit(0)
  }
}

capture().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
