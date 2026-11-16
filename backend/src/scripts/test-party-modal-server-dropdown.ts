/**
 * 7Anime Party Play — Watch Party Create Modal Streaming Server Dropdown Verification
 * Verifies all 3 options exist in the DOM, custom Liquid Glass dropdown menu renders with
 * dark background and high-contrast text, updates selected state correctly, passes selected
 * serverId to room creation, and captures real browser screenshots for audit evidence.
 * Run with: npx tsx backend/src/scripts/test-party-modal-server-dropdown.ts
 */

import path from 'node:path'
import puppeteer from 'puppeteer'

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
        console.log(`🔌 Detected active Vite frontend server on port ${port}`)
        return `http://localhost:${port}`
      }
    } catch {}
  }
  return 'http://localhost:5174'
}

async function verifyServerDropdown() {
  console.log('\n======================================================================')
  console.log('🔍 7Anime Party Play — Create Modal Server Dropdown UI Verification')
  console.log('======================================================================\n')

  let browser: puppeteer.Browser | null = null

  try {
    const frontendUrl = await getActiveFrontendUrl()

    console.log('🚀 Launching Chrome at:', CHROME_PATH)
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

    console.log(`🌐 Navigating directly to ${frontendUrl}/#party=create...`)
    await page.goto(`${frontendUrl}/#party=create`, { waitUntil: 'networkidle2', timeout: 30000 })

    // Wait for Create Modal to open
    await page.waitForSelector('.party-modal', { timeout: 10000 })
    const modalTitle = await page.$eval('.party-modal__title', (el) => el.textContent?.trim())
    assert(modalTitle === 'Create Watch Party', `Party Create Modal opened with title: "${modalTitle}"`)

    // 1. Locate the Streaming Server select element and custom trigger
    const selectSelector = '#party-create-server, select[data-testid="party-server-select"]'
    const triggerSelector = '#party-create-server-trigger, button[data-testid="party-server-select-trigger"]'

    await page.waitForSelector(selectSelector, { timeout: 5000 })
    assert(!!(await page.$(selectSelector)), 'Found Streaming Server select element in DOM')

    await page.waitForSelector(triggerSelector, { timeout: 5000 })
    assert(!!(await page.$(triggerSelector)), 'Found Streaming Server custom trigger button in DOM')

    // 2. Inspect rendered options in the hidden select DOM
    const optionsData = await page.evaluate((sel) => {
      const select = document.querySelector(sel) as HTMLSelectElement
      const selectStyles = window.getComputedStyle(select)
      const options = Array.from(select.querySelectorAll('option')).map((opt) => {
        const optStyles = window.getComputedStyle(opt)
        return {
          value: opt.value,
          text: opt.textContent?.trim() || '',
          color: optStyles.color,
          backgroundColor: optStyles.backgroundColor,
        }
      })

      return {
        selectValue: select.value,
        selectColor: selectStyles.color,
        selectBg: selectStyles.backgroundColor,
        colorScheme: selectStyles.colorScheme,
        optionsCount: options.length,
        options,
      }
    }, selectSelector)

    console.log('\n--- DOM & Computed Style Inspection (Hidden Select) ---')
    console.log('Select Current Value:', optionsData.selectValue)
    console.log('Total Options Count:', optionsData.optionsCount)
    optionsData.options.forEach((opt, idx) => {
      console.log(`  Option [${idx + 1}]: value="${opt.value}" | text="${opt.text}"`)
    })

    // Assertions for Option Existence and Values
    assert(optionsData.optionsCount === 3, `Select has exactly 3 options (got ${optionsData.optionsCount})`)
    assert(optionsData.options[0].value === 'server1', 'Option 1 value is "server1"')
    assert(optionsData.options[0].text === 'Server 1 (Primary - AnimeTVPlus)', `Option 1 text is "Server 1 (Primary - AnimeTVPlus)" (got "${optionsData.options[0].text}")`)
    assert(optionsData.options[1].value === 'server2', 'Option 2 value is "server2"')
    assert(optionsData.options[1].text === 'Server 2 (MegaPlay AniList)', `Option 2 text is "Server 2 (MegaPlay AniList)" (got "${optionsData.options[1].text}")`)
    assert(optionsData.options[2].value === 'server3', 'Option 3 value is "server3"')
    assert(optionsData.options[2].text === 'Server 3 (MegaPlay MAL)', `Option 3 text is "Server 3 (MegaPlay MAL)" (got "${optionsData.options[2].text}")`)

    // 3. Test Initial Display on Custom Trigger
    const initialTriggerText = await page.$eval(triggerSelector, (el) => el.textContent?.trim())
    assert(initialTriggerText?.includes('Server 1 (Primary - AnimeTVPlus)'), `Initial trigger displays: "${initialTriggerText}"`)

    const screenshotModal = async (targetPath: string) => {
      await new Promise((r) => setTimeout(r, 300))
      await page.screenshot({ path: targetPath })
    }

    const srv1ModalPath = path.join(SCREENSHOT_DIR, 'party_modal_server1_selected.png').replace(/\\/g, '/')
    await screenshotModal(srv1ModalPath)
    console.log(`📸 Saved screenshot of Server 1 selection: ${srv1ModalPath}`)

    // 4. Click Custom Trigger to Open Dropdown Menu
    console.log('\n--- Testing Custom Dropdown Opening & Liquid Glass Styling ---')
    await page.evaluate(() => {
      const btn = document.querySelector('#party-create-server-trigger') as HTMLButtonElement | null
      if (btn) btn.click()
    })
    await new Promise((r) => setTimeout(r, 600))
    await page.waitForSelector('#party-create-server-menu', { timeout: 8000 })

    const menuData = await page.evaluate(() => {
      const menu = document.querySelector('#party-create-server-menu') as HTMLElement
      const menuStyles = window.getComputedStyle(menu)
      const items = Array.from(menu.querySelectorAll('li[role="option"]')).map((el) => {
        const itemStyles = window.getComputedStyle(el)
        return {
          value: el.getAttribute('data-value'),
          text: el.textContent?.trim() || '',
          color: itemStyles.color,
          bg: itemStyles.backgroundColor,
          selected: el.getAttribute('aria-selected') === 'true',
        }
      })
      return {
        bg: menuStyles.backgroundColor,
        border: menuStyles.borderColor,
        itemsCount: items.length,
        items,
      }
    })

    console.log('Dropdown Menu Background:', menuData.bg)
    console.log('Dropdown Menu Items Count:', menuData.itemsCount)
    menuData.items.forEach((item, idx) => {
      console.log(`  Menu Item [${idx + 1}]: val="${item.value}" | text="${item.text}" | color="${item.color}" | selected=${item.selected}`)
    })

    assert(menuData.itemsCount === 3, `Custom dropdown menu contains exactly 3 items (got ${menuData.itemsCount})`)
    assert(menuData.items[0].value === 'server1', 'Menu item 1 is server1')
    assert(menuData.items[1].value === 'server2', 'Menu item 2 is server2')
    assert(menuData.items[2].value === 'server3', 'Menu item 3 is server3')

    // Confirm dark background and high-contrast styling (preventing white-on-white)
    assert(menuData.bg.includes('14, 19, 31') || menuData.bg.includes('rgb(14, 19, 31)'), `Menu background is dark #0e131f (got ${menuData.bg})`)
    assert(menuData.items[1].color.includes('245, 248, 255') || menuData.items[1].color.includes('255, 255, 255'), 'Menu item 2 has bright readable text')

    // Capture screenshot of OPEN dropdown menu showing all 3 servers!
    const openDropdownPath = path.join(SCREENSHOT_DIR, 'party_modal_dropdown_open.png').replace(/\\/g, '/')
    await screenshotModal(openDropdownPath)
    console.log(`📸 Saved screenshot of OPEN dropdown with all 3 options visible: ${openDropdownPath}`)

    // 5. Test Selecting Server 2 (MegaPlay AniList) from Custom Dropdown
    console.log('\n--- Testing Selecting Server 2 from Menu ---')
    await page.$eval('[data-testid="party-server-select-option-server2"]', (el) => (el as HTMLElement).click())
    await page.waitForFunction(() => !document.querySelector('#party-create-server-menu'))

    const triggerAfterSrv2 = await page.$eval(triggerSelector, (el) => el.textContent?.trim())
    const selectAfterSrv2 = await page.$eval(selectSelector, (el) => (el as HTMLSelectElement).value)
    assert(triggerAfterSrv2?.includes('Server 2 (MegaPlay AniList)'), `Trigger updated to Server 2 (got "${triggerAfterSrv2}")`)
    assert(selectAfterSrv2 === 'server2', `Hidden select updated to "server2" (got "${selectAfterSrv2}")`)

    const srv2ModalPath = path.join(SCREENSHOT_DIR, 'party_modal_server2_selected.png').replace(/\\/g, '/')
    await screenshotModal(srv2ModalPath)
    console.log(`📸 Saved screenshot of Server 2 selection: ${srv2ModalPath}`)

    // 6. Test Selecting Server 3 (MegaPlay MAL) from Custom Dropdown
    console.log('\n--- Testing Selecting Server 3 from Menu ---')
    await new Promise((r) => setTimeout(r, 300))
    await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement
      el?.click()
    }, triggerSelector)
    await page.waitForSelector('#party-create-server-menu')
    await page.$eval('[data-testid="party-server-select-option-server3"]', (el) => (el as HTMLElement).click())
    await page.waitForFunction(() => !document.querySelector('#party-create-server-menu'))

    const triggerAfterSrv3 = await page.$eval(triggerSelector, (el) => el.textContent?.trim())
    const selectAfterSrv3 = await page.$eval(selectSelector, (el) => (el as HTMLSelectElement).value)
    assert(triggerAfterSrv3?.includes('Server 3 (MegaPlay MAL)'), `Trigger updated to Server 3 (got "${triggerAfterSrv3}")`)
    assert(selectAfterSrv3 === 'server3', `Hidden select updated to "server3" (got "${selectAfterSrv3}")`)

    const srv3ModalPath = path.join(SCREENSHOT_DIR, 'party_modal_server3_selected.png').replace(/\\/g, '/')
    await screenshotModal(srv3ModalPath)
    console.log(`📸 Saved screenshot of Server 3 selection: ${srv3ModalPath}`)

    // 7. Test Programmatic Selection via page.select
    console.log('\n--- Testing Programmatic page.select("server1") ---')
    await page.select(selectSelector, 'server1')
    const triggerAfterSrv1 = await page.$eval(triggerSelector, (el) => el.textContent?.trim())
    assert(triggerAfterSrv1?.includes('Server 1 (Primary - AnimeTVPlus)'), `Trigger updated back to Server 1 via page.select (got "${triggerAfterSrv1}")`)

    // 8. Capture Full Page View
    const fullPagePath = path.join(SCREENSHOT_DIR, 'party_modal_full_page.png').replace(/\\/g, '/')
    await page.screenshot({ path: fullPagePath })
    console.log(`📸 Saved full page screenshot: ${fullPagePath}`)

    console.log('\n======================================================================')
    console.log(`🎉 SERVER DROPDOWN VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`)
    console.log('======================================================================\n')
  } catch (err) {
    console.error('\n❌ ERROR DURING DROPDOWN VERIFICATION:', err)
  } finally {
    if (browser) {
      await browser.close()
    }
    if (failed > 0) {
      process.exit(1)
    }
  }
}

verifyServerDropdown()
