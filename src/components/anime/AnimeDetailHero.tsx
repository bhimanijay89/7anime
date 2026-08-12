import { Bookmark, Check, Play, Star } from 'lucide-react'
import { useState } from 'react'
import type { Anime } from '../../types/domain'
import { ShareButton } from '../share/ShareButton'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import './detail.css'

export function AnimeDetailHero({ anime, onWatch }: { anime: Anime; onWatch: () => void }) {
  const [inList, setInList] = useState(false)

  return (
    <div
      className="detail-hero"
      style={{ backgroundImage: `url(${anime.cover || anime.poster})` }}
    >
      <div className="detail-hero__backdrop" />
      <div className="detail-hero__content">
        <div className="detail-hero__poster">
          <img src={anime.poster} alt={anime.title} loading="eager" />
        </div>
        <div className="detail-hero__info">
          <div className="detail-hero__tags">
            <Badge tone={anime.status === 'Airing' ? 'success' : 'neutral'}>{anime.status}</Badge>
            {anime.type && <Badge tone="accent">{anime.type}</Badge>}
            {anime.year && <Badge tone="neutral">{anime.year}</Badge>}
            {anime.genres?.map(g => (
              <Badge key={g} tone="neutral">{g}</Badge>
            ))}
          </div>

          <h1 className="detail-hero__title">{anime.title}</h1>

          <div className="detail-hero__specs">
            {anime.rating && (
              <span>
                <Star size={14} fill="var(--color-warning)" color="var(--color-warning)" /> {anime.rating} rating
              </span>
            )}
            {anime.sub !== undefined && <span>SUB {anime.sub}</span>}
            {anime.dub !== undefined && <span>DUB {anime.dub}</span>}
            {anime.studio && <span>Studio: {anime.studio}</span>}
          </div>

          {anime.synopsis && <p className="detail-hero__synopsis">{anime.synopsis}</p>}

          <div className="detail-hero__actions">
            <Button onClick={onWatch}>
              <Play size={16} fill="currentColor" /> Watch Ep 1
            </Button>
            <Button
              variant={inList ? 'success' : 'glass'}
              onClick={() => setInList(prev => !prev)}
            >
              {inList ? <Check size={16} /> : <Bookmark size={16} />}
              {inList ? 'In My List' : 'Add to List'}
            </Button>
            <ShareButton
              data={{
                title: anime.title,
                url: typeof window !== 'undefined' ? window.location.href : 'https://7anime.app',
                description: anime.synopsis || `Watch ${anime.title} on 7anime!`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
