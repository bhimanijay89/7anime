import React, { useEffect, useMemo, useState } from 'react'
import {
  Compass,
  Film,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import type { Anime } from '../../types/domain'
import { getAnimeMovies, getCachedAnimeMoviesSync } from '../../services/anilist'
import { MovieCard } from './MovieCard'
import { MoviesHeroCarousel } from './MoviesHeroCarousel'
import { MoviesSkeleton } from './MoviesSkeleton'
import './movies.css'

export { MoviesSkeleton }

export interface MoviesViewProps {
  /** Optional pre-loaded movies passed from caller */
  initialMovies?: Anime[]
  /** Check whether an anime ID is saved in user library */
  isSaved?: (id: string | number) => boolean
  /** Toggle library save callback */
  onToggleSave?: (anime: Anime) => void
  /** Select anime callback (opens Detail view) */
  onSelectAnime: (anime: Anime) => void
  /** Play anime callback (opens Player view directly) */
  onPlayAnime?: (anime: Anime) => void
}

const GENRES = [
  'All',
  'Drama',
  'Action',
  'Romance',
  'Fantasy',
  'Sci-Fi',
  'Mystery',
  'Supernatural',
  'Adventure',
]

export type MovieCategoryTab = 'all' | 'popular' | 'top_rated' | 'ghibli' | 'newest'
export type MovieSortOption = 'popularity' | 'rating' | 'newest' | 'title'

export function MoviesView({
  initialMovies = [],
  isSaved,
  onToggleSave,
  onSelectAnime,
  onPlayAnime,
}: MoviesViewProps) {
  // Use in-memory cached movie data immediately if available for 0ms transition
  const [movies, setMovies] = useState<Anime[]>(() => {
    const cached = getCachedAnimeMoviesSync()
    if (cached && cached.length > 0) return cached
    return initialMovies
  })

  const [loading, setLoading] = useState(() => {
    const cached = getCachedAnimeMoviesSync()
    return (!cached || cached.length === 0) && initialMovies.length === 0
  })

  const [selectedTab, setSelectedTab] = useState<MovieCategoryTab>('all')
  const [query, setQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [sortBy, setSortBy] = useState<MovieSortOption>('popularity')

  // Fetch or revalidate anime movies catalog on mount
  useEffect(() => {
    let active = true

    getAnimeMovies(1, 35)
      .then(fetched => {
        if (!active) return
        if (fetched && fetched.length > 0) {
          setMovies(fetched)
        }
      })
      .catch(err => {
        console.warn('[MoviesView] Error loading movies from API:', err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  // Studio Ghibli collection helper
  const ghibliMovies = useMemo(() => {
    return movies.filter(m => {
      if (m.studio && m.studio.toLowerCase().includes('ghibli')) return true
      const ghibliTitles = [
        'spirited away',
        'howl',
        'mononoke',
        'totoro',
        'fireflies',
        'ponyo',
        'kiki',
      ]
      return ghibliTitles.some(t => m.title.toLowerCase().includes(t))
    })
  }, [movies])

  // Popular movies helper:
  // AniList returns movies ordered by POPULARITY_DESC.
  // The popular tier represents the premier top 20 ranked catalog titles.
  const popularMovies = useMemo(() => {
    return movies.slice(0, Math.min(20, movies.length))
  }, [movies])

  const popularMovieIds = useMemo(() => {
    return new Set(popularMovies.map(m => m.id))
  }, [popularMovies])

  // Top rated movies (rating >= 8.0) matching the 'Top Rated (8.0+)' tab filter and badge
  const topRatedMovies = useMemo(() => {
    return movies.filter(m => (m.rating ?? 0) >= 8.0)
  }, [movies])

  // Dedicated masterpieces rail (rating >= 8.4) for curated spotlight showcase
  const masterpieceMovies = useMemo(() => {
    return movies.filter(m => (m.rating ?? 0) >= 8.4)
  }, [movies])

  // Filter and sort movies according to toolbar controls
  const filteredMovies = useMemo(() => {
    const q = query.trim().toLowerCase()

    let result = movies.filter(m => {
      // 1. Search Query Filter
      if (q) {
        const inTitle = m.title.toLowerCase().includes(q)
        const inSynopsis = m.synopsis ? m.synopsis.toLowerCase().includes(q) : false
        const inStudio = m.studio ? m.studio.toLowerCase().includes(q) : false
        if (!inTitle && !inSynopsis && !inStudio) return false
      }

      // 2. Category Tab Filter
      if (selectedTab === 'popular') {
        if (!popularMovieIds.has(m.id)) return false
      } else if (selectedTab === 'top_rated') {
        if ((m.rating ?? 0) < 8.0) return false
      } else if (selectedTab === 'ghibli') {
        const isGhibli =
          (m.studio && m.studio.toLowerCase().includes('ghibli')) ||
          ['spirited away', 'howl', 'mononoke', 'totoro', 'fireflies', 'ponyo', 'kiki'].some(t =>
            m.title.toLowerCase().includes(t),
          )
        if (!isGhibli) return false
      } else if (selectedTab === 'newest') {
        if ((m.year ?? 0) < 2020) return false
      }

      // 3. Genre Filter
      if (selectedGenre !== 'All') {
        if (!m.genres || !m.genres.includes(selectedGenre)) return false
      }

      return true
    })

    // 4. Sorting
    if (sortBy === 'rating') {
      result = [...result].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    } else if (sortBy === 'newest') {
      result = [...result].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    } else if (sortBy === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    } else {
      // 'popularity': maintains top catalog ranking order
    }

    return result
  }, [movies, query, selectedTab, selectedGenre, sortBy])

  // If initial load with empty cache, display high-fidelity skeleton
  if (loading && movies.length === 0) {
    return <MoviesSkeleton />
  }

  const isDefaultView = !query && selectedGenre === 'All' && selectedTab === 'all' && sortBy === 'popularity'

  return (
    <section className="movies-view" aria-label="Anime Movies Catalogue">
      {/* ─── A. Compact Page Introduction ─── */}
      <header className="movies-intro glass-elevated">
        <div className="movies-intro__content">
          <div className="movies-intro__badge-row">
            <span className="movies-intro__badge">
              <Film size={13} className="text-cyan-400" />
              <span>Featured Collection</span>
            </span>
            <span className="movies-intro__tag">
              <Sparkles size={12} className="text-amber-400" />
              <span>Cinema Experience</span>
            </span>
          </div>
          <h1 className="movies-intro__title">Anime Movies & Films</h1>
          <p className="movies-intro__subtitle">
            Experience cinematic storytelling with feature-length anime films, theatrical blockbusters,
            and award-winning masterpieces.
          </p>
        </div>

        <div className="movies-intro__stat-box">
          <span className="movies-intro__stat-label">Available Films</span>
          <strong className="movies-intro__stat-value">{movies.length}</strong>
        </div>
      </header>

      {/* ─── B. Cinematic Featured Movie Hero Carousel ─── */}
      {movies.length > 0 && (
        <MoviesHeroCarousel
          movies={movies}
          isSaved={isSaved}
          onToggleSave={onToggleSave}
          onSelectAnime={onSelectAnime}
          onPlayAnime={onPlayAnime}
        />
      )}

      {/* ─── D. Movie Discovery Navigation Toolbar ─── */}
      <div className="movies-toolbar glass">
        {/* Category Tabs */}
        <div className="movies-tabs" role="tablist" aria-label="Movie collections">
          <button
            type="button"
            role="tab"
            aria-selected={selectedTab === 'all'}
            className={`movies-tab ${selectedTab === 'all' ? 'movies-tab--active' : ''}`}
            onClick={() => setSelectedTab('all')}
          >
            <span>All Movies</span>
            <span className="movies-tab__count">{movies.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={selectedTab === 'popular'}
            className={`movies-tab ${selectedTab === 'popular' ? 'movies-tab--active' : ''}`}
            onClick={() => setSelectedTab('popular')}
          >
            <span className="movies-tab__dot movies-tab__dot--cyan" />
            <span>Popular</span>
            <span className="movies-tab__count">{popularMovies.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={selectedTab === 'top_rated'}
            className={`movies-tab ${selectedTab === 'top_rated' ? 'movies-tab--active' : ''}`}
            onClick={() => setSelectedTab('top_rated')}
          >
            <span className="movies-tab__dot movies-tab__dot--gold" />
            <span>Top Rated (8.0+)</span>
            <span className="movies-tab__count">{topRatedMovies.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={selectedTab === 'ghibli'}
            className={`movies-tab ${selectedTab === 'ghibli' ? 'movies-tab--active' : ''}`}
            onClick={() => setSelectedTab('ghibli')}
          >
            <span className="movies-tab__dot movies-tab__dot--emerald" />
            <span>Studio Ghibli</span>
            <span className="movies-tab__count">{ghibliMovies.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={selectedTab === 'newest'}
            className={`movies-tab ${selectedTab === 'newest' ? 'movies-tab--active' : ''}`}
            onClick={() => setSelectedTab('newest')}
          >
            <span className="movies-tab__dot movies-tab__dot--violet" />
            <span>Recent Releases</span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="movies-toolbar__controls">
          <div className="movies-search-box">
            <Search size={15} className="movies-search-box__icon text-cyan-400" />
            <input
              type="text"
              className="movies-search-box__input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setQuery('')}
              placeholder="Search anime movies..."
              aria-label="Search anime movies"
            />
            {query && (
              <button
                type="button"
                className="movies-search-box__clear"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="movies-sort-box">
            <SlidersHorizontal size={14} className="text-gray-400" />
            <select
              className="movies-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as MovieSortOption)}
              aria-label="Sort anime movies"
            >
              <option value="popularity">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Latest Release</option>
              <option value="title">Title (A → Z)</option>
            </select>
          </div>
        </div>

        {/* Genre Filter Strip */}
        <div className="movies-genres-strip" role="tablist" aria-label="Filter movies by genre">
          {GENRES.map(g => (
            <button
              key={g}
              type="button"
              className={`movies-genre-pill ${selectedGenre === g ? 'movies-genre-pill--active' : ''}`}
              onClick={() => setSelectedGenre(g)}
              aria-pressed={selectedGenre === g}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Active Filter Feedback Ribbon ─── */}
      {(query || selectedGenre !== 'All' || selectedTab !== 'all' || sortBy !== 'popularity') && (
        <div className="movies-filter-status">
          <span>
            Showing <strong>{filteredMovies.length}</strong> of <strong>{movies.length}</strong> films
            {selectedGenre !== 'All' && (
              <> in <strong>{selectedGenre}</strong></>
            )}
            {query && (
              <> matching &ldquo;<strong>{query}</strong>&rdquo;</>
            )}
            {selectedTab !== 'all' && (
              <> in <strong>{selectedTab === 'ghibli' ? 'Studio Ghibli' : selectedTab === 'top_rated' ? 'Top Rated' : selectedTab}</strong></>
            )}
          </span>
          <button
            type="button"
            className="movies-filter-reset-btn"
            onClick={() => {
              setQuery('')
              setSelectedGenre('All')
              setSelectedTab('all')
              setSortBy('popularity')
            }}
          >
            Reset all filters
          </button>
        </div>
      )}

      {/* ─── E. Curated Discovery Sections (When in Default Browse Mode) ─── */}
      {isDefaultView && (
        <>
          {/* Rail 1: Top Rated Masterpieces */}
          {masterpieceMovies.length > 0 && (
            <section className="movies-section" aria-label="Top Rated Masterpieces">
              <div className="movies-section__header">
                <div className="movies-section__title-group">
                  <Star size={16} className="text-amber-400" />
                  <h2 className="movies-section__title">Top Rated Masterpieces</h2>
                  <span className="movies-section__tag">8.4+ Rating</span>
                </div>
                <button
                  type="button"
                  className="movies-section__link"
                  onClick={() => setSelectedTab('top_rated')}
                >
                  View Top Rated ({topRatedMovies.length})
                </button>
              </div>
              <div className="movies-grid">
                {masterpieceMovies.slice(0, 6).map(movie => (
                  <MovieCard
                    key={`top-${movie.id}`}
                    movie={movie}
                    isSaved={isSaved?.(movie.id)}
                    onToggleSave={onToggleSave}
                    onSelect={onSelectAnime}
                    onPlay={onPlayAnime}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Rail 2: Studio Ghibli Collection */}
          {ghibliMovies.length > 0 && (
            <section className="movies-section" aria-label="Studio Ghibli Collection">
              <div className="movies-section__header">
                <div className="movies-section__title-group">
                  <Sparkles size={16} className="text-cyan-400" />
                  <h2 className="movies-section__title">Studio Ghibli Classics</h2>
                  <span className="movies-section__tag">Legendary Animation</span>
                </div>
                <button
                  type="button"
                  className="movies-section__link"
                  onClick={() => setSelectedTab('ghibli')}
                >
                  View Collection ({ghibliMovies.length})
                </button>
              </div>
              <div className="movies-grid">
                {ghibliMovies.slice(0, 6).map(movie => (
                  <MovieCard
                    key={`ghibli-${movie.id}`}
                    movie={movie}
                    isSaved={isSaved?.(movie.id)}
                    onToggleSave={onToggleSave}
                    onSelect={onSelectAnime}
                    onPlay={onPlayAnime}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Rail 3: Complete Catalog Heading */}
          <div className="movies-section__header" style={{ marginTop: '1rem' }}>
            <div className="movies-section__title-group">
              <Film size={16} className="text-cyan-400" />
              <h2 className="movies-section__title">All Anime Movies</h2>
            </div>
            <span className="movies-section__count">{filteredMovies.length} Titles</span>
          </div>
        </>
      )}

      {/* ─── E. Full Movie Grid ─── */}
      {filteredMovies.length > 0 ? (
        <div className="movies-grid" role="region" aria-label="Anime movies collection">
          {filteredMovies.map(movie => (
            <MovieCard
              key={movie.id}
              movie={movie}
              isSaved={isSaved?.(movie.id)}
              onToggleSave={onToggleSave}
              onSelect={onSelectAnime}
              onPlay={onPlayAnime}
            />
          ))}
        </div>
      ) : (
        <div className="movies-empty glass">
          <div className="movies-empty__icon-wrap">
            <Film size={32} className="text-cyan-400" />
          </div>
          <h2 className="movies-empty__title">No Movies Found</h2>
          <p className="movies-empty__desc">
            {query
              ? `No films matched your search for "${query}". Try adjusting keywords or clearing genre filters.`
              : 'No anime movies match the selected filters. Explore all available movies.'}
          </p>
          <button
            type="button"
            className="movies-btn movies-btn--primary"
            onClick={() => {
              setQuery('')
              setSelectedGenre('All')
              setSelectedTab('all')
              setSortBy('popularity')
            }}
          >
            <Compass size={16} />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}
    </section>
  )
}
