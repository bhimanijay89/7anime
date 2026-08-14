import { Check, Play } from 'lucide-react'
import type { Episode } from '../../types/domain'
import { Badge } from '../ui/Badge'
import './detail.css'

const fallbackEpisodes: Episode[] = [
  { id: 'ep1', number: 1, title: 'Episode 1: The Awakening', duration: 24, watched: true, thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80' },
  { id: 'ep2', number: 2, title: 'Episode 2: Echoes of the Past', duration: 23, watched: false, thumbnail: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=80' },
  { id: 'ep3', number: 3, title: 'Episode 3: Midnight Encounter', duration: 24, watched: false, thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80' },
  { id: 'ep4', number: 4, title: 'Episode 4: Rising Conflict', duration: 25, watched: false, thumbnail: 'https://images.unsplash.com/photo-1519608487953-e999c86e7454?auto=format&fit=crop&w=400&q=80' },
]

export function EpisodeList({
  episodes = fallbackEpisodes,
  onPlayEpisode
}: {
  episodes?: Episode[]
  onPlayEpisode: (episode: Episode) => void
}) {
  const list = episodes.length > 0 ? episodes : fallbackEpisodes

  return (
    <section className="episode-section glass" aria-label="Episodes">
      <div className="episode-section__header">
        <h2>Episodes ({list.length})</h2>
        <Badge tone="accent">Season 1</Badge>
      </div>

      <div className="episode-grid">
        {list.map(ep => (
          <article
            key={ep.id}
            className="episode-card"
            onClick={() => onPlayEpisode(ep)}
            tabIndex={0}
            role="button"
            onKeyDown={e => e.key === 'Enter' && onPlayEpisode(ep)}
            aria-label={`Play episode ${ep.number}: ${ep.title}`}
          >
            <div className="episode-card__thumb">
              {ep.thumbnail && (
                <img
                  src={ep.thumbnail}
                  alt=""
                  loading="lazy"
                  onError={e => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <div className="episode-card__play">
                <Play size={24} fill="#ffffff" color="#ffffff" />
              </div>
              {ep.watched && (
                <div className="episode-card__badge">
                  <Badge tone="success">
                    <Check size={12} /> Watched
                  </Badge>
                </div>
              )}
            </div>
            <div className="episode-card__info">
              <h3 className="episode-card__title">
                EP {ep.number}: {ep.title}
              </h3>
              <span className="episode-card__meta">{ep.duration || 24} minutes</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
