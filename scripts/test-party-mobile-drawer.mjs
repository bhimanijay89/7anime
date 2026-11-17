import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/BHIMANI/.gemini/antigravity/brain/a2b9de21-66b7-4141-96b9-a2ff7e0be97d';

async function run() {
  console.log('--- TESTING MOBILE PARTY PLAY BOTTOM SHEET ---');

  // Authenticate test user
  console.log('1. Authenticating test user with backend...');
  let token = null;
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bhimanijay89@gmail.com', password: 'bhimanijay' }),
  });
  const loginData = await loginRes.json();
  if (loginData.ok && loginData.data?.token) {
    token = loginData.data.token;
    console.log('✅ Authenticated successfully! User:', loginData.data.user.username);
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // Store token in localStorage
  if (token) {
    await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => localStorage.setItem('7anime_token', t), token);
  }

  // Navigate to movies and open player
  console.log('2. Navigating to Movies view...');
  await page.goto('http://localhost:5174#movies', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.movies-hero__actions .movies-btn--primary', { timeout: 20000 });
  
  console.log('3. Clicking Watch Movie to open FullPlayerView...');
  await page.click('.movies-hero__actions .movies-btn--primary');
  await page.waitForSelector('.cinema-player', { timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  // Click Party button
  console.log('4. Clicking mobile Party button to open Create modal...');
  await page.click('.cinema-player__mobile-party-btn:not(.cinema-player__mobile-party-btn--join)');
  await page.waitForSelector('.party-modal', { timeout: 5000 });
  console.log('✅ Party Create Modal opened!');

  // Click "Launch Watch Party" button in modal
  console.log('5. Clicking Launch Watch Party button (button.party-modal__btn--primary)...');
  await page.click('.party-modal button.party-modal__btn--primary');

  // Wait for success / invite link screen inside modal
  console.log('Waiting for room to be created and invite screen...');
  await new Promise(r => setTimeout(r, 3000));

  // Click "Start Watching" in modal
  console.log('6. Clicking Start Watching button...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.party-modal button')).find(b => b.textContent?.includes('Start Watching') || b.textContent?.includes('Done'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Check Bottom Sheet metrics
  console.log('7. Verifying Bottom Sheet layout and tabs...');
  const sheetMetrics = await page.evaluate(() => {
    const sheet = document.querySelector('.party-bottom-sheet');
    const sheetStyle = sheet ? window.getComputedStyle(sheet) : null;
    const backdrop = document.querySelector('.party-bottom-sheet__backdrop');
    const dragHandle = document.querySelector('.party-bottom-sheet__drag-handle');
    const tabs = Array.from(document.querySelectorAll('.party-drawer__tab')).map(t => t.textContent.trim());
    const activeTab = document.querySelector('.party-drawer__tab.active')?.textContent.trim();
    const pill = document.querySelector('.cinema-player__mobile-party-btn.active');
    return {
      sheetFound: !!sheet,
      sheetPosition: sheetStyle ? sheetStyle.position : null,
      sheetBottom: sheetStyle ? sheetStyle.bottom : null,
      hasBackdrop: !!backdrop,
      hasDragHandle: !!dragHandle,
      tabs,
      activeTab,
      pillText: pill ? pill.textContent.trim() : null
    };
  });
  console.log('Bottom Sheet Metrics:', sheetMetrics);

  const bottomSheetChatPath = path.join(ARTIFACT_DIR, 'player_mobile_bottom_sheet_chat.png');
  await page.screenshot({ path: bottomSheetChatPath, fullPage: false });
  console.log('Saved screenshot:', bottomSheetChatPath);

  // Switch to Reactions tab
  console.log('8. Switching to Reactions tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.party-drawer__tab'));
    const rxTab = tabs.find(t => t.textContent.includes('Reactions'));
    if (rxTab) rxTab.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const rxMetrics = await page.evaluate(() => {
    const activeTab = document.querySelector('.party-drawer__tab.active')?.textContent.trim();
    const reactionBtns = Array.from(document.querySelectorAll('.party-reactions-grid__btn')).length;
    return { activeTab, reactionBtns };
  });
  console.log('Reactions Tab Metrics:', rxMetrics);

  const bottomSheetRxPath = path.join(ARTIFACT_DIR, 'player_mobile_bottom_sheet_reactions.png');
  await page.screenshot({ path: bottomSheetRxPath, fullPage: false });
  console.log('Saved screenshot:', bottomSheetRxPath);

  // Switch to Room tab
  console.log('9. Switching to Room tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.party-drawer__tab'));
    const roomTab = tabs.find(t => t.textContent.includes('Room'));
    if (roomTab) roomTab.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const roomMetrics = await page.evaluate(() => {
    const activeTab = document.querySelector('.party-drawer__tab.active')?.textContent.trim();
    const serverButtons = Array.from(document.querySelectorAll('.party-drawer__server-btn')).length;
    return { activeTab, serverButtons };
  });
  console.log('Room Tab Metrics:', roomMetrics);

  const bottomSheetRoomPath = path.join(ARTIFACT_DIR, 'player_mobile_bottom_sheet_room.png');
  await page.screenshot({ path: bottomSheetRoomPath, fullPage: false });
  console.log('Saved screenshot:', bottomSheetRoomPath);

  // Switch to Members tab
  console.log('10. Switching to Members tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.party-drawer__tab'));
    const memTab = tabs.find(t => t.textContent.includes('Members'));
    if (memTab) memTab.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const memMetrics = await page.evaluate(() => {
    const activeTab = document.querySelector('.party-drawer__tab.active')?.textContent.trim();
    const participants = Array.from(document.querySelectorAll('.party-participant-item')).length;
    return { activeTab, participants };
  });
  console.log('Members Tab Metrics:', memMetrics);

  const bottomSheetMemPath = path.join(ARTIFACT_DIR, 'player_mobile_bottom_sheet_members.png');
  await page.screenshot({ path: bottomSheetMemPath, fullPage: false });
  console.log('Saved screenshot:', bottomSheetMemPath);

  await browser.close();
  console.log('--- TEST FINISHED SUCCESSFULLY ---');
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
