import 'dotenv/config'
import prisma from '../db/client.js'
import { cache } from '../redis/cache.js'
import {
  ensureCuratedHeroLogos,
  resolveTmdbLogo,
  CURATED_HERO_ANIME,
} from '../services/tmdb.js'
import type { AnimeLogoResult } from '../types.js'

async function runTest() {
  console.log('====================================================')
  console.log('7ANIME — PHASE 3.2 CURATED HERO & DB PERSISTENCE TEST')
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

  // 1. Run ensureCuratedHeroLogos
  console.log('--- TEST GROUP 1: Ensure Curated Hero Logos ---')
  const startTime = Date.now()
  const logos = await ensureCuratedHeroLogos()
  const elapsed = Date.now() - startTime
  console.log(`Curated logos resolution took ${elapsed}ms`)

  assert(
    Object.keys(logos).length === 10,
    `Resolved all 10 curated anime logos (got ${Object.keys(logos).length}/10)`,
  )

  // 2. Verify all 10 records in PostgreSQL directly
  console.log('\n--- TEST GROUP 2: Direct PostgreSQL Database Verification ---')
  const dbRecords = await prisma.animeTmdbLogo.findMany({
    where: {
      anilistId: { in: CURATED_HERO_ANIME.map(a => a.anilistId) },
    },
    orderBy: { anilistId: 'asc' },
  })

  assert(
    dbRecords.length === 10,
    `PostgreSQL contains exactly 10 curated logo records (found ${dbRecords.length})`,
  )

  for (const item of CURATED_HERO_ANIME) {
    const rec = dbRecords.find(r => r.anilistId === item.anilistId)
    assert(Boolean(rec), `Record exists in DB for ${item.title} (AniList: ${item.anilistId})`)
    if (rec) {
      assert(rec.tmdbId === item.tmdbId, `${item.title}: TMDB ID matches ${item.tmdbId} (got ${rec.tmdbId})`)
      assert(Boolean(rec.logoUrl && rec.logoUrl.startsWith('https://image.tmdb.org/')), `${item.title}: valid logo URL`)
      assert(Boolean(rec.filePath && rec.filePath.startsWith('/')), `${item.title}: valid filePath (${rec.filePath})`)
      assert(rec.language === 'en', `${item.title}: language is official English ('${rec.language}')`)
      assert(rec.status === 'verified', `${item.title}: status is 'verified'`)
      assert(rec.expiresAt === null, `${item.title}: expiresAt is null (permanent persistence)`)
      assert(!rec.notFound, `${item.title}: notFound is false`)
      console.log(`   -> ${item.title}: ${rec.logoUrl} (${rec.width}x${rec.height}, aspect: ${rec.aspectRatio})`)
    }
  }

  // 3. Test Redis Cache Invalidation / Flush Resilience
  console.log('\n--- TEST GROUP 3: Redis Invalidation & DB Fallback Verification ---')
  for (const item of CURATED_HERO_ANIME) {
    // Evict key from Redis
    const cacheKey = `anime:logo:${item.anilistId}`
    await cache.delete(cacheKey)

    // Verify Redis cache is empty
    const beforeRead = await cache.get(cacheKey)
    assert(beforeRead === null, `Redis key ${cacheKey} successfully evicted`)

    // Call resolveTmdbLogo - should hit PostgreSQL (Tier 2) and backfill Redis without TMDB request
    const resolveStart = Date.now()
    const resolved = await resolveTmdbLogo(item.anilistId, item.tmdbId, item.mediaType)
    const resolveElapsed = Date.now() - resolveStart

    assert(Boolean(resolved && resolved.logoUrl), `${item.title} resolved from DB cache after Redis flush (${resolveElapsed}ms)`)

    // Verify Redis has been re-populated
    const afterRead = await cache.get<AnimeLogoResult>(cacheKey)
    assert(Boolean(afterRead && afterRead.logoUrl), `${item.title} Redis cache re-populated from DB hit`)
  }

  console.log('\n====================================================')
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runTest().catch(err => {
  console.error('Fatal error in test suite:', err)
  process.exit(1)
})

