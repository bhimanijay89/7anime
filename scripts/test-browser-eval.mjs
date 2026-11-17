import puppeteer from 'puppeteer'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()

  await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' })

  console.log('Evaluating getAnimeById(21) in browser context...')
  const result = await page.evaluate(async () => {
    try {
      // Dynamic import anilist service from client
      const mod = await import('/src/services/anilist.ts')
      const anime = await mod.getAnimeById(21)
      return {
        success: true,
        id: anime.id,
        title: anime.title,
        totalEpisodes: anime.totalEpisodes,
        episodesListCount: anime.episodesList?.length,
        hasEpisodesList: !!anime.episodesList,
      }
    } catch (err) {
      return { success: false, error: String(err), stack: err.stack }
    }
  })

  console.log('Browser Evaluation Result:', result)
  await browser.close()
}

run().catch(console.error)
