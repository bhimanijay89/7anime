import { BookmarkX, Library, Search } from 'lucide-react'
import { useState } from 'react'
import type { Anime } from '../../types/domain'
import { AnimeCard } from '../anime/AnimeCard'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/Feedback'
import './profile.css'

export function LibraryView({
  savedAnime,
  onSelectAnime,
  onRemoveFromLibrary
}: {
  savedAnime: Anime[]
  onSelectAnime: (anime: Anime) => void
  onRemoveFromLibrary: (animeId: string) => void
}) {
  const [tab, setTab] = useState<'all' | 'watching' | 'planned' | 'completed'>('all')
  const [query, setQuery] = useState('')

  const filtered = savedAnime.filter(item => {
    const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase())
    if (!matchesQuery) return false
    if (tab === 'watching') return item.status === 'Airing' || item.progress !== undefined
    if (tab === 'planned') return item.status === 'Upcoming'
    if (tab === 'completed') return item.status === 'Completed'
    return true
  })

  return (
    <section className="library-space" aria-label="Personal Library">
      <header className="library-space__header glass">
        <div>
          <p className="eyebrow"><Library size={16} /> My Collection</p>
          <h1>Personal Library</h1>
          <p>Manage your saved watchlists, tracked series, and completed favorites.</p>
        </div>
        <div className="library-space__count">
          <strong>{savedAnime.length}</strong>
          <span>Saved Titles</span>
        </div>
      </header>

      <div className="library-space__controls glass">
        <div className="library-space__tabs">
          <button
            className={tab === 'all' ? 'active' : ''}
            onClick={() => setTab('all')}
          >
            All Saved ({savedAnime.length})
          </button>
          <button
            className={tab === 'watching' ? 'active' : ''}
            onClick={() => setTab('watching')}
          >
            Watching
          </button>
          <button
            className={tab === 'planned' ? 'active' : ''}
            onClick={() => setTab('planned')}
          >
            Plan to Watch
          </button>
          <button
            className={tab === 'completed' ? 'active' : ''}
            onClick={() => setTab('completed')}
          >
            Completed
          </button>
        </div>

        <label className="library-space__search">
          <Search size={16} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search saved titles..."
          />
        </label>
      </div>

      {filtered.length > 0 ? (
        <div className="library-space__grid">
          {filtered.map(anime => (
            <div key={anime.id} className="library-card-wrapper">
              <AnimeCard anime={anime} onSelect={onSelectAnime} />
              <button
                className="library-card-remove"
                onClick={e => {
                  e.stopPropagation()
                  onRemoveFromLibrary(anime.id)
                }}
                aria-label={`Remove ${anime.title} from library`}
                title="Remove from library"
              >
                <BookmarkX size={14} /> Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No titles in this collection"
          description="Browse the catalog to add your favorite series to your personal library."
          action={
            <Button onClick={() => setTab('all')}>View all saved</Button>
          }
        />
      )}
    </section>
  )
}
