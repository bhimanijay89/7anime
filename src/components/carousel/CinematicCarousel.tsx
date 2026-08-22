import {
  ChevronLeft,
  ChevronRight,
  Check,
  Pause,
  Play,
  Plus,
  Star,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Anime } from '../../types/domain'
import { Badge } from '../ui/Badge'
import { Button, IconButton } from '../ui/Button'
import './rail.css'

interface Top10HeroProps {
  anime: Anime[]
  onSelect?: (anime: Anime) => void
  onAddToList?: (anime: Anime) => void
  onToggleSave?: (anime: Anime) => void
  /** AniList IDs already saved in the user's library. */
  savedAnimeIds?: string[]
}

interface UpcomingHeroProps {
  anime: Anime[]
  onSelect?: (anime: Anime) => void
}

/* =========================================================
   TOP 10 HERO
========================================================= */

export function Top10Hero({
  anime,
  onSelect,
  onAddToList,
  onToggleSave,
  savedAnimeIds = [],
}: Top10HeroProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const stripRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLElement>(null)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )

    prefersReducedMotion.current = mediaQuery.matches

    const handleChange = (event: MediaQueryListEvent) => {
      prefersReducedMotion.current = event.matches
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  const goTo = useCallback(
    (index: number) => {
      if (anime.length === 0) return

      const target =
        ((index % anime.length) + anime.length) %
        anime.length

      setTransitioning(true)

      const transitionDelay =
        prefersReducedMotion.current ? 0 : 200

      window.setTimeout(() => {
        setActiveIndex(target)

        window.setTimeout(() => {
          setTransitioning(false)
        }, 50)
      }, transitionDelay)
    },
    [anime.length],
  )

  useEffect(() => {
    if (paused || anime.length <= 1) return

    const timer = window.setInterval(() => {
      goTo(activeIndex + 1)
    }, 5000)

    return () => {
      window.clearInterval(timer)
    }
  }, [paused, activeIndex, anime.length, goTo])

  useEffect(() => {
    const element = containerRef.current

    if (!element) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goTo(activeIndex + 1)
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goTo(activeIndex - 1)
      }
    }

    element.addEventListener('keydown', handleKeyDown)

    return () => {
      element.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeIndex, goTo])

  useEffect(() => {
    const strip = stripRef.current

    if (!strip) return

    const active = strip.children[
      activeIndex
    ] as HTMLElement | undefined

    if (!active) return

    const targetScrollLeft =
      active.offsetLeft -
      strip.clientWidth / 2 +
      active.offsetWidth / 2

    const maxScrollLeft =
      strip.scrollWidth - strip.clientWidth

    const clampedScrollLeft = Math.max(
      0,
      Math.min(targetScrollLeft, maxScrollLeft),
    )

    strip.scrollTo({
      left: clampedScrollLeft,
      behavior: prefersReducedMotion.current
        ? 'auto'
        : 'smooth',
    })
  }, [activeIndex])

  const current = anime[activeIndex]

  const savedIds = new Set(savedAnimeIds.map(String))
  const isCurrentSaved = savedIds.has(String(current?.id ?? ''))

  const handleToggleCurrent = () => {
    if (!current) return
    if (onToggleSave) {
      onToggleSave(current)
    } else {
      onAddToList?.(current)
    }
  }

  if (!current) return null

  const rank = String(activeIndex + 1).padStart(2, '0')

  return (
    <section
      ref={containerRef}
      className={`hero-top10 ${transitioning
        ? 'hero-top10--transitioning'
        : ''
        }`}
      aria-roledescription="carousel"
      aria-label="Top 10 anime this week"
      tabIndex={0}
    >
      <div
        className="hero-top10__bg"
        style={{
          backgroundImage: `url(${current.cover || current.poster
            })`,
        }}
        aria-hidden="true"
      />

      <div
        className="hero-top10__overlay"
        aria-hidden="true"
      />

      <div
        className="hero-top10__main"
        aria-live="polite"
      >
        <div className="hero-top10__content">
          <p className="hero-top10__eyebrow">
            TOP 10 ·{' '}
            <span>#{rank} THIS WEEK</span>
          </p>

          {(() => {
            const len = current.title.length
            const titleClass =
              len > 60
                ? 'hero-top10__title hero-top10__title--long-xl'
                : len > 35
                  ? 'hero-top10__title hero-top10__title--long'
                  : 'hero-top10__title'
            return (
              <h1 className={titleClass}>
                {current.title}
              </h1>
            )
          })()}

          <div className="hero-top10__specs">
            {current.rating && (
              <span>
                <Star
                  size={14}
                  fill="var(--color-warning)"
                  color="var(--color-warning)"
                />{' '}
                {current.rating}
              </span>
            )}

            {current.type && (
              <Badge tone="accent">
                {current.type}
              </Badge>
            )}

            {current.year && (
              <Badge tone="neutral">
                {current.year}
              </Badge>
            )}

            {current.status && (
              <Badge
                tone={
                  current.status === 'Airing'
                    ? 'success'
                    : current.status === 'Upcoming'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {current.status}
              </Badge>
            )}
          </div>

          {current.genres &&
            current.genres.length > 0 && (
              <div className="hero-top10__genres">
                {current.genres
                  .slice(0, 3)
                  .map(genre => (
                    <span key={genre}>
                      {genre}
                    </span>
                  ))}
              </div>
            )}

          <p className="hero-top10__synopsis">
            {current.synopsis}
          </p>

          <div className="hero-top10__actions">
            <Button
              onClick={() =>
                onSelect?.(current)
              }
            >
              <Play
                size={15}
                fill="currentColor"
              />
              Watch Now
            </Button>

            <Button
              variant={isCurrentSaved ? 'success' : 'glass'}
              onClick={handleToggleCurrent}
              aria-label={
                isCurrentSaved
                  ? `Remove ${current.title} from list`
                  : `Add ${current.title} to list`
              }
            >
              {isCurrentSaved ? (
                <>
                  <Check size={16} strokeWidth={2.8} />
                  In My List
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add to List
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="hero-top10__poster-wrap">
          <div className="hero-top10__poster">
            <img
              src={current.poster}
              alt={`${current.title} poster`}
              loading="eager"
            />

            <strong className="hero-top10__poster-rank">
              #{rank}
            </strong>
          </div>
        </div>
      </div>

      <div className="hero-top10__strip-area">
        <IconButton
          label="Previous"
          onClick={() =>
            goTo(activeIndex - 1)
          }
        >
          <ChevronLeft />
        </IconButton>

        <div
          className="hero-top10__strip"
          ref={stripRef}
        >
          {anime.map((item, index) => (
            <button
              key={item.id}
              className={`hero-top10__thumb ${index === activeIndex
                ? 'hero-top10__thumb--active'
                : ''
                }`}
              onClick={() => goTo(index)}
              aria-label={`Show #${String(
                index + 1,
              ).padStart(2, '0')} ${item.title
                }`}
              aria-current={
                index === activeIndex
                  ? 'true'
                  : undefined
              }
            >
              <img
                src={item.poster}
                alt=""
                loading="lazy"
              />

              <span className="hero-top10__thumb-rank">
                {String(index + 1).padStart(
                  2,
                  '0',
                )}
              </span>
            </button>
          ))}
        </div>

        <IconButton
          label={
            paused
              ? 'Resume autoplay'
              : 'Pause autoplay'
          }
          onClick={() =>
            setPaused(currentPaused => !currentPaused)
          }
        >
          {paused ? <Play /> : <Pause />}
        </IconButton>

        <IconButton
          label="Next"
          onClick={() =>
            goTo(activeIndex + 1)
          }
        >
          <ChevronRight />
        </IconButton>
      </div>
    </section>
  )
}

/* =========================================================
   UPCOMING ANIME HERO
========================================================= */

export function UpcomingHero({
  anime,
  onSelect,
}: UpcomingHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const stripRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLElement>(null)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )

    prefersReducedMotion.current = mediaQuery.matches

    const handleChange = (event: MediaQueryListEvent) => {
      prefersReducedMotion.current = event.matches
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  const goTo = useCallback(
    (index: number) => {
      if (anime.length === 0) return

      const target =
        ((index % anime.length) + anime.length) %
        anime.length

      setTransitioning(true)

      const transitionDelay =
        prefersReducedMotion.current ? 0 : 200

      window.setTimeout(() => {
        setActiveIndex(target)

        window.setTimeout(() => {
          setTransitioning(false)
        }, 50)
      }, transitionDelay)
    },
    [anime.length],
  )

  useEffect(() => {
    if (paused || anime.length <= 1) return

    const timer = window.setInterval(() => {
      goTo(activeIndex + 1)
    }, 5500)

    return () => {
      window.clearInterval(timer)
    }
  }, [paused, activeIndex, anime.length, goTo])

  useEffect(() => {
    const element = containerRef.current

    if (!element) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goTo(activeIndex + 1)
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goTo(activeIndex - 1)
      }

      if (
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        if (
          event.target === element ||
          event.target === containerRef.current
        ) {
          event.preventDefault()
          onSelect?.(anime[activeIndex])
        }
      }
    }

    element.addEventListener('keydown', handleKeyDown)

    return () => {
      element.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [activeIndex, anime, goTo, onSelect])

  useEffect(() => {
    const strip = stripRef.current

    if (!strip) return

    const active = strip.children[
      activeIndex
    ] as HTMLElement | undefined

    if (!active) return

    const targetScrollLeft =
      active.offsetLeft -
      strip.clientWidth / 2 +
      active.offsetWidth / 2

    const maxScrollLeft =
      strip.scrollWidth - strip.clientWidth

    const clampedScrollLeft = Math.max(
      0,
      Math.min(targetScrollLeft, maxScrollLeft),
    )

    strip.scrollTo({
      left: clampedScrollLeft,
      behavior: prefersReducedMotion.current
        ? 'auto'
        : 'smooth',
    })
  }, [activeIndex])

  const current = anime[activeIndex]

  if (!current) return null

  const handleHeroClick = (
    event: React.MouseEvent<HTMLElement>,
  ) => {
    const target = event.target as HTMLElement

    if (
      target.closest('button') ||
      target.closest('a')
    ) {
      return
    }

    onSelect?.(current)
  }

  return (
    <section
      ref={containerRef}
      className={`hero-top10 hero-upcoming ${transitioning
        ? 'hero-top10--transitioning'
        : ''
        }`}
      aria-roledescription="carousel"
      aria-label="Upcoming anime"
      tabIndex={0}
      onClick={handleHeroClick}
      onKeyDown={event => {
        if (
          event.key === 'Enter' ||
          event.key === ' '
        ) {
          if (
            event.target === containerRef.current
          ) {
            event.preventDefault()
            onSelect?.(current)
          }
        }
      }}
    >
      {/* Background */}

      <div
        className="hero-top10__bg"
        style={{
          backgroundImage: `url(${current.cover || current.poster
            })`,
        }}
        aria-hidden="true"
      />

      <div
        className="hero-top10__overlay"
        aria-hidden="true"
      />

      {/* Main content */}

      <div
        className="hero-top10__main"
        aria-live="polite"
      >
        <div className="hero-top10__content">
          <p className="hero-top10__eyebrow">
            <span>UPCOMING · COMING SOON</span>
          </p>

          {(() => {
            const len = current.title.length
            const titleClass =
              len > 60
                ? 'hero-top10__title hero-top10__title--long-xl'
                : len > 35
                  ? 'hero-top10__title hero-top10__title--long'
                  : 'hero-top10__title'
            return (
              <h2 className={titleClass}>
                {current.title}
              </h2>
            )
          })()}

          <div className="hero-top10__meta">
            {current.type && (
              <Badge tone="neutral">
                {current.type}
              </Badge>
            )}

            {current.year && (
              <Badge tone="neutral">
                {current.year}
              </Badge>
            )}

            <Badge tone="warning">
              Upcoming
            </Badge>
          </div>

          {current.genres &&
            current.genres.length > 0 && (
              <div className="hero-top10__genres">
                {current.genres
                  .slice(0, 3)
                  .map(genre => (
                    <span key={genre}>
                      {genre}
                    </span>
                  ))}
              </div>
            )}

          {current.synopsis && (
            <p className="hero-top10__synopsis">
              {current.synopsis}
            </p>
          )}

          <p
            style={{
              marginTop: '1.1rem',
              color: 'var(--color-accent)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View anime details →
          </p>
        </div>

        {/* Poster */}

        <div className="hero-top10__poster-wrap">
          <div className="hero-top10__poster">
            <img
              src={current.poster}
              alt={`${current.title} poster`}
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Upcoming thumbnails */}

      {anime.length > 1 && (
        <div className="hero-top10__strip-area">
          <IconButton
            label="Previous upcoming anime"
            onClick={() =>
              goTo(activeIndex - 1)
            }
          >
            <ChevronLeft />
          </IconButton>

          <div
            className="hero-top10__strip"
            ref={stripRef}
          >
            {anime.map((item, index) => (
              <button
                key={item.id}
                className={`hero-top10__thumb ${index === activeIndex
                  ? 'hero-top10__thumb--active'
                  : ''
                  }`}
                onClick={() => goTo(index)}
                aria-label={`Show upcoming anime ${item.title}`}
                aria-current={
                  index === activeIndex
                    ? 'true'
                    : undefined
                }
              >
                <img
                  src={item.poster}
                  alt=""
                  loading="lazy"
                />

                <span className="hero-top10__thumb-rank">
                  {String(index + 1).padStart(
                    2,
                    '0',
                  )}
                </span>
              </button>
            ))}
          </div>

          <IconButton
            label={
              paused
                ? 'Resume upcoming autoplay'
                : 'Pause upcoming autoplay'
            }
            onClick={() =>
              setPaused(currentPaused => !currentPaused)
            }
          >
            {paused ? <Play /> : <Pause />}
          </IconButton>

          <IconButton
            label="Next upcoming anime"
            onClick={() =>
              goTo(activeIndex + 1)
            }
          >
            <ChevronRight />
          </IconButton>
        </div>
      )}
    </section>
  )
}