import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Film,
  Info,
  Play,
  Plus,
  Star,
} from 'lucide-react'
import type { Anime } from '../../types/domain'
import { cleanSynopsis } from '../carousel/CinematicCarousel'

export interface MoviesHeroCarouselProps {
  movies: Anime[]
  isSaved?: (id: string | number) => boolean
  onToggleSave?: (anime: Anime) => void
  onSelectAnime: (anime: Anime) => void
  onPlayAnime?: (anime: Anime) => void
}

/**
 * Format raw duration into a clean movie runtime string.
 * e.g. "130m per ep" -> "130 mins", or 130 -> "2h 10m"
 */
function formatMovieRuntime(rawDuration?: string): string | null {
  if (!rawDuration) return null
  const numMatch = rawDuration.match(/(\d+)/)
  if (!numMatch) return rawDuration
  const minutes = parseInt(numMatch[1], 10)
  if (isNaN(minutes) || minutes <= 0) return null
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours > 0) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }
  return `${minutes} mins`
}

export function MoviesHeroCarousel({
  movies,
  isSaved,
  onToggleSave,
  onSelectAnime,
  onPlayAnime,
}: MoviesHeroCarouselProps) {
  // Curate top spotlight candidates (up to 5 valid, unique films with artwork)
  const candidates = useMemo(() => {
    if (!movies || movies.length === 0) return []

    const seenIds = new Set<string | number>()
    const valid: Anime[] = []

    for (const m of movies) {
      if (!m || !m.id || seenIds.has(m.id)) continue
      if (!m.title || typeof m.title !== 'string' || !m.title.trim()) continue
      // Ensure at least one artwork asset exists
      if (!m.banner && !m.cover && !m.poster) continue

      seenIds.add(m.id)
      valid.push(m)
    }

    if (valid.length === 0) return []

    // Prefer high-rated anime movies (>= 8.2 rating), or take the top 5 catalog items
    const topRated = valid.filter(m => (m.rating ?? 0) >= 8.2)
    return topRated.length >= 3 ? topRated.slice(0, 5) : valid.slice(0, 5)
  }, [movies])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isTabHidden, setIsTabHidden] = useState(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  )
  const [posterErrors, setPosterErrors] = useState<Record<string, boolean>>({})

  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalSlides = candidates.length
  // Safe index within bounds [0, totalSlides - 1]
  const safeIndex = totalSlides > 0 ? ((currentIndex % totalSlides) + totalSlides) % totalSlides : 0
  const currentMovie = candidates[safeIndex] || null
  const isCurrentSaved = currentMovie ? isSaved?.(currentMovie.id) : false
  const isPaused = isHovered || isFocused || isTabHidden

  // Synchronize index if candidates list changes
  useEffect(() => {
    if (currentIndex >= totalSlides && totalSlides > 0) {
      setCurrentIndex(0)
    }
  }, [currentIndex, totalSlides])

  // Stable callback ref to eliminate stale closures in timer
  const advanceSlideRef = useRef<() => void>(() => {})
  advanceSlideRef.current = () => {
    if (totalSlides <= 1) return
    setCurrentIndex(prev => (prev + 1) % totalSlides)
  }

  // Clear timer helper
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Start fresh 7.5s timer
  const startTimer = useCallback(() => {
    clearTimer()
    if (isPaused || totalSlides <= 1) return

    timerRef.current = setTimeout(() => {
      advanceSlideRef.current()
    }, 7500)
  }, [clearTimer, isPaused, totalSlides])

  // Reset timer on slide change (manual or auto) and on pause/unpause
  useEffect(() => {
    startTimer()
    return () => clearTimer()
  }, [safeIndex, isPaused, totalSlides, startTimer, clearTimer])

  // Window listeners for tab visibility and window blur/exit
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.visibilityState === 'hidden')
    }
    const handleWindowBlur = () => {
      setIsHovered(false)
    }
    const handleDocumentMouseLeave = () => {
      setIsHovered(false)
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('mouseleave', handleDocumentMouseLeave)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('mouseleave', handleDocumentMouseLeave)
    }
  }, [])

  // Safe navigation handlers (looping)
  const handleNext = useCallback(() => {
    if (totalSlides <= 1) return
    setCurrentIndex(prev => (prev + 1) % totalSlides)
  }, [totalSlides])

  const handlePrev = useCallback(() => {
    if (totalSlides <= 1) return
    setCurrentIndex(prev => (prev - 1 + totalSlides) % totalSlides)
  }, [totalSlides])

  const handleSelectSlide = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  // Preload adjacent backdrop and poster images
  useEffect(() => {
    if (totalSlides <= 1) return

    const nextIdx = (safeIndex + 1) % totalSlides
    const prevIdx = (safeIndex - 1 + totalSlides) % totalSlides

    const preload = (url?: string) => {
      if (!url) return
      const img = new Image()
      img.src = url
    }

    const nextMovie = candidates[nextIdx]
    const prevMovie = candidates[prevIdx]

    if (nextMovie) {
      preload(nextMovie.banner || nextMovie.cover || nextMovie.poster)
      preload(nextMovie.poster || nextMovie.cover)
    }
    if (prevMovie) {
      preload(prevMovie.banner || prevMovie.cover || prevMovie.poster)
      preload(prevMovie.poster || prevMovie.cover)
    }
  }, [safeIndex, candidates, totalSlides])

  // Keyboard navigation when hero or its controls are focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      handleNext()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      handlePrev()
    }
  }

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchEndX.current = null
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const diff = touchStartX.current - touchEndX.current
    const threshold = 45 // min 45px swipe
    if (diff > threshold) {
      handleNext()
    } else if (diff < -threshold) {
      handlePrev()
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  if (!currentMovie) return null

  const heroRuntime = formatMovieRuntime(currentMovie.duration)
  const isPosterBroken = posterErrors[currentMovie.id] === true
  const currentPoster = !isPosterBroken
    ? currentMovie.poster || currentMovie.cover || currentMovie.banner
    : ''

  // Formatted slide index counter strings
  const currentFormatted = String(safeIndex + 1).padStart(2, '0')
  const totalFormatted = String(totalSlides).padStart(2, '0')

  // Diagnostic state exposed for verification
  if (typeof window !== 'undefined') {
    ;(window as unknown as Record<string, unknown>).__7ANIME_MOVIES_HERO__ = {
      totalCandidates: totalSlides,
      currentIndex: safeIndex,
      currentMovieId: currentMovie.id,
      currentMovieTitle: currentMovie.title,
      isPaused,
      isHovered,
      isFocused,
      isTabHidden,
      timerActive: timerRef.current !== null,
    }
  }

  return (
    <div
      ref={heroRef}
      className={`movies-hero glass-elevated ${isPaused ? 'is-paused' : ''}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured Anime Movies Carousel"
      data-active-index={safeIndex}
      data-total-slides={totalSlides}
      data-movie-id={currentMovie.id}
      data-movie-title={currentMovie.title}
      data-is-paused={isPaused ? 'true' : 'false'}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsFocused(false)}
      onFocus={(e) => {
        const target = e.target as HTMLElement | null
        if (target && typeof target.matches === 'function' && target.matches(':focus-visible')) {
          setIsFocused(true)
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsFocused(false)
        }
      }}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
    >
      {/* ─── Stacked Backdrop Layers (Crossfade + Ken Burns) ─── */}
      <div className="movies-hero__backdrop-container" aria-hidden="true">
        {candidates.map((movie, idx) => {
          const isActive = idx === safeIndex
          const backdropSrc = movie.banner || movie.cover || movie.poster || ''

          return (
            <div
              key={movie.id}
              className={`movies-hero__backdrop-layer ${isActive ? 'is-active' : ''}`}
            >
              {backdropSrc ? (
                <img
                  src={backdropSrc}
                  alt=""
                  className="movies-hero__backdrop-img"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="movies-hero__backdrop-fallback" />
              )}
            </div>
          )
        })}

        {/* Ambient Dark Scrims for Contrast */}
        <div className="movies-hero__scrim-left" />
        <div className="movies-hero__scrim-bottom" />
        <div className="movies-hero__scrim-top" />
      </div>

      {/* ─── Synchronized Content Scene (Poster + Details) ─── */}
      <div
        key={currentMovie.id}
        className="movies-hero__content-scene"
        aria-live="polite"
      >
        {/* Left Column: Fixed 2:3 Aspect-Ratio Poster with Smooth Glide */}
        <div className="movies-hero__poster-col animate-poster">
          <div className="movies-hero__poster-box">
            {currentPoster ? (
              <img
                src={currentPoster}
                alt={currentMovie.title}
                className="movies-hero__poster-img"
                loading="eager"
                fetchPriority="high"
                referrerPolicy="no-referrer"
                onError={() => {
                  setPosterErrors(prev => ({ ...prev, [currentMovie.id]: true }))
                }}
              />
            ) : (
              <div className="movies-hero__poster-fallback">
                <Film size={34} className="text-cyan-400 opacity-60" />
                <span>{currentMovie.title}</span>
              </div>
            )}

            {/* Rating Ribbon on Poster */}
            {typeof currentMovie.rating === 'number' && currentMovie.rating > 0 && (
              <span className="movies-hero__poster-ribbon">
                <Star size={11} fill="currentColor" />
                <span>{currentMovie.rating.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Staggered Movie Details */}
        <div className="movies-hero__details">
          {/* 1. Badges */}
          <div className="movies-hero__badges animate-fade-up" style={{ animationDelay: '30ms' }}>
            <span className="movies-hero__badge movies-hero__badge--accent">
              <Film size={11} /> Featured Film
            </span>
            {currentMovie.year && (
              <span className="movies-hero__badge">{currentMovie.year}</span>
            )}
            {heroRuntime && (
              <span className="movies-hero__badge">{heroRuntime}</span>
            )}
            {currentMovie.studio && (
              <span className="movies-hero__badge movies-hero__badge--studio">
                {currentMovie.studio}
              </span>
            )}
          </div>

          {/* 2. Movie Title */}
          <h2
            className="movies-hero__title animate-fade-up"
            style={{ animationDelay: '80ms' }}
            title={currentMovie.title}
          >
            {currentMovie.title}
          </h2>

          {/* 3. Rating & Genres */}
          <div
            className="movies-hero__meta-row animate-fade-up"
            style={{ animationDelay: '130ms' }}
          >
            {typeof currentMovie.rating === 'number' && currentMovie.rating > 0 && (
              <span className="movies-hero__rating">
                <Star size={14} fill="#facc15" color="#facc15" />
                <strong>{currentMovie.rating.toFixed(1)}</strong>
                <span className="movies-hero__rating-scale">/ 10</span>
              </span>
            )}
            {currentMovie.genres && currentMovie.genres.length > 0 && (
              <div className="movies-hero__genres">
                {currentMovie.genres.slice(0, 3).map(genre => (
                  <span key={genre} className="movies-hero__genre-tag">
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 4. Overview / Synopsis */}
          {currentMovie.synopsis && (
            <p
              className="movies-hero__synopsis animate-fade-up"
              style={{ animationDelay: '170ms' }}
            >
              {cleanSynopsis(currentMovie.synopsis)}
            </p>
          )}

          {/* 5. Action Buttons */}
          <div
            className="movies-hero__actions animate-fade-up"
            style={{ animationDelay: '210ms' }}
          >
            <button
              type="button"
              className="movies-btn movies-btn--primary"
              onClick={() =>
                onPlayAnime ? onPlayAnime(currentMovie) : onSelectAnime(currentMovie)
              }
              aria-label={`Watch ${currentMovie.title}`}
            >
              <Play size={16} fill="currentColor" />
              <span>Watch Movie</span>
            </button>

            {onToggleSave && (
              <button
                type="button"
                className={`movies-btn ${isCurrentSaved ? 'movies-btn--saved' : 'movies-btn--glass'}`}
                onClick={() => onToggleSave(currentMovie)}
                aria-label={isCurrentSaved ? 'In My List' : 'Add to My List'}
              >
                {isCurrentSaved ? <Check size={16} /> : <Plus size={16} />}
                <span>{isCurrentSaved ? 'In My List' : 'Add to List'}</span>
              </button>
            )}

            <button
              type="button"
              className="movies-btn movies-btn--ghost"
              onClick={() => onSelectAnime(currentMovie)}
              aria-label={`View details for ${currentMovie.title}`}
            >
              <Info size={16} />
              <span>Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Cinematic Carousel Controls (Bottom-Right / Bottom-Center) ─── */}
      <div className="movies-hero__controls" aria-label="Carousel navigation controls">
        {/* Navigation Arrow Left */}
        <button
          type="button"
          className="movies-hero__arrow movies-hero__arrow--prev"
          onClick={handlePrev}
          aria-label="Previous movie"
          title="Previous slide"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Slide Indicator Pills with Animated Progress */}
        <div className="movies-hero__indicators" role="tablist" aria-label="Slide indicators">
          {candidates.map((cand, idx) => {
            const isActive = idx === safeIndex
            return (
              <button
                key={cand.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Slide ${idx + 1} of ${totalSlides}: ${cand.title}`}
                className={`movies-hero__indicator-pill ${isActive ? 'is-active' : ''}`}
                onClick={() => handleSelectSlide(idx)}
                title={cand.title}
              >
                <span className="movies-hero__progress-track">
                  {isActive && <span className="movies-hero__progress-fill" />}
                </span>
                <span className="movies-hero__indicator-label">{cand.title}</span>
              </button>
            )
          })}
        </div>

        {/* Slide Counter (e.g. 01 / 05) */}
        <div className="movies-hero__counter" aria-hidden="true">
          <span className="movies-hero__counter-current">{currentFormatted}</span>
          <span className="movies-hero__counter-sep">/</span>
          <span className="movies-hero__counter-total">{totalFormatted}</span>
        </div>

        {/* Navigation Arrow Right */}
        <button
          type="button"
          className="movies-hero__arrow movies-hero__arrow--next"
          onClick={handleNext}
          aria-label="Next movie"
          title="Next slide"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

