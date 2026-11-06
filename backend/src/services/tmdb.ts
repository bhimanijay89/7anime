import https from 'node:https'
import dns from 'node:dns'
import { cache } from '../redis/cache.js'
import prisma from '../db/client.js'
import type { AniListAnime, AnimeLogoResult } from '../types.js'
export type { AnimeLogoResult } from '../types.js'

export interface TmdbMappingResult {
  anilistId: number
  tmdbId: number
  mediaType: 'tv' | 'movie'
  season: number
  title?: string
  confidence: 'high' | 'medium' | 'fallback' | 'manual'
  source: string
}

export interface TmdbRawLogo {
  aspect_ratio: number
  height: number
  width: number
  file_path: string
  iso_639_1: string | null
  vote_average?: number
  vote_count?: number
}

interface CachedLogoData {
  logoUrl?: string
  aspectRatio?: number
  width?: number
  height?: number
  language?: string | null
  filePath?: string
  notFound?: boolean
  cachedAt?: number
}

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const TMDB_TIMEOUT_MS = 6000
const MAPPING_CACHE_TTL = 86400 * 30 // 30 days
export const LOGO_CACHE_TTL = 86400 * 30 // 30 days
export const LOGO_NEGATIVE_CACHE_TTL = 86400 * 7 // 7 days

const publicDnsResolver = new dns.promises.Resolver()
try {
  publicDnsResolver.setServers(['8.8.8.8', '1.1.1.1'])
} catch {
  // Graceful fallback to default DNS
}

export interface FetchTmdbResult<T> {
  status: number
  data: T | null
}

/**
 * Resilient TMDB request dispatcher that uses DNS resolution to bypass ISP DNS blocks,
 * with graceful fallback to standard global fetch.
 */
async function fetchTmdbWithFallback<T>(urlStr: string, timeoutMs: number = TMDB_TIMEOUT_MS): Promise<FetchTmdbResult<T>> {
  const token = getTmdbToken()
  if (!token) return { status: 401, data: null }

  // Tier 1: Direct HTTPS with public DNS resolver (instant, avoids ISP DNS blackhole)
  try {
    const parsedUrl = new URL(urlStr)
    const result = await new Promise<FetchTmdbResult<T>>((resolve) => {
      const req = https.request({
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeout: timeoutMs,
        lookup: (hostname, opts, cb) => {
          const callback = typeof opts === 'function' ? opts : cb
          const isAll = typeof opts === 'object' && opts && opts.all
          publicDnsResolver.resolve4(hostname).then(ips => {
            if (isAll) {
              callback(null, ips.map(ip => ({ address: ip, family: 4 })))
            } else {
              callback(null, ips[0], 4)
            }
          }).catch(err => callback(err as Error, '', 4))
        }
      }, (res) => {
        const statusCode = res.statusCode || 500
        if (statusCode !== 200) {
          res.resume()
          resolve({ status: statusCode, data: null })
          return
        }
        let body = ''
        res.setEncoding('utf8')
        res.on('data', chunk => { body += chunk })
        res.on('end', () => {
          try {
            resolve({ status: 200, data: JSON.parse(body) as T })
          } catch {
            resolve({ status: 500, data: null })
          }
        })
      })

      req.on('timeout', () => {
        req.destroy()
        resolve({ status: 408, data: null })
      })
      req.on('error', () => {
        resolve({ status: 0, data: null })
      })
      req.end()
    })

    if (result.status === 200 || result.status === 404) {
      return result
    }
  } catch {
    // Proceed to standard fetch fallback if HTTPS request encounters an unexpected error
  }

  // Tier 2: Standard fetch fallback
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2000)
    const res = await fetch(urlStr, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (res.ok) {
      return { status: res.status, data: (await res.json()) as T }
    }
    return { status: res.status, data: null }
  } catch {
    // Both attempts exhausted
  }

  return { status: 0, data: null }
}

/**
 * Curated high-accuracy baseline mappings for popular anime.
 * Ensures zero-latency, 100% accurate resolution and functions as an offline/ISP-resilient fallback.
 */
export const CURATED_ANIME_TMDB_MAP: Record<number, { tmdbId: number; mediaType: 'tv' | 'movie'; season: number }> = {
  // One Piece
  21: { tmdbId: 37854, mediaType: 'tv', season: 1 },
  // Naruto
  20: { tmdbId: 46260, mediaType: 'tv', season: 1 },
  // Naruto Shippuden
  1735: { tmdbId: 31910, mediaType: 'tv', season: 1 },
  // Bleach
  269: { tmdbId: 30984, mediaType: 'tv', season: 1 },
  // Bleach: Thousand-Year Blood War
  116674: { tmdbId: 30984, mediaType: 'tv', season: 17 },
  // Attack on Titan
  16498: { tmdbId: 1429, mediaType: 'tv', season: 1 },
  // Attack on Titan Season 2
  20958: { tmdbId: 1429, mediaType: 'tv', season: 2 },
  // Attack on Titan Season 3
  99147: { tmdbId: 1429, mediaType: 'tv', season: 3 },
  // Attack on Titan Final Season
  110277: { tmdbId: 1429, mediaType: 'tv', season: 4 },
  // Jujutsu Kaisen
  113415: { tmdbId: 95479, mediaType: 'tv', season: 1 },
  // Jujutsu Kaisen Season 2
  145064: { tmdbId: 95479, mediaType: 'tv', season: 2 },
  // Demon Slayer: Kimetsu no Yaiba
  101922: { tmdbId: 85937, mediaType: 'tv', season: 1 },
  // Demon Slayer: Mugen Train Arc (TV)
  129874: { tmdbId: 85937, mediaType: 'tv', season: 2 },
  // Demon Slayer: Entertainment District Arc
  142329: { tmdbId: 85937, mediaType: 'tv', season: 3 },
  // Demon Slayer: Swordsmith Village Arc
  145139: { tmdbId: 85937, mediaType: 'tv', season: 4 },
  // Death Note
  1535: { tmdbId: 13916, mediaType: 'tv', season: 1 },
  // Fullmetal Alchemist: Brotherhood
  5114: { tmdbId: 31911, mediaType: 'tv', season: 1 },
  // My Hero Academia
  21459: { tmdbId: 65930, mediaType: 'tv', season: 1 },
  // Hunter x Hunter (2011)
  11061: { tmdbId: 46298, mediaType: 'tv', season: 1 },
  // Solo Leveling
  151807: { tmdbId: 127532, mediaType: 'tv', season: 1 },
  // Black Clover
  97940: { tmdbId: 73223, mediaType: 'tv', season: 1 },
  // Dragon Ball Z
  813: { tmdbId: 12971, mediaType: 'tv', season: 1 },
  // Frieren: Beyond Journey's End
  154587: { tmdbId: 209867, mediaType: 'tv', season: 1 },
  // Chainsaw Man
  127230: { tmdbId: 114410, mediaType: 'tv', season: 1 },
  // Spy x Family
  140960: { tmdbId: 120089, mediaType: 'tv', season: 1 },
  // Tokyo Ghoul
  20605: { tmdbId: 61374, mediaType: 'tv', season: 1 },
  // Steins;Gate
  9253: { tmdbId: 39516, mediaType: 'tv', season: 1 },
  // Sword Art Online
  11757: { tmdbId: 45782, mediaType: 'tv', season: 1 },
  // Cowboy Bebop
  1: { tmdbId: 4087, mediaType: 'tv', season: 1 },
  // Spirited Away (Movie)
  199: { tmdbId: 129, mediaType: 'movie', season: 1 },
  // Your Name (Movie)
  21519: { tmdbId: 372058, mediaType: 'movie', season: 1 },
  // A Silent Voice (Movie)
  20954: { tmdbId: 378064, mediaType: 'movie', season: 1 },
  // Princess Mononoke (Movie)
  164: { tmdbId: 128, mediaType: 'movie', season: 1 },
  // Howl's Moving Castle (Movie)
  431: { tmdbId: 4935, mediaType: 'movie', season: 1 },
  // Demon Slayer: Mugen Train (Movie)
  112151: { tmdbId: 635302, mediaType: 'movie', season: 1 },
  // Jujutsu Kaisen 0 (Movie)
  131573: { tmdbId: 810693, mediaType: 'movie', season: 1 },
  // Suzume (Movie)
  142770: { tmdbId: 916224, mediaType: 'movie', season: 1 },
}

export interface CuratedHeroAnimeConfig {
  anilistId: number
  tmdbId: number
  mediaType: 'tv' | 'movie'
  title: string
}

/**
 * Phase 3.2: Curated 10 anime collection for the cinematic Hero carousel.
 * Fixed collection; does not depend on dynamic AniList trending rankings.
 */
export const CURATED_HERO_ANIME: CuratedHeroAnimeConfig[] = [
  { anilistId: 21, tmdbId: 37854, mediaType: 'tv', title: 'One Piece' },
  { anilistId: 1735, tmdbId: 31910, mediaType: 'tv', title: 'Naruto Shippuden' },
  { anilistId: 269, tmdbId: 30984, mediaType: 'tv', title: 'Bleach' },
  { anilistId: 97940, tmdbId: 73223, mediaType: 'tv', title: 'Black Clover' },
  { anilistId: 101922, tmdbId: 85937, mediaType: 'tv', title: 'Demon Slayer' },
  { anilistId: 113415, tmdbId: 95479, mediaType: 'tv', title: 'Jujutsu Kaisen' },
  { anilistId: 16498, tmdbId: 1429, mediaType: 'tv', title: 'Attack on Titan' },
  { anilistId: 151807, tmdbId: 127532, mediaType: 'tv', title: 'Solo Leveling' },
  { anilistId: 813, tmdbId: 12971, mediaType: 'tv', title: 'Dragon Ball Z' },
  { anilistId: 1535, tmdbId: 13916, mediaType: 'tv', title: 'Death Note' },
]

export const CURATED_HERO_ANILIST_IDS = new Set<number>(CURATED_HERO_ANIME.map(a => a.anilistId))

function getTmdbToken(): string | null {
  return process.env.TMDB_READ_ACCESS_TOKEN || null
}

function cleanTitle(raw?: string | null): string {
  if (!raw) return ''
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Searches TMDB for an anime title and validates animation genres and origin language.
 */
async function searchTmdb(
  title: string,
  mediaType: 'tv' | 'movie',
  year?: number,
): Promise<{ id: number; title: string; mediaType: 'tv' | 'movie' } | null> {
  const token = getTmdbToken()
  if (!token) return null

  const endpoint = mediaType === 'movie' ? 'search/movie' : 'search/tv'
  const url = new URL(`${TMDB_API_BASE}/${endpoint}`)
  url.searchParams.set('query', title)
  url.searchParams.set('include_adult', 'false')
  if (year && Number.isFinite(year) && year > 1950) {
    if (mediaType === 'movie') {
      url.searchParams.set('primary_release_year', String(year))
    } else {
      url.searchParams.set('first_air_date_year', String(year))
    }
  }

  interface TmdbItem {
    id: number
    title?: string
    name?: string
    genre_ids?: number[]
    original_language?: string
    first_air_date?: string
    release_date?: string
  }

  const res = await fetchTmdbWithFallback<{ results?: TmdbItem[] }>(url.toString(), TMDB_TIMEOUT_MS)
  const data = res.data
  if (!data?.results || data.results.length === 0) return null

  // Anime-only validation: Must have genre_id 16 (Animation) or East Asian original language (ja, zh, ko)
  const validAnimation = data.results.find(item => {
    const isAnimationGenre = item.genre_ids?.includes(16)
    const isAsianLang = ['ja', 'zh', 'ko'].includes(item.original_language || '')
    return isAnimationGenre || isAsianLang
  })

  if (!validAnimation) return null

  const resolvedTitle = validAnimation.name || validAnimation.title || title
  return {
    id: validAnimation.id,
    title: resolvedTitle,
    mediaType,
  }
}

/**
 * Main resolution entrypoint: Resolves an AniList anime to its corresponding TMDB ID.
 * Follows a 4-tier resolution pipeline:
 * 1. Redis Cache
 * 2. Database Mapping table
 * 3. Curated High-Accuracy Baseline Seed Map
 * 4. Live TMDB API Search with strict anime validation
 */
export async function resolveTmdbMapping(
  aniListAnime: AniListAnime,
): Promise<TmdbMappingResult | null> {
  const anilistId = aniListAnime.id
  if (!anilistId || anilistId <= 0) return null

  const cacheKey = `anime:tmdb:${anilistId}`

  // Tier 1: Check Redis cache
  const cached = await cache.get<TmdbMappingResult>(cacheKey)
  if (cached && cached.tmdbId > 0) {
    return cached
  }

  // Tier 2: Check Database Mapping table
  try {
    const dbRecord = await prisma.animeTmdbMapping.findUnique({
      where: { anilistId },
    })
    if (dbRecord && dbRecord.tmdbId > 0) {
      const result: TmdbMappingResult = {
        anilistId,
        tmdbId: dbRecord.tmdbId,
        mediaType: dbRecord.mediaType === 'movie' ? 'movie' : 'tv',
        season: dbRecord.season || 1,
        title: dbRecord.title || undefined,
        confidence: 'high',
        source: dbRecord.source || 'db',
      }
      void cache.set(cacheKey, result, MAPPING_CACHE_TTL)
      return result
    }
  } catch (dbErr) {
    console.warn(
      '[TMDB Resolver] Database mapping query error (table may not be migrated yet):',
      dbErr instanceof Error ? dbErr.message : dbErr,
    )
  }

  // Tier 3: Check Curated Baseline Seed Map
  if (CURATED_ANIME_TMDB_MAP[anilistId]) {
    const seed = CURATED_ANIME_TMDB_MAP[anilistId]
    const result: TmdbMappingResult = {
      anilistId,
      tmdbId: seed.tmdbId,
      mediaType: seed.mediaType,
      season: seed.season,
      title: aniListAnime.title?.english || aniListAnime.title?.romaji || undefined,
      confidence: 'high',
      source: 'curated_seed',
    }

    // Persist to DB asynchronously
    void prisma.animeTmdbMapping
      .upsert({
        where: { anilistId },
        update: {
          tmdbId: seed.tmdbId,
          mediaType: seed.mediaType,
          season: seed.season,
          title: result.title,
          source: 'curated_seed',
        },
        create: {
          anilistId,
          tmdbId: seed.tmdbId,
          mediaType: seed.mediaType,
          season: seed.season,
          title: result.title,
          source: 'curated_seed',
        },
      })
      .catch(upsertErr => {
        console.warn(
          '[TMDB Resolver] Database upsert skipped:',
          upsertErr instanceof Error ? upsertErr.message : upsertErr,
        )
      })

    void cache.set(cacheKey, result, MAPPING_CACHE_TTL)
    return result
  }

  // Tier 4: Live TMDB Search
  const isMovieFormat = String(aniListAnime.format || '').trim().toUpperCase() === 'MOVIE'
  const targetMediaType: 'tv' | 'movie' = isMovieFormat ? 'movie' : 'tv'
  const year = aniListAnime.seasonYear || undefined

  const searchTitles = [
    aniListAnime.title?.english,
    aniListAnime.title?.romaji,
    aniListAnime.title?.native,
  ].filter(Boolean) as string[]

  for (const rawTitle of searchTitles) {
    const cleaned = cleanTitle(rawTitle)
    if (!cleaned) continue

    // Attempt primary format search
    let tmdbMatch = await searchTmdb(cleaned, targetMediaType, year)

    // Fallback: If not found and was marked TV, check Movie (or vice-versa)
    if (!tmdbMatch) {
      const fallbackMediaType = targetMediaType === 'movie' ? 'tv' : 'movie'
      tmdbMatch = await searchTmdb(cleaned, fallbackMediaType, year)
    }

    if (tmdbMatch) {
      const result: TmdbMappingResult = {
        anilistId,
        tmdbId: tmdbMatch.id,
        mediaType: tmdbMatch.mediaType,
        season: 1,
        title: tmdbMatch.title,
        confidence: 'medium',
        source: 'tmdb_api',
      }

      // Persist to DB asynchronously
      void prisma.animeTmdbMapping
        .upsert({
          where: { anilistId },
          update: {
            tmdbId: tmdbMatch.id,
            mediaType: tmdbMatch.mediaType,
            season: 1,
            title: tmdbMatch.title,
            source: 'tmdb_api',
          },
          create: {
            anilistId,
            tmdbId: tmdbMatch.id,
            mediaType: tmdbMatch.mediaType,
            season: 1,
            title: tmdbMatch.title,
            source: 'tmdb_api',
          },
        })
        .catch(() => { })

      void cache.set(cacheKey, result, MAPPING_CACHE_TTL)
      return result
    }
  }

  return null
}

/**
 * In-flight map for deduplicating concurrent logo resolution requests for the same anime.
 */
export const inFlightLogoRequests = new Map<number, Promise<AnimeLogoResult | null>>()

/**
 * Computes a quality/suitability score for a TMDB logo candidate.
 * Higher score indicates a better, more suitable title wordmark.
 */
export function scoreLogoCandidate(logo: TmdbRawLogo): number {
  let score = 0

  const filePath = (logo.file_path || '').toLowerCase()
  // 1. Format: strongly prefer transparent PNG or SVG
  if (filePath.endsWith('.png')) {
    score += 100
  } else if (filePath.endsWith('.svg')) {
    score += 90
  } else {
    score += 20
  }

  // 2. Aspect ratio: Title logos are horizontal wordmarks
  const ar = logo.aspect_ratio || 0
  if (ar >= 1.5 && ar <= 6.0) {
    score += 50
  } else if (ar >= 1.0 && ar < 1.5) {
    score += 30
  } else if (ar > 6.0 && ar <= 12.0) {
    score += 25
  } else if (ar < 0.8 || ar > 15.0) {
    score -= 40
  }

  // 3. Resolution & Dimensions
  if (logo.width >= 800) {
    score += 40
  } else if (logo.width >= 400) {
    score += 25
  } else if (logo.width < 100 || logo.height < 40) {
    score -= 50
  }

  // 4. Community rating
  if (typeof logo.vote_average === 'number' && logo.vote_average > 0) {
    score += logo.vote_average * 3
  }
  if (typeof logo.vote_count === 'number' && logo.vote_count > 0) {
    score += Math.min(25, logo.vote_count * 2)
  }

  return score
}

/**
 * Selects the best logo according to the defined language priority:
 * 1. English ('en')
 * 2. Japanese ('ja')
 * 3. Language-neutral ('null' or 'xx')
 * 4. Other languages as final fallback
 *
 * Within each tier, candidates are validated and scored deterministically.
 */
export function selectBestLogo(logos: TmdbRawLogo[]): TmdbRawLogo | null {
  if (!logos || !Array.isArray(logos) || logos.length === 0) {
    return null
  }

  // Validate candidates: must have file_path, positive dimensions, positive aspect ratio
  const validLogos = logos.filter(l => {
    if (!l || typeof l !== 'object') return false
    if (!l.file_path || typeof l.file_path !== 'string') return false
    if (!l.file_path.startsWith('/') || l.file_path.length < 5) return false
    if (typeof l.width !== 'number' || l.width <= 0) return false
    if (typeof l.height !== 'number' || l.height <= 0) return false
    if (typeof l.aspect_ratio !== 'number' || l.aspect_ratio <= 0) return false
    return true
  })

  if (validLogos.length === 0) {
    return null
  }

  const enCandidates: TmdbRawLogo[] = []
  const jaCandidates: TmdbRawLogo[] = []
  const neutralCandidates: TmdbRawLogo[] = []
  const otherCandidates: TmdbRawLogo[] = []

  for (const logo of validLogos) {
    const lang = logo.iso_639_1 ? logo.iso_639_1.trim().toLowerCase() : null
    if (lang === 'en') {
      enCandidates.push(logo)
    } else if (lang === 'ja') {
      jaCandidates.push(logo)
    } else if (!lang || lang === 'xx' || lang === 'null') {
      neutralCandidates.push(logo)
    } else {
      otherCandidates.push(logo)
    }
  }

  const sortGroup = (group: TmdbRawLogo[]) => {
    return group.sort((a, b) => {
      const scoreDiff = scoreLogoCandidate(b) - scoreLogoCandidate(a)
      if (scoreDiff !== 0) return scoreDiff
      return a.file_path.localeCompare(b.file_path)
    })
  }

  if (enCandidates.length > 0) return sortGroup(enCandidates)[0]
  if (jaCandidates.length > 0) return sortGroup(jaCandidates)[0]
  if (neutralCandidates.length > 0) return sortGroup(neutralCandidates)[0]
  if (otherCandidates.length > 0) return sortGroup(otherCandidates)[0]

  return null
}

/**
 * Resolves the authentic title logo for an anime from TMDB and caches the result.
 *
 * Implements:
 * 1. Cache-first strategy via Upstash Redis (`anime:logo:{anilistId}`).
 * 2. In-flight request deduplication to prevent redundant concurrent fetches.
 * 3. Fallback to existing mapping resolver if tmdbId is omitted.
 * 4. Language-prioritized selection (en -> ja -> neutral -> other).
 * 5. Negative caching (7 days) for missing logos; 30 days for resolved logos.
 * 6. Graceful non-throwing degradation on Redis or TMDB errors.
 */
export async function resolveTmdbLogo(
  anilistId: number,
  tmdbId?: number | null,
  mediaType?: 'tv' | 'movie' | null,
  options?: { isPermanent?: boolean },
): Promise<AnimeLogoResult | null> {
  if (!Number.isInteger(anilistId) || anilistId <= 0) {
    return null
  }

  const isPermanent = Boolean(options?.isPermanent || CURATED_HERO_ANILIST_IDS.has(anilistId))
  const cacheKey = `anime:logo:${anilistId}`

  // Tier 1: Check Redis Cache
  try {
    const cached = await cache.get<CachedLogoData>(cacheKey)
    if (cached) {
      if (cached.notFound) {
        return null
      }
      if (cached.logoUrl && cached.filePath) {
        return {
          logoUrl: cached.logoUrl,
          aspectRatio: cached.aspectRatio,
          width: cached.width,
          height: cached.height,
          language: cached.language ?? null,
          filePath: cached.filePath,
        }
      }
    }
  } catch (cacheErr) {
    console.warn(
      `[TMDB Logo] Redis cache read failed for anilistId ${anilistId}:`,
      cacheErr instanceof Error ? cacheErr.message : cacheErr,
    )
  }

  // Tier 2: Check PostgreSQL Database Cache (anime_tmdb_logos)
  try {
    const dbLogo = await prisma.animeTmdbLogo.findUnique({
      where: { anilistId },
    })

    if (dbLogo) {
      const now = new Date()
      // Permanent logos have expiresAt === null or status === 'verified' and never expire
      const isExpired = dbLogo.expiresAt !== null && dbLogo.expiresAt <= now

      if (!isExpired) {
        const remainingTtlSeconds = dbLogo.expiresAt
          ? Math.max(60, Math.floor((dbLogo.expiresAt.getTime() - now.getTime()) / 1000))
          : LOGO_CACHE_TTL

        if (dbLogo.notFound) {
          if (!isPermanent) {
            // Re-populate Redis negative cache
            void cache.set(
              cacheKey,
              { notFound: true, cachedAt: Date.now() },
              remainingTtlSeconds,
            )
            return null
          }
        } else if (dbLogo.logoUrl && dbLogo.filePath) {
          const logoResult: AnimeLogoResult = {
            logoUrl: dbLogo.logoUrl,
            aspectRatio: dbLogo.aspectRatio ?? 1,
            width: dbLogo.width ?? 100,
            height: dbLogo.height ?? 100,
            language: dbLogo.language ?? null,
            filePath: dbLogo.filePath,
          }

          // Re-populate Redis cache
          void cache.set(
            cacheKey,
            {
              logoUrl: logoResult.logoUrl,
              aspectRatio: logoResult.aspectRatio,
              width: logoResult.width,
              height: logoResult.height,
              language: logoResult.language,
              filePath: logoResult.filePath,
              notFound: false,
              cachedAt: Date.now(),
            },
            remainingTtlSeconds,
          )

          return logoResult
        }
      }
    }
  } catch (dbErr) {
    console.warn(
      `[TMDB Logo] Database cache read failed for anilistId ${anilistId}:`,
      dbErr instanceof Error ? dbErr.message : dbErr,
    )
  }

  // Tier 3: In-flight deduplication
  const existingPromise = inFlightLogoRequests.get(anilistId)
  if (existingPromise) {
    return existingPromise
  }

  const resolutionPromise = (async (): Promise<AnimeLogoResult | null> => {
    try {
      // Resolve TMDB ID and mediaType if not already provided
      let targetTmdbId = tmdbId
      let targetMediaType = mediaType

      if (!targetTmdbId || !targetMediaType) {
        const mapping = await resolveTmdbMapping({ id: anilistId } as AniListAnime)
        if (mapping && mapping.tmdbId > 0) {
          targetTmdbId = mapping.tmdbId
          targetMediaType = mapping.mediaType
        }
      }

      if (!targetTmdbId || targetTmdbId <= 0 || !targetMediaType) {
        // Negative cache when no mapping can be determined
        const expiresAt = new Date(Date.now() + LOGO_NEGATIVE_CACHE_TTL * 1000)
        void cache.set(cacheKey, { notFound: true, cachedAt: Date.now() }, LOGO_NEGATIVE_CACHE_TTL)
        void prisma.animeTmdbLogo
          .upsert({
            where: { anilistId },
            update: {
              notFound: true,
              expiresAt,
            },
            create: {
              anilistId,
              notFound: true,
              expiresAt,
            },
          })
          .catch(() => { })
        return null
      }

      // Query TMDB images endpoint
      const endpoint = `${TMDB_API_BASE}/${targetMediaType}/${targetTmdbId}/images?include_image_language=en,ja,null`
      interface TmdbImagesResponse {
        id: number
        logos?: TmdbRawLogo[]
      }

      const fetchRes = await fetchTmdbWithFallback<TmdbImagesResponse>(endpoint, TMDB_TIMEOUT_MS)

      if (fetchRes.status === 404) {
        if (isPermanent) {
          const existingValid = await prisma.animeTmdbLogo.findUnique({ where: { anilistId } })
          if (existingValid?.logoUrl && !existingValid.notFound) {
            return {
              logoUrl: existingValid.logoUrl,
              aspectRatio: existingValid.aspectRatio ?? 1,
              width: existingValid.width ?? 100,
              height: existingValid.height ?? 100,
              language: existingValid.language ?? null,
              filePath: existingValid.filePath || '',
            }
          }
        }

        const expiresAt = new Date(Date.now() + LOGO_NEGATIVE_CACHE_TTL * 1000)
        await cache.set(cacheKey, { notFound: true, cachedAt: Date.now() }, LOGO_NEGATIVE_CACHE_TTL)
        void prisma.animeTmdbLogo
          .upsert({
            where: { anilistId },
            update: {
              tmdbId: targetTmdbId,
              mediaType: targetMediaType,
              notFound: true,
              status: 'not_found',
              expiresAt,
            },
            create: {
              anilistId,
              tmdbId: targetTmdbId,
              mediaType: targetMediaType,
              notFound: true,
              status: 'not_found',
              expiresAt,
            },
          })
          .catch(() => { })
        return null
      }

      if (fetchRes.status !== 200 || !fetchRes.data) {
        // Transient network or server error -> do NOT cache negatively
        return null
      }

      const rawLogos = fetchRes.data.logos || []
      const bestLogo = selectBestLogo(rawLogos)

      if (!bestLogo) {
        if (isPermanent) {
          const existingValid = await prisma.animeTmdbLogo.findUnique({ where: { anilistId } })
          if (existingValid?.logoUrl && !existingValid.notFound) {
            return {
              logoUrl: existingValid.logoUrl,
              aspectRatio: existingValid.aspectRatio ?? 1,
              width: existingValid.width ?? 100,
              height: existingValid.height ?? 100,
              language: existingValid.language ?? null,
              filePath: existingValid.filePath || '',
            }
          }
        }

        const expiresAt = new Date(Date.now() + LOGO_NEGATIVE_CACHE_TTL * 1000)
        await cache.set(cacheKey, { notFound: true, cachedAt: Date.now() }, LOGO_NEGATIVE_CACHE_TTL)
        void prisma.animeTmdbLogo
          .upsert({
            where: { anilistId },
            update: {
              tmdbId: targetTmdbId,
              mediaType: targetMediaType,
              notFound: true,
              status: 'not_found',
              expiresAt,
            },
            create: {
              anilistId,
              tmdbId: targetTmdbId,
              mediaType: targetMediaType,
              notFound: true,
              status: 'not_found',
              expiresAt,
            },
          })
          .catch(() => { })
        return null
      }

      const logoResult: AnimeLogoResult = {
        logoUrl: `${TMDB_IMAGE_BASE}${bestLogo.file_path}`,
        aspectRatio: bestLogo.aspect_ratio,
        width: bestLogo.width,
        height: bestLogo.height,
        language: bestLogo.iso_639_1 ?? null,
        filePath: bestLogo.file_path,
      }

      // Permanent / curated logos do not expire (expiresAt = null, status = 'verified')
      const dbExpiresAt = isPermanent ? null : new Date(Date.now() + LOGO_CACHE_TTL * 1000)
      const dbStatus = isPermanent ? 'verified' : 'auto'

      await cache.set(
        cacheKey,
        {
          logoUrl: logoResult.logoUrl,
          aspectRatio: logoResult.aspectRatio,
          width: logoResult.width,
          height: logoResult.height,
          language: logoResult.language,
          filePath: logoResult.filePath,
          notFound: false,
          cachedAt: Date.now(),
        },
        LOGO_CACHE_TTL,
      )

      await prisma.animeTmdbLogo
        .upsert({
          where: { anilistId },
          update: {
            tmdbId: targetTmdbId,
            mediaType: targetMediaType,
            logoUrl: logoResult.logoUrl,
            aspectRatio: logoResult.aspectRatio,
            width: logoResult.width,
            height: logoResult.height,
            language: logoResult.language,
            filePath: logoResult.filePath,
            status: dbStatus,
            notFound: false,
            expiresAt: dbExpiresAt,
          },
          create: {
            anilistId,
            tmdbId: targetTmdbId,
            mediaType: targetMediaType,
            logoUrl: logoResult.logoUrl,
            aspectRatio: logoResult.aspectRatio,
            width: logoResult.width,
            height: logoResult.height,
            language: logoResult.language,
            filePath: logoResult.filePath,
            status: dbStatus,
            notFound: false,
            expiresAt: dbExpiresAt,
          },
        })
        .catch(err => {
          console.warn(
            `[TMDB Logo] DB upsert failed for anilistId ${anilistId}:`,
            err instanceof Error ? err.message : err,
          )
        })

      return logoResult
    } catch (fetchErr) {
      console.warn(
        `[TMDB Logo] Resolution error for anilistId ${anilistId}:`,
        fetchErr instanceof Error ? fetchErr.message : fetchErr,
      )
      return null
    } finally {
      inFlightLogoRequests.delete(anilistId)
    }
  })()

  inFlightLogoRequests.set(anilistId, resolutionPromise)
  return resolutionPromise
}

/**
 * Phase 3.2: Verifies and persists all 10 curated Hero anime logos permanently
 * into PostgreSQL.
 */
export async function ensureCuratedHeroLogos(): Promise<Record<number, AnimeLogoResult>> {
  const result: Record<number, AnimeLogoResult> = {}
  console.log('[TMDB Curated Hero] Verifying permanent database storage for 10 curated anime...')

  try {
    const dbRecords = await prisma.animeTmdbLogo.findMany({
      where: {
        anilistId: { in: CURATED_HERO_ANIME.map(a => a.anilistId) },
        notFound: false,
      },
    })

    const dbMap = new Map<number, typeof dbRecords[0]>()
    for (const record of dbRecords) {
      if (record.logoUrl && record.filePath) {
        dbMap.set(record.anilistId, record)
      }
    }

    for (const item of CURATED_HERO_ANIME) {
      const existing = dbMap.get(item.anilistId)
      if (existing && existing.logoUrl && existing.filePath) {
        // Ensure permanently verified persistence (expiresAt = null, status = 'verified')
        if (existing.expiresAt !== null || existing.status !== 'verified') {
          await prisma.animeTmdbLogo
            .update({
              where: { anilistId: item.anilistId },
              data: { expiresAt: null, status: 'verified', notFound: false },
            })
            .catch(() => {})
        }

        const logo: AnimeLogoResult = {
          logoUrl: existing.logoUrl,
          aspectRatio: existing.aspectRatio ?? 1,
          width: existing.width ?? 100,
          height: existing.height ?? 100,
          language: existing.language ?? null,
          filePath: existing.filePath,
        }
        result[item.anilistId] = logo
        // Populate Redis cache
        void cache.set(
          `anime:logo:${item.anilistId}`,
          {
            ...logo,
            notFound: false,
            cachedAt: Date.now(),
          },
          LOGO_CACHE_TTL,
        )
      } else {
        console.log(`[TMDB Curated Hero] Resolving missing logo for ${item.title} (AniList ${item.anilistId})...`)
        const resolved = await resolveTmdbLogo(item.anilistId, item.tmdbId, item.mediaType, { isPermanent: true })
        if (resolved) {
          result[item.anilistId] = resolved
        }
      }
    }
  } catch (err) {
    console.error('[TMDB Curated Hero] Error ensuring curated hero logos:', err)
  }

  console.log(`[TMDB Curated Hero] ${Object.keys(result).length}/${CURATED_HERO_ANIME.length} curated logos ready in permanent storage.`)
  return result
}
