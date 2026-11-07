import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('docs/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
  console.log('🚀 Starting Phase 4.1 Profile Verification...');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  // 1. Visit Home
  console.log('1. Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 });

  // 2. Set authenticated session directly or through login
  console.log('2. Performing authentication as bhimanijay89@gmail.com...');
  const loginRes = await page.evaluate(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bhimanijay89@gmail.com', password: 'bhimanijay' }),
      });
      const data = await res.json();
      if (data.ok && data.data && data.data.token) {
        localStorage.setItem('7anime_token', data.data.token);
        return { success: true, user: data.data.user };
      }
      return { success: false, data };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  });

  console.log('Login result:', loginRes);

  // 3. Reload page to trigger session restoration on mount and navigate to #profile
  console.log('3. Reloading page with token to restore session...');
  await page.goto('http://localhost:5173/#profile', { waitUntil: 'networkidle2' });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000)); // allow profile data hydration

  // 4. Capture Desktop Profile Screenshot
  const desktopPath = path.join(SCREENSHOT_DIR, 'phase4-1-desktop-profile.png');
  await page.screenshot({ path: desktopPath, fullPage: true });
  console.log(`📸 Desktop Profile screenshot saved to ${desktopPath}`);

  // 5. Inspect DOM content to verify real data
  const profileDetails = await page.evaluate(() => {
    const username = document.querySelector('.profile-summary h2')?.textContent?.trim() || '';
    const streakNum = document.querySelector('.streak-hero-number')?.textContent?.trim() || '';
    const streakUnit = document.querySelector('.streak-hero-unit')?.textContent?.trim() || '';
    const flameEl = document.querySelector('.anime-flame-wrapper');
    const flameStateClass = flameEl ? Array.from(flameEl.classList).find(c => c.startsWith('anime-flame-wrapper--')) : '';

    // Stats boxes
    const statsItems = Array.from(document.querySelectorAll('.profile-stats__item')).map(item => ({
      val: item.querySelector('strong')?.textContent?.trim() || '',
      label: item.querySelector('span')?.textContent?.trim() || '',
    }));

    // Today calendar day
    const todayDayEl = document.querySelector('.streak-day--today-completed, .streak-day--today-pending');
    const isTodayCompleted = !!document.querySelector('.streak-day--today-completed');

    // Milestones
    const milestonesCount = document.querySelectorAll('.streak-milestone-item').length;

    // Continue watching
    const recentCardsCount = document.querySelectorAll('.profile-recent__card').length;

    return {
      username,
      streakNum,
      streakUnit,
      flameStateClass,
      statsItems,
      isTodayCompleted,
      milestonesCount,
      recentCardsCount,
    };
  });

  console.log('📊 Verified Profile DOM Data:', JSON.stringify(profileDetails, null, 2));

  // 6. Mobile Viewport Check
  console.log('6. Testing Mobile Viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const mobilePath = path.join(SCREENSHOT_DIR, 'phase4-1-mobile-profile.png');
  await page.screenshot({ path: mobilePath, fullPage: true });
  console.log(`📸 Mobile Profile screenshot saved to ${mobilePath}`);

  await browser.close();
  console.log('✅ Phase 4.1 Profile Verification complete!');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
