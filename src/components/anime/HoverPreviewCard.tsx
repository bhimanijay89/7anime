import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Play,
  Bookmark,
  ChevronDown,
  Star,
  ThumbsUp,
} from 'lucide-react'
import type { Anime } from '../../types/domain'
import './hoverCard.css'

export interface HoverPreviewCardProps {
  anime: Anime
  anchorRect: DOMRect
  isSaved?: boolean
  onToggleSave?: (anime: Anime) => void
  onPlay?: (anime: Anime) => void
  onViewDetails?: (anime: Anime) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function HoverPreviewCard({
  anime,
  anchorRect,
  isSaved = false,
  onToggleSave,
  onPlay,
  onViewDetails,
  onMouseEnter,
  onMouseLeave,
}: HoverPreviewCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isLiked, setIsLiked] = useState(false)

  // Compute viewport-safe position
  const CARD_WIDTH = 320
  const CARD_HEIGHT = 340
  const padding = 16

  const centerX = anchorRect.left + anchorRect.width / 2
  let targetLeft = centerX - CARD_WIDTH / 2
  targetLeft = Math.max(padding, Math.min(window.innerWidth - CARD_WIDTH - padding, targetLeft))

  let targetTop = anchorRect.top - 24
  if (targetTop + CARD_HEIGHT > window.innerHeight - padding) {
    targetTop = window.innerHeight - CARD_HEIGHT - padding
  }
  if (targetTop < padding) {
    targetTop = padding
  }

  // Sanitize synopsis
  const cleanSynopsis = (anime.synopsis || '')
    .replace(/<[^>]*>?/gm, '')
    .trim()

  const backdropImage = anime.banner || anime.cover || anime.poster

  return createPortal(
    <div
      ref={cardRef}
      className="hover-preview-portal"
      style={{
        left: `${targetLeft}px`,
        top: `${targetTop}px`,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="hover-preview-card" role="dialog" aria-label={`${anime.title} preview`}>
        {/* Media / Backdrop */}
        <div className="hover-preview-card__media">
          <img
            src={backdropImage}
            alt={anime.title}
            loading="eager"
            onError={e => {
              if (anime.poster && e.currentTarget.src !== anime.poster) {
                e.currentTarget.src = anime.poster
              }
            }}
          />
          <div className="hover-preview-card__scrim" />

          <div className="hover-preview-card__media-badges">
            {anime.status && (
              <span className={`hover-preview-card__badge ${anime.status === 'Airing' ? 'hover-preview-card__badge--status' : ''}`}>
                {anime.status}
              </span>
            )}
            {anime.type && (
              <span className="hover-preview-card__badge hover-preview-card__badge--accent">
                {anime.type}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="hover-preview-card__body">
          {/* Quick Actions Row */}
          <div className="hover-preview-card__actions">
            <div className="hover-preview-card__action-group-left">
              <button
                type="button"
                className="hover-preview-btn hover-preview-btn--play"
                onClick={() => onPlay?.(anime)}
                title="Play Now"
                aria-label={`Play ${anime.title}`}
              >
                <Play size={20} fill="currentColor" />
              </button>

              <button
                type="button"
                className={`hover-preview-btn hover-preview-btn--circle ${isSaved ? 'active' : ''}`}
                onClick={() => onToggleSave?.(anime)}
                title={isSaved ? 'In My List' : 'Add to My List'}
                aria-label={isSaved ? 'Remove from My List' : 'Add to My List'}
              >
                <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
              </button>

              <button
                type="button"
                className={`hover-preview-btn hover-preview-btn--circle ${isLiked ? 'active' : ''}`}
                onClick={() => setIsLiked(prev => !prev)}
                title={isLiked ? 'Liked' : 'Like'}
                aria-label="Like"
              >
                <ThumbsUp size={16} fill={isLiked ? 'currentColor' : 'none'} />
              </button>
            </div>

            <button
              type="button"
              className="hover-preview-btn hover-preview-btn--circle"
              onClick={() => onViewDetails?.(anime)}
              title="View Anime Details"
              aria-label={`View details for ${anime.title}`}
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Title */}
          <h4 className="hover-preview-card__title" title={anime.title}>
            {anime.title}
          </h4>

          {/* Metadata Row */}
          <div className="hover-preview-card__meta">
            {typeof anime.rating === 'number' && (
              <span className="hover-preview-card__rating">
                <Star size={13} fill="currentColor" /> {anime.rating.toFixed(1)}
              </span>
            )}

            {anime.year && (
              <>
                <span className="hover-preview-card__dot">•</span>
                <span>{anime.year}</span>
              </>
            )}

            {(anime.totalEpisodes || anime.episode) && (
              <>
                <span className="hover-preview-card__dot">•</span>
                <span>{anime.totalEpisodes ? `${anime.totalEpisodes} Eps` : anime.episode}</span>
              </>
            )}

            <div className="hover-preview-card__audio-pills">
              <span className="hover-preview-card__audio-pill">SUB</span>
              <span className="hover-preview-card__audio-pill">DUB</span>
            </div>
          </div>

          {/* Synopsis */}
          {cleanSynopsis && (
            <p className="hover-preview-card__synopsis">
              {cleanSynopsis}
            </p>
          )}

          {/* Genres */}
          {anime.genres && anime.genres.length > 0 && (
            <div className="hover-preview-card__genres">
              {anime.genres.slice(0, 4).map(genre => (
                <span key={genre} className="hover-preview-card__genre">
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
