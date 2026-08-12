import { Check, Play, Search } from 'lucide-react'
import { useState } from 'react'
import type { Episode } from '../../types/domain'
import { Badge } from '../ui/Badge'
import './player.css'

export function EpisodeSidebar({
  episodes,
  currentEpisodeId,
  onSelectEpisode
}: {
  episodes: Episode[]
  currentEpisodeId?: string
  onSelectEpisode: (episode: Episode) => void
}) {
  const [query, setQuery] = useState('')

  const filtered = episodes.filter(ep =>
    `EP ${ep.number} ${ep.title}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <aside className="player-sidebar glass" aria-label="Episode list">
      <div className="player-sidebar__header">
        <h3>Playlist</h3>
        <span>{episodes.length} Episodes</span>
      </div>

      <div className="player-sidebar__search">
        <Search size={14} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filter episodes..."
        />
      </div>

      <div className="player-sidebar__list">
        {filtered.map(ep => {
          const active = ep.id === currentEpisodeId
          return (
            <article
              key={ep.id}
              className={`player-sidebar__item ${active ? 'active' : ''}`}
              onClick={() => onSelectEpisode(ep)}
              tabIndex={0}
              role="button"
              onKeyDown={e => e.key === 'Enter' && onSelectEpisode(ep)}
            >
              <div className="player-sidebar__thumb">
                {ep.thumbnail && <img src={ep.thumbnail} alt="" loading="lazy" />}
                <div className="player-sidebar__play-icon">
                  <Play size={16} fill="currentColor" />
                </div>
              </div>
              <div className="player-sidebar__info">
                <strong>EP {ep.number}: {ep.title}</strong>
                <div className="player-sidebar__meta">
                  <small>{ep.duration || 24}m</small>
                  {ep.watched && (
                    <Badge tone="success">
                      <Check size={10} /> Watched
                    </Badge>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </aside>
  )
}
