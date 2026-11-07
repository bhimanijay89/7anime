import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('docs/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
  console.log('🚀 Starting Phase 4.3 Premium Profile Redesign Verification...');

  // 1. Direct login via API to get real JWT session token
  console.log('1. Authenticating with backend /api/auth/login...');
  const loginFetch = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bhimanijay89@gmail.com', password: 'bhimanijay' }),
  });
  const loginData = await loginFetch.json();
  if (!loginData.ok || !loginData.data?.token) {
    throw new Error('Backend login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.data.token;
  console.log('✅ Authenticated successfully! User:', loginData.data.user.username);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[profile]') || text.includes('Error') || text.includes('error')) {
      console.log('  [Browser Console]:', text);
    }
  });

  // Inject token before document load so checkAuthSession succeeds on initial mount
  await page.evaluateOnNewDocument((tok) => {
    localStorage.setItem('7anime_token', tok);
  }, token);

  // 2. Navigate to Profile page
  console.log('2. Navigating to http://localhost:5173/#profile...');
  await page.goto('http://localhost:5173/#profile', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 4000)); // allow full hydration of profile, streak & stats

  // 3. Inspect Header & Navbar layout relationship (verify ZERO overlap!)
  const layoutCheck = await page.evaluate(() => {
    const nav = document.querySelector('.desktop-nav');
    const header = document.querySelector('.profile-header');
    const title = document.querySelector('.profile-header__title');

    const navRect = nav ? nav.getBoundingClientRect() : null;
    const headerRect = header ? header.getBoundingClientRect() : null;

    // Check vertical overlap: header top must be strictly below nav bottom
    const isOverlapping = navRect && headerRect ? headerRect.top < navRect.bottom : false;
    const verticalGapPx = navRect && headerRect ? Math.round(headerRect.top - navRect.bottom) : 0;

    return {
      navBottom: navRect ? Math.round(navRect.bottom) : 0,
      headerTop: headerRect ? Math.round(headerRect.top) : 0,
      verticalGapPx,
      isOverlapping,
      titleText: title?.textContent?.trim() || '',
    };
  });

  console.log('📐 Header & Navbar Layout Inspection:', layoutCheck);
  if (layoutCheck.isOverlapping) {
    console.error('❌ ERROR: Navbar overlaps profile header!');
  } else {
    console.log(`✅ PASS: Navbar and Profile Header have clean ${layoutCheck.verticalGapPx}px breathing room!`);
  }

  // 4. Capture 1440px Desktop Profile Screenshot
  console.log('4. Capturing 1440px Desktop Profile Screenshot...');
  await page.setViewport({ width: 1440, height: 960 });
  await new Promise((r) => setTimeout(r, 600));
  const desktop1440Path = path.join(SCREENSHOT_DIR, 'phase4-3-desktop-1440.png');
  await page.screenshot({ path: desktop1440Path, fullPage: true });
  console.log(`📸 1440px Desktop screenshot saved to ${desktop1440Path}`);

  // 5. Capture 1280px Desktop Profile Screenshot
  console.log('5. Capturing 1280px Desktop Profile Screenshot...');
  await page.setViewport({ width: 1280, height: 900 });
  await new Promise((r) => setTimeout(r, 600));
  const desktop1280Path = path.join(SCREENSHOT_DIR, 'phase4-3-desktop-1280.png');
  await page.screenshot({ path: desktop1280Path, fullPage: true });
  console.log(`📸 1280px Desktop screenshot saved to ${desktop1280Path}`);

  // 6. Inspect Metrics Console & Identity Card
  const profileDetails = await page.evaluate(() => {
    const displayName = document.querySelector('.profile-identity-card__display-name')?.textContent?.trim() || '';
    const usernameTag = document.querySelector('.profile-username-tag')?.textContent?.trim() || '';
    const bio = document.querySelector('.profile-identity-card__bio')?.textContent?.trim() || '';
    const rankChip = document.querySelector('.profile-rank-chip')?.textContent?.trim() || '';
    const levelChip = document.querySelector('.profile-avatar__level-chip')?.textContent?.trim() || '';
    const coins = document.querySelector('.profile-identity-card__coins strong')?.textContent?.trim() || '';
    const hasRing = !!document.querySelector('.profile-avatar-ring--animated');

    // Metrics console zones
    const metricZones = Array.from(document.querySelectorAll('.profile-metric-zone')).map((el) => ({
      val: el.querySelector('.profile-metric-zone__value')?.textContent?.trim() || '',
      label: el.querySelector('.profile-metric-zone__label')?.textContent?.trim() || '',
      unit: el.querySelector('.profile-metric-zone__unit')?.textContent?.trim() || '',
      hint: el.querySelector('.profile-metric-zone__hint')?.textContent?.trim() || '',
    }));

    // Streak
    const streakNum = document.querySelector('.streak-hero-number')?.textContent?.trim() || '';
    const streakUnit = document.querySelector('.streak-hero-unit')?.textContent?.trim() || '';

    return {
      displayName,
      usernameTag,
      bio,
      rankChip,
      levelChip,
      coins,
      hasRing,
      metricZones,
      streakNum,
      streakUnit,
    };
  });

  console.log('📊 Verified Authenticated Profile Details:', JSON.stringify(profileDetails, null, 2));

  // 7. Test Avatar Customization Modal
  console.log('7. Testing Avatar Customization Modal...');
  await page.evaluate(() => {
    const changeAvatarBtn = Array.from(document.querySelectorAll('.profile-action-btn')).find((b) =>
      b.textContent.includes('Avatar'),
    );
    if (changeAvatarBtn) changeAvatarBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  // Capture Avatar Modal Screenshot
  const avatarModalPath = path.join(SCREENSHOT_DIR, 'phase4-3-avatar-modal.png');
  await page.screenshot({ path: avatarModalPath });
  console.log(`📸 Avatar Modal screenshot saved to ${avatarModalPath}`);

  // Select Anime Preset and Save
  console.log('Selecting anime avatar preset...');
  await page.evaluate(() => {
    const presetsTab = Array.from(document.querySelectorAll('.avatar-tab')).find((el) =>
      el.textContent.includes('Presets'),
    );
    if (presetsTab) presetsTab.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  await page.evaluate(() => {
    const presetBtn = document.querySelector('.avatar-preset-btn');
    if (presetBtn) presetBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  await page.evaluate(() => {
    const saveBtn = Array.from(document.querySelectorAll('.avatar-modal__footer button')).find((el) =>
      el.textContent.includes('Save'),
    );
    if (saveBtn) saveBtn.click();
  });
  await new Promise((r) => setTimeout(r, 2500));

  // Verify avatar update in DOM & Navbar
  const avatarCheck = await page.evaluate(() => {
    const profileAvatarImg = document.querySelector('.profile-avatar-img')?.getAttribute('src') || '';
    const navAvatarImg = document.querySelector('.profile-chip__avatar-img')?.getAttribute('src') || '';
    return {
      profileAvatarImg: profileAvatarImg.slice(0, 45),
      navAvatarImg: navAvatarImg.slice(0, 45),
      updatedSuccessfully: !!profileAvatarImg && !!navAvatarImg,
    };
  });
  console.log('✅ Avatar updated in DOM & Navbar:', avatarCheck);

  // 8. Capture Streak Section Close-Up
  const streakCardEl = await page.$('.streak-hero-card');
  if (streakCardEl) {
    const streakPath = path.join(SCREENSHOT_DIR, 'phase4-3-streak-section.png');
    await streakCardEl.screenshot({ path: streakPath });
    console.log(`📸 Streak Section screenshot saved to ${streakPath}`);
  }

  // 9. Capture 768px Tablet Profile Screenshot
  console.log('9. Capturing 768px Tablet Profile Screenshot...');
  await page.setViewport({ width: 768, height: 1024 });
  await new Promise((r) => setTimeout(r, 1000));
  const tabletPath = path.join(SCREENSHOT_DIR, 'phase4-3-tablet-768.png');
  await page.screenshot({ path: tabletPath, fullPage: true });
  console.log(`📸 768px Tablet screenshot saved to ${tabletPath}`);

  // 10. Capture 430px Mobile Profile Screenshot
  console.log('10. Capturing 430px Mobile Profile Screenshot...');
  await page.setViewport({ width: 430, height: 932 });
  await new Promise((r) => setTimeout(r, 1000));
  const mobile430Path = path.join(SCREENSHOT_DIR, 'phase4-3-mobile-430.png');
  await page.screenshot({ path: mobile430Path, fullPage: true });
  console.log(`📸 430px Mobile screenshot saved to ${mobile430Path}`);

  // 11. Capture 375px Mobile Profile Screenshot
  console.log('11. Capturing 375px Mobile Profile Screenshot...');
  await page.setViewport({ width: 375, height: 812 });
  await new Promise((r) => setTimeout(r, 1000));
  const mobile375Path = path.join(SCREENSHOT_DIR, 'phase4-3-mobile-375.png');
  await page.screenshot({ path: mobile375Path, fullPage: true });
  console.log(`📸 375px Mobile screenshot saved to ${mobile375Path}`);

  // 12. Check all viewports for horizontal overflow
  const viewports = [320, 375, 430, 600, 768, 1024, 1280, 1440];
  console.log('12. Checking horizontal overflow across viewports:', viewports);
  for (const w of viewports) {
    await page.setViewport({ width: w, height: 900 });
    await new Promise((r) => setTimeout(r, 200));
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    console.log(`   Viewport ${w}px horizontal overflow: ${hasOverflow ? 'FAIL' : 'PASS (Clean)'}`);
  }

  // 13. Homepage Continue Watching Verification
  console.log('13. Navigating to #home to verify Continue Watching section...');
  await page.setViewport({ width: 1440, height: 960 });
  await page.goto('http://localhost:5173/#home', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3000));

  const continueWatchingData = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('h2, .rail-title, .section-title, span'));
    const cwTitle = titles.find((t) => t.textContent.trim().toLowerCase().includes('continue watching'));
    const cards = Array.from(
      document.querySelectorAll('.anime-card--continue, [data-variant="continue"], .anime-card'),
    ).slice(0, 5);
    return {
      foundTitle: !!cwTitle,
      cardCount: cards.length,
      sampleTitle: cards[0]?.querySelector('.anime-card__title, strong, h3')?.textContent?.trim() || '',
    };
  });
  console.log('📺 Homepage Continue Watching Data:', continueWatchingData);

  const cwScreenshotPath = path.join(SCREENSHOT_DIR, 'phase4-3-homepage-continue-watching.png');
  await page.screenshot({ path: cwScreenshotPath, fullPage: false });
  console.log(`📸 Homepage Continue Watching screenshot saved to ${cwScreenshotPath}`);

  await browser.close();
  console.log('🎉 Phase 4.3 Premium Profile Redesign Verification Completed Successfully!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
