async function testAnimeTVPlus() {
  const malUrl = 'https://embed.animetvplus.site/home/embed/mal/64340/1'
  
  const testCases = [
    {
      name: 'Desktop UA with Vercel Referer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://7anime-tv.vercel.app/',
        'Origin': 'https://7anime-tv.vercel.app',
      }
    },
    {
      name: 'Mobile Android UA with Vercel Referer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36',
        'Referer': 'https://7anime-tv.vercel.app/',
        'Origin': 'https://7anime-tv.vercel.app',
      }
    },
    {
      name: 'Mobile Android UA with InfinityFree Referer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36',
        'Referer': 'https://7anime.ct.ws/',
        'Origin': 'https://7anime.ct.ws',
      }
    },
    {
      name: 'Mobile iOS Safari UA with Vercel Referer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        'Referer': 'https://7anime-tv.vercel.app/',
        'Origin': 'https://7anime-tv.vercel.app',
      }
    },
  ]

  for (const tc of testCases) {
    console.log(`\n--- Testing: ${tc.name} ---`)
    try {
      const res = await fetch(malUrl, { headers: tc.headers })
      console.log('Status:', res.status, res.statusText)
      console.log('Headers:', Object.fromEntries(res.headers.entries()))
      const html = await res.text()
      console.log('Body length:', html.length)
      console.log('Body snippet:', html.slice(0, 250).replace(/\n/g, ' '))
      if (html.includes('iframe') || html.includes('player') || html.includes('video') || html.includes('source')) {
        console.log('Player/video markup detected: YES')
      } else {
        console.log('Player/video markup detected: NO')
      }
    } catch (err) {
      console.error('Fetch error:', err.message)
    }
  }
}

testAnimeTVPlus()
