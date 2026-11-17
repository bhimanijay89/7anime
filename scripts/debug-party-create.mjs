import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/BHIMANI/.gemini/antigravity/brain/a2b9de21-66b7-4141-96b9-a2ff7e0be97d';

async function run() {
  console.log('--- DEBUGGING PARTY CREATE MODAL ---');

  let token = null;
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bhimanijay89@gmail.com', password: 'bhimanijay' }),
  });
  const loginData = await loginRes.json();
  if (loginData.ok && loginData.data?.token) {
    token = loginData.data.token;
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  page.on('console', msg => console.log('[PAGE]', msg.type(), msg.text()));

  if (token) {
    await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => localStorage.setItem('7anime_token', t), token);
  }

  await page.goto('http://localhost:5174#movies', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.movies-hero__actions .movies-btn--primary', { timeout: 20000 });
  await page.click('.movies-hero__actions .movies-btn--primary');
  await page.waitForSelector('.cinema-player', { timeout: 35000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Clicking mobile Party button...');
  await page.click('.cinema-player__mobile-party-btn:not(.cinema-player__mobile-party-btn--join)');
  await page.waitForSelector('.party-modal', { timeout: 5000 });

  const modalHtml = await page.evaluate(() => {
    const modal = document.querySelector('.party-modal');
    return {
      buttons: Array.from(modal.querySelectorAll('button')).map(b => ({ text: b.textContent.trim(), class: b.className })),
      inputs: Array.from(modal.querySelectorAll('input, select')).map(i => i.outerHTML),
      text: modal.innerText
    };
  });
  console.log('Modal State before click:', JSON.stringify(modalHtml, null, 2));

  // Click the submit button
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.party-modal button')).find(b => b.textContent?.includes('Create Watch Party'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked submit button:', clicked);

  await new Promise(r => setTimeout(r, 3000));

  const modalAfter = await page.evaluate(() => {
    const modal = document.querySelector('.party-modal');
    return modal ? modal.innerText : 'MODAL CLOSED';
  });
  console.log('Modal State after 3s:', modalAfter);

  const playerState = await page.evaluate(() => {
    const mobileActions = document.querySelector('.cinema-player__mobile-actions')?.innerHTML;
    const sheet = document.querySelector('.party-bottom-sheet');
    const drawer = document.querySelector('.party-drawer');
    return {
      mobileActions,
      sheetFound: !!sheet,
      drawerFound: !!drawer
    };
  });
  console.log('Player State:', playerState);

  await browser.close();
}

run().catch(console.error);
