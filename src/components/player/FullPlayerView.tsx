import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Radio,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type {
  Anime,
  Episode,
} from '../../types/domain'

import {
  getMegaPlayEmbedUrl,
} from '../../services/anilist'

import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ShareButton } from '../share/ShareButton'
import { EpisodeSidebar } from './EpisodeSidebar'

import './player.css'

/* =========================================================
   FULL PLAYER VIEW
========================================================= */

export function FullPlayerView({
  anime,
  initialEpisode,
  isSaved,
  onToggleSave,
  onProgressUpdate,
  onBack,
}: {
  anime: Anime
  initialEpisode?: Episode
  isSaved?: boolean
  onToggleSave?: (anime: Anime) => void
  onProgressUpdate?: (
    animeId: string | number,
    episodeNumber: number,
    progressSeconds: number,
    durationSeconds: number,
    completed?: boolean,
  ) => void
  onBack: () => void
}) {
  /* =======================================================
     EPISODES
  ======================================================== */

  const episodes = useMemo(() => {
    if (
      anime.episodesList &&
      anime.episodesList.length > 0
    ) {
      return anime.episodesList
    }

    const count =
      anime.totalEpisodes &&
        anime.totalEpisodes > 0
        ? anime.totalEpisodes
        : 12

    return Array.from(
      {
        length: count,
      },
      (_, index) => ({
        id: `fallback-ep-${index + 1}`,
        number: index + 1,
        title: `Episode ${index + 1}`,
        thumbnail:
          anime.poster ||
          anime.cover ||
          '',
      }),
    )
  }, [anime])

  const initial =
    initialEpisode ||
    episodes[0]

  const [
    currentEpisode,
    setCurrentEpisode,
  ] = useState<
    Episode | undefined
  >(initial)

  const [
    server,
    setServer,
  ] = useState<
    'megaplay' | 'server2'
  >('megaplay')

  const [
    autoNext,
    setAutoNext,
  ] = useState(true)

  const [
    inList,
    setInList,
  ] = useState(isSaved || false)

  const [
    language,
    setLanguage,
  ] = useState<
    'sub' | 'dub'
  >('sub')

  const [
    muted,
    setMuted,
  ] = useState(false)

  const [
    isIframeLoading,
    setIsIframeLoading,
  ] = useState(true)

  const iframeRef =
    useRef<
      HTMLIFrameElement
    >(null)

  /* Sync inList with prop if changed */
  useEffect(() => {
    if (isSaved !== undefined) {
      setInList(isSaved)
    }
  }, [isSaved])

  /* Reset loading state when episode changes */
  useEffect(() => {
    setIsIframeLoading(true)
  }, [currentEpisode?.id, language, server])

  /* =======================================================
     INITIAL EPISODE & WATCH PROGRESS REPORTING
  ======================================================== */

  useEffect(() => {
    if (initialEpisode) {
      setCurrentEpisode(
        initialEpisode,
      )
    }
  }, [
    initialEpisode,
  ])

  useEffect(() => {
    if (currentEpisode && anime.id) {
      const epNum = currentEpisode.number
      const durationSec = currentEpisode.duration ? currentEpisode.duration * 60 : 1440
      const progressSec = Math.floor(durationSec * 0.5)
      onProgressUpdate?.(anime.id, epNum, progressSec, durationSec, false)
    }
  }, [anime.id, currentEpisode, onProgressUpdate])

  /* =======================================================
     CURRENT EPISODE INDEX
  ======================================================== */

  const currentIndex =
    useMemo(() => {
      if (!currentEpisode) {
        return -1
      }

      return episodes.findIndex(
        episode =>
          episode.id ===
          currentEpisode.id,
      )
    }, [
      episodes,
      currentEpisode,
    ])

  /* =======================================================
     STREAM URL
  ======================================================== */

  const embedUrl =
    currentEpisode
      ? getMegaPlayEmbedUrl(
        anime.id,
        currentEpisode.number,
        language,
      )
      : ''

  /* =======================================================
     PREVIOUS EPISODE
  ======================================================== */

  const goPrevious = () => {
    if (
      currentIndex > 0
    ) {
      setCurrentEpisode(
        episodes[
        currentIndex - 1
        ],
      )
    }
  }

  /* =======================================================
     NEXT EPISODE
  ======================================================== */

  const goNext = () => {
    if (
      currentIndex >= 0 &&
      currentIndex <
      episodes.length -
      1
    ) {
      setCurrentEpisode(
        episodes[
        currentIndex + 1
        ],
      )
    }
  }

  /* =======================================================
     KEYBOARD CONTROLS
  ======================================================== */

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.target instanceof
        HTMLInputElement ||
        event.target instanceof
        HTMLSelectElement ||
        event.target instanceof
        HTMLTextAreaElement
      ) {
        return
      }

      if (
        event.code ===
        'ArrowLeft'
      ) {
        event.preventDefault()
        goPrevious()
      }

      if (
        event.code ===
        'ArrowRight'
      ) {
        event.preventDefault()
        goNext()
      }

      if (
        event.key.toLowerCase() ===
        'm'
      ) {
        setMuted(
          value => !value,
        )
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [
    currentIndex,
    episodes,
  ])

  /* =======================================================
     FULLSCREEN
  ======================================================== */

  const requestFullscreen =
    async () => {
      try {
        await iframeRef.current?.requestFullscreen()
      } catch {
        /* Browser blocked fullscreen */
      }
    }

  /* =======================================================
     NO EPISODE STATE
  ======================================================== */

  if (!currentEpisode) {
    return (
      <section
        className="cinema-player"
        aria-label="Anime player"
      >
        <div className="cinema-player__topbar glass">
          <button
            type="button"
            className="cinema-player__back-btn"
            onClick={onBack}
          >
            <ArrowLeft
              size={16}
            />

            <span>Back to Details</span>
          </button>
        </div>

        <div
          className="cinema-player__stage cinema-player__stage--empty"
        >
          <div className="cinema-player__empty-notice">
            <Radio size={36} className="cinema-player__empty-icon" />
            <h2>Episodes Unavailable</h2>
            <p>
              No episodes were found for this anime. Please return to details or check back later.
            </p>
            <Button variant="glass" onClick={onBack}>
              Return to Anime Details
            </Button>
          </div>
        </div>
      </section>
    )
  }

  /* =======================================================
     MAIN PLAYER VIEW
  ======================================================== */

  return (
    <section
      className="cinema-player"
      aria-label="Cinema mode video player"
    >
      {/* =================================================
          TOP NAVIGATION BAR
      ================================================== */}

      <header className="cinema-player__topbar glass">
        <div className="cinema-player__title-group">
          <button
            type="button"
            className="cinema-player__back-btn"
            onClick={onBack}
            aria-label="Back to Anime Details"
          >
            <ArrowLeft
              size={16}
            />
            <span>Back</span>
          </button>

          <div className="cinema-player__title-meta">
            <h2>
              {anime.title}
            </h2>

            <div className="cinema-player__ep-badge">
              <span className="cinema-player__ep-tag">
                EP {currentEpisode.number}
              </span>
              <span className="cinema-player__ep-title">
                {currentEpisode.title}
              </span>
            </div>
          </div>
        </div>

        <div className="cinema-player__topbar-actions">
          <Button
            variant={
              inList
                ? 'success'
                : 'glass'
            }
            onClick={() => {
              setInList(val => !val)
              onToggleSave?.(anime)
            }}
            aria-label={inList ? 'In Watchlist' : 'Add to Watchlist'}
          >
            {inList ? (
              <Check
                size={14}
              />
            ) : (
              <Bookmark
                size={14}
              />
            )}

            <span>
              {inList
                ? 'In List'
                : 'Add to List'}
            </span>
          </Button>

          <ShareButton
            data={{
              title: `${anime.title} - EP ${currentEpisode.number}`,
              url:
                typeof window !==
                  'undefined'
                  ? window.location
                    .href
                  : 'https://7anime.app',
              description: `Watching ${anime.title} Episode ${currentEpisode.number} on 7anime`,
            }}
          />
        </div>
      </header>

      {/* =================================================
          PLAYER LAYOUT (GRID: STAGE + SIDEBAR)
      ================================================== */}

      <div className="cinema-player__layout">
        <div className="cinema-player__stage-container">
          {/* ===============================================
              SERVERS & AUDIO SELECTOR BAR
          ================================================ */}

          <div className="cinema-player__servers glass">
            <div className="cinema-player__server-group">
              <span className="cinema-player__server-label">
                SERVER
              </span>

              <button
                type="button"
                className={`cinema-player__server-chip ${server === 'megaplay' ? 'active' : ''}`}
                onClick={() => setServer('megaplay')}
              >
                <Sparkles
                  size={13}
                />
                <span>Server 1 (MegaPlay HD)</span>
              </button>

              <button
                type="button"
                className={`cinema-player__server-chip ${server === 'server2' ? 'active' : ''}`}
                onClick={() => setServer('server2')}
              >
                <Radio size={13} />
                <span>Server 2</span>
              </button>
            </div>

            {/* =============================================
                AUDIO SELECTOR (SUB / DUB)
            ============================================== */}

            <div className="cinema-player__audio-group">
              <span className="cinema-player__server-label">
                AUDIO
              </span>

              <button
                type="button"
                className={`cinema-player__lang-chip ${language === 'sub' ? 'active' : ''}`}
                onClick={() => setLanguage('sub')}
              >
                SUB
              </button>

              <button
                type="button"
                className={`cinema-player__lang-chip ${language === 'dub' ? 'active' : ''}`}
                onClick={() => setLanguage('dub')}
              >
                DUB
              </button>
            </div>
          </div>

          {/* ===============================================
              VIDEO PLAYER STAGE
          ============================================== */}

          <div className="cinema-player__stage">
            <div
              className="cinema-player__ambient"
              aria-hidden="true"
            />

            {isIframeLoading && (
              <div className="cinema-player__loader" aria-live="polite">
                <div className="cinema-player__spinner" />
                <span>Preparing your episode...</span>
              </div>
            )}

            <iframe
              key={`${embedUrl}`}
              ref={iframeRef}
              src={embedUrl}
              title={`${anime.title} Episode ${currentEpisode.number}`}
              className="cinema-player__iframe"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              onLoad={() => setIsIframeLoading(false)}
            />
          </div>

          {/* ===============================================
              PLAYER TOOLBAR
          ============================================== */}

          <div className="cinema-player__toolbar glass">
            <div className="cinema-player__toolbar-left">
              <button
                type="button"
                className="cinema-player__control-btn"
                onClick={goPrevious}
                disabled={currentIndex <= 0}
                aria-label="Previous episode"
                title="Previous Episode (←)"
              >
                <ChevronLeft
                  size={16}
                />
                <span>Prev</span>
              </button>

              <div className="cinema-player__ep-select-wrap">
                <select
                  value={currentEpisode.id}
                  onChange={event => {
                    const episode = episodes.find(
                      item => item.id === event.target.value,
                    )
                    if (episode) {
                      setCurrentEpisode(episode)
                    }
                  }}
                  className="cinema-player__select"
                  aria-label="Jump to Episode"
                >
                  {episodes.map(episode => (
                    <option
                      key={episode.id}
                      value={episode.id}
                    >
                      EP {episode.number}: {episode.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="cinema-player__control-btn"
                onClick={goNext}
                disabled={
                  currentIndex < 0 ||
                  currentIndex >= episodes.length - 1
                }
                aria-label="Next episode"
                title="Next Episode (→)"
              >
                <span>Next</span>
                <ChevronRight
                  size={16}
                />
              </button>
            </div>

            <div className="cinema-player__toolbar-right">
              <label className="cinema-player__autonext" title="Automatically start next episode">
                <input
                  type="checkbox"
                  checked={autoNext}
                  onChange={event => setAutoNext(event.target.checked)}
                />
                <span>Auto Next</span>
              </label>

              <button
                type="button"
                className={`cinema-player__control-btn icon-only ${inList ? 'active' : ''}`}
                onClick={() => {
                  setInList(val => !val)
                  onToggleSave?.(anime)
                }}
                aria-label={inList ? 'Remove from List' : 'Add to List'}
                title={inList ? 'In My List' : 'Add to List'}
              >
                {inList ? <Check size={16} /> : <Bookmark size={16} />}
              </button>

              <button
                type="button"
                className={`cinema-player__control-btn icon-only ${muted ? 'active' : ''}`}
                onClick={() => setMuted(val => !val)}
                aria-label={muted ? 'Unmute' : 'Mute'}
                title={muted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {muted ? (
                  <VolumeX
                    size={16}
                  />
                ) : (
                  <Volume2
                    size={16}
                  />
                )}
              </button>

              <button
                type="button"
                className="cinema-player__control-btn icon-only"
                onClick={requestFullscreen}
                aria-label="Fullscreen player"
                title="Fullscreen"
              >
                <Maximize
                  size={16}
                />
              </button>
            </div>
          </div>

          {/* ===============================================
              ANIME INFORMATION CARD (ENLARGED ON DESKTOP)
          ============================================== */}

          <article className="cinema-player__info-card glass">
            <div className="cinema-player__info-poster">
              <img
                src={anime.poster}
                alt={anime.title}
                loading="lazy"
              />
              <div className="cinema-player__poster-overlay" />
            </div>

            <div className="cinema-player__info-body">
              <div className="cinema-player__info-header">
                <h3>{anime.title}</h3>
              </div>

              <div className="cinema-player__info-meta">
                {anime.rating && (
                  <span className="cinema-player__rating" title="Rating">
                    <Star
                      size={14}
                      fill="currentColor"
                    />
                    <span>{anime.rating}</span>
                  </span>
                )}

                {anime.type && (
                  <Badge tone="neutral">
                    {anime.type}
                  </Badge>
                )}

                {anime.status && (
                  <Badge
                    tone={
                      anime.status === 'Airing'
                        ? 'success'
                        : 'neutral'
                    }
                  >
                    {anime.status}
                  </Badge>
                )}

                {anime.totalEpisodes && anime.totalEpisodes > 0 && (
                  <span className="cinema-player__meta-pill">
                    {anime.totalEpisodes} Episodes
                  </span>
                )}

                {anime.studio && (
                  <span className="cinema-player__studio-tag">
                    Studio: <strong>{anime.studio}</strong>
                  </span>
                )}
              </div>

              {anime.synopsis && (
                <p className="cinema-player__synopsis">
                  {anime.synopsis}
                </p>
              )}

              {anime.genres && anime.genres.length > 0 && (
                <div className="cinema-player__genres">
                  {anime.genres.map(genre => (
                    <span key={genre} className="cinema-player__genre-chip">
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        </div>

        {/* =================================================
            EPISODE SIDEBAR
        ================================================== */}

        <EpisodeSidebar
          episodes={episodes}
          currentEpisodeId={currentEpisode.id}
          onSelectEpisode={episode => setCurrentEpisode(episode)}
        />
      </div>
    </section>
  )
}