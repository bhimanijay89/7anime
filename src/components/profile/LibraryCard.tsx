import React, { useState, useRef, useEffect } from 'react'
import {
  Play,
  BookmarkX,
  Star,
  Info,
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  Trash2,
} from 'lucide-react'
import type { Anime } from '../../types/domain'
import { getAnimeLibraryStatusBadge } from './libraryUtils'

export interface LibraryCardProps {
  anime: Anime
  onSelect: (anime: Anime) => void
  onPlay?: (anime: Anime) => void
  onRemove: (animeId: string) => void
}

export function LibraryCard({
  anime,
  onSelect,
  onPlay,
  onRemove,
}: LibraryCardProps) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [imageError, setImageError] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmRemove) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setConfirmRemove(false)
      onRemove(anime.id)
    } else {
      setConfirmRemove(true)
      timerRef.current = setTimeout(() => {
        setConfirmRemove(false)
      }, 3500)
    }
  }

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onPlay) {
      onPlay(anime)
    } else {
      onSelect(anime)
    }
  }

  // Determine watch status category badge using shared classification logic
  const badge = getAnimeLibraryStatusBadge(anime)

  // Extract initial for fallback placeholder
  const titleInitial = anime.title ? anime.title.trim().charAt(0).toUpperCase() : 'A'

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    onSelect(anime)
  }

  return (
    <article
      className="library-card"
      aria-labelledby={`library-anime-${anime.id}-title`}
      onClick={handleCardClick}
    >
      {/* ─── Poster Artwork & Overlays ─── */}
      <div className="library-card__poster-box">
        {!imageError && anime.poster ? (
          <img
            src={anime.poster}
            alt={anime.title}
            className="library-card__image"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="library-card__fallback">
            <span className="library-card__fallback-letter">{titleInitial}</span>
            <span className="library-card__fallback-title">{anime.title}</span>
          </div>
        )}

        {/* Ambient bottom scrim */}
        <div className="library-card__scrim" aria-hidden="true" />

        {/* Top Badges */}
        <div className="library-card__badges-top" aria-hidden="true">
          <span className={`library-card__status-badge library-card__status-badge--${badge.tone}`}>
            {badge.iconType === 'completed' ? (
              <CheckCircle2 size={11} />
            ) : badge.iconType === 'airing' ? (
              <Flame size={11} className="library-card__pulse-icon" />
            ) : badge.iconType === 'watching' ? (
              <Sparkles size={11} />
            ) : (
              <Clock size={11} />
            )}
            <span>{badge.label}</span>
          </span>

          {typeof anime.rating === 'number' && anime.rating > 0 && (
            <span className="library-card__rating-badge">
              <Star size={11} fill="currentColor" />
              <span>{anime.rating.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Progress Bar (if watched) */}
        {typeof anime.progress === 'number' && !Number.isNaN(anime.progress) && anime.progress > 0 && (
          <div
            className="library-card__progress-wrap"
            aria-label={`Watched ${Math.min(100, Math.max(0, Math.round(anime.progress)))}%`}
          >
            <div className="library-card__progress-bar">
              <div
                className="library-card__progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, anime.progress))}%` }}
              />
            </div>
            <div className="library-card__progress-text">
              <span>{anime.episode || 'Progress'}</span>
              <span>{Math.min(100, Math.max(0, Math.round(anime.progress)))}%</span>
            </div>
          </div>
        )}

        {/* ─── Desktop Hover Action Overlay ─── */}
        <div className="library-card__overlay">
          {/* Centered Large Play Button */}
          <button
            type="button"
            className="library-card__play-btn"
            onClick={handlePlayClick}
            aria-label={`Play ${anime.title}`}
            title="Play Now"
          >
            <Play size={22} fill="currentColor" />
          </button>

          {/* Quick Action Buttons (Bottom Overlay) */}
          <div className="library-card__overlay-actions">
            <button
              type="button"
              className="library-card__action-btn"
              onClick={e => {
                e.stopPropagation()
                onSelect(anime)
              }}
              title="View Anime Details"
              aria-label={`View details for ${anime.title}`}
            >
              <Info size={13} />
              <span>Details</span>
            </button>

            <button
              type="button"
              className={`library-card__action-btn library-card__action-btn--remove ${
                confirmRemove ? 'is-confirming' : ''
              }`}
              onClick={handleRemoveClick}
              title={confirmRemove ? 'Click again to confirm removal' : 'Remove from Library'}
              aria-label={confirmRemove ? 'Confirm removal' : `Remove ${anime.title} from library`}
            >
              {confirmRemove ? (
                <>
                  <Trash2 size={13} />
                  <span>Confirm?</span>
                </>
              ) : (
                <>
                  <BookmarkX size={13} />
                  <span>Remove</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Card Body / Info ─── */}
      <div className="library-card__body">
        <h3 className="library-card__title" id={`library-anime-${anime.id}-title`}>
          <button
            type="button"
            className="library-card__title-btn"
            onClick={() => onSelect(anime)}
            title={anime.title}
          >
            {anime.title}
          </button>
        </h3>

        <div className="library-card__meta">
          <span className="library-card__meta-type">
            {anime.type || 'TV'} {anime.year ? `· ${anime.year}` : ''}
          </span>
          <span className="library-card__meta-episodes">
            {anime.episode || (anime.totalEpisodes ? `${anime.totalEpisodes} Eps` : 'Series')}
          </span>
        </div>

        {/* Sub / Dub Badges */}
        {(anime.sub || anime.dub) && (
          <div className="library-card__lang-row">
            {anime.sub && (
              <span className="library-card__lang-tag library-card__lang-tag--sub">
                SUB {anime.sub}
              </span>
            )}
            {anime.dub && (
              <span className="library-card__lang-tag library-card__lang-tag--dub">
                DUB {anime.dub}
              </span>
            )}
          </div>
        )}

        {/* ─── Mobile Quick Action Controls (Always visible on touch) ─── */}
        <div className="library-card__mobile-bar">
          <button
            type="button"
            className="library-card__mobile-btn library-card__mobile-btn--play"
            onClick={handlePlayClick}
            aria-label={`Play ${anime.title}`}
          >
            <Play size={12} fill="currentColor" />
            <span>Play</span>
          </button>
          <button
            type="button"
            className={`library-card__mobile-btn library-card__mobile-btn--remove ${
              confirmRemove ? 'is-confirming' : ''
            }`}
            onClick={handleRemoveClick}
            aria-label={confirmRemove ? 'Confirm removal' : 'Remove from library'}
          >
            {confirmRemove ? <Trash2 size={12} /> : <BookmarkX size={12} />}
            <span>{confirmRemove ? 'Confirm?' : 'Remove'}</span>
          </button>
        </div>
      </div>
    </article>
  )
}

