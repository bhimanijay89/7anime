import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/BHIMANI/.gemini/antigravity/brain/a2b9de21-66b7-4141-96b9-a2ff7e0be97d';

async function run() {
  console.log('--- STARTING PREMIUM PLAYER REDESIGN VERIFICATION ---');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
  });

  const page = await browser.newPage();

  try {
    // ==========================================
    // TEST 1: MOBILE VIEWPORT (390px)
    // ==========================================
    console.log('\n[Test 1] Inspecting Mobile Player UI (390px)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    await page.goto('http://localhost:5174#movies', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.movies-hero__actions .movies-btn--primary', { timeout: 20000 });
    await page.click('.movies-hero__actions .movies-btn--primary');

    console.log('Waiting for .cinema-player...');
    await page.waitForSelector('.cinema-player', { timeout: 35000 });
    await new Promise(r => setTimeout(r, 2000));

    // Capture initial 390px view
    const initial390Data = await page.evaluate(() => {
      const header = document.querySelector('.cinema-player__header');
      const title = document.querySelector('.cinema-player__anime-title')?.textContent?.trim();
      const epTag = document.querySelector('.cinema-player__ep-tag')?.textContent?.trim();
      const deck = document.querySelector('.cinema-player__deck');
      const prevBtn = document.querySelector('.cinema-player__nav-btn--prev');
      const nextBtn = document.querySelector('.cinema-player__nav-btn--next');
      const dropdown = document.querySelector('.cinema-player__ep-dropdown-wrap');
      const autoNext = document.querySelector('.cinema-player__autonext');
      const partyBtn = document.querySelector('.cinema-player__party-pill');
      const joinBtn = document.querySelector('.cinema-player__party-pill--join');
      const serverCards = Array.from(document.querySelectorAll('.cinema-player__server-card'));
      const activeServer = document.querySelector('.cinema-player__server-card.active')?.textContent?.trim();
      const audioMulti = document.querySelector('.cinema-player__audio-multi-card');
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;

      return {
        hasHeader: !!header,
        title,
        epTag,
        hasDeck: !!deck,
        hasPrevBtn: !!prevBtn,
        hasNextBtn: !!nextBtn,
        hasDropdown: !!dropdown,
        hasAutoNext: !!autoNext,
        hasPartyBtn: !!partyBtn,
        hasJoinBtn: !!joinBtn,
        serverCount: serverCards.length,
        activeServer,
        hasAudioMultiOnServer1: !!audioMulti,
        hasOverflow: scrollWidth > clientWidth,
        scrollWidth,
        clientWidth
      };
    });

    console.log('Initial 390px player state:', initial390Data);

    const shot390Initial = path.join(ARTIFACT_DIR, 'redesign_player_390px_server1.png');
    await page.screenshot({ path: shot390Initial, fullPage: true });
    console.log('📸 Screenshot saved:', shot390Initial);

    // ==========================================
    // TEST 2: SERVER SWITCHING & AUDIO SEGMENTED TOGGLE
    // ==========================================
    console.log('\n[Test 2] Testing Server Switching to Server 2 (Sub/Dub Segmented)...');
    // Click Server 2
    const server2Btn = await page.$('.cinema-player__server-card:nth-child(2)');
    if (server2Btn) {
      await server2Btn.click();
      await new Promise(r => setTimeout(r, 1500));
    }

    const server2Data = await page.evaluate(() => {
      const activeServer = document.querySelector('.cinema-player__server-card.active')?.textContent?.trim();
      const segmentedAudio = document.querySelector('.cinema-player__audio-segmented');
      const audioPills = Array.from(document.querySelectorAll('.cinema-player__audio-pill')).map(p => ({
        text: p.textContent?.trim(),
        active: p.classList.contains('active')
      }));
      return {
        activeServer,
        hasSegmentedAudio: !!segmentedAudio,
        audioPills
      };
    });
    console.log('Server 2 state:', server2Data);

    // Click DUB
    const dubBtn = await page.$('.cinema-player__audio-pill:nth-child(2)');
    if (dubBtn) {
      await dubBtn.click();
      await new Promise(r => setTimeout(r, 800));
    }

    const shot390Server2 = path.join(ARTIFACT_DIR, 'redesign_player_390px_server2_dub.png');
    await page.screenshot({ path: shot390Server2, fullPage: true });
    console.log('📸 Screenshot saved:', shot390Server2);

    // Switch to Server 3
    console.log('\n[Test 3] Testing Server Switching to Server 3 (MegaPlay)...');
    const server3Btn = await page.$('.cinema-player__server-card:nth-child(3)');
    if (server3Btn) {
      await server3Btn.click();
      await new Promise(r => setTimeout(r, 1500));
    }

    const server3Data = await page.evaluate(() => {
      const activeServer = document.querySelector('.cinema-player__server-card.active')?.textContent?.trim();
      const iframeSrc = document.querySelector('.cinema-player__iframe')?.getAttribute('src');
      return {
        activeServer,
        iframeSrc: iframeSrc?.slice(0, 60) + '...'
      };
    });
    console.log('Server 3 state:', server3Data);

    // ==========================================
    // TEST 4: ULTRA-COMPACT MOBILE VIEWPORT (320px)
    // ==========================================
    console.log('\n[Test 4] Inspecting Ultra-compact Mobile Viewport (320px)...');
    await page.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 1000));

    const data320 = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      const deckBox = document.querySelector('.cinema-player__deck')?.getBoundingClientRect();
      const configBox = document.querySelector('.cinema-player__config-panel')?.getBoundingClientRect();

      return {
        scrollWidth,
        clientWidth,
        hasOverflow: scrollWidth > clientWidth,
        deckWidth: deckBox?.width,
        configWidth: configBox?.width
      };
    });
    console.log('320px ultra-compact metrics:', data320);

    const shot320 = path.join(ARTIFACT_DIR, 'redesign_player_320px.png');
    await page.screenshot({ path: shot320, fullPage: true });
    console.log('📸 Screenshot saved:', shot320);

    // ==========================================
    // TEST 5: TABLET VIEWPORT (768px)
    // ==========================================
    console.log('\n[Test 5] Inspecting Tablet Viewport (768px)...');
    await page.setViewport({ width: 768, height: 1024, isMobile: false });
    await new Promise(r => setTimeout(r, 1000));

    const shot768 = path.join(ARTIFACT_DIR, 'redesign_player_768px.png');
    await page.screenshot({ path: shot768, fullPage: true });
    console.log('📸 Screenshot saved:', shot768);

    // ==========================================
    // TEST 6: DESKTOP CINEMA VIEWPORT (1440px)
    // ==========================================
    console.log('\n[Test 6] Inspecting Desktop Cinema Viewport (1440px)...');
    await page.setViewport({ width: 1440, height: 900, isMobile: false });
    await new Promise(r => setTimeout(r, 1000));

    const desktopData = await page.evaluate(() => {
      const topbarActions = document.querySelector('.cinema-player__topbar-actions');
      const topbarActionsVisible = topbarActions ? window.getComputedStyle(topbarActions).display !== 'none' : false;
      const stageBox = document.querySelector('.cinema-player__stage')?.getBoundingClientRect();
      const sidebar = document.querySelector('.player-sidebar');
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;

      return {
        topbarActionsVisible,
        stageWidth: stageBox?.width,
        stageHeight: stageBox?.height,
        aspectRatio: stageBox ? (stageBox.width / stageBox.height).toFixed(2) : null,
        hasSidebar: !!sidebar,
        hasOverflow: scrollWidth > clientWidth,
        scrollWidth,
        clientWidth
      };
    });
    console.log('1440px desktop cinema metrics:', desktopData);

    const shot1440 = path.join(ARTIFACT_DIR, 'redesign_player_1440px.png');
    await page.screenshot({ path: shot1440, fullPage: true });
    console.log('📸 Screenshot saved:', shot1440);

    console.log('\n==========================================');
    console.log('ALL VISUAL & FUNCTIONAL CHECKS COMPLETED!');
    console.log('==========================================\n');

  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    await browser.close();
  }
}

run();
