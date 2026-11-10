import React, { useState } from 'react'
import {
  Bookmark,
  Check,
  Clock,
  Film,
  Info,
  Play,
  Plus,
  Star,
} from 'lucide-react'
import type { Anime } from '../../types/domain'

export interface MovieCardProps {
  movie: Anime
  isSaved?: boolean
  onToggleSave?: (movie: Anime) => void
  onSelect: (movie: Anime) => void
  onPlay?: (movie: Anime) => void
}

/**
 * Format raw duration into a clean movie runtime string.
 * e.g. "130m per ep" -> "130m", or 130 -> "2h 10m"
 */
function formatMovieDuration(rawDuration?: string): string | null {
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
  return `${minutes}m`
}

export function MovieCard({
  movie,
  isSaved = false,
  onToggleSave,
  onSelect,
  onPlay,
}: MovieCardProps) {
  const [imageError, setImageError] = useState(false)
  const [triedFallback, setTriedFallback] = useState(false)

  const runtime = formatMovieDuration(movie.duration)
  const titleInitial = movie.title ? movie.title.trim().charAt(0).toUpperCase() : 'M'

  // Primary image source with intelligent cascade: poster -> cover -> banner
  const primaryImage = movie.poster || movie.cover || movie.banner || ''
  const fallbackImage = movie.banner || movie.cover || ''

  const handleImageError = () => {
    if (!triedFallback && fallbackImage && fallbackImage !== primaryImage) {
      setTriedFallback(true)
    } else {
      setImageError(true)
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    onSelect(movie)
  }

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onPlay) {
      onPlay(movie)
    } else {
      onSelect(movie)
    }
  }

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSave?.(movie)
  }

  return (
    <article
      className="movie-card"
      aria-labelledby={`movie-${movie.id}-title`}
      onClick={handleCardClick}
    >
      {/* ─── Poster Box (Fixed 2:3 Aspect Ratio) ─── */}
      <div className="movie-card__poster-box">
        {!imageError && (primaryImage || fallbackImage) ? (
          <img
            src={triedFallback ? fallbackImage : primaryImage}
            alt={movie.title}
            className="movie-card__image"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />
        ) : (
          <div className="movie-card__fallback">
            <Film size={28} className="text-cyan-400 opacity-60" />
            <span className="movie-card__fallback-letter">{titleInitial}</span>
            <span className="movie-card__fallback-title">{movie.title}</span>
          </div>
        )}

        {/* Bottom Ambient Scrim */}
        <div className="movie-card__scrim" aria-hidden="true" />

        {/* Top Badges */}
        <div className="movie-card__badges-top" aria-hidden="true">
          <span className="movie-card__type-badge">
            <Film size={10} />
            <span>{movie.year || 'MOVIE'}</span>
          </span>

          {typeof movie.rating === 'number' && movie.rating > 0 && (
            <span className="movie-card__rating-badge">
              <Star size={11} fill="currentColor" />
              <span>{movie.rating.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Runtime Badge (Bottom Corner) */}
        {runtime && (
          <div className="movie-card__runtime-badge" aria-hidden="true">
            <Clock size={11} />
            <span>{runtime}</span>
          </div>
        )}

        {/* ─── Desktop Hover Overlay (Self-Contained) ─── */}
        <div className="movie-card__overlay">
          {/* Centered Large Play Button */}
          <button
            type="button"
            className="movie-card__play-btn"
            onClick={handlePlayClick}
            aria-label={`Play ${movie.title}`}
            title="Watch Movie"
          >
            <Play size={22} fill="currentColor" />
          </button>

          {/* Quick Action Buttons */}
          <div className="movie-card__overlay-actions">
            <button
              type="button"
              className="movie-card__action-btn"
              onClick={e => {
                e.stopPropagation()
                onSelect(movie)
              }}
              title="View Movie Details"
              aria-label={`View details for ${movie.title}`}
            >
              <Info size={13} />
              <span>Details</span>
            </button>

            {onToggleSave && (
              <button
                type="button"
                className={`movie-card__action-btn ${isSaved ? 'movie-card__action-btn--saved' : ''}`}
                onClick={handleSaveClick}
                title={isSaved ? 'In My List' : 'Add to My List'}
                aria-label={isSaved ? 'Remove from My List' : 'Add to My List'}
              >
                {isSaved ? <Check size={13} /> : <Plus size={13} />}
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Card Info / Details ─── */}
      <div className="movie-card__body">
        <h3 className="movie-card__title" id={`movie-${movie.id}-title`}>
          <button
            type="button"
            className="movie-card__title-btn"
            onClick={() => onSelect(movie)}
            title={movie.title}
          >
            {movie.title}
          </button>
        </h3>

        <div className="movie-card__meta">
          <span className="movie-card__meta-year">
            {movie.year || 'Feature Film'}
          </span>
          {movie.studio && (
            <span className="movie-card__meta-studio" title={movie.studio}>
              {movie.studio}
            </span>
          )}
        </div>

        {/* Genre Tags */}
        {movie.genres && movie.genres.length > 0 && (
          <div className="movie-card__genres-row">
            {movie.genres.slice(0, 2).map(genre => (
              <span key={genre} className="movie-card__genre-tag">
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* ─── Mobile Quick Action Controls (Active on Touch) ─── */}
        <div className="movie-card__mobile-bar">
          <button
            type="button"
            className="movie-card__mobile-btn movie-card__mobile-btn--play"
            onClick={handlePlayClick}
            aria-label={`Play ${movie.title}`}
          >
            <Play size={12} fill="currentColor" />
            <span>Play</span>
          </button>
          {onToggleSave && (
            <button
              type="button"
              className={`movie-card__mobile-btn ${isSaved ? 'movie-card__mobile-btn--saved' : ''}`}
              onClick={handleSaveClick}
              aria-label={isSaved ? 'Saved to list' : 'Add to list'}
            >
              {isSaved ? <Check size={12} /> : <Bookmark size={12} />}
              <span>{isSaved ? 'Saved' : 'Add'}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

