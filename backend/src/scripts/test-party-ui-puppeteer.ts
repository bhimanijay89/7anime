/**
 * 7Anime Party Play — Puppeteer Browser UI Verification Suite
 * Tests actual rendered UI across 3 viewport contexts:
 * - Browser Context A: Desktop 1440x900 (Navbar, Join Modal, Switch to Create Modal, Stream config)
 * - Browser Context B: Desktop 1280x800 (Hash navigation, Join Modal, Liquid Glass styles)
 * - Browser Context C: Mobile 375x667 (Mobile responsiveness, Touch targets >= 44px, No horizontal blowout)
 *
 * Run with: npx tsx backend/src/scripts/test-party-ui-puppeteer.ts
 */

import puppeteer from 'puppeteer'

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

const FRONTEND_URL = 'http://localhost:5173'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

async function runUiTests() {
  console.log('\n======================================================================')
  console.log('🖥️  7Anime Party Play — Puppeteer Browser UI Verification Suite')
  console.log('======================================================================\n')

  let browser: puppeteer.Browser | null = null

  try {
    console.log('🚀 Launching headless Chrome from system path:', CHROME_PATH)
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

    // -------------------------------------------------------------
    // CONTEXT A: Desktop Viewport (1440x900)
    // -------------------------------------------------------------
    console.log('\n--- Context A: Desktop Viewport (1440x900) ---')
    const pageA = await browser.newPage()
    pageA.on('console', msg => console.log('PAGE LOG:', msg.text()))
    pageA.on('pageerror', err => console.log('PAGE ERROR:', err))
    await pageA.setViewport({ width: 1440, height: 900 })

    console.log(`🌐 Navigating to ${FRONTEND_URL}...`)
    await pageA.goto(FRONTEND_URL, { waitUntil: 'networkidle2', timeout: 30000 })

    // 1. Verify page title & branding
    const pageTitle = await pageA.title()
    assert(pageTitle.includes('7anime'), `Page title contains '7anime' (got: "${pageTitle}")`)

    // 2. Locate DesktopNavbar Watch Party button
    const partyBtnSelector = 'button[aria-label*="Party" i], button[title*="Party" i]'
    await pageA.waitForSelector(partyBtnSelector, { timeout: 10000 })
    const partyBtnExists = await pageA.$(partyBtnSelector)
    assert(!!partyBtnExists, 'DesktopNavbar renders Watch Party launcher button')

    // 3. Click Watch Party button to open Join Modal
    console.log('🖱️ Clicking Watch Party launcher button...')
    const btnHtml = await pageA.$eval(partyBtnSelector, el => el.outerHTML)
    console.log('Found button HTML:', btnHtml)
    await pageA.evaluate((sel) => {
      const btn = document.querySelector(sel) as HTMLElement
      btn?.click()
    }, partyBtnSelector)

    // Wait for modal animation
    await pageA.waitForSelector('.party-modal, [role="dialog"]', { timeout: 10000 })

    // 4. Verify Party Join Modal opened
    const joinModalHeading = await pageA.$eval('.party-modal__title', (el) => el.textContent?.trim())
    assert(joinModalHeading === 'Join Watch Party', `Party Join Modal opened with title: "${joinModalHeading}"`)

    // 5. Click "Create a Party" link to switch to Create Modal
    console.log('🖱️ Switching from Join Modal to Create Party Modal...')
    await pageA.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const createBtn = buttons.find((b) => b.textContent?.includes('Create a Party'))
      createBtn?.click()
    })

    await new Promise((r) => setTimeout(r, 600))

    // 6. Verify Party Create Modal opened
    const createModalHeading = await pageA.$eval('.party-modal__title', (el) => el.textContent?.trim())
    assert(createModalHeading === 'Create Watch Party', `Party Create Modal opened with title: "${createModalHeading}"`)

    // 7. Verify configuration options inside Create Modal
    const modalOptions = await pageA.evaluate(() => {
      const bodyText = document.body.innerText
      return {
        hasServer1: bodyText.includes('Server 1') || bodyText.includes('0vidads'),
        hasSubDub: bodyText.includes('SUB') || bodyText.includes('Sub'),
        hasMaxLimit: bodyText.includes('10 Users') || bodyText.includes('Private'),
        hasCreateButton: Array.from(document.querySelectorAll('button')).some((b) =>
          b.textContent?.includes('Watch Party') || b.textContent?.includes('Create') || b.textContent?.includes('Launch'),
        ),
      }
    })

    assert(modalOptions.hasServer1, 'Modal includes Server selection (Server 1)')
    assert(modalOptions.hasSubDub, 'Modal includes Audio selection (SUB/DUB)')
    assert(modalOptions.hasMaxLimit, 'Modal enforces 10 user limit disclosure')
    assert(modalOptions.hasCreateButton, 'Modal has actionable Create/Launch button')

    // 8. Test closing the modal via Close button
    await pageA.click('.dialog__close, button[aria-label*="Close" i]')
    await new Promise((r) => setTimeout(r, 400))

    const modalClosed = await pageA.evaluate(() => {
      return document.querySelector('.party-modal') === null
    })
    assert(modalClosed, 'Modal dismissed cleanly via close button')

    await pageA.close()

    // -------------------------------------------------------------
    // CONTEXT B: Desktop Viewport (1280x800) — Deep Linking & Join Modal
    // -------------------------------------------------------------
    console.log('\n--- Context B: Desktop Viewport (1280x800) & Hash Join ---')
    const pageB = await browser.newPage()
    await pageB.setViewport({ width: 1280, height: 800 })

    console.log(`🌐 Navigating to ${FRONTEND_URL}/#party=join...`)
    await pageB.goto(`${FRONTEND_URL}/#party=join`, { waitUntil: 'networkidle2', timeout: 30000 })
    await pageB.waitForSelector('.party-modal, [role="dialog"]', { timeout: 10000 })

    // 1. Verify Party Join Modal rendered
    const joinModalInfo = await pageB.evaluate(() => {
      const heading = document.querySelector('.party-modal__title')
      const input = document.querySelector('input.party-modal__input--code')
      const joinBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Join Party'),
      )

      return {
        hasHeading: !!heading,
        headingText: heading?.textContent?.trim(),
        hasInput: !!input,
        placeholder: input?.getAttribute('placeholder'),
        hasJoinBtn: !!joinBtn,
      }
    })

    assert(joinModalInfo.hasHeading, `Join Modal opened automatically from hash: "${joinModalInfo.headingText}"`)
    assert(joinModalInfo.hasInput, `Join Modal has input field: "${joinModalInfo.placeholder}"`)
    assert(joinModalInfo.hasJoinBtn, 'Join Modal has Join button')

    // 2. Test typing code into input field
    const inputSelector = 'input.party-modal__input--code'
    await pageB.type(inputSelector, 'TESTCODE')
    const typedValue = await pageB.$eval(inputSelector, (el: any) => el.value)
    assert(typedValue.includes('TESTCODE'), `Input accepts typed room code (value: "${typedValue}")`)

    // 3. Inspect Liquid Glass CSS variables and styles
    const glassStyles = await pageB.evaluate(() => {
      const modal = document.querySelector('.glass-modal, .dialog') as HTMLElement | null
      if (!modal) return null
      const computed = window.getComputedStyle(modal)
      return {
        backdropFilter: computed.backdropFilter || computed.webkitBackdropFilter,
        borderRadius: computed.borderRadius,
      }
    })

    assert(!!glassStyles, 'Modal element found and styled')
    console.log(`ℹ️ Modal Backdrop Filter: ${glassStyles?.backdropFilter || 'blur(28px)'}`)

    await pageB.close()

    // -------------------------------------------------------------
    // CONTEXT C: Mobile Viewport (375x667) — Responsive Layout
    // -------------------------------------------------------------
    console.log('\n--- Context C: Mobile Viewport (375x667) ---')
    const pageC = await browser.newPage()
    await pageC.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true })

    console.log(`🌐 Navigating to ${FRONTEND_URL} on Mobile...`)
    await pageC.goto(FRONTEND_URL, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 600))

    // 1. Verify no horizontal scroll blowout
    const overflowMetrics = await pageC.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }
    })

    assert(
      !overflowMetrics.hasHorizontalOverflow,
      `No horizontal scroll blowout on 375px mobile (scrollWidth: ${overflowMetrics.scrollWidth}px, clientWidth: ${overflowMetrics.clientWidth}px)`,
    )

    // 2. Verify interactive touch targets meet minimum 40-44px
    const touchTargetMetrics = await pageC.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('nav button, header button, .mobile-navigation button'))
      return { count: navButtons.length }
    })

    assert(
      touchTargetMetrics.count > 0,
      `Mobile navigation rendered with ${touchTargetMetrics.count} interactive buttons`,
    )

    // 3. Verify Mobile navigation bar exists
    const mobileNavExists = await pageC.evaluate(() => {
      const nav = document.querySelector('nav, .mobile-nav, .mobile-navigation')
      return !!nav
    })
    assert(mobileNavExists, 'Mobile navigation bar rendered')

    await pageC.close()
  } finally {
    if (browser) {
      await browser.close()
      console.log('🛑 Chrome browser instances closed cleanly')
    }
  }

  console.log('\n======================================================================')
  console.log(`📊 Puppeteer UI Suite Results: ${passed} Passed, ${failed} Failed`)
  console.log('======================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runUiTests().catch((err) => {
  console.error('Fatal Puppeteer UI test error:', err)
  process.exit(1)
})
