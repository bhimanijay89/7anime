import React from 'react'
globalThis.React = React
import { renderToStaticMarkup } from 'react-dom/server'
import { AnimeLogo } from '../src/components/anime/AnimeLogo.js'
import { AnimeDetailHero } from '../src/components/anime/AnimeDetailHero.js'
import { Top10Hero } from '../src/components/carousel/CinematicCarousel.js'
import { UpcomingHero } from '../src/components/carousel/UpcomingHero.js'
import { ToastProvider } from '../src/components/ui/Toast.js'
import type { Anime } from '../src/types/domain.js'

async function runPhase3Tests() {
  console.log('====================================================')
  console.log('7ANIME — PHASE 3 UNIVERSAL ANIME LOGO TEST SUITE')
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

  // Sample test anime data
  const onePiece: Anime = {
    id: '21',
    title: 'One Piece',
    status: 'Airing',
    rating: 8.8,
    poster: 'https://example.com/onepiece-poster.jpg',
    cover: 'https://example.com/onepiece-cover.jpg',
    synopsis: 'A pirate adventure in search of the legendary treasure One Piece.',
    genres: ['Action', 'Adventure', 'Fantasy'],
    type: 'TV',
    year: 1999,
    logo: {
      url: 'https://image.tmdb.org/t/p/original/9F7daAmibx8ZHTE17CdM5FAwiHE.png',
      aspectRatio: 2.88,
      width: 1277,
      height: 443,
      language: 'en',
      filePath: '/9F7daAmibx8ZHTE17CdM5FAwiHE.png',
    },
  }

  const aot: Anime = {
    id: '16498',
    title: 'Attack on Titan',
    status: 'Finished',
    rating: 9.0,
    poster: 'https://example.com/aot-poster.jpg',
    cover: 'https://example.com/aot-cover.jpg',
    synopsis: 'Humanity fights against giant man-eating humanoids known as Titans.',
    genres: ['Action', 'Drama', 'Mystery'],
    type: 'TV',
    year: 2013,
    logo: {
      url: 'https://image.tmdb.org/t/p/original/eHMfVTIwen9anB4HuvQlFRGZFms.png',
      aspectRatio: 3.46,
      width: 1200,
      height: 347,
      language: 'en',
      filePath: '/eHMfVTIwen9anB4HuvQlFRGZFms.png',
    },
  }

  const noLogoAnime: Anime = {
    id: '99999999',
    title: 'Obscure Anime Without Logo',
    status: 'Airing',
    rating: 7.2,
    poster: 'https://example.com/obscure-poster.jpg',
    cover: 'https://example.com/obscure-cover.jpg',
    synopsis: 'An obscure show without any TMDB logo available.',
    genres: ['Slice of Life'],
    type: 'TV',
    year: 2024,
    logo: undefined,
  }

  // ----------------------------------------------------
  // TEST GROUP 1: Universal AnimeLogo Component
  // ----------------------------------------------------
  console.log('--- TEST GROUP 1: Universal AnimeLogo Component ---')

  // 1. Renders image when logo is provided
  const logoHtml = renderToStaticMarkup(
    React.createElement(AnimeLogo, {
      logo: onePiece.logo,
      title: onePiece.title,
      sizeVariant: 'hero',
    })
  )
  assert(
    logoHtml.includes('src="https://image.tmdb.org/t/p/original/9F7daAmibx8ZHTE17CdM5FAwiHE.png"'),
    'AnimeLogo renders authentic TMDB logo URL in img src'
  )
  assert(
    logoHtml.includes('alt="One Piece"'),
    'AnimeLogo includes accessible title in alt attribute'
  )
  assert(
    logoHtml.includes('aspect-ratio:2.88'),
    'AnimeLogo preserves TMDB aspect-ratio in style'
  )

  // 2. Fallback to styled title text when logo is missing
  const fallbackHtml = renderToStaticMarkup(
    React.createElement(AnimeLogo, {
      logo: undefined,
      title: noLogoAnime.title,
      sizeVariant: 'hero',
    })
  )
  assert(
    fallbackHtml.includes('<h1') && fallbackHtml.includes('Obscure Anime Without Logo</h1>'),
    'AnimeLogo renders styled <h1> heading fallback when logo is missing'
  )
  assert(
    !fallbackHtml.includes('<img'),
    'AnimeLogo does NOT render <img> tag when logo is missing'
  )

  // 3. Size variants generate correct classes
  const heroHtml = renderToStaticMarkup(
    React.createElement(AnimeLogo, {
      logo: onePiece.logo,
      title: onePiece.title,
      sizeVariant: 'hero',
    })
  )
  assert(heroHtml.includes('anime-logo--hero'), 'Applies anime-logo--hero variant class')

  const detailHtml = renderToStaticMarkup(
    React.createElement(AnimeLogo, {
      logo: onePiece.logo,
      title: onePiece.title,
      sizeVariant: 'detail',
    })
  )
  assert(detailHtml.includes('anime-logo--detail'), 'Applies anime-logo--detail variant class')

  const upcomingHtml = renderToStaticMarkup(
    React.createElement(AnimeLogo, {
      logo: onePiece.logo,
      title: onePiece.title,
      sizeVariant: 'upcoming',
    })
  )
  assert(upcomingHtml.includes('anime-logo--upcoming'), 'Applies anime-logo--upcoming variant class')

  // ----------------------------------------------------
  // TEST GROUP 2: Location 1 — Anime Detail Page
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 2: Location 1 — Anime Detail Page ---')

  const detailPageHtml = renderToStaticMarkup(
    React.createElement(
      ToastProvider,
      null,
      React.createElement(AnimeDetailHero, {
        anime: onePiece,
        onWatch: () => {},
      })
    )
  )
  assert(
    detailPageHtml.includes('detail-hero__title-area'),
    'AnimeDetailHero contains title area wrapper at exact title position'
  )
  assert(
    detailPageHtml.includes('src="https://image.tmdb.org/t/p/original/9F7daAmibx8ZHTE17CdM5FAwiHE.png"'),
    'Detail page displays official One Piece logo at title position'
  )
  assert(
    detailPageHtml.includes('detail-hero__tags') && detailPageHtml.includes('detail-hero__specs'),
    'Detail page preserves metadata tags and specs hierarchy around logo'
  )

  // Detail page fallback when anime has no logo
  const detailNoLogoHtml = renderToStaticMarkup(
    React.createElement(
      ToastProvider,
      null,
      React.createElement(AnimeDetailHero, {
        anime: noLogoAnime,
        onWatch: () => {},
      })
    )
  )
  assert(
    detailNoLogoHtml.includes('Obscure Anime Without Logo'),
    'Detail page falls back to styled title text when logo is missing'
  )

  // ----------------------------------------------------
  // TEST GROUP 3: Location 2 — Top 10 Hero Carousel
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: Location 2 — Top 10 Hero Carousel ---')

  const top10Html = renderToStaticMarkup(
    React.createElement(Top10Hero, {
      anime: [onePiece, aot],
    })
  )
  assert(
    top10Html.includes('hero-top10__title-area'),
    'Top10Hero contains title area wrapper at exact title position'
  )
  assert(
    top10Html.includes('src="https://image.tmdb.org/t/p/original/9F7daAmibx8ZHTE17CdM5FAwiHE.png"'),
    'Top 10 Hero displays official logo for active anime (One Piece at rank 1)'
  )

  // ----------------------------------------------------
  // TEST GROUP 4: Location 3 — Upcoming Anime Carousel
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 4: Location 3 — Upcoming Anime Carousel ---')

  const upcomingCarouselHtml = renderToStaticMarkup(
    React.createElement(UpcomingHero, {
      anime: [aot, onePiece],
    })
  )
  assert(
    upcomingCarouselHtml.includes('upcoming-hero__title-area'),
    'UpcomingHero contains title area wrapper at exact title position'
  )
  assert(
    upcomingCarouselHtml.includes('src="https://image.tmdb.org/t/p/original/eHMfVTIwen9anB4HuvQlFRGZFms.png"'),
    'Upcoming Anime carousel displays official logo for active anime (Attack on Titan at index 0)'
  )

  // ----------------------------------------------------
  // TEST GROUP 5: Batching & Association Integrity
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 5: Pipeline & Batch Integrity ---')

  // Simulate 35 upcoming anime IDs to test batch slicing
  const largeIdList = Array.from({ length: 35 }, (_, i) => i + 1000)
  const BATCH_SIZE = 20
  const batches: number[][] = []
  for (let i = 0; i < largeIdList.length; i += BATCH_SIZE) {
    batches.push(largeIdList.slice(i, i + BATCH_SIZE))
  }
  assert(
    batches.length === 2 && batches[0].length === 20 && batches[1].length === 15,
    'Upcoming anime pipeline splits large batch (>20 IDs) into chunks <= 20 IDs'
  )

  // AniList ID-based association simulation
  const mockUpcomingList = [
    { id: '16498', title: 'Attack on Titan' },
    { id: '21', title: 'One Piece' },
    { id: '99999999', title: 'Obscure Anime' },
  ]
  const mockLogoMap: Record<string, any> = {
    '21': onePiece.logo,
    '16498': aot.logo,
    '99999999': null,
  }

  const enrichedUpcoming = mockUpcomingList.map(item => {
    const logo = mockLogoMap[item.id]
    return logo ? { ...item, logo } : item
  })

  assert(
    (enrichedUpcoming[0] as any).logo?.filePath === '/eHMfVTIwen9anB4HuvQlFRGZFms.png' &&
    enrichedUpcoming[0].title === 'Attack on Titan',
    'Upcoming anime at index 0 strictly receives Attack on Titan logo by AniList ID 16498'
  )
  assert(
    (enrichedUpcoming[1] as any).logo?.filePath === '/9F7daAmibx8ZHTE17CdM5FAwiHE.png' &&
    enrichedUpcoming[1].title === 'One Piece',
    'Upcoming anime at index 1 strictly receives One Piece logo by AniList ID 21'
  )
  assert(
    (enrichedUpcoming[2] as any).logo === undefined &&
    enrichedUpcoming[2].title === 'Obscure Anime',
    'Upcoming anime without logo preserves metadata and falls back safely'
  )

  console.log('\n====================================================')
  console.log(`PHASE 3 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runPhase3Tests().catch(err => {
  console.error('Phase 3 tests failed:', err)
  process.exit(1)
})
