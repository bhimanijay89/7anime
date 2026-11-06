import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'
import animeRouter from '../backend/dist/routes/anime.js'
import dns from 'dns'

async function capture() {
  const screenshotDir = path.resolve('docs/screenshots')
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true })
  }

  const resolver = new dns.promises.Resolver()
  resolver.setServers(['8.8.8.8', '1.1.1.1'])
  const ips = await resolver.resolve4('image.tmdb.org').catch(() => ['84.17.38.227'])
  const tmdbIp = ips[0] || '84.17.38.227'
  console.log(`Resolved image.tmdb.org to ${tmdbIp} via public DNS`)

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
      `--host-resolver-rules=MAP image.tmdb.org ${tmdbIp}`,
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
    await new Promise(r => setTimeout(r, 4000))

    // Helper to click thumbnail by title substring and wait for logo
    async function clickSlideByTitle(query) {
      await page.evaluate((q) => {
        const thumbs = Array.from(document.querySelectorAll('.hero-top10__thumb'))
        const target = thumbs.find(t => (t.getAttribute('aria-label') || t.textContent || '').toLowerCase().includes(q.toLowerCase()))
        if (target) target.click()
      }, query)
      await page.waitForFunction(() => {
        const img = document.querySelector('.hero-top10 .anime-logo__img')
        return img && (img.classList.contains('anime-logo__img--loaded') || (img.complete && img.naturalWidth > 0))
      }, { timeout: 8000 }).catch(() => {})
      await new Promise(r => setTimeout(r, 1200))
    }

    // Screenshot 1: Desktop Viewport (Full Bleed Hero with floating capsule navbar)
    console.log('Capturing Desktop Full-Bleed Viewport Hero (One Piece)...')
    await clickSlideByTitle('One Piece')
    await page.screenshot({ path: path.join(screenshotDir, 'hero_fullbleed_desktop.png') })
    console.log('Saved docs/screenshots/hero_fullbleed_desktop.png')

    // Screenshot 2: Capsule Navbar
    console.log('Capturing Capsule Navbar screenshot...')
    const navEl = await page.$('.desktop-nav')
    if (navEl) {
      await navEl.screenshot({ path: path.join(screenshotDir, 'capsule_navbar.png') })
      console.log('Saved docs/screenshots/capsule_navbar.png')
    }

    const heroEl = await page.$('.hero-top10')

    // Screenshot 3: Hero Slide #1 (One Piece)
    console.log('Capturing Hero: One Piece...')
    await clickSlideByTitle('One Piece')
    if (heroEl) {
      await heroEl.screenshot({ path: path.join(screenshotDir, 'hero_curated_onepiece.png') })
      console.log('Saved docs/screenshots/hero_curated_onepiece.png')
    }

    // Screenshot 4: Hero Slide #2 (Naruto Shippuden)
    console.log('Capturing Hero: Naruto Shippuden...')
    await clickSlideByTitle('Naruto')
    if (heroEl) {
      await heroEl.screenshot({ path: path.join(screenshotDir, 'hero_curated_naruto.png') })
      console.log('Saved docs/screenshots/hero_curated_naruto.png')
    }

    // Screenshot 5: Hero Slide (Jujutsu Kaisen)
    console.log('Capturing Hero: Jujutsu Kaisen...')
    await clickSlideByTitle('Jujutsu Kaisen')
    if (heroEl) {
      await heroEl.screenshot({ path: path.join(screenshotDir, 'hero_curated_jujutsukaisen.png') })
      console.log('Saved docs/screenshots/hero_curated_jujutsukaisen.png')
    }

    // Screenshot 6: Hero Slide #10 (Death Note)
    console.log('Capturing Hero: Death Note...')
    await clickSlideByTitle('Death Note')
    if (heroEl) {
      await heroEl.screenshot({ path: path.join(screenshotDir, 'hero_curated_deathnote.png') })
      console.log('Saved docs/screenshots/hero_curated_deathnote.png')
    }

    // Screenshot 7: Mobile Viewport Hero (390x844)
    console.log('Capturing Mobile Hero...')
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    await clickSlideByTitle('One Piece')
    await new Promise(r => setTimeout(r, 2000))
    await page.screenshot({ path: path.join(screenshotDir, 'mobile_hero.png') })
    console.log('Saved docs/screenshots/mobile_hero.png')

    // Reset viewport for detail page
    await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false })
    await new Promise(r => setTimeout(r, 1000))

    // Screenshot 8: Anime Detail Page (One Piece)
    console.log('Navigating to Anime Detail Page for One Piece...')
    await page.evaluate(() => {
      const btn = document.querySelector('.hero-top10__actions button')
      if (btn) btn.click()
    })
    console.log('Waiting for .detail-hero to mount...')
    const detailEl = await page.waitForSelector('.detail-hero', { timeout: 20000 })
    if (detailEl) {
      await page.waitForFunction(() => {
        const img = document.querySelector('.detail-hero .anime-logo__img')
        return img && (img.classList.contains('anime-logo__img--loaded') || (img.complete && img.naturalWidth > 0))
      }, { timeout: 8000 }).catch(() => {})
      await new Promise(r => setTimeout(r, 2000))
      await detailEl.screenshot({ path: path.join(screenshotDir, 'anime_detail.png') })
      console.log('Saved docs/screenshots/anime_detail.png')
    }
  } catch (err) {
    console.error('Error during screenshot capture:', err)
  } finally {
    await browser.close()
    server.close()
    backendServer.close()
  }
}

capture().catch(console.error)
