import 'dotenv/config'
import express from 'express'
import animeRouter from '../routes/anime.js'

interface TestLogoItem {
  logoUrl?: string
  aspectRatio?: number
  width?: number
  height?: number
}

interface TestClientLogo {
  url: string
  aspectRatio?: number
}

// Inlined client logic for Phase 2 test
async function fetchAnimeLogosClient(anilistIds: number[], serverUrl: string): Promise<Record<number, TestClientLogo | null>> {
  const validIds = Array.from(
    new Set(
      (anilistIds || [])
        .map(id => Number(id))
        .filter(id => Number.isInteger(id) && id > 0)
    )
  )
  if (validIds.length === 0) return {}
  try {
    const res = await fetch(`${serverUrl}/api/anime/logos?ids=${validIds.join(',')}`)
    if (!res.ok) return {}
    const json = await res.json()
    const rawData = (json?.data || {}) as Record<string, TestLogoItem | null>
    const result: Record<number, TestClientLogo | null> = {}
    for (const [idStr, logoItem] of Object.entries(rawData)) {
      const numId = Number(idStr)
      result[numId] = logoItem?.logoUrl ? { url: logoItem.logoUrl } : null
    }
    return result
  } catch {
    return {}
  }
}

async function runPhase2Tests() {
  console.log('====================================================')
  console.log('7ANIME — PHASE 2 LOGO API & FRONTEND PIPELINE TESTS')
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

  // Set up local express test server using the actual animeRouter
  const app = express()
  app.use(express.json())
  app.use('/api', animeRouter)

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Failed to bind server')
  const baseUrl = `http://127.0.0.1:${address.port}`

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: Backend Batch API Validation & Error Handling
    // ----------------------------------------------------
    console.log('--- TEST GROUP 1: Backend Route Validation & Error Handling ---')

    // 1. Missing ids param -> 400
    const resNoIds = await fetch(`${baseUrl}/api/anime/logos`)
    assert(resNoIds.status === 400, 'Rejects request without "ids" parameter with HTTP 400')
    const jsonNoIds = await resNoIds.json()
    assert(jsonNoIds.ok === false && jsonNoIds.error?.code === 'BAD_REQUEST', 'Error response has BAD_REQUEST error code')

    // 2. Empty ids param -> 400
    const resEmptyIds = await fetch(`${baseUrl}/api/anime/logos?ids=`)
    assert(resEmptyIds.status === 400, 'Rejects empty "ids=" parameter with HTTP 400')

    // 3. Non-numeric ID -> 400
    const resNonNumeric = await fetch(`${baseUrl}/api/anime/logos?ids=21,naruto,16498`)
    assert(resNonNumeric.status === 400, 'Rejects non-numeric ID with HTTP 400')
    const jsonNonNumeric = await resNonNumeric.json()
    assert(jsonNonNumeric.error?.code === 'INVALID_ID', 'Error response has INVALID_ID code for string token')

    // 4. Negative / zero ID -> 400
    const resNegative = await fetch(`${baseUrl}/api/anime/logos?ids=21,-5,16498`)
    assert(resNegative.status === 400, 'Rejects negative ID with HTTP 400')

    const resZero = await fetch(`${baseUrl}/api/anime/logos?ids=0,21`)
    assert(resZero.status === 400, 'Rejects zero ID with HTTP 400')

    // 5. Exceeding MAX_BATCH_SIZE (20) -> 400
    const tooMany = Array.from({ length: 25 }, (_, i) => i + 1).join(',')
    const resTooMany = await fetch(`${baseUrl}/api/anime/logos?ids=${tooMany}`)
    assert(resTooMany.status === 400, 'Rejects batches exceeding 20 IDs with HTTP 400')

    // ----------------------------------------------------
    // TEST GROUP 2: Batch Resolution & Deduplication
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 2: Batch Resolution & Partial Results ---')

    // 6. Duplicate IDs deduplication
    const resDuplicates = await fetch(`${baseUrl}/api/anime/logos?ids=21,21,16498,16498`)
    assert(resDuplicates.status === 200, 'Accepts duplicate IDs and returns HTTP 200')
    const jsonDuplicates = await resDuplicates.json()
    assert(
      Object.keys(jsonDuplicates.data).length === 2 &&
      jsonDuplicates.data['21'] !== undefined &&
      jsonDuplicates.data['16498'] !== undefined,
      'Duplicate IDs cleanly deduplicated into unique AniList ID keys'
    )

    // 7. Batch request with ten valid anime IDs (Top 10 scenario)
    const top10List = [21, 16498, 113415, 101922, 151807, 21519, 142770, 106240, 20, 269]
    const t0 = Date.now()
    const resTop10 = await fetch(`${baseUrl}/api/anime/logos?ids=${top10List.join(',')}`)
    const durationTop10 = Date.now() - t0
    assert(resTop10.status === 200, `Top 10 batch request returned HTTP 200 in ${durationTop10}ms`)
    const jsonTop10 = await resTop10.json()
    assert(jsonTop10.ok === true && typeof jsonTop10.data === 'object', 'Top 10 response has ok:true and data object')

    let resolvedCount = 0
    for (const id of top10List) {
      const item = jsonTop10.data[String(id)]
      if (item) {
        resolvedCount++
        assert(
          item.logoUrl.startsWith('https://image.tmdb.org/t/p/original/'),
          `Anime ID ${id} returned valid TMDB logoUrl: ${item.logoUrl}`
        )
      }
    }
    assert(resolvedCount >= 8, `Resolved authentic logos for ${resolvedCount}/${top10List.length} Top 10 titles`)

    // 8. Partial success with a non-existent anime ID
    const mixedBatch = [21, 99999999, 16498]
    const resMixed = await fetch(`${baseUrl}/api/anime/logos?ids=${mixedBatch.join(',')}`)
    const jsonMixed = await resMixed.json()
    assert(
      jsonMixed.data['21'] !== null &&
      jsonMixed.data['99999999'] === null &&
      jsonMixed.data['16498'] !== null,
      'Missing logo for 99999999 returns null without failing valid anime (partial success)'
    )

    // 9. Fast cached subsequent batch request
    const tCached = Date.now()
    const resCached = await fetch(`${baseUrl}/api/anime/logos?ids=${top10List.join(',')}`)
    const durationCached = Date.now() - tCached
    assert(
      resCached.status === 200 && durationCached < 5000,
      `Cached Top 10 batch response returned in ${durationCached}ms (< 5000ms)`
    )

    // ----------------------------------------------------
    // TEST GROUP 3: Frontend Service & Matching Verification
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 3: Frontend fetchAnimeLogos Service & Association ---')

    // 10. Empty array input returns empty object without network call
    const emptyResult = await fetchAnimeLogosClient([], baseUrl)
    assert(Object.keys(emptyResult).length === 0, 'fetchAnimeLogos([]) returns {} immediately')

    // 11. Invalid array inputs filtered out
    const invalidArrayResult = await fetchAnimeLogosClient([0, -1, NaN], baseUrl)
    assert(Object.keys(invalidArrayResult).length === 0, 'fetchAnimeLogos([invalid]) returns {} safely')

    // 12. Valid anime association by AniList ID via direct endpoint fetch simulation
    const directRes = await fetch(`${baseUrl}/api/anime/logos?ids=21,16498,99999999`)
    const directJson = (await directRes.json()) as { data: Record<string, TestLogoItem | null> }
    const frontendLogos: Record<number, TestClientLogo | null> = {}
    for (const [k, v] of Object.entries(directJson.data)) {
      frontendLogos[Number(k)] = v?.logoUrl ? { url: v.logoUrl, aspectRatio: v.aspectRatio } : null
    }

    assert(
      ((frontendLogos[21]?.url.startsWith('https://image.tmdb.org/t/p/original/') || frontendLogos[21]?.url.includes('one-piece')) ?? false) &&
      ((frontendLogos[16498]?.url.startsWith('https://image.tmdb.org/t/p/original/') || frontendLogos[16498]?.url.includes('attack-on-titan')) ?? false) &&
      frontendLogos[99999999] === null,
      'Logo map correctly maps logo objects and null markers by AniList ID'
    )

    // 13. Simulated anime enrichment matching by ID (never array index)
    const mockTrending = [
      { id: '16498', title: 'Attack on Titan' },
      { id: '21', title: 'One Piece' },
      { id: '99999999', title: 'Unknown Show' },
    ]

    interface EnrichedMockAnime {
      id: string
      title: string
      logo?: TestClientLogo | null
    }

    const enriched: EnrichedMockAnime[] = mockTrending.map(anime => {
      const logo = frontendLogos[Number(anime.id)]
      return logo ? { ...anime, logo } : anime
    })

    assert(
      ((enriched[0].logo?.url.includes('/eHMfVTIwen9anB4HuvQlFRGZFms.png') || enriched[0].logo?.url.includes('attack-on-titan')) ?? false) &&
      enriched[0].title === 'Attack on Titan',
      'Attack on Titan (index 0) received its own logo matched strictly by ID 16498'
    )
    assert(
      ((enriched[1].logo?.url.includes('/9F7daAmibx8ZHTE17CdM5FAwiHE.png') || enriched[1].logo?.url.includes('one-piece')) ?? false) &&
      enriched[1].title === 'One Piece',
      'One Piece (index 1) received its own logo matched strictly by ID 21'
    )
    assert(
      enriched[2].logo === undefined && enriched[2].title === 'Unknown Show',
      'Unknown show without logo preserves original object metadata without crashing'
    )
  } finally {
    server.close()
  }

  console.log('\n====================================================')
  console.log(`PHASE 2 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runPhase2Tests().catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
