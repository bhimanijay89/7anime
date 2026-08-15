import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Anime, Episode } from '../../types/domain'
import { ShareButton } from '../share/ShareButton'
import { Badge } from '../ui/Badge'
import { Button, IconButton } from '../ui/Button'
import { EpisodeSidebar } from './EpisodeSidebar'
import './player.css'

type Language = 'sub' | 'dub'

export function FullPlayerView({
  anime,
  initialEpisode,
  onBack,
}: {
  anime: Anime
  initialEpisode?: Episode
  onBack: () => void
}) {
  const episodesList = anime.episodesList ?? []

  const firstEpisode =
    initialEpisode ??
    episodesList[0]

  const [currentEpisode, setCurrentEpisode] =
    useState<Episode | undefined>(firstEpisode)

  const [language, setLanguage] =
    useState<Language>('sub')

  /*
   * Keep the selected episode synchronized
   * when the parent changes it.
   */
  useEffect(() => {
    if (initialEpisode) {
      setCurrentEpisode(initialEpisode)
    }
  }, [initialEpisode])

  /*
   * MegaPlay embed URL.
   *
   * IMPORTANT:
   * anime.id = AniList ID
   * currentEpisode.number = episode number
   *
   * Nothing is hardcoded to Naruto, One Piece,
   * Bleach, etc.
   */
  const megaPlayUrl = useMemo(() => {
    if (!currentEpisode) {
      return ''
    }

    const animeId = encodeURIComponent(
      String(anime.id),
    )

    const episodeNumber = encodeURIComponent(
      String(currentEpisode.number),
    )

    return `https://megaplay.buzz/stream/ani/${animeId}/${episodeNumber}/${language}`
  }, [
    anime.id,
    currentEpisode?.number,
    language,
  ])

  /*
   * Find current episode index.
   */
  const currentIndex =
    currentEpisode
      ? episodesList.findIndex(
        episode =>
          episode.id ===
          currentEpisode.id,
      )
      : -1

  const canGoPrevious =
    currentIndex > 0

  const canGoNext =
    currentIndex >= 0 &&
    currentIndex <
    episodesList.length - 1

  const handlePreviousEpisode = () => {
    if (!canGoPrevious) {
      return
    }

    const previousEpisode =
      episodesList[currentIndex - 1]

    setCurrentEpisode(
      previousEpisode,
    )

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const handleNextEpisode = () => {
    if (!canGoNext) {
      return
    }

    const nextEpisode =
      episodesList[currentIndex + 1]

    setCurrentEpisode(
      nextEpisode,
    )

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const handleSelectEpisode = (
    episode: Episode,
  ) => {
    setCurrentEpisode(episode)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  /*
   * No episode available.
   *
   * We intentionally do NOT create fake/default
   * episodes here. The player must only show
   * real episodes supplied by the application.
   */
  if (!currentEpisode) {
    return (
      <section
        className="cinema-player"
        aria-label="Cinema mode video player"
      >
        <div className="cinema-player__topbar glass">
          <div className="cinema-player__title-group">
            <Button
              variant="glass"
              onClick={onBack}
            >
              <ArrowLeft size={16} />
              Back to Details
            </Button>

            <div>
              <h2>{anime.title}</h2>
              <p>Episodes unavailable</p>
            </div>
          </div>

          <ShareButton
            data={{
              title: anime.title,
              url:
                typeof window !== 'undefined'
                  ? window.location.href
                  : 'https://7anime.app',
              description:
                `Watch ${anime.title} on 7anime`,
            }}
          />
        </div>

        <div className="cinema-player__layout">
          <div className="cinema-player__stage-container">
            <div className="cinema-player__stage">
              <div className="cinema-player__ambient" />

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '12px',
                  textAlign: 'center',
                  padding: '24px',
                }}
              >
                <h3>
                  Episodes unavailable
                </h3>

                <p
                  style={{
                    color:
                      'var(--color-text-muted)',
                  }}
                >
                  Episode information could not
                  be loaded for this anime yet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className="cinema-player"
      aria-label="Cinema mode video player"
    >
      {/* =====================================================
          PLAYER TOP BAR
      ====================================================== */}

      <div className="cinema-player__topbar glass">
        <div className="cinema-player__title-group">
          <Button
            variant="glass"
            onClick={onBack}
          >
            <ArrowLeft size={16} />
            Back to Details
          </Button>

          <div>
            <h2>{anime.title}</h2>

            <p>
              EP {currentEpisode.number}
              {currentEpisode.title
                ? `: ${currentEpisode.title}`
                : ''}
            </p>
          </div>
        </div>

        <ShareButton
          data={{
            title:
              `${anime.title} - EP ${currentEpisode.number}`,
            url:
              typeof window !== 'undefined'
                ? window.location.href
                : 'https://7anime.app',
            description:
              `Watching ${anime.title} Episode ${currentEpisode.number} on 7anime`,
          }}
        />
      </div>


      {/* =====================================================
          PLAYER + EPISODE SIDEBAR
      ====================================================== */}

      <div className="cinema-player__layout">

        {/* ===================================================
            VIDEO PLAYER
        ==================================================== */}

        <div className="cinema-player__stage-container">

          <div className="cinema-player__stage">

            {/*
             * REAL MEGAPLAY PLAYER
             *
             * Dynamic:
             *   anime.id
             *   episode.number
             *   language
             *
             * Example:
             *   /stream/ani/20/1/sub
             *
             * But this component never hardcodes
             * any anime ID.
             */}

            <iframe
              key={megaPlayUrl}
              src={megaPlayUrl}
              title={`${anime.title} Episode ${currentEpisode.number}`}
              className="cinema-player__iframe"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="origin"
            />

          </div>


          {/* =================================================
              PLAYER NAVIGATION / LANGUAGE
          ================================================== */}

          <div className="cinema-player__meta glass">

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <IconButton
                label="Previous episode"
                onClick={
                  handlePreviousEpisode
                }
                disabled={
                  !canGoPrevious
                }
              >
                <ChevronLeft size={17} />
              </IconButton>

              <IconButton
                label="Next episode"
                onClick={
                  handleNextEpisode
                }
                disabled={
                  !canGoNext
                }
              >
                <ChevronRight size={17} />
              </IconButton>

              <Badge tone="accent">
                EP {currentEpisode.number}
              </Badge>

              {currentEpisode.title && (
                <span
                  style={{
                    color:
                      'var(--color-text-muted)',
                  }}
                >
                  {currentEpisode.title}
                </span>
              )}
            </div>


            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '0.8rem',
                  color:
                    'var(--color-text-muted)',
                }}
              >
                Language
              </span>

              <select
                value={language}
                onChange={event =>
                  setLanguage(
                    event.target.value as Language,
                  )
                }
                className="cinema-player__select"
                aria-label="Audio language"
              >
                <option value="sub">
                  SUB
                </option>

                <option value="dub">
                  DUB
                </option>
              </select>

              <IconButton
                label="Fullscreen"
                onClick={() => {
                  const iframe =
                    document.querySelector(
                      '.cinema-player__iframe',
                    )

                  if (
                    iframe instanceof
                    HTMLIFrameElement
                  ) {
                    iframe.requestFullscreen?.()
                  }
                }}
              >
                <Maximize size={16} />
              </IconButton>
            </div>

          </div>

        </div>


        {/* ===================================================
            EPISODE SIDEBAR
        ==================================================== */}

        {episodesList.length > 0 && (
          <EpisodeSidebar
            episodes={episodesList}
            currentEpisodeId={
              currentEpisode.id
            }
            onSelectEpisode={
              handleSelectEpisode
            }
          />
        )}

      </div>
    </section>
  )
}