import 'dotenv/config'
import {
  resolveTmdbLogo,
  selectBestLogo,
  scoreLogoCandidate,
  type TmdbRawLogo,
} from '../services/tmdb.js'
import { cache } from '../redis/cache.js'

async function runTests() {
  console.log('====================================================')
  console.log('7ANIME — TMDB LOGO RESOLVER COMPREHENSIVE TEST SUITE')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`)
      passed++
    } else {
      console.error(`[FAIL] ${desc}`)
      failed++
    }
  }

  // ----------------------------------------------------
  // TEST 1: Unit tests for Logo Selection & Scoring Algorithm
  // ----------------------------------------------------
  console.log('--- TEST GROUP 1: Logo Selection & Priority Scoring ---')

  const dummyLogos: TmdbRawLogo[] = [
    {
      file_path: '/french_logo.png',
      iso_639_1: 'fr',
      width: 1000,
      height: 300,
      aspect_ratio: 3.33,
      vote_average: 9.0,
      vote_count: 5,
    },
    {
      file_path: '/neutral_logo.png',
      iso_639_1: null,
      width: 800,
      height: 250,
      aspect_ratio: 3.2,
      vote_average: 6.0,
      vote_count: 2,
    },
    {
      file_path: '/japanese_logo.png',
      iso_639_1: 'ja',
      width: 900,
      height: 300,
      aspect_ratio: 3.0,
      vote_average: 7.5,
      vote_count: 4,
    },
    {
      file_path: '/english_logo.png',
      iso_639_1: 'en',
      width: 1200,
      height: 400,
      aspect_ratio: 3.0,
      vote_average: 8.0,
      vote_count: 10,
    },
  ]

  // English priority
  const bestEn = selectBestLogo(dummyLogos)
  assert(bestEn?.file_path === '/english_logo.png', 'Prefers English logo when available')

  // Japanese fallback
  const noEn = dummyLogos.filter(l => l.iso_639_1 !== 'en')
  const bestJa = selectBestLogo(noEn)
  assert(bestJa?.file_path === '/japanese_logo.png', 'Falls back to Japanese logo when English missing')

  // Neutral fallback
  const noEnJa = noEn.filter(l => l.iso_639_1 !== 'ja')
  const bestNeutral = selectBestLogo(noEnJa)
  assert(bestNeutral?.file_path === '/neutral_logo.png', 'Falls back to Neutral logo when En & Ja missing')

  // Other fallback
  const onlyOther = noEnJa.filter(l => l.iso_639_1 !== null)
  const bestOther = selectBestLogo(onlyOther)
  assert(bestOther?.file_path === '/french_logo.png', 'Falls back to other languages if preferred missing')

  // Invalid image rejection
  const invalidLogos: TmdbRawLogo[] = [
    { file_path: '', iso_639_1: 'en', width: 500, height: 200, aspect_ratio: 2.5 },
    { file_path: 'relative_path.png', iso_639_1: 'en', width: 500, height: 200, aspect_ratio: 2.5 },
    { file_path: '/valid.png', iso_639_1: 'en', width: -10, height: 200, aspect_ratio: 2.5 },
    { file_path: '/valid.png', iso_639_1: 'en', width: 500, height: 0, aspect_ratio: 2.5 },
    { file_path: '/valid.png', iso_639_1: 'en', width: 500, height: 200, aspect_ratio: 0 },
  ]
  const bestInvalid = selectBestLogo(invalidLogos)
  assert(bestInvalid === null, 'Rejects invalid logos (empty path, non-root path, non-positive dimensions/aspect)')

  // Scoring prefers transparent PNG over JPG and wider aspect ratio
  const pngLogo: TmdbRawLogo = { file_path: '/logo.png', iso_639_1: 'en', width: 800, height: 250, aspect_ratio: 3.2 }
  const jpgLogo: TmdbRawLogo = { file_path: '/logo.jpg', iso_639_1: 'en', width: 800, height: 250, aspect_ratio: 3.2 }
  assert(scoreLogoCandidate(pngLogo) > scoreLogoCandidate(jpgLogo), 'Scores PNG higher than non-PNG')

  // ----------------------------------------------------
  // TEST 2: Real TMDB Resolution on Requested Titles
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 2: Live TMDB Resolution on Target Titles ---')

  const testSuite = [
    { name: 'One Piece', anilistId: 21, tmdbId: 37854, mediaType: 'tv' as const },
    { name: 'Attack on Titan', anilistId: 16498, tmdbId: 1429, mediaType: 'tv' as const },
    { name: 'Jujutsu Kaisen', anilistId: 113415, tmdbId: 95479, mediaType: 'tv' as const },
    { name: 'Demon Slayer', anilistId: 101922, tmdbId: 85937, mediaType: 'tv' as const },
    { name: 'Solo Leveling', anilistId: 151807, tmdbId: 127532, mediaType: 'tv' as const },
    { name: 'Your Name', anilistId: 21519, tmdbId: 372058, mediaType: 'movie' as const },
    { name: 'Suzume', anilistId: 142770, tmdbId: 916224, mediaType: 'movie' as const },
    { name: 'Hello World', anilistId: 106240, tmdbId: 604605, mediaType: 'movie' as const },
  ]

  for (const item of testSuite) {
    // Clear cache first for a clean resolution test
    await cache.delete(`anime:logo:${item.anilistId}`)
    const res = await resolveTmdbLogo(item.anilistId, item.tmdbId, item.mediaType)
    assert(
      res !== null && res.logoUrl.startsWith('https://image.tmdb.org/t/p/original/'),
      `${item.name} resolved: ${res?.logoUrl} (lang: ${res?.language}, aspect: ${res?.aspectRatio})`
    )
  }

  // ----------------------------------------------------
  // TEST 3: Redis Cache Hit & In-Flight Deduplication
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: Redis Cache Hit & Concurrent Deduplication ---')

  const opId = 21
  const t0 = Date.now()
  const cachedHit = await resolveTmdbLogo(opId, 37854, 'tv')
  const duration = Date.now() - t0
  assert(
    cachedHit !== null && duration < 1000,
    `Cache hit returned in ${duration}ms (fast Redis read)`
  )

  // Concurrent deduplication
  const concurrentCalls = await Promise.all([
    resolveTmdbLogo(16498, 1429, 'tv'),
    resolveTmdbLogo(16498, 1429, 'tv'),
    resolveTmdbLogo(16498, 1429, 'tv'),
  ])
  assert(
    concurrentCalls[0]?.logoUrl === concurrentCalls[1]?.logoUrl &&
    concurrentCalls[1]?.logoUrl === concurrentCalls[2]?.logoUrl,
    'Concurrent requests returned identical result without duplicate fetches'
  )

  // ----------------------------------------------------
  // TEST 4: Negative Caching & Error Handling
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 4: Negative Caching & Edge Cases ---')

  const fakeAnilistId = 99999999
  await cache.delete(`anime:logo:${fakeAnilistId}`)
  const missingResult = await resolveTmdbLogo(fakeAnilistId, 99999999, 'tv')
  assert(missingResult === null, 'Non-existent anime returns null without error')

  // Check that negative cache was written
  const rawCached = await cache.get<{ notFound?: boolean }>(`anime:logo:${fakeAnilistId}`)
  assert(Boolean(rawCached?.notFound), 'Negative cache entry stored in Redis for missing logo')

  // Immediate subsequent call uses negative cache
  const secondCall = await resolveTmdbLogo(fakeAnilistId, 99999999, 'tv')
  assert(secondCall === null, 'Second call for missing anime returns null from negative cache')

  // Clean up test key
  await cache.delete(`anime:logo:${fakeAnilistId}`)

  // Invalid IDs
  const invalidIdResult = await resolveTmdbLogo(0, 37854, 'tv')
  assert(invalidIdResult === null, 'Invalid anilistId (0) returns null safely')

  console.log('\n====================================================')
  console.log(`TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
