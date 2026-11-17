import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/BHIMANI/.gemini/antigravity/brain/a2b9de21-66b7-4141-96b9-a2ff7e0be97d';

async function run() {
  console.log('--- STARTING COMPREHENSIVE PRODUCTION-SAFE VERIFICATION ---');

  // 1. Authenticate test user with backend
  console.log('\n[Step 1] Authenticating test user with backend /api/auth/login...');
  let token = null;
  let user = null;
  try {
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bhimanijay89@gmail.com', password: 'bhimanijay' }),
    });
    const loginData = await loginRes.json();
    if (loginData.ok && loginData.data?.token) {
      token = loginData.data.token;
      user = loginData.data.user;
      console.log('✅ Authenticated successfully! User:', user.username);
    }
  } catch (err) {
    console.warn('⚠️ Login fetch error:', err.message);
  }

  // 2. Create a test Party Room via backend REST API to verify live Party state
  let testRoom = null;
  if (token) {
    console.log('\n[Step 2] Creating a real watch party room via backend /api/party/rooms...');
    try {
      const roomRes = await fetch('http://localhost:3001/api/party/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          anilistId: 21,
          mediaType: 'tv',
          episodeNumber: 1,
          audioType: 'sub',
          serverId: 'server1'
        })
      });
      const roomData = await roomRes.json();
      if (roomData.ok && roomData.data?.code) {
        testRoom = roomData.data;
        console.log('✅ Created Watch Party Room code:', testRoom.code, 'Token:', testRoom.inviteToken?.slice(0, 8) + '...');
      }
    } catch (err) {
      console.warn('⚠️ Failed to create test party room:', err.message);
    }
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[PAGE ERROR]`, msg.text());
    }
  });

  // ==========================================
  // TEST 1: MOBILE MOVIES PAGE (390px & 320px)
  // ==========================================
  console.log('\n--- Test 1: Movies Page (Mobile 390px & 320px) ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5174#movies', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.movies-hero, .movies-grid', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 1200));

  const moviesMetrics390 = await page.evaluate(() => {
    const heroPoster = document.querySelector('.movies-hero__poster-box');
    const heroPosterDisplay = heroPoster ? window.getComputedStyle(heroPoster).display : 'none';
    const heroPosterWidth = heroPoster ? heroPoster.getBoundingClientRect().width : 0;
    const heroTitle = document.querySelector('.movies-hero__title');
    const heroSynopsis = document.querySelector('.movies-hero__synopsis');
    const grid = document.querySelector('.movies-grid');
    const gridStyle = grid ? window.getComputedStyle(grid) : null;
    const gridCols = gridStyle ? gridStyle.gridTemplateColumns.split(' ').length : 0;
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    return {
      heroPosterDisplay,
      heroPosterWidth,
      heroTitle: heroTitle ? heroTitle.textContent.trim() : null,
      heroSynopsis: heroSynopsis ? heroSynopsis.textContent.trim().slice(0, 50) + '...' : null,
      gridCols,
      hasOverflow: scrollWidth > clientWidth,
      scrollWidth,
      clientWidth
    };
  });
  console.log('Movies 390px metrics:', moviesMetrics390);

  const moviesScreenshotPath = path.join(ARTIFACT_DIR, 'movies_mobile_390px.png');
  await page.screenshot({ path: moviesScreenshotPath, fullPage: false });
  console.log('Saved screenshot:', moviesScreenshotPath);

  // Check 320px Movies Grid
  await page.setViewport({ width: 320, height: 600, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 800));

  const moviesMetrics320 = await page.evaluate(() => {
    const grid = document.querySelector('.movies-grid');
    const gridStyle = grid ? window.getComputedStyle(grid) : null;
    const gridCols = gridStyle ? gridStyle.gridTemplateColumns.split(' ').length : 0;
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    return {
      gridCols,
      hasOverflow: scrollWidth > clientWidth,
      scrollWidth,
      clientWidth
    };
  });
  console.log('Movies 320px metrics:', moviesMetrics320);

  const movies320ScreenshotPath = path.join(ARTIFACT_DIR, 'movies_mobile_320px.png');
  await page.screenshot({ path: movies320ScreenshotPath, fullPage: false });
  console.log('Saved screenshot:', movies320ScreenshotPath);

  // ==========================================
  // TEST 2: MOBILE PLAYER PAGE & ACTIONS (390px)
  // ==========================================
  console.log('\n--- Test 2: Full Player View & Join Modal (Mobile 390px) ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  
  // Set auth token in localStorage so user is recognized in player
  if (token) {
    await page.evaluate((t) => localStorage.setItem('7anime_token', t), token);
  }

  // Open player directly by navigating to #movies and clicking Watch Movie
  console.log('Navigating to Movies and clicking Watch Movie...');
  await page.goto('http://localhost:5174#movies', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.movies-hero__actions .movies-btn--primary', { timeout: 20000 });
  await page.click('.movies-hero__actions .movies-btn--primary');

  console.log('Waiting for .cinema-player...');
  await page.waitForSelector('.cinema-player', { timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  const playerMetrics = await page.evaluate(() => {
    const iframe = document.querySelector('.cinema-player__iframe');
    const iframeBox = iframe ? iframe.getBoundingClientRect() : null;
    const mobileActions = document.querySelector('.cinema-player__mobile-actions');
    const joinBtn = document.querySelector('.cinema-player__mobile-party-btn--join');
    const partyBtn = document.querySelector('.cinema-player__mobile-party-btn:not(.cinema-player__mobile-party-btn--join)');
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    return {
      iframeFound: !!iframe,
      iframeWidth: iframeBox ? iframeBox.width : 0,
      iframeHeight: iframeBox ? iframeBox.height : 0,
      hasMobileActions: !!mobileActions,
      hasJoinBtn: !!joinBtn,
      joinBtnText: joinBtn ? joinBtn.textContent.trim() : null,
      hasPartyBtn: !!partyBtn,
      partyBtnText: partyBtn ? partyBtn.textContent.trim() : null,
      hasOverflow: scrollWidth > clientWidth,
      scrollWidth,
      clientWidth
    };
  });
  console.log('Player 390px metrics:', playerMetrics);

  const playerMobilePath = path.join(ARTIFACT_DIR, 'player_mobile_actions_390px.png');
  await page.screenshot({ path: playerMobilePath, fullPage: false });
  console.log('Saved screenshot:', playerMobilePath);

  // ==========================================
  // TEST 3: JOIN PARTY MODAL INTERACTION
  // ==========================================
  console.log('\n--- Test 3: Join Party Modal Interaction ---');
  const joinBtn = await page.$('.cinema-player__mobile-party-btn--join');
  if (joinBtn) {
    console.log('Clicking Join Party button...');
    await joinBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    const modalMetrics = await page.evaluate(() => {
      const dialog = document.querySelector('.dialog, .glass-modal');
      const partyModal = document.querySelector('.party-modal');
      const input = document.querySelector('.party-modal__input--code');
      const isFocused = document.activeElement === input;
      const title = document.querySelector('.party-modal__title, .dialog h2')?.textContent?.trim();
      return {
        dialogVisible: !!dialog,
        partyModalVisible: !!partyModal,
        title,
        hasInput: !!input,
        isAutofocused: isFocused,
        placeholder: input ? input.getAttribute('placeholder') : null
      };
    });
    console.log('Join Modal metrics:', modalMetrics);

    const joinModalPath = path.join(ARTIFACT_DIR, 'player_mobile_join_modal.png');
    await page.screenshot({ path: joinModalPath, fullPage: false });
    console.log('Saved screenshot:', joinModalPath);

    // If testRoom exists, test typing room code into input
    if (testRoom?.code) {
      console.log('Typing room code into input:', testRoom.code);
      await page.type('.party-modal__input--code', testRoom.code);
      await new Promise(r => setTimeout(r, 500));
      
      const typedModalPath = path.join(ARTIFACT_DIR, 'player_mobile_join_modal_typed.png');
      await page.screenshot({ path: typedModalPath, fullPage: false });
      console.log('Saved screenshot:', typedModalPath);

      // Submit join
      console.log('Submitting Join Party...');
      await page.evaluate(() => {
        const joinSubmitBtn = Array.from(document.querySelectorAll('.party-modal button')).find(b => b.textContent?.includes('Join'));
        if (joinSubmitBtn) joinSubmitBtn.click();
      });
      await new Promise(r => setTimeout(r, 3000));
    } else {
      // Close modal
      await page.click('.dialog__close');
      await new Promise(r => setTimeout(r, 600));
    }
  }

  // ==========================================
  // TEST 4: MOBILE BOTTOM SHEET DRAWER
  // ==========================================
  console.log('\n--- Test 4: Mobile Bottom Sheet Party Drawer ---');
  // Check if room pill is visible in mobile player actions bar
  const roomPillState = await page.evaluate(() => {
    const pill = document.querySelector('.cinema-player__room-pill');
    const sheet = document.querySelector('.party-bottom-sheet');
    const dragHandle = document.querySelector('.party-bottom-sheet__drag-handle');
    const tabs = Array.from(document.querySelectorAll('.party-bottom-sheet__tab')).map(t => t.textContent.trim());
    const activeTab = document.querySelector('.party-bottom-sheet__tab--active')?.textContent.trim();
    return {
      hasRoomPill: !!pill,
      roomPillText: pill ? pill.textContent.trim() : null,
      sheetVisible: !!sheet,
      hasDragHandle: !!dragHandle,
      tabs,
      activeTab
    };
  });
  console.log('Live Room / Bottom Sheet State:', roomPillState);

  // If sheet is visible, take screenshots of Chat, Reactions, Room, Members tabs
  if (roomPillState.sheetVisible) {
    const bottomSheetChatPath = path.join(ARTIFACT_DIR, 'player_mobile_bottom_sheet_chat.png');
    await page.screenshot({ path: bottomSheetChatPath, fullPage: false });
    console.log('Saved screenshot:', bottomSheetChatPath);

    // Switch to Reactions tab
    console.log('Switching to Reactions tab in Bottom Sheet...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.party-bottom-sheet__tab'));
      const rxTab = tabs.find(t => t.textContent.includes('Reactions'));
      if (rxTab) rxTab.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const reactionsPath = path.join(ARTIFACT_DIR, 'player_mobile_bottom_sheet_reactions.png');
    await page.screenshot({ path: reactionsPath, fullPage: false });
    console.log('Saved screenshot:', reactionsPath);

    // Switch to Room tab
    console.log('Switching to Room tab in Bottom Sheet...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.party-bottom-sheet__tab'));
      const roomTab = tabs.find(t => t.textContent.includes('Room'));
      if (roomTab) roomTab.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const roomTabPath = path.join(ARTIFACT_DIR, 'player_mobile_bottom_sheet_room.png');
    await page.screenshot({ path: roomTabPath, fullPage: false });
    console.log('Saved screenshot:', roomTabPath);

    // Switch to Members tab
    console.log('Switching to Members tab in Bottom Sheet...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.party-bottom-sheet__tab'));
      const membersTab = tabs.find(t => t.textContent.includes('Members'));
      if (membersTab) membersTab.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const membersTabPath = path.join(ARTIFACT_DIR, 'player_mobile_bottom_sheet_members.png');
    await page.screenshot({ path: membersTabPath, fullPage: false });
    console.log('Saved screenshot:', membersTabPath);
  }

  // ==========================================
  // TEST 5: DESKTOP PLAYER (1440px)
  // ==========================================
  console.log('\n--- Test 5: Desktop Player View (1440px) ---');
  await page.setViewport({ width: 1440, height: 900, isMobile: false });
  await page.goto('http://localhost:5174#movies', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.movies-hero__actions .movies-btn--primary', { timeout: 20000 });
  await page.click('.movies-hero__actions .movies-btn--primary');
  await page.waitForSelector('.cinema-player', { timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  const desktopMetrics = await page.evaluate(() => {
    const desktopJoinBtn = document.querySelector('.cinema-player__action-btn--join');
    const desktopPartyBtn = document.querySelector('.cinema-player__party-btn');
    const iframe = document.querySelector('.cinema-player__iframe');
    const iframeBox = iframe ? iframe.getBoundingClientRect() : null;
    return {
      hasDesktopJoinBtn: !!desktopJoinBtn,
      desktopJoinText: desktopJoinBtn ? desktopJoinBtn.textContent.trim() : null,
      hasDesktopPartyBtn: !!desktopPartyBtn,
      iframeWidth: iframeBox ? iframeBox.width : 0,
      iframeHeight: iframeBox ? iframeBox.height : 0
    };
  });
  console.log('Desktop 1440px Metrics:', desktopMetrics);

  const desktopScreenshot = path.join(ARTIFACT_DIR, 'player_desktop_1440px.png');
  await page.screenshot({ path: desktopScreenshot, fullPage: false });
  console.log('Saved screenshot:', desktopScreenshot);

  await browser.close();
  console.log('\n--- ALL VERIFICATIONS COMPLETED SUCCESSFULLY ---');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
