import { ScheduleView } from '../components/schedule/ScheduleView'
import {
  ArrowLeft,
  LoaderCircle,
  Play,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type {
  Anime,
  Episode,
} from '../types/domain'

import {
  getAnimeById,
  getPopularAnime,
  getTrendingAnime,
  getUpcomingAnime,
  searchAnime,
} from '../services/anilist'

import { AnimeCard } from '../components/anime/AnimeCard'
import { AnimeDetailHero } from '../components/anime/AnimeDetailHero'
import { AnimeMetadataTabs } from '../components/anime/AnimeMetadataTabs'
import { DiscoveryCatalog } from '../components/anime/DiscoveryCatalog'
import { EpisodeList } from '../components/anime/EpisodeList'

import { Top10Hero } from '../components/carousel/CinematicCarousel'
import { ContentRail } from '../components/carousel/ContentRail'
import { UpcomingHero } from '../components/carousel/UpcomingHero'

import {
  DesktopNavbar,
  MobileNavigation,
  type ViewMode,
} from '../components/navigation/Navigation'

import { FullPlayerView } from '../components/player/FullPlayerView'

import { LibraryView } from '../components/profile/LibraryView'
import { ProfileFullView, type UserProfileStats } from '../components/profile/ProfileFullView'

import { SearchOverlay } from '../components/search/SearchOverlay'

import { Button } from '../components/ui/Button'
import { Drawer } from '../components/ui/Overlay'

import {
  ToastProvider,
  useToast,
} from '../components/ui/Toast'

import { AuthModal } from '../components/auth/AuthModal'
import type { AuthUser } from '../types/auth'
import type { User } from '../types/domain'

import { guestUser } from '../data/anime'

import { SplashScreen } from '../components/splash/SplashScreen'
import { isDevToolsActive, onDevToolsChange } from '../utils/security'
import { DevToolsDecoyView } from '../components/security/DevToolsDecoyView'

import './preview.css'

const BACKEND_URL =
  import.meta.env.VITE_API_URL ||
  'https://sevenanime-vodw.onrender.com'

function getAuthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders }
  const token = localStorage.getItem('7anime_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

function Home() {
  const [currentView, setCurrentView] =
    useState<ViewMode>('home')

  const [selectedAnime, setSelectedAnime] =
    useState<Anime | null>(
      null,
    )

  const [selectedEpisode, setSelectedEpisode] =
    useState<Episode | undefined>(
      undefined,
    )

  const [savedLibrary, setSavedLibrary] =
    useState<Anime[]>([])

  const [search, setSearch] =
    useState(false)

  const [drawer, setDrawer] =
    useState(false)

  const [detailLoading, setDetailLoading] =
    useState(false)

  const [trendingData, setTrendingData] =
    useState<Anime[]>([])

  const [topRatedData, setTopRatedData] =
    useState<Anime[]>([])

  const [upcomingData, setUpcomingData] =
    useState<Anime[]>([])

  const [homeLoading, setHomeLoading] =
    useState(true)

  const [homeError, setHomeError] =
    useState<string | null>(null)

  const [isDecoyActive, setIsDecoyActive] = useState(() => isDevToolsActive())

  useEffect(() => {
    return onDevToolsChange(detected => {
      setIsDecoyActive(detected)
    })
  }, [])

  // Auth, Library & Progress State
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<User>(guestUser)
  const [profileStats, setProfileStats] = useState<UserProfileStats | undefined>(undefined)
  const [continueWatchingList, setContinueWatchingList] = useState<Anime[]>([])

  const { notify } =
    useToast()

  /* =========================================================
     AUTH SESSION & USER DATA FETCH
  ========================================================= */

  const isSaved = useCallback(
    (animeId: string | number) => {
      const target = String(animeId)
      return savedLibrary.some(item => String(item.id) === target)
    },
    [savedLibrary],
  )

  const fetchUserProfile = useCallback(async () => {
    if (isDecoyActive) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/profile`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.ok && data.data) {
          const p = data.data
          setUserProfile({
            id: p.user.id,
            username: p.user.username,
            avatar: p.user.avatar || undefined,
            level: {
              level: p.level || 1,
              title: p.level >= 25 ? 'Master Otaku' : p.level >= 10 ? 'Senior Otaku' : 'Anime Enthusiast',
              currentXp: p.xp || 0,
              nextLevelXp: p.nextLevelXp || 100,
            },
            streak: {
              days: p.currentStreak || 0,
              longestDays: p.longestStreak || 0,
            },
            coins: p.coins || 0,
          })
          setProfileStats(p)
        }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }, [])

  const fetchUserLibrary = useCallback(async () => {
    if (isDecoyActive) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/library`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.ok && Array.isArray(data.data?.library)) {
          const entries = data.data.library as Array<{ anilistId: number; status: string }>
          const loadedAnime = await Promise.all(
            entries.map(async (entry) => {
              try {
                return await getAnimeById(entry.anilistId)
              } catch {
                return null
              }
            })
          )
          setSavedLibrary(loadedAnime.filter((item): item is Anime => item !== null))
        }
      }
    } catch (error) {
      console.error('Failed to fetch user library:', error)
    }
  }, [])

  const fetchUserProgress = useCallback(async () => {
    if (isDecoyActive) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/progress`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.ok && Array.isArray(data.data?.progress)) {
          const records = data.data.progress as Array<{
            anilistId: number
            episodeNumber: number
            progressSeconds: number
            durationSeconds: number
            completed: boolean
            updatedAt: string
          }>

          // Deduplicate by anilistId — keep only the latest episode per anime.
          // Records arrive sorted by updatedAt desc from backend, so the first
          // occurrence of each anilistId is the user's current watching position.
          const seenAnime = new Set<number>()
          const latestPerAnime = records.filter((rec) => {
            if (seenAnime.has(rec.anilistId)) return false
            seenAnime.add(rec.anilistId)
            return true
          })

          const items = await Promise.all(
            latestPerAnime.map(async (rec) => {
              try {
                const detail = await getAnimeById(rec.anilistId)
                const duration = rec.durationSeconds > 0 ? rec.durationSeconds : 1440
                const pct = Math.min(100, Math.round((rec.progressSeconds / duration) * 100))
                return {
                  ...detail,
                  episode: `EP ${rec.episodeNumber}`,
                  progress: pct,
                  lastWatchedEpisodeNumber: rec.episodeNumber,
                }
              } catch {
                return null
              }
            })
          )
          const validItems: Anime[] = []
          for (const item of items) {
            if (item) {
              validItems.push(item)
            }
          }
          setContinueWatchingList(validItems)
        }
      }
    } catch (error) {
      console.error('Failed to fetch user progress:', error)
    }
  }, [])

  const handleProgressUpdate = useCallback(
    async (
      animeId: string | number,
      episodeNumber: number,
      progressSeconds: number,
      durationSeconds: number,
      completed?: boolean,
    ) => {
      if (isDecoyActive) return
      const parsedId = Number(animeId)
      if (!Number.isInteger(parsedId) || parsedId <= 0) return

      if (authUser) {
        try {
          await fetch(`${BACKEND_URL}/api/progress`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({
              anilistId: parsedId,
              episodeNumber,
              progressSeconds,
              durationSeconds,
              completed: Boolean(completed),
            }),
          })
          await Promise.all([fetchUserProfile(), fetchUserProgress()])
        } catch (err) {
          console.error('Failed to save progress to backend:', err)
        }
      }
    },
    [authUser, fetchUserProfile, fetchUserProgress],
  )

  const checkAuthSession = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.ok && data.data?.user) {
          setAuthUser(data.data.user as AuthUser)
          await Promise.all([fetchUserProfile(), fetchUserLibrary(), fetchUserProgress()])
          return
        }
      }
      localStorage.removeItem('7anime_token')
      setAuthUser(null)
      setUserProfile(guestUser)
      setProfileStats(undefined)
      setSavedLibrary([])
      setContinueWatchingList([])
    } catch (error) {
      console.error('Session check failed:', error)
      localStorage.removeItem('7anime_token')
      setAuthUser(null)
      setUserProfile(guestUser)
      setProfileStats(undefined)
      setSavedLibrary([])
      setContinueWatchingList([])
    }
  }, [fetchUserProfile, fetchUserLibrary, fetchUserProgress])

  useEffect(() => {
    checkAuthSession()
  }, [checkAuthSession])

  const handleAuthenticated = async (user: AuthUser, token?: string) => {
    if (token) {
      localStorage.setItem('7anime_token', token)
    }
    setAuthUser(user)
    setAuthModalOpen(false)
    notify(`Welcome back, ${user.username}!`, 'success')
    await Promise.all([fetchUserProfile(), fetchUserLibrary(), fetchUserProgress()])
  }

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      localStorage.removeItem('7anime_token')
      setAuthUser(null)
      setUserProfile(guestUser)
      setProfileStats(undefined)
      setSavedLibrary([])
      setContinueWatchingList([])
      notify('You have signed out.', 'info')
    }
  }

  /* =========================================================
     LOAD HOME DATA FROM ANILIST (WITH GRACEFUL FALLBACK)
  ========================================================= */

  const loadHomeData = useCallback(async () => {
    setHomeLoading(true)
    setHomeError(null)

    if (isDecoyActive || isDevToolsActive()) {
      setHomeLoading(false)
      return
    }

    try {
      const [
        trending,
        popular,
        upcoming,
      ] =
        await Promise.allSettled([
          getTrendingAnime(1, 20),
          getPopularAnime(1, 20),
          getUpcomingAnime(1, 15),
        ])

      const trendingList = trending.status === 'fulfilled' && trending.value.length > 0 ? trending.value : []
      const popularList = popular.status === 'fulfilled' && popular.value.length > 0 ? popular.value : []
      const upcomingList = upcoming.status === 'fulfilled' && upcoming.value.length > 0
        ? upcoming.value.map(item => item.anime)
        : []

      setTrendingData(trendingList)
      setTopRatedData(popularList)
      setUpcomingData(upcomingList)

      if (
        trending.status === 'rejected' &&
        popular.status === 'rejected' &&
        upcoming.status === 'rejected'
      ) {
        notify('AniList API is temporarily offline.', 'info')
      }
    } catch (error) {
      console.error('Unexpected error loading home data:', error)
      setTrendingData([])
      setTopRatedData([])
      setUpcomingData([])
    } finally {
      setHomeLoading(false)
    }
  }, [isDecoyActive, notify])

  useEffect(() => {
    loadHomeData()
  }, [loadHomeData])


  /* =========================================================
     PAGE TITLE
  ========================================================= */

  useEffect(() => {
    const titles: Record<
      ViewMode,
      string
    > = {
      home:
        '7anime — Premium Anime Streaming',

      schedule:
        'Schedule — 7anime',

      detail:
        `${selectedAnime?.title ?? 'Anime'} — 7anime`,

      player:
        `Playing ${selectedAnime?.title ?? 'Anime'} — 7anime`,

      library:
        'My Library — 7anime',

      profile:
        'My Space — 7anime',
    }

    document.title =
      titles[currentView] ||
      '7anime'
  }, [
    currentView,
    selectedAnime?.title,
  ])


  /* =========================================================
     NAVIGATION
  ========================================================= */

  const navigateTo = (
    view: ViewMode,
  ) => {
    setCurrentView(view)

    if (
      typeof window !== 'undefined'
    ) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }
  }


  /* =========================================================
     CHECK WHETHER ANIME IS LOCAL PREVIEW DATA
  =========================================================

  The old preview data contains fake IDs such as:

      id: '1'
      id: '2'
      id: '3'

  Those are NOT AniList IDs.

  We therefore identify those objects by reference/title
  before deciding whether an ID can be sent directly to
  AniList.
  ========================================================= */

  const isLocalPreviewAnime = (
  ) => {
    return false
  }


  /* =========================================================
     FIND REAL ANILIST MATCH FOR LOCAL PREVIEW
  ========================================================= */

  const findAniListMatch =
    async (
      anime: Anime,
    ): Promise<Anime | null> => {
      try {
        const results =
          await searchAnime(
            anime.title,
            1,
            10,
          )

        if (
          results.length === 0
        ) {
          return null
        }

        const normalizedTitle =
          anime.title
            .trim()
            .toLowerCase()

        /*
         * Prefer exact title match.
         */
        const exactMatch =
          results.find(
            item =>
              item.title
                .trim()
                .toLowerCase() ===
              normalizedTitle,
          )

        return (
          exactMatch ||
          results[0] ||
          null
        )
      } catch (error) {
        console.error(
          'AniList title search failed:',
          error,
        )

        return null
      }
    }


  /* =========================================================
     LOAD COMPLETE ANIME
  =========================================================

  This is now the SINGLE entry point used by:

  - Home cards
  - Top 10
  - Trending
  - Continue Watching
  - Upcoming
  - Library
  - Search results
  - More Like This

  Flow:

  LOCAL PREVIEW
      ↓
  Search AniList by title
      ↓
  REAL AniList ID
      ↓
  getAnimeById()
      ↓
  AniList metadata
      ↓
  Jikan episode catalogue
      ↓
  EpisodeList
      ↓
  MegaPlay
  ========================================================= */

  const loadCompleteAnime =
    async (
      anime: Anime,
    ): Promise<Anime> => {
      let anilistId: number | null =
        null

      /*
       * -------------------------------------------------------
       * LOCAL PREVIEW DATA
       * -------------------------------------------------------
       */

      if (
        isLocalPreviewAnime()
      ) {
        const match =
          await findAniListMatch(
            anime,
          )

        if (match) {
          const parsedId =
            Number(
              match.id,
            )

          if (
            Number.isInteger(
              parsedId,
            ) &&
            parsedId > 0
          ) {
            anilistId =
              parsedId
          }
        }
      } else {
        /*
         * -----------------------------------------------------
         * REAL ANILIST DATA
         * -----------------------------------------------------
         */

        const parsedId =
          Number(
            anime.id,
          )

        if (
          Number.isInteger(
            parsedId,
          ) &&
          parsedId > 0
        ) {
          anilistId =
            parsedId
        }
      }

      /*
       * -------------------------------------------------------
       * IF WE HAVE A REAL ANILIST ID
       * -------------------------------------------------------
       */

      if (
        anilistId !== null
      ) {
        try {
          const fullAnime =
            await getAnimeById(
              anilistId,
            )

          /*
           * Make absolutely sure the returned object
           * has the real AniList ID.
           */
          if (
            fullAnime &&
            fullAnime.id
          ) {
            return fullAnime
          }
        } catch (error) {
          console.error(
            'Failed to load complete AniList anime:',
            error,
          )
        }
      }

      /*
       * -------------------------------------------------------
       * SAFE FALLBACK
       * -------------------------------------------------------
       *
       * Never crash the UI if AniList is temporarily
       * unavailable.
       */

      return anime
    }


  /* =========================================================
     OPEN ANIME DETAIL
  ========================================================= */

  const openDetail =
    async (
      anime: Anime,
    ) => {
      setDetailLoading(true)

      try {
        const fullAnime =
          await loadCompleteAnime(
            anime,
          )

        setSelectedAnime(
          fullAnime,
        )

        setSelectedEpisode(
          undefined,
        )

        navigateTo(
          'detail',
        )
      } catch (error) {
        console.error(
          'Failed to open anime detail:',
          error,
        )

        setSelectedAnime(
          anime,
        )

        setSelectedEpisode(
          undefined,
        )

        navigateTo(
          'detail',
        )

        notify(
          'Could not load live anime information.',
          'info',
        )
      } finally {
        setDetailLoading(false)
      }
    }

  /* =========================================================
     OPEN CONTINUE WATCHING PLAYER AT EXACT EPISODE
  ========================================================= */

  const openContinueWatchingPlayer = async (anime: Anime) => {
    setDetailLoading(true)
    try {
      const fullAnime = await loadCompleteAnime(anime)
      setSelectedAnime(fullAnime)

      // Find exact target episode number saved in watch progress
      const targetEpNum = (anime as Anime & { lastWatchedEpisodeNumber?: number }).lastWatchedEpisodeNumber ||
        (anime.episode ? parseInt(anime.episode.replace(/\D/g, ''), 10) : undefined)

      let targetEpisode: Episode | undefined
      const epList = fullAnime.episodesList

      if (targetEpNum && epList && epList.length > 0) {
        targetEpisode = epList.find(ep => ep.number === targetEpNum)
      }

      if (!targetEpisode && epList && epList.length > 0) {
        targetEpisode = epList[0]
      }

      setSelectedEpisode(targetEpisode)
      navigateTo('player')
    } catch (error) {
      console.error('Failed to open continue watching player:', error)
      setSelectedAnime(anime)
      setSelectedEpisode(undefined)
      navigateTo('player')
    } finally {
      setDetailLoading(false)
    }
  }


  /* =========================================================
     SEARCH RESULT
  ========================================================= */

  const openSearchAnime =
    async (
      anime: Anime,
    ) => {
      setSearch(false)

      await openDetail(
        anime,
      )
    }


  /* =========================================================
     PLAYER
  ========================================================= */

  const openFullPlayer =
    (
      episode?: Episode,
    ) => {
      setSelectedEpisode(
        episode,
      )

      navigateTo(
        'player',
      )
    }


  /* =========================================================
     REMOVE FROM LIBRARY
  ========================================================= */

  const handleRemoveFromLibrary =
    async (
      animeId: string,
    ) => {
      setSavedLibrary(
        previous =>
          previous.filter(
            item =>
              item.id !==
              animeId,
          ),
      )

      notify(
        'Title removed from your library.',
        'info',
      )

      if (authUser) {
        const parsedId = Number(animeId)
        if (Number.isInteger(parsedId) && parsedId > 0) {
          try {
            await fetch(`${BACKEND_URL}/api/library/${parsedId}`, {
              method: 'DELETE',
              headers: getAuthHeaders(),
              credentials: 'include',
            })
            await fetchUserProfile()
          } catch (err) {
            console.error('Failed to remove from backend library:', err)
          }
        }
      }
    }


  /* =========================================================
     ADD TO LIBRARY
  ========================================================= */

  const handleAddToList =
    async (
      anime: Anime,
    ) => {
      const alreadySaved =
        savedLibrary.some(
          item =>
            item.id ===
            anime.id,
        )

      if (
        !alreadySaved
      ) {
        setSavedLibrary(
          previous => [
            ...previous,
            anime,
          ],
        )

        notify(
          `${anime.title} added to your library!`,
          'success',
        )

        if (authUser) {
          const parsedId = Number(anime.id)
          if (Number.isInteger(parsedId) && parsedId > 0) {
            try {
              await fetch(`${BACKEND_URL}/api/library`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                credentials: 'include',
                body: JSON.stringify({
                  anilistId: parsedId,
                  status: 'WATCHING',
                }),
              })
              await fetchUserProfile()
            } catch (err) {
              console.error('Failed to save to backend library:', err)
            }
          }
        }
      } else {
        notify(
          `${anime.title} is already in your library.`,
          'info',
        )
      }
    }

  const handleToggleSave = useCallback(
    async (anime: Anime) => {
      const targetId = String(anime.id)
      if (isSaved(targetId)) {
        await handleRemoveFromLibrary(targetId)
      } else {
        await handleAddToList(anime)
      }
    },
    [isSaved, handleRemoveFromLibrary, handleAddToList],
  )


  /* =========================================================
     DERIVED HOME DATA
  ========================================================= */

  const heroAnime =
    trendingData.slice(
      0,
      10,
    )


  /* =========================================================
     LOADING SCREEN
  ========================================================= */

  if (
    detailLoading ||
    (homeLoading &&
      currentView === 'home')
  ) {
    return (
      <>
        <DesktopNavbar
          onSearch={() =>
            setSearch(true)
          }
          onMenu={() =>
            setDrawer(true)
          }
          onNavigate={
            navigateTo
          }
          onOpenAuthModal={() =>
            setAuthModalOpen(true)
          }
          onLogout={
            handleLogout
          }
          authUser={
            authUser
          }
          currentView={
            currentView
          }
        />

        <main
          id="top"
          className="home"
        >
          <div
            style={{
              minHeight:
                '70vh',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              flexDirection:
                'column',

              gap:
                'var(--space-3)',
            }}
          >
            <LoaderCircle
              size={38}
              className="spin"
            />

            <h2>
              {detailLoading
                ? 'Loading anime details...'
                : 'Loading your anime feed...'}
            </h2>

            <p
              style={{
                color:
                  'var(--color-text-muted)',
              }}
            >
              {detailLoading
                ? 'Fetching AniList information and episode catalogue...'
                : 'Curating trending, top-rated, and upcoming anime...'}
            </p>
          </div>
        </main>

        <MobileNavigation
          onNavigate={
            navigateTo
          }
          currentView={
            currentView
          }
        />
      </>
    )
  }


  /* =========================================================
     MAIN APPLICATION
  ========================================================= */

  if (isDecoyActive || isDevToolsActive()) {
    return (
      <div className="preview-app">
        <DesktopNavbar
          onSearch={() => setSearch(true)}
          onMenu={() => setDrawer(true)}
          onNavigate={navigateTo}
          onOpenAuthModal={() => setAuthModalOpen(true)}
          onLogout={handleLogout}
          authUser={authUser}
          currentView={currentView}
        />
        <DevToolsDecoyView />
      </div>
    )
  }

  return (
    <>
      {/* =====================================================
          DESKTOP NAVIGATION
      ====================================================== */}

      <DesktopNavbar
        onSearch={() =>
          setSearch(true)
        }
        onMenu={() =>
          setDrawer(true)
        }
        onNavigate={
          navigateTo
        }
        onOpenAuthModal={() =>
          setAuthModalOpen(true)
        }
        onLogout={
          handleLogout
        }
        authUser={
          authUser
        }
        currentView={
          currentView
        }
      />


      {/* =====================================================
          MAIN
      ====================================================== */}

      <main
        id="top"
        className="home"
      >

        {/* ===================================================
            PLAYER
        ==================================================== */}

        {currentView ===
          'player' && selectedAnime ? (
          <FullPlayerView
            anime={
              selectedAnime
            }
            initialEpisode={
              selectedEpisode
            }
            isSaved={
              isSaved(selectedAnime.id)
            }
            onToggleSave={
              handleToggleSave
            }
            onProgressUpdate={
              handleProgressUpdate
            }
            onBack={() =>
              navigateTo(
                'detail',
              )
            }
          />

        ) : currentView ===
          'schedule' ? (

          /* =================================================
             SCHEDULE
          ================================================== */

          <ScheduleView
            onSelectAnime={
              openDetail
            }
          />

        ) : currentView ===
          'library' ? (

          /* =================================================
             LIBRARY
          ================================================== */

          <LibraryView
            savedAnime={
              savedLibrary
            }
            onSelectAnime={
              openDetail
            }
            onRemoveFromLibrary={
              handleRemoveFromLibrary
            }
          />

        ) : currentView ===
          'profile' ? (

          /* =================================================
             PROFILE
          ================================================== */

          <ProfileFullView
            user={
              userProfile
            }
            authUser={
              authUser
            }
            profileStats={
              profileStats
            }
            onLogout={
              handleLogout
            }
            onOpenAuthModal={() =>
              setAuthModalOpen(true)
            }
          />

        ) : currentView ===
          'home' ? (

          /* =================================================
             HOME
          ================================================== */

          homeError ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-10) var(--space-4)',
                textAlign: 'center',
                gap: 'var(--space-4)',
                minHeight: '50vh',
              }}
            >
              <h3>Anime data is temporarily unavailable.</h3>
              <p style={{ color: 'var(--text-dim)' }}>
                {homeError}
              </p>
              <Button onClick={() => loadHomeData()}>Try again</Button>
            </div>
          ) : (
            <>

              {/* ===============================================
                  TOP 10
              ================================================ */}

              {heroAnime.length > 0 && (
                <Top10Hero
                  anime={
                    heroAnime
                  }
                  onSelect={
                    openDetail
                  }
                  onAddToList={
                    handleAddToList
                  }
                  onToggleSave={
                    handleToggleSave
                  }
                  savedAnimeIds={
                    savedLibrary.map(item => String(item.id))
                  }
                />
              )}


              {/* ===============================================
                  QUICK ACTIONS
              ================================================ */}

              <section
                className="home-quick glass"
                aria-label="Quick discovery"
              >
                <span>
                  <Sparkles
                    size={17}
                  />

                  Curated for your
                  evening
                </span>

                <div>
                  <Button
                    onClick={() => {
                      if (heroAnime[0]) {
                        openDetail(heroAnime[0])
                      }
                    }}
                    disabled={!heroAnime[0]}
                  >
                    Start watching

                    <Play
                      size={15}
                      fill="currentColor"
                    />
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() =>
                      navigateTo(
                        'library',
                      )
                    }
                  >
                    <Plus
                      size={16}
                    />

                    My list (
                    {
                      savedLibrary.length
                    }
                    )
                  </Button>
                </div>
              </section>


              {/* ===============================================
                  CONTINUE WATCHING
              ================================================ */}

              <ContentRail
                title="Continue watching"
                hideViewAll
              >
                {continueWatchingList.length > 0 ? (
                  continueWatchingList.map(anime => (
                    <AnimeCard
                      anime={anime}
                      variant="continue"
                      key={`continue-${anime.id}`}
                      isSaved={isSaved(anime.id)}
                      onToggleSave={handleToggleSave}
                      onSelect={openContinueWatchingPlayer}
                    />
                  ))
                ) : (
                  <div className="empty-state-message" style={{ padding: 'var(--space-6) var(--space-8)', color: 'var(--text-dim)' }}>
                    No anime in progress yet.
                  </div>
                )}
              </ContentRail>


              {/* ===============================================
                  TRENDING
              ================================================ */}

              <section
                className="home-section-head"
              >
                <div>
                  <p className="eyebrow">
                    Handpicked today
                  </p>

                  <h2>
                    Trending now
                  </h2>
                </div>

                <p>
                  Stories finding
                  their audience
                  right now.
                </p>
              </section>

              {trendingData.length > 0 && (
                <ContentRail
                  title="Popular with 7anime viewers"
                >
                  {trendingData
                    .slice(0, 10)
                    .map(
                      anime => (
                        <AnimeCard
                          anime={
                            anime
                          }
                          key={
                            anime.id
                          }
                          isSaved={
                            isSaved(anime.id)
                          }
                          onToggleSave={
                            handleToggleSave
                          }
                          onSelect={
                            openDetail
                          }
                        />
                      ),
                    )}
                </ContentRail>
              )}


              {/* ===============================================
                  UPCOMING
              ================================================ */}

              {upcomingData.length >
                0 && (
                  <UpcomingHero
                    anime={
                      upcomingData
                    }
                    onSelect={
                      openDetail
                    }
                  />
                )}


              {/* ===============================================
                  TOP RATED
              ================================================ */}

              {topRatedData.length > 0 && (
                <ContentRail
                  title="Top rated"
                >
                  {topRatedData
                    .slice(0, 10)
                    .map(
                      (
                        anime,
                        index,
                      ) => (
                        <AnimeCard
                          anime={
                            anime
                          }
                          variant="ranked"
                          rank={
                            index +
                            1
                          }
                          key={`${anime.id}-rated-${index}`}
                          isSaved={
                            isSaved(anime.id)
                          }
                          onToggleSave={
                            handleToggleSave
                          }
                          onSelect={
                            openDetail
                          }
                        />
                      ),
                    )}
                </ContentRail>
              )}


              {/* ===============================================
                  DISCOVERY
              ================================================ */}

              <DiscoveryCatalog
                anime={
                  topRatedData
                }
                isSaved={
                  isSaved
                }
                onToggleSave={
                  handleToggleSave
                }
                onSelect={
                  openDetail
                }
              />

            </>
          )

        ) : (

          /* =================================================
             ANIME DETAIL
          ================================================== */

          <div
            className="anime-detail"
          >
            {selectedAnime ? (
              <>
                <div
                  style={{
                    margin:
                      'var(--space-4) 0 0 0',
                  }}
                >
                  <Button
                    variant="glass"
                    onClick={() =>
                      navigateTo(
                        'home',
                      )
                    }
                  >
                    <ArrowLeft
                      size={16}
                    />

                    Back to Discover
                  </Button>
                </div>


                {/* ===============================================
                    HERO
                ================================================ */}

                <AnimeDetailHero
                  anime={
                    selectedAnime
                  }
                  isSaved={
                    isSaved(selectedAnime.id)
                  }
                  onToggleSave={
                    handleToggleSave
                  }
                  onWatch={() =>
                    openFullPlayer()
                  }
                />


                {/* ===============================================
                    EPISODES
                ================================================ */}

                <EpisodeList
                  episodes={
                    selectedAnime
                      .episodesList ??
                    []
                  }
                  onPlayEpisode={
                    episode =>
                      openFullPlayer(
                        episode,
                      )
                  }
                />


                {/* ===============================================
                    METADATA
                ================================================ */}

                <AnimeMetadataTabs
                  anime={
                    selectedAnime
                  }
                />


                {/* ===============================================
                    MORE LIKE THIS
                ================================================ */}

                <ContentRail
                  title="More like this"
                >
                  {trendingData
                    .filter(
                      anime =>
                        anime.id !==
                        selectedAnime.id,
                    )
                    .slice(0, 8)
                    .map(
                      anime => (
                        <AnimeCard
                          anime={
                            anime
                          }
                          key={
                            anime.id
                          }
                          onSelect={
                            openDetail
                          }
                        />
                      ),
                    )}
                </ContentRail>
              </>
            ) : (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-dim)' }}>
                Anime details unavailable.
                <br /><br />
                <Button onClick={() => navigateTo('home')}>Go Back</Button>
              </div>
            )}
          </div>
        )}

      </main>


      {/* =====================================================
          MOBILE NAVIGATION
      ====================================================== */}

      <MobileNavigation
        onNavigate={
          navigateTo
        }
        onSearch={() =>
          setSearch(true)
        }
        currentView={
          currentView
        }
      />


      {/* =====================================================
          SEARCH OVERLAY
      ====================================================== */}

      <SearchOverlay
        open={
          search
        }
        onClose={() =>
          setSearch(false)
        }
        onSelectAnime={
          openSearchAnime
        }
      />


      {/* =====================================================
          DRAWER
      ====================================================== */}

      <Drawer
        open={
          drawer
        }
        onClose={() =>
          setDrawer(false)
        }
      >
        <h2>
          Your 7anime space
        </h2>

        {authUser ? (
          <p>
            Welcome back,{' '}
            <strong>
              {authUser.username}
            </strong>
            ! Manage your account & space.
          </p>
        ) : (
          <p>
            Welcome to 7anime! Sign in to access your personal space, watch history, and library.
          </p>
        )}

        <div
          style={{
            display:
              'flex',

            flexDirection:
              'column',

            gap:
              'var(--space-2)',

            marginTop:
              'var(--space-3)',
          }}
        >
          {authUser ? (
            <>
              <Button
                onClick={() => {
                  setDrawer(false)
                  navigateTo('profile')
                }}
              >
                View Profile Space
              </Button>

              <Button
                variant="glass"
                onClick={() => {
                  setDrawer(false)
                  navigateTo('library')
                }}
              >
                My Library ({savedLibrary.length})
              </Button>

              <Button
                variant="glass"
                onClick={() => {
                  setDrawer(false)
                  handleLogout()
                }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  setDrawer(false)
                  setAuthModalOpen(true)
                }}
              >
                Sign In / Create Account
              </Button>

              <Button
                variant="glass"
                onClick={() => {
                  setDrawer(false)
                  navigateTo('library')
                }}
              >
                My Library ({savedLibrary.length})
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            onClick={() =>
              setDrawer(
                false,
              )
            }
          >
            Close Menu
          </Button>
        </div>
      </Drawer>

      {/* =====================================================
          AUTH MODAL
      ====================================================== */}

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </>
  )
}


/* =========================================================
   FOUNDATION PREVIEW
========================================================= */

export function FoundationPreview() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <ToastProvider>
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}
      <Home />
    </ToastProvider>
  )
}