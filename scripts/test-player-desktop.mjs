import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/BHIMANI/.gemini/antigravity/brain/a2b9de21-66b7-4141-96b9-a2ff7e0be97d';

async function run() {
  console.log('--- TESTING DESKTOP PLAYER (1440px) ---');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    await page.goto('http://localhost:5174#movies', { waitUntil: 'domcontentloaded' });
    
    console.log('Clicking Watch Movie on Movies hero...');
    await page.waitForSelector('.movies-hero__actions .movies-btn--primary', { timeout: 20000 });
    await page.click('.movies-hero__actions .movies-btn--primary');

    console.log('Waiting for .cinema-player...');
    await page.waitForSelector('.cinema-player', { timeout: 35000 });
    await new Promise(r => setTimeout(r, 2000));

    const desktopData = await page.evaluate(() => {
      const topbarActions = document.querySelector('.cinema-player__topbar-actions');
      const topbarActionsVisible = topbarActions ? window.getComputedStyle(topbarActions).display !== 'none' : false;
      const stageBox = document.querySelector('.cinema-player__stage')?.getBoundingClientRect();
      const deck = document.querySelector('.cinema-player__deck')?.getBoundingClientRect();
      const config = document.querySelector('.cinema-player__config-panel')?.getBoundingClientRect();
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;

      return {
        topbarActionsVisible,
        stageWidth: stageBox?.width,
        stageHeight: stageBox?.height,
        aspectRatio: stageBox ? (stageBox.width / stageBox.height).toFixed(2) : null,
        deckWidth: deck?.width,
        configWidth: config?.width,
        hasOverflow: scrollWidth > clientWidth,
        scrollWidth,
        clientWidth
      };
    });

    console.log('1440px Desktop Player metrics:', desktopData);

    const shot1440 = path.join(ARTIFACT_DIR, 'redesign_player_1440px_desktop.png');
    await page.screenshot({ path: shot1440, fullPage: true });
    console.log('📸 Screenshot saved:', shot1440);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

run();
