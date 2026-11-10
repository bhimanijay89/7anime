import { useState, useMemo } from 'react'
import {
  Bookmark,
  BookmarkX,
  Search,
  X,
  SlidersHorizontal,
  Sparkles,
  Compass,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import type { Anime } from '../../types/domain'
import { LibraryCard } from './LibraryCard'
import {
  getAnimeLibraryCategory,
  type LibraryCategory,
  type LibraryCategoryTab,
  type LibrarySortOption,
  type LibrarySyncStatus,
} from './libraryUtils'
import './library.css'

export {
  getAnimeLibraryCategory,
  type LibraryCategory,
  type LibraryCategoryTab,
  type LibrarySortOption,
  type LibrarySyncStatus,
}

export interface LibraryViewProps {
  savedAnime: Anime[]
  onSelectAnime: (anime: Anime) => void
  onRemoveFromLibrary: (animeId: string) => void
  onPlayAnime?: (anime: Anime) => void
  onBrowseCatalog?: () => void
  isAuthenticated?: boolean
  syncStatus?: LibrarySyncStatus
}

export function LibraryView({
  savedAnime,
  onSelectAnime,
  onRemoveFromLibrary,
  onPlayAnime,
  onBrowseCatalog,
  isAuthenticated = false,
  syncStatus,
}: LibraryViewProps) {
  const syncState: LibrarySyncStatus = syncStatus ?? (isAuthenticated ? 'synced' : 'guest')
  const [tab, setTab] = useState<LibraryCategoryTab>('all')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<LibrarySortOption>('recent')

  // Compute exact category counts for badge pills using the unified helper
  const counts = useMemo(() => {
    let watching = 0
    let planned = 0
    let completed = 0

    for (const item of savedAnime) {
      const cat = getAnimeLibraryCategory(item)
      if (cat === 'completed') {
        completed++
      } else if (cat === 'watching') {
        watching++
      } else {
        planned++
      }
    }

    return {
      all: savedAnime.length,
      watching,
      planned,
      completed,
    }
  }, [savedAnime])

  // Filter and sort the library items
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    const list = savedAnime.filter(item => {
      // 1. Search Query Filter
      if (q && !item.title.toLowerCase().includes(q)) {
        return false
      }

      // 2. Category Tab Filter (using shared classification helper)
      if (tab !== 'all' && getAnimeLibraryCategory(item) !== tab) {
        return false
      }

      return true
    })

    // 3. Sorting
    return list.slice().sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0)
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title)
      }
      if (sortBy === 'episodes') {
        return (b.totalEpisodes || 0) - (a.totalEpisodes || 0)
      }
      return 0 // 'recent' maintains default saved array order
    })
  }, [savedAnime, query, tab, sortBy])

  const categoryName =
    tab === 'all'
      ? 'All Saved'
      : tab === 'watching'
      ? 'Watching'
      : tab === 'planned'
      ? 'Plan to Watch'
      : 'Completed'

  return (
    <section className="library-view" aria-label="Personal Library">
      {/* ─── Header: Cinematic Glass Header ─── */}
      <header className="library-header glass-elevated">
        <div className="library-header__main">
          <div className="library-header__title-block">
            <div className="library-header__badge-row">
              <span className="library-header__badge">
                <Bookmark size={13} className="text-cyan-400" />
                <span>Personal Collection</span>
              </span>
              <span className={`library-header__sync-tag library-header__sync-tag--${syncState}`}>
                {syncState === 'syncing' ? (
                  <RefreshCw size={12} className="text-cyan-400 animate-spin" />
                ) : syncState === 'synced' ? (
                  <Sparkles size={12} className="text-amber-400" />
                ) : syncState === 'error' ? (
                  <AlertCircle size={12} className="text-rose-400" />
                ) : (
                  <Sparkles size={12} className="text-slate-400" />
                )}
                <span>
                  {syncState === 'syncing'
                    ? 'Syncing...'
                    : syncState === 'synced'
                    ? 'Cloud Synced'
                    : syncState === 'error'
                    ? 'Sync Failed'
                    : 'Personal Watchlist'}
                </span>
              </span>
            </div>
            <h1 className="library-header__title">My Library</h1>
            <p className="library-header__subtitle">
              Your personalized watchlist, tracked series progression, and completed favorites.
            </p>
          </div>

          <div className="library-header__stats-ribbon">
            <div className="library-stat-pill">
              <span className="library-stat-pill__label">Total Saved</span>
              <strong className="library-stat-pill__value">{counts.all}</strong>
            </div>
            <div className="library-stat-pill">
              <span className="library-stat-pill__label">Watching</span>
              <strong className="library-stat-pill__value text-cyan-400">{counts.watching}</strong>
            </div>
            <div className="library-stat-pill">
              <span className="library-stat-pill__label">Plan to Watch</span>
              <strong className="library-stat-pill__value text-violet-400">{counts.planned}</strong>
            </div>
            <div className="library-stat-pill">
              <span className="library-stat-pill__label">Completed</span>
              <strong className="library-stat-pill__value text-emerald-400">{counts.completed}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Toolbar: Category Tabs & Search/Sort Controls ─── */}
      <div className="library-toolbar glass">
        {/* Category Tabs */}
        <div className="library-tabs" role="tablist" aria-label="Library categories">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'all'}
            className={`library-tab ${tab === 'all' ? 'library-tab--active' : ''}`}
            onClick={() => setTab('all')}
          >
            <span>All Saved</span>
            <span className="library-tab__count">{counts.all}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'watching'}
            className={`library-tab ${tab === 'watching' ? 'library-tab--active' : ''}`}
            onClick={() => setTab('watching')}
          >
            <span className="library-tab__dot library-tab__dot--cyan" />
            <span>Watching</span>
            <span className="library-tab__count">{counts.watching}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'planned'}
            className={`library-tab ${tab === 'planned' ? 'library-tab--active' : ''}`}
            onClick={() => setTab('planned')}
          >
            <span className="library-tab__dot library-tab__dot--violet" />
            <span>Plan to Watch</span>
            <span className="library-tab__count">{counts.planned}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'completed'}
            className={`library-tab ${tab === 'completed' ? 'library-tab--active' : ''}`}
            onClick={() => setTab('completed')}
          >
            <span className="library-tab__dot library-tab__dot--emerald" />
            <span>Completed</span>
            <span className="library-tab__count">{counts.completed}</span>
          </button>
        </div>

        {/* Action Controls: Search & Sort */}
        <div className="library-toolbar__actions">
          <div className="library-search-box">
            <Search size={15} className="library-search-box__icon text-cyan-400" />
            <input
              type="text"
              className="library-search-box__input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setQuery('')}
              placeholder="Search saved titles..."
              aria-label="Search saved titles"
            />
            {query && (
              <button
                type="button"
                className="library-search-box__clear"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="library-sort-box">
            <SlidersHorizontal size={14} className="text-gray-400" />
            <select
              className="library-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as LibrarySortOption)}
              aria-label="Sort library"
            >
              <option value="recent">Saved Order</option>
              <option value="rating">Highest Rated</option>
              <option value="title">Title (A → Z)</option>
              <option value="episodes">Most Episodes</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Active Filter Feedback Ribbon ─── */}
      {(query || tab !== 'all') && (
        <div className="library-filter-status">
          <span>
            Showing <strong>{filtered.length}</strong> of <strong>{savedAnime.length}</strong> saved anime
            {query && (
              <>
                {' '}matching &ldquo;<strong>{query}</strong>&rdquo;
              </>
            )}
            {tab !== 'all' && (
              <>
                {' '}in <strong>{categoryName}</strong>
              </>
            )}
          </span>
          <button
            type="button"
            className="library-filter-reset-btn"
            onClick={() => {
              setQuery('')
              setTab('all')
            }}
          >
            Reset filters
          </button>
        </div>
      )}

      {/* ─── Library Cards Grid ─── */}
      {filtered.length > 0 ? (
        <div className="library-grid" role="region" aria-label="Saved anime collection">
          {filtered.map(anime => (
            <LibraryCard
              key={anime.id}
              anime={anime}
              onSelect={onSelectAnime}
              onPlay={onPlayAnime}
              onRemove={onRemoveFromLibrary}
            />
          ))}
        </div>
      ) : (
        <div className="library-empty-box glass">
          <div className="library-empty-box__icon-wrap">
            {query ? (
              <Search size={28} className="text-cyan-400" />
            ) : (
              <BookmarkX size={28} className="text-cyan-400" />
            )}
          </div>
          <h2 className="library-empty-box__title">
            {savedAnime.length === 0
              ? 'Your Library is Empty'
              : query
              ? `No anime matching "${query}"`
              : `No titles in ${categoryName}`}
          </h2>
          <p className="library-empty-box__desc">
            {savedAnime.length === 0
              ? 'Start exploring anime series and movies, and save them to your library to track your watch progress.'
              : query
              ? 'Check for spelling mistakes or try searching with a different keyword.'
              : 'Add anime to this category from the catalog or update your watching progress.'}
          </p>
          <div className="library-empty-box__actions">
            {savedAnime.length === 0 ? (
              <button
                type="button"
                className="library-btn-primary"
                onClick={onBrowseCatalog}
              >
                <Compass size={16} />
                <span>Explore Anime Catalog</span>
              </button>
            ) : query ? (
              <button
                type="button"
                className="library-btn-primary"
                onClick={() => setQuery('')}
              >
                <span>Clear Search</span>
              </button>
            ) : (
              <button
                type="button"
                className="library-btn-primary"
                onClick={() => setTab('all')}
              >
                <span>View All Saved ({savedAnime.length})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
