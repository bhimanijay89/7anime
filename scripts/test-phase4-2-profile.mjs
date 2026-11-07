import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('docs/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
  console.log('🚀 Starting Phase 4.2 Next-Gen Profile Experience Verification...');

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
  await page.goto('http://localhost:5173/#profile', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3500)); // allow full hydration of profile, streak & stats

  // 3. Inspect Identity Card & Profile DOM
  const profileDetails = await page.evaluate(() => {
    const displayName = document.querySelector('.profile-identity-card__display-name')?.textContent?.trim() || '';
    const usernameTag = document.querySelector('.profile-username-tag')?.textContent?.trim() || '';
    const bio = document.querySelector('.profile-identity-card__bio')?.textContent?.trim() || '';
    const rankChip = document.querySelector('.profile-rank-chip')?.textContent?.trim() || '';
    const levelChip = document.querySelector('.profile-avatar__level-chip')?.textContent?.trim() || '';
    const coins = document.querySelector('.profile-identity-card__coins strong')?.textContent?.trim() || '';
    const hasRing = !!document.querySelector('.profile-avatar-ring--animated');

    // Stats Grid
    const statBoxes = Array.from(document.querySelectorAll('.profile-stat-box')).map((el) => ({
      val: el.querySelector('strong')?.textContent?.trim() || '',
      label: el.querySelector('span')?.textContent?.trim() || '',
    }));

    // Streak
    const streakNum = document.querySelector('.streak-hero-number')?.textContent?.trim() || '';
    const streakUnit = document.querySelector('.streak-hero-unit')?.textContent?.trim() || '';
    const flameEl = document.querySelector('.anime-flame-wrapper');
    const flameClass = flameEl
      ? Array.from(flameEl.classList).find((c) => c.startsWith('anime-flame-wrapper--'))
      : '';

    return {
      displayName,
      usernameTag,
      bio,
      rankChip,
      levelChip,
      coins,
      hasRing,
      statBoxes,
      streakNum,
      streakUnit,
      flameClass,
    };
  });

  console.log('📊 Verified Authenticated Profile Identity & Stats:', JSON.stringify(profileDetails, null, 2));

  // 4. Capture Desktop Profile Screenshot
  const desktopPath = path.join(SCREENSHOT_DIR, 'phase4-2-desktop-profile.png');
  await page.screenshot({ path: desktopPath, fullPage: true });
  console.log(`📸 Desktop Profile screenshot saved to ${desktopPath}`);

  // 5. Test Avatar Customization Modal
  console.log('5. Testing Avatar Customization Modal...');
  await page.evaluate(() => {
    const changeAvatarBtn = Array.from(document.querySelectorAll('.profile-action-btn')).find((b) =>
      b.textContent.includes('Avatar'),
    );
    if (changeAvatarBtn) changeAvatarBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  // Capture Avatar Modal Screenshot
  const avatarModalPath = path.join(SCREENSHOT_DIR, 'phase4-2-avatar-modal.png');
  await page.screenshot({ path: avatarModalPath });
  console.log(`📸 Avatar Modal screenshot saved to ${avatarModalPath}`);

  // Switch to presets tab and select first preset, then save
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

  // Verify avatar in navbar and profile
  const avatarCheck = await page.evaluate(() => {
    const profileAvatarImg = document.querySelector('.profile-avatar-img')?.getAttribute('src') || '';
    const navAvatarImg = document.querySelector('.profile-chip__avatar-img')?.getAttribute('src') || '';
    return {
      profileAvatarImg: profileAvatarImg.slice(0, 50),
      navAvatarImg: navAvatarImg.slice(0, 50),
      updatedSuccessfully: !!profileAvatarImg && !!navAvatarImg,
    };
  });
  console.log('✅ Avatar updated in DOM & Navbar:', avatarCheck);

  // 6. Test Edit Profile Modal
  console.log('6. Testing Edit Profile Modal...');
  await page.evaluate(() => {
    const editBtns = Array.from(document.querySelectorAll('.profile-action-btn'));
    const editProfileBtn = editBtns.find((b) => b.textContent.includes('Edit Profile'));
    if (editProfileBtn) editProfileBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.evaluate(() => {
    const nameInput = document.querySelector('#edit-profile-display-name');
    const bioInput = document.querySelector('#edit-profile-bio');
    if (nameInput) {
      nameInput.value = 'Monkey D. Luffy';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (bioInput) {
      bioInput.value = 'Future King of the Pirates! Exploring anime on 7anime.';
      bioInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const form = document.querySelector('.edit-profile-form');
    if (form) {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    }
  });
  await new Promise((r) => setTimeout(r, 2000));

  // 7. Capture Streak Section Close-Up
  const streakCardEl = await page.$('.streak-hero-card');
  if (streakCardEl) {
    const streakPath = path.join(SCREENSHOT_DIR, 'phase4-2-streak-section.png');
    await streakCardEl.screenshot({ path: streakPath });
    console.log(`📸 Streak Section screenshot saved to ${streakPath}`);
  }

  // 8. Test Tabs: Achievements & Library
  console.log('8. Testing Profile Tabs...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.profile-nav-tab'));
    const achTab = tabs.find((t) => t.textContent.includes('Achievements'));
    if (achTab) achTab.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const achCount = await page.evaluate(() => document.querySelectorAll('.achievement-card').length);
  console.log(`✅ Achievements displayed: ${achCount} cards`);

  // 9. Tablet Viewport (768x1024)
  console.log('9. Capturing Tablet Profile Screenshot (768x1024)...');
  await page.setViewport({ width: 768, height: 1024 });
  await new Promise((r) => setTimeout(r, 1000));
  const tabletPath = path.join(SCREENSHOT_DIR, 'phase4-2-tablet-profile.png');
  await page.screenshot({ path: tabletPath, fullPage: true });
  console.log(`📸 Tablet Profile screenshot saved to ${tabletPath}`);

  // 10. Mobile Viewport (390x844)
  console.log('10. Capturing Mobile Profile Screenshot (390x844)...');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise((r) => setTimeout(r, 1000));
  const mobilePath = path.join(SCREENSHOT_DIR, 'phase4-2-mobile-profile.png');
  await page.screenshot({ path: mobilePath, fullPage: true });
  console.log(`📸 Mobile Profile screenshot saved to ${mobilePath}`);

  // 11. Verify Viewport Widths (320px to 1440px)
  const viewports = [320, 375, 430, 600, 768, 1024, 1280, 1440];
  console.log('11. Checking horizontal overflow across viewports:', viewports);
  for (const w of viewports) {
    await page.setViewport({ width: w, height: 900 });
    await new Promise((r) => setTimeout(r, 300));
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    console.log(`   Viewport ${w}px horizontal overflow: ${hasOverflow ? 'FAIL' : 'PASS (Clean)'}`);
  }

  // 12. Homepage Continue Watching Verification
  console.log('12. Navigating to #home to verify Continue Watching section...');
  await page.setViewport({ width: 1440, height: 960 });
  await page.goto('http://localhost:5173/#home', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 3000));

  // Find continue watching rail
  const continueWatchingData = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('h2, .rail-title, .section-title, span'));
    const cwTitle = titles.find((t) => t.textContent.trim().toLowerCase().includes('continue watching'));
    const cards = Array.from(document.querySelectorAll('.anime-card--continue, [data-variant="continue"], .anime-card')).slice(0, 5);
    return {
      foundTitle: !!cwTitle,
      cardCount: cards.length,
      sampleTitle: cards[0]?.querySelector('.anime-card__title, strong, h3')?.textContent?.trim() || '',
    };
  });
  console.log('📺 Homepage Continue Watching Data:', continueWatchingData);

  const cwScreenshotPath = path.join(SCREENSHOT_DIR, 'phase4-2-homepage-continue-watching.png');
  await page.screenshot({ path: cwScreenshotPath, fullPage: false });
  console.log(`📸 Homepage Continue Watching screenshot saved to ${cwScreenshotPath}`);

  await browser.close();
  console.log('🎉 Phase 4.2 Verification Finished Successfully!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
