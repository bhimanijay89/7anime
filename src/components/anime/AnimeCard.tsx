import { Bookmark, Share2, Star } from 'lucide-react'
import type { Anime } from '../../types/domain'
import { Badge } from '../ui/Badge'
import { Progress } from '../ui/Progress'
import './anime.css'
export function AnimeCard({
  anime,
  variant = 'poster',
  rank,
  onSelect
}: {
  anime: Anime
  variant?: 'poster' | 'compact' | 'landscape' | 'continue' | 'ranked'
  rank?: number
  onSelect?: (anime: Anime) => void
}) {
  return (
    <article
      className={`anime-card anime-card--${variant}`}
      onClick={() => onSelect?.(anime)}
      tabIndex={onSelect ? 0 : undefined}
      role={onSelect ? 'button' : undefined}
      onKeyDown={onSelect ? e => e.key === 'Enter' && onSelect(anime) : undefined}
      style={{ cursor: onSelect ? 'pointer' : undefined }}
    >
      <div className="anime-card__art">
        <img src={anime.poster} alt={`${anime.title} poster`} loading="lazy" />
        <div className="anime-card__actions">
          <button
            aria-label={`Save ${anime.title}`}
            onClick={e => {
              e.stopPropagation()
            }}
          >
            <Bookmark size={16} />
          </button>
          <button
            aria-label={`Share ${anime.title}`}
            onClick={e => {
              e.stopPropagation()
            }}
          >
            <Share2 size={16} />
          </button>
        </div>
        {variant === 'ranked' && (
          <strong className="rank">
            {rank !== undefined ? String(rank).padStart(2, '0') : '01'}
          </strong>
        )}
        {anime.progress !== undefined && (
          <div className="anime-card__progress">
            <Progress value={anime.progress} />
          </div>
        )}
      </div>
      <div className="anime-card__details">
        <h3>{anime.title}</h3>
        <div className="anime-card__meta">
          <span>{anime.episode}</span>
          {anime.rating && (
            <span>
              <Star size={12} fill="currentColor" /> {anime.rating}
            </span>
          )}
        </div>
        <div className="anime-card__badges">
          {anime.sub && <Badge tone="accent">SUB {anime.sub}</Badge>}
          {anime.dub && <Badge>DUB {anime.dub}</Badge>}
          <Badge tone={anime.status === 'Airing' ? 'success' : 'neutral'}>
            {anime.status}
          </Badge>
        </div>
      </div>
    </article>
  )
}
