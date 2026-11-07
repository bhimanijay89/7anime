import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('docs/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('🚀 Starting Monthly Calendar Redesign Visual Verification (Authenticated)...');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });

    console.log('1. Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('2. Logging in as bhimanijay89@gmail.com...');
    await page.evaluate(async () => {
      try {
        const res = await fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'bhimanijay89@gmail.com', password: 'bhimanijay' }),
        });
        const data = await res.json();
        if (data.ok && data.data && data.data.token) {
          localStorage.setItem('7anime_token', data.data.token);
        }
      } catch (e) {
        console.error(e);
      }
    });

    console.log('3. Navigating to #profile and reloading to restore authenticated session...');
    await page.goto('http://localhost:5173/#profile', { waitUntil: 'networkidle2' });
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 3500));

    // Scroll to the calendar card
    console.log('4. Scrolling to calendar card...');
    const calendarEl = await page.$('.streak-calendar-card');
    if (calendarEl) {
      await calendarEl.scrollIntoView();
      await new Promise((r) => setTimeout(r, 600));

      const calShotPath = path.join(SCREENSHOT_DIR, 'phase4-3-calendar-element.png');
      await calendarEl.screenshot({ path: calShotPath });
      console.log('📸 Saved calendar element screenshot:', calShotPath);
    }

    // Capture Full Desktop Profile View
    const desktopPath = path.join(SCREENSHOT_DIR, 'phase4-3-calendar-desktop.png');
    await page.screenshot({ path: desktopPath, fullPage: true });
    console.log('📸 Saved full desktop screenshot:', desktopPath);

    // Click on Day 6 to open the detail drawer
    console.log('5. Clicking on Day 6 cell...');
    const day6Btn = await page.evaluateHandle(() => {
      const cells = Array.from(document.querySelectorAll('.streak-calendar__cell'));
      return cells.find((c) => {
        const num = c.querySelector('.streak-cell__day-num');
        return num && num.textContent.trim() === '6';
      });
    });

    if (day6Btn && day6Btn.asElement()) {
      await day6Btn.asElement().click();
      await new Promise((r) => setTimeout(r, 800));

      if (calendarEl) {
        const detailShotPath = path.join(SCREENSHOT_DIR, 'phase4-3-calendar-detail.png');
        await calendarEl.screenshot({ path: detailShotPath });
        console.log('📸 Saved calendar detail screenshot:', detailShotPath);
      }
    }

    // Hover over Day 6 to capture custom hover tooltip
    console.log('6. Hovering over Day 6 to test tooltip...');
    if (day6Btn && day6Btn.asElement()) {
      await day6Btn.asElement().hover();
      await new Promise((r) => setTimeout(r, 500));
      const hoverShotPath = path.join(SCREENSHOT_DIR, 'phase4-3-calendar-hover.png');
      if (calendarEl) {
        await calendarEl.screenshot({ path: hoverShotPath });
        console.log('📸 Saved calendar hover screenshot:', hoverShotPath);
      }
    }

    // Test Mobile View (375px)
    console.log('7. Testing Mobile View (375px)...');
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 3000));
    const mobileCalendarEl = await page.$('.streak-calendar-card');
    if (mobileCalendarEl) {
      await mobileCalendarEl.scrollIntoView();
      await new Promise((r) => setTimeout(r, 500));
      const mobileShotPath = path.join(SCREENSHOT_DIR, 'phase4-3-calendar-mobile.png');
      await mobileCalendarEl.screenshot({ path: mobileShotPath });
      console.log('📸 Saved mobile calendar screenshot:', mobileShotPath);
    }

    console.log('✅ Visual verification completed.');
  } catch (err) {
    console.error('❌ Error during visual verification:', err);
  } finally {
    await browser.close();
  }
}

run();
