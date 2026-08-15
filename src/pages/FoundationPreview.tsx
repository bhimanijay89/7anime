import { ScheduleView } from '../components/schedule/ScheduleView'
import {
  ArrowLeft,
  Play,
  Plus,
  Sparkles,
  LoaderCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Anime, Episode } from '../types/domain'

import { getAnimeById } from '../services/anilist'

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

import {
  LibraryView,
} from '../components/profile/LibraryView'
import { ProfileFullView } from '../components/profile/ProfileFullView'

import { SearchOverlay } from '../components/search/SearchOverlay'

import { Button } from '../components/ui/Button'
import { Drawer } from '../components/ui/Overlay'

import {
  ToastProvider,
  useToast,
} from '../components/ui/Toast'

import {
  continueWatching,
  previewAnime,
  previewUser,
  top10Anime,
  trendingAnime,
} from '../data/anime'

import './preview.css'


function Home() {
  const [currentView, setCurrentView] =
    useState<ViewMode>('home')

  const [selectedAnime, setSelectedAnime] =
    useState<Anime>(previewAnime[0])

  const [selectedEpisode, setSelectedEpisode] =
    useState<Episode | undefined>(undefined)

  const [savedLibrary, setSavedLibrary] =
    useState<Anime[]>([
      previewAnime[0],
      previewAnime[1],
      previewAnime[2],
    ])

  const [search, setSearch] =
    useState(false)

  const [drawer, setDrawer] =
    useState(false)

  const [detailLoading, setDetailLoading] =
    useState(false)

  const { notify } = useToast()


  /* =========================================================
     PAGE TITLE
  ========================================================= */

  useEffect(() => {
    const titles: Record<ViewMode, string> = {
      home: '7anime — Premium Anime Streaming',
      schedule: 'Schedule — 7anime',
      detail: `${selectedAnime.title} — 7anime`,
      player: `Playing ${selectedAnime.title} — 7anime`,
      library: 'My Library — 7anime',
      profile: 'My Space — 7anime',
    }

    document.title =
      titles[currentView] || '7anime'
  }, [
    currentView,
    selectedAnime.title,
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
     NORMAL ANIME DETAIL
     
     IMPORTANT:
     Every anime opened from Home / Top 10 /
     Trending / Continue Watching / Library /
     Upcoming / More Like This is loaded again
     through AniList + Jikan so that the complete
     episode catalogue is available.
  ========================================================= */

  const openDetail = async (
    anime: Anime,
  ) => {
    const anilistId =
      Number(anime.id)

    /*
     * If the ID is not a valid AniList numeric ID,
     * use the anime object we already have.
     */
    if (
      !Number.isInteger(anilistId) ||
      anilistId <= 0
    ) {
      setSelectedAnime(anime)
      setSelectedEpisode(undefined)
      navigateTo('detail')
      return
    }

    /*
     * Show the same loading state used by
     * Search → Anime Detail.
     */
    setDetailLoading(true)

    try {
      /*
       * getAnimeById() is responsible for:
       *
       * 1. Fetching full AniList metadata.
       * 2. Getting the MAL ID.
       * 3. Fetching the Jikan episode catalogue.
       * 4. Handling Jikan pagination.
       * 5. Providing a safe episode fallback.
       */
      const fullAnime =
        await getAnimeById(
          anilistId,
        )

      /*
       * Make absolutely sure we use the
       * fully loaded object.
       */
      setSelectedAnime(
        fullAnime,
      )

      setSelectedEpisode(
        undefined,
      )

      navigateTo('detail')
    } catch (error) {
      console.error(
        'Failed to load anime details:',
        error,
      )

      /*
       * Never leave the user stuck on
       * the loading screen.
       *
       * If the API fails completely, open
       * the information we already have.
       */
      setSelectedAnime(anime)

      setSelectedEpisode(
        undefined,
      )

      navigateTo('detail')

      notify(
        'Could not load full anime details. Showing available information.',
        'info',
      )
    } finally {
      setDetailLoading(false)
    }
  }


  /* =========================================================
     SEARCH RESULT → FULL ANILIST + JIKAN DETAIL
  ========================================================= */

  const openSearchAnime = async (
    anime: Anime,
  ) => {
    const anilistId =
      Number(anime.id)

    /*
     * If this is not a valid AniList numeric ID,
     * simply open the result we already have.
     */
    if (
      !Number.isInteger(anilistId) ||
      anilistId <= 0
    ) {
      setSearch(false)
      openDetail(anime)
      return
    }

    setDetailLoading(true)
    setSearch(false)

    try {
      /*
       * getAnimeById() loads:
       * - AniList metadata
       * - MAL ID
       * - Jikan episodes
       * - complete paginated episode catalogue
       */
      const fullAnime =
        await getAnimeById(
          anilistId,
        )

      setSelectedAnime(
        fullAnime,
      )

      setSelectedEpisode(
        undefined,
      )

      navigateTo('detail')
    } catch (error) {
      console.error(
        'Failed to load anime details:',
        error,
      )

      /*
       * Fallback to the search result
       * instead of leaving the page empty.
       */
      setSelectedAnime(anime)

      setSelectedEpisode(
        undefined,
      )

      navigateTo('detail')

      notify(
        'Could not load full anime details. Showing available information.',
        'info',
      )
    } finally {
      setDetailLoading(false)
    }
  }


  /* =========================================================
     PLAYER
  ========================================================= */

  const openFullPlayer = (
    ep?: Episode,
  ) => {
    setSelectedEpisode(ep)
    navigateTo('player')
  }


  /* =========================================================
     LIBRARY
  ========================================================= */

  const handleRemoveFromLibrary = (
    animeId: string,
  ) => {
    setSavedLibrary(prev =>
      prev.filter(
        item =>
          item.id !== animeId,
      ),
    )

    notify(
      'Title removed from your library.',
      'info',
    )
  }


  const handleAddToList = (
    anime: Anime,
  ) => {
    if (
      !savedLibrary.find(
        item =>
          item.id === anime.id,
      )
    ) {
      setSavedLibrary(prev => [
        ...prev,
        anime,
      ])

      notify(
        `${anime.title} added to your library!`,
        'success',
      )
    } else {
      notify(
        `${anime.title} is already in your library.`,
        'info',
      )
    }
  }


  /* =========================================================
     UPCOMING ANIME
  ========================================================= */

  const upcomingAnime =
    previewAnime.filter(
      anime =>
        anime.status === 'Upcoming',
    )


  /* =========================================================
     FULL DETAIL LOADING SCREEN
  ========================================================= */

  if (detailLoading) {
    return (
      <>
        <DesktopNavbar
          onSearch={() =>
            setSearch(true)
          }
          onMenu={() =>
            setDrawer(true)
          }
          onNavigate={navigateTo}
          currentView="detail"
        />

        <main
          id="top"
          className="home"
        >
          <div
            style={{
              minHeight: '70vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <LoaderCircle
              size={38}
              className="spin"
            />

            <h2>
              Loading anime details...
            </h2>

            <p
              style={{
                color:
                  'var(--color-text-muted)',
              }}
            >
              Fetching anime information
              and episode catalogue...
            </p>
          </div>
        </main>

        <MobileNavigation
          onNavigate={navigateTo}
          currentView="detail"
        />
      </>
    )
  }


  /* =========================================================
     MAIN RENDER
  ========================================================= */

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
        onNavigate={navigateTo}
        currentView={currentView}
      />


      {/* =====================================================
          MAIN APPLICATION
      ====================================================== */}

      <main
        id="top"
        className="home"
      >

        {/* ===================================================
            PLAYER
        ==================================================== */}

        {currentView === 'player' ? (

          <FullPlayerView
            anime={selectedAnime}
            initialEpisode={
              selectedEpisode
            }
            onBack={() =>
              navigateTo('detail')
            }
          />

        ) : currentView === 'schedule' ? (

          /* ===================================================
             SCHEDULE
          ==================================================== */

          <ScheduleView
            anime={top10Anime}
          />

        ) : currentView === 'library' ? (

          /* ===================================================
             LIBRARY
          ==================================================== */

          <LibraryView
            savedAnime={savedLibrary}
            onSelectAnime={
              openDetail
            }
            onRemoveFromLibrary={
              handleRemoveFromLibrary
            }
          />

        ) : currentView === 'profile' ? (

          /* ===================================================
             PROFILE
          ==================================================== */

          <ProfileFullView
            user={previewUser}
          />

        ) : currentView === 'home' ? (

          /* ===================================================
             HOME
          ==================================================== */

          <>

            {/* ===============================================
                1. TOP 10 HERO
            ================================================ */}

            <Top10Hero
              anime={top10Anime}
              onSelect={
                openDetail
              }
              onAddToList={
                handleAddToList
              }
            />


            {/* ===============================================
                2. QUICK ACTIONS
            ================================================ */}

            <section
              className="home-quick glass"
              aria-label="Quick discovery"
            >
              <span>
                <Sparkles size={17} />
                Curated for your evening
              </span>

              <div>

                <Button
                  onClick={() =>
                    openDetail(
                      previewAnime[0],
                    )
                  }
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
                  <Plus size={16} />

                  My list (
                  {savedLibrary.length}
                  )
                </Button>

              </div>
            </section>


            {/* ===============================================
                3. CONTINUE WATCHING
            ================================================ */}

            <ContentRail
              title="Continue watching"
            >
              {continueWatching.map(
                anime => (
                  <AnimeCard
                    anime={anime}
                    variant="continue"
                    key={anime.id}
                    onSelect={
                      openDetail
                    }
                  />
                ),
              )}
            </ContentRail>


            {/* ===============================================
                4. TRENDING NOW
            ================================================ */}

            <section className="home-section-head">
              <div>
                <p className="eyebrow">
                  Handpicked today
                </p>

                <h2>
                  Trending now
                </h2>
              </div>

              <p>
                Stories finding their
                audience right now.
              </p>
            </section>


            <ContentRail
              title="Popular with 7anime viewers"
            >
              {trendingAnime.map(
                anime => (
                  <AnimeCard
                    anime={anime}
                    key={anime.id}
                    onSelect={
                      openDetail
                    }
                  />
                ),
              )}
            </ContentRail>


            {/* ===============================================
                5. UPCOMING ANIME HERO
            ================================================ */}

            {upcomingAnime.length > 0 && (
              <UpcomingHero
                anime={upcomingAnime}
                onSelect={
                  openDetail
                }
              />
            )}


            {/* ===============================================
                6. TOP RATED
            ================================================ */}

            <ContentRail
              title="Top rated"
            >
              {[...previewAnime]
                .sort(
                  (a, b) =>
                    (b.rating || 0) -
                    (a.rating || 0),
                )
                .map(
                  (
                    anime,
                    index,
                  ) => (
                    <AnimeCard
                      anime={anime}
                      variant="ranked"
                      rank={
                        index + 1
                      }
                      key={`${anime.id}-${index}`}
                      onSelect={
                        openDetail
                      }
                    />
                  ),
                )}
            </ContentRail>


            {/* ===============================================
                7. DISCOVERY
            ================================================ */}

            <DiscoveryCatalog
              anime={trendingAnime}
            />

          </>

        ) : (

          /* ===================================================
             ANIME DETAIL
          ==================================================== */

          <div className="anime-detail">

            <div
              style={{
                margin:
                  'var(--space-4) 0 0 0',
              }}
            >
              <Button
                variant="glass"
                onClick={() =>
                  navigateTo('home')
                }
              >
                <ArrowLeft
                  size={16}
                />

                Back to Discover
              </Button>
            </div>


            <AnimeDetailHero
              anime={selectedAnime}
              onWatch={() =>
                openFullPlayer()
              }
            />


            {/* =================================================
                EPISODE LIST

                The selected anime now comes from getAnimeById(),
                which loads the Jikan episode catalogue.

                If Jikan is temporarily unavailable, the service
                provides a safe fallback based on AniList's
                episode count when possible.
            ================================================== */}

            <EpisodeList
              episodes={
                selectedAnime.episodesList ??
                []
              }
              onPlayEpisode={ep =>
                openFullPlayer(ep)
              }
            />


            <AnimeMetadataTabs
              anime={selectedAnime}
            />


            <ContentRail
              title="More like this"
            >
              {trendingAnime
                .filter(
                  item =>
                    item.id !==
                    selectedAnime.id,
                )
                .map(
                  anime => (
                    <AnimeCard
                      anime={anime}
                      key={anime.id}
                      onSelect={
                        openDetail
                      }
                    />
                  ),
                )}
            </ContentRail>

          </div>
        )}

      </main>


      {/* =====================================================
          MOBILE NAVIGATION
      ====================================================== */}

      <MobileNavigation
        onNavigate={navigateTo}
        currentView={currentView}
      />


      {/* =====================================================
          SEARCH OVERLAY
      ====================================================== */}

      <SearchOverlay
        open={search}
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
        open={drawer}
        onClose={() =>
          setDrawer(false)
        }
      >
        <h2>
          Your 7anime space
        </h2>

        <p>
          Welcome back,{' '}
          <strong>
            {previewUser.username}
          </strong>
          ! Manage your space.
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection:
              'column',
            gap: 'var(--space-2)',
            marginTop:
              'var(--space-3)',
          }}
        >

          <Button
            onClick={() => {
              setDrawer(false)

              navigateTo(
                'profile',
              )
            }}
          >
            View Profile Space
          </Button>


          <Button
            variant="glass"
            onClick={() => {
              setDrawer(false)

              navigateTo(
                'library',
              )
            }}
          >
            My Library (
            {savedLibrary.length}
            )
          </Button>


          <Button
            variant="ghost"
            onClick={() =>
              setDrawer(false)
            }
          >
            Close Menu
          </Button>

        </div>
      </Drawer>

    </>
  )
}


/* =========================================================
   FOUNDATION PREVIEW
========================================================= */

export function FoundationPreview() {
  return (
    <ToastProvider>
      <Home />
    </ToastProvider>
  )
}