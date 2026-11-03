import React from 'react'
import { Bookmark, Check, Play, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Anime, AnimeLogo as AnimeLogoType } from '../../types/domain'
import { fetchAnimeLogos } from '../../services/anilist'
import { ShareButton } from '../share/ShareButton'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { AnimeLogo } from './AnimeLogo'
import './detail.css'

export function AnimeDetailHero({
  anime,
  isSaved,
  onToggleSave,
  onWatch,
}: {
  anime: Anime
  isSaved?: boolean
  onToggleSave?: (anime: Anime) => void
  onWatch: () => void
}) {
  const [activeLogo, setActiveLogo] = useState<AnimeLogoType | null | undefined>(anime.logo)

  // Synchronize or lazily fetch logo if direct page refresh or navigation
  useEffect(() => {
    setActiveLogo(anime.logo)

    if (!anime.logo && anime.id) {
      const numId = Number(anime.id)
      if (Number.isInteger(numId) && numId > 0) {
        let isCurrent = true
        fetchAnimeLogos([numId])
          .then(result => {
            if (isCurrent && result[numId]) {
              setActiveLogo(result[numId])
            }
          })
          .catch(() => {})

        return () => {
          isCurrent = false
        }
      }
    }
  }, [anime.id, anime.logo])

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

          <div className="detail-hero__title-area">
            <AnimeLogo
              logo={activeLogo}
              title={anime.title}
              sizeVariant="detail"
              className="detail-hero__logo"
              priority
            />
          </div>

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
              variant={isSaved ? 'success' : 'glass'}
              onClick={() => onToggleSave?.(anime)}
            >
              {isSaved ? <Check size={16} /> : <Bookmark size={16} />}
              {isSaved ? 'In My List' : 'Add to List'}
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
