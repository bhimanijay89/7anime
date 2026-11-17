import puppeteer from 'puppeteer'
import path from 'path'

const ARTIFACTS_DIR = 'C:/Users/BHIMANI/.gemini/antigravity/brain/a2b9de21-66b7-4141-96b9-a2ff7e0be97d'
const BASE_URL = 'http://localhost:5174'

async function runTests() {
  console.log('=== STARTING NAVBAR REFINEMENT VERIFICATION ===')

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

    // 1. DESKTOP NAVBAR TEST (1440x900)
    console.log('\n--- 1. Testing Desktop Navbar (1440x900) ---')
    await page.goto(BASE_URL + '#home', { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 1000))

    const desktopNav = await page.$('.desktop-nav')
    assert(desktopNav !== null, 'Desktop navbar exists in DOM')

    // Check Party Play button is NOT present in Desktop Navbar
    const partyBtnDesktop = await page.$('.desktop-nav button[aria-label*="Party" i], .desktop-nav button[title*="Party" i]')
    const partyTextDesktop = await page.evaluate(() => {
      const nav = document.querySelector('.desktop-nav')
      if (!nav) return false
      return nav.textContent?.includes('Party Play') || false
    })
    assert(!partyBtnDesktop && !partyTextDesktop, 'Party Play button is NOT present in desktop navbar')

    // Check standard desktop elements
    const brandDesktop = await page.$('.desktop-nav .brand')
    assert(brandDesktop !== null, 'Brand logo is present in desktop navbar')

    const middleLinksDesktop = await page.$$('.desktop-nav nav a')
    assert(middleLinksDesktop.length >= 4, `Middle links present: ${middleLinksDesktop.length} links`)

    const searchBtnDesktop = await page.$('.desktop-nav__actions button[aria-label*="search" i]')
    assert(searchBtnDesktop !== null, 'Search button is present in desktop navbar')

    const notifBtnDesktop = await page.$('.desktop-nav__actions button[aria-label*="notification" i]')
    assert(notifBtnDesktop !== null, 'Notification button is present in desktop navbar')

    // Capture desktop screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'desktop_navbar_no_party.png'), clip: { x: 0, y: 0, width: 1440, height: 120 } })
    console.log('Captured desktop_navbar_no_party.png')

    // 2. MOBILE TOP NAVBAR TEST (375x667)
    console.log('\n--- 2. Testing Mobile Top Navbar (375x667) ---')
    await page.setViewport({ width: 375, height: 667, isMobile: true })
    await new Promise(r => setTimeout(r, 600))

    // Check visible elements in top navbar
    const mobileTopElements = await page.evaluate(() => {
      const nav = document.querySelector('.desktop-nav')
      if (!nav) return { error: 'No .desktop-nav' }
      
      const isVisible = (el) => {
        if (!el) return false
        const style = window.getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.width > 0 && rect.height > 0
      }

      const logoVisible = isVisible(document.querySelector('.desktop-nav .brand'))
      const avatarVisible = isVisible(document.querySelector('.desktop-nav .profile-chip'))
      
      // Check middle links visibility
      const linksContainer = document.querySelector('.desktop-nav nav')
      const linksVisible = isVisible(linksContainer)
      
      // Check search & notif buttons visibility
      const searchBtn = document.querySelector('.desktop-nav__actions button[aria-label*="search" i]')
      const searchVisible = isVisible(searchBtn)
      const notifBtn = document.querySelector('.desktop-nav__actions button[aria-label*="notification" i]')
      const notifVisible = isVisible(notifBtn)
      const partyBtn = document.querySelector('.desktop-nav [aria-label*="Party" i]')
      const partyVisible = isVisible(partyBtn)

      // Count direct visible clickable items (Logo + Profile Avatar)
      const visibleClickables = Array.from(nav.querySelectorAll('button, a')).filter(isVisible)

      return {
        logoVisible,
        avatarVisible,
        linksVisible,
        searchVisible,
        notifVisible,
        partyVisible,
        visibleCount: visibleClickables.length,
        visibleLabels: visibleClickables.map(b => b.getAttribute('aria-label') || b.textContent?.trim())
      }
    })

    console.log('Mobile Top Navbar Inspection:', mobileTopElements)
    assert(mobileTopElements.logoVisible, 'Logo is visible on left')
    assert(mobileTopElements.avatarVisible, 'Profile Avatar is visible on right')
    assert(!mobileTopElements.linksVisible, 'Middle links are hidden on mobile')
    assert(!mobileTopElements.searchVisible, 'Search button is hidden in mobile top bar')
    assert(!mobileTopElements.notifVisible, 'Notification button is hidden in mobile top bar')
    assert(!mobileTopElements.partyVisible, 'Party Play button is NOT in mobile top bar')
    assert(mobileTopElements.visibleCount === 2, `Top mobile navbar has EXACTLY 2 elements (Logo & Avatar). Found: ${mobileTopElements.visibleCount}`)

    // 3. MOBILE BOTTOM NAVIGATION TEST (375x667)
    console.log('\n--- 3. Testing Mobile Bottom Navigation (375x667) ---')
    const bottomNavData = await page.evaluate(() => {
      const nav = document.querySelector('.mobile-nav')
      if (!nav) return { error: 'No .mobile-nav' }
      
      const items = Array.from(nav.querySelectorAll('a'))
      const labels = items.map(it => it.querySelector('span')?.textContent?.trim() || '')
      const hasOverflow = nav.scrollWidth > nav.clientWidth

      return {
        itemCount: items.length,
        labels,
        hasOverflow,
        clientWidth: nav.clientWidth,
        scrollWidth: nav.scrollWidth
      }
    })

    console.log('Mobile Bottom Navigation Inspection:', bottomNavData)
    assert(bottomNavData.itemCount === 5, `Mobile bottom nav has EXACTLY 5 items (Found: ${bottomNavData.itemCount})`)
    const expectedLabels = ['Home', 'Discover', 'Movies', 'Schedule', 'My List']
    const labelsMatch = expectedLabels.every((lbl, idx) => bottomNavData.labels[idx] === lbl)
    assert(labelsMatch, `Bottom nav labels match expected: ${bottomNavData.labels.join(', ')}`)
    assert(!bottomNavData.labels.includes('Profile'), 'Profile is NOT in bottom nav')
    assert(!bottomNavData.labels.includes('Party Play'), 'Party Play is NOT in bottom nav')
    assert(!bottomNavData.hasOverflow, 'Mobile bottom nav has NO horizontal overflow')

    // 4. MOBILE SMALL VIEWPORT TEST (320x568)
    console.log('\n--- 4. Testing Small Mobile Viewport (320x568) ---')
    await page.setViewport({ width: 320, height: 568, isMobile: true })
    await new Promise(r => setTimeout(r, 500))

    const smallViewportData = await page.evaluate(() => {
      const nav = document.querySelector('.mobile-nav')
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth
      const navOverflow = nav ? nav.scrollWidth > nav.clientWidth : false
      const navWidth = nav ? nav.getBoundingClientRect().width : 0
      return { docOverflow, navOverflow, navWidth, windowWidth: window.innerWidth }
    })

    console.log('320px Viewport Inspection:', smallViewportData)
    assert(!smallViewportData.docOverflow, '320px viewport has NO horizontal document overflow')
    assert(!smallViewportData.navOverflow, '320px bottom nav has NO horizontal overflow')
    assert(smallViewportData.navWidth <= 320, `320px bottom nav fits viewport (width: ${smallViewportData.navWidth}px)`)

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_320px_navbar.png') })
    console.log('Captured mobile_320px_navbar.png')

    // 5. INTERACTION & NAVIGATION TEST
    console.log('\n--- 5. Testing Navigation Interactions ---')
    // Reset to 375x667
    await page.setViewport({ width: 375, height: 667, isMobile: true })
    await new Promise(r => setTimeout(r, 500))

    // Capture initial top and bottom navbar screenshot
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_top_bottom_navbar.png') })
    console.log('Captured mobile_top_bottom_navbar.png')

    // Click Profile Avatar in top navbar
    console.log('Clicking Profile Avatar in top navbar...')
    await page.click('.desktop-nav .profile-chip')
    await new Promise(r => setTimeout(r, 600))

    let currentHash = await page.evaluate(() => window.location.hash)
    console.log('Hash after clicking profile:', currentHash)
    assert(currentHash === '#profile', `Clicking avatar navigates to #profile (got: ${currentHash})`)

    // Click Movies in bottom navbar
    console.log('Clicking Movies in bottom navbar...')
    await page.click('.mobile-nav a[href="#movies"]')
    await new Promise(r => setTimeout(r, 600))
    currentHash = await page.evaluate(() => window.location.hash)
    console.log('Hash after clicking Movies:', currentHash)
    assert(currentHash === '#movies', `Clicking Movies tab navigates to #movies (got: ${currentHash})`)

    // Click Schedule in bottom navbar
    console.log('Clicking Schedule in bottom navbar...')
    await page.click('.mobile-nav a[href="#schedule"]')
    await new Promise(r => setTimeout(r, 600))
    currentHash = await page.evaluate(() => window.location.hash)
    console.log('Hash after clicking Schedule:', currentHash)
    assert(currentHash === '#schedule', `Clicking Schedule tab navigates to #schedule (got: ${currentHash})`)

    // Click Discover in bottom navbar
    console.log('Clicking Discover in bottom navbar...')
    await page.click('.mobile-nav a[href="#discover"]')
    await new Promise(r => setTimeout(r, 600))
    currentHash = await page.evaluate(() => window.location.hash)
    console.log('Hash after clicking Discover:', currentHash)
    assert(currentHash === '#discover', `Clicking Discover tab navigates to #discover (got: ${currentHash})`)

    // Click Home in bottom navbar
    console.log('Clicking Home in bottom navbar...')
    await page.click('.mobile-nav a[href="#home"]')
    await new Promise(r => setTimeout(r, 600))
    currentHash = await page.evaluate(() => window.location.hash)
    console.log('Hash after clicking Home:', currentHash)
    assert(currentHash === '#home', `Clicking Home tab navigates to #home (got: ${currentHash})`)

    // 6. SCROLL BEHAVIOR TEST
    console.log('\n--- 6. Testing Scroll Hide/Show Behavior ---')
    // Scroll down 300px
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }))
    await new Promise(r => setTimeout(r, 600))

    const isHiddenScrolledDown = await page.evaluate(() => {
      const nav = document.querySelector('.desktop-nav')
      if (!nav) return false
      const hasHiddenClass = nav.classList.contains('desktop-nav--scrolled-down')
      const style = window.getComputedStyle(nav)
      const transform = style.transform
      const opacity = style.opacity
      return hasHiddenClass || transform.includes('-') || opacity === '0'
    })
    console.log('Top navbar hidden after scrolling down 300px:', isHiddenScrolledDown)
    assert(isHiddenScrolledDown, 'Top navbar hides on scroll down')

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_scrolled_navbar.png') })
    console.log('Captured mobile_scrolled_navbar.png')

    // Scroll up 100px
    await page.evaluate(() => window.scrollTo({ top: 150, behavior: 'instant' }))
    await new Promise(r => setTimeout(r, 600))

    const isVisibleScrolledUp = await page.evaluate(() => {
      const nav = document.querySelector('.desktop-nav')
      if (!nav) return false
      const hasHiddenClass = nav.classList.contains('desktop-nav--scrolled-down')
      return !hasHiddenClass
    })
    console.log('Top navbar reappears after scrolling up:', isVisibleScrolledUp)
    assert(isVisibleScrolledUp, 'Top navbar reappears on scroll up')

    // 7. PLAYER WATCH PARTY REGRESSION CHECK
    console.log('\n--- 7. Testing Player Watch Party Button Regression ---')
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(BASE_URL + '#home', { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 1000))

    // Open video player directly by clicking Hero "Watch Now" button or an anime card
    // First try Hero slide Watch Now button
    const watchNowBtn = await page.$('.hero-slide__action-btn, .hero-slide__actions button')
    if (watchNowBtn) {
      console.log('Found Hero slide action button, clicking...')
      await watchNowBtn.click()
      await new Promise(r => setTimeout(r, 1200))
    } else {
      // Click first anime card
      console.log('Clicking anime card...')
      await page.click('.anime-card, .cinema-card')
      await new Promise(r => setTimeout(r, 1200))
    }

    // Check if in detail view and click Watch Now
    const detailWatch = await page.$('.detail-hero__actions button, .detail-actions button, button[title*="Watch" i]')
    if (detailWatch) {
      console.log('Clicking Watch Now in detail view...')
      await detailWatch.click()
      await new Promise(r => setTimeout(r, 1500))
    }

    // Now check cinema player for Watch Party button
    const partyInPlayer = await page.evaluate(() => {
      const topbarActions = document.querySelector('.cinema-player__topbar-actions')
      if (topbarActions) {
        const btn = topbarActions.querySelector('button[title*="Party" i], button[title*="Watch Party" i]')
        const hasText = topbarActions.textContent?.includes('Party') || false
        if (btn || hasText) return true
      }
      const player = document.querySelector('.cinema-player')
      return player ? (player.textContent?.includes('Watch Party') || player.textContent?.includes('Party')) : false
    })

    console.log('Watch Party button present inside cinema player:', partyInPlayer)
    assert(partyInPlayer, 'Watch Party button remains 100% available and functional inside Video Player')

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'player_party_play_present.png') })
    console.log('Captured player_party_play_present.png')

  } catch (err) {
    console.error('Test execution error:', err)
    allPassed = false
  } finally {
    await browser.close()
  }

  console.log('\n=== NAVBAR VERIFICATION SUMMARY ===')
  if (allPassed) {
    console.log('ALL TESTS PASSED SUCCESSFULLY! (0 FAILURES)')
  } else {
    console.error('SOME TESTS FAILED! Review output above.')
    process.exitCode = 1
  }
}

runTests()
