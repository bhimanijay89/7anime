import React, { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Film,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
} from 'lucide-react'
import type { Anime } from '../../types/domain'
import { getAnimeMovies, getCachedAnimeMoviesSync } from '../../services/anilist'
import { AnimeCard } from '../anime/AnimeCard'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/Feedback'
import { MoviesSkeleton } from './MoviesSkeleton'
import { cleanSynopsis } from '../carousel/CinematicCarousel'
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
  'Action',
  'Adventure',
  'Drama',
  'Fantasy',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Supernatural',
]

type SortOption = 'popularity' | 'rating' | 'newest'

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

  const [query, setQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [sortBy, setSortBy] = useState<SortOption>('popularity')

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

  // Filter and sort movies
  const filteredMovies = useMemo(() => {
    let result = movies.filter(m => {
      const matchesQuery =
        !query.trim() ||
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        (m.synopsis && m.synopsis.toLowerCase().includes(query.toLowerCase()))

      const matchesGenre =
        selectedGenre === 'All' ||
        (m.genres && m.genres.includes(selectedGenre))

      return matchesQuery && matchesGenre
    })

    if (sortBy === 'rating') {
      result = [...result].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    } else if (sortBy === 'newest') {
      result = [...result].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    }

    return result
  }, [movies, query, selectedGenre, sortBy])

  // Top featured spotlight movie
  const spotlightMovie = useMemo(() => {
    if (filteredMovies.length === 0) return null
    return (
      filteredMovies.find(m => m.cover && (m.rating ?? 0) >= 8.0) ||
      filteredMovies[0]
    )
  }, [filteredMovies])

  const spotlightSaved = spotlightMovie ? isSaved?.(spotlightMovie.id) : false

  // If initial load with empty cache, display high-fidelity skeleton
  if (loading && movies.length === 0) {
    return <MoviesSkeleton />
  }

  return (
    <section className="movies-view" aria-label="Anime Movies Catalogue">
      {/* Header Banner */}
      <header className="movies-view__header glass">
        <div className="movies-view__header-info">
          <p className="eyebrow">
            <Film size={16} /> Feature Presentations
          </p>
          <h1>Anime Movies & Films</h1>
          <p>
            Experience cinematic storytelling with feature-length anime films,
            theatrical blockbusters, and award-winning animated masterpieces.
          </p>
        </div>
        <div className="movies-view__header-stat">
          <strong>{filteredMovies.length}</strong>
          <span>Films Available</span>
        </div>
      </header>

      {/* Spotlight Feature (if available) */}
      {spotlightMovie && (
        <div
          className="movies-spotlight"
          style={{
            backgroundImage: `url(${spotlightMovie.cover || spotlightMovie.banner || spotlightMovie.poster})`,
          }}
        >
          <div className="movies-spotlight__overlay" />
          <div className="movies-spotlight__content">
            <div className="movies-spotlight__poster">
              <img
                src={spotlightMovie.poster}
                alt={spotlightMovie.title}
                loading="eager"
              />
            </div>
            <div className="movies-spotlight__details">
              <div className="movies-spotlight__badges">
                <Badge tone="accent">Featured Film</Badge>
                {spotlightMovie.year && (
                  <Badge tone="neutral">{spotlightMovie.year}</Badge>
                )}
                {spotlightMovie.duration && (
                  <Badge tone="neutral">{spotlightMovie.duration}</Badge>
                )}
              </div>
              <h2>{spotlightMovie.title}</h2>
              <div className="movies-spotlight__meta">
                {spotlightMovie.rating && (
                  <span className="movies-spotlight__rating">
                    <Star size={15} fill="#ffd77e" color="#ffd77e" />{' '}
                    {spotlightMovie.rating} Rating
                  </span>
                )}
                {spotlightMovie.genres && spotlightMovie.genres.length > 0 && (
                  <span className="movies-spotlight__genres">
                    {spotlightMovie.genres.slice(0, 3).join(' • ')}
                  </span>
                )}
              </div>
              {spotlightMovie.synopsis && (
                <p className="movies-spotlight__synopsis">
                  {cleanSynopsis(spotlightMovie.synopsis)}
                </p>
              )}
              <div className="movies-spotlight__actions">
                <Button
                  variant="primary"
                  onClick={() =>
                    onPlayAnime
                      ? onPlayAnime(spotlightMovie)
                      : onSelectAnime(spotlightMovie)
                  }
                >
                  <Play size={16} fill="currentColor" /> Watch Movie
                </Button>
                <Button
                  variant={spotlightSaved ? 'success' : 'glass'}
                  onClick={() => onToggleSave?.(spotlightMovie)}
                >
                  {spotlightSaved ? <Check size={16} /> : <Plus size={16} />}
                  {spotlightSaved ? 'In My List' : 'Add to List'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="movies-toolbar glass">
        <div className="movies-toolbar__top">
          <label className="movies-toolbar__search">
            <Search size={16} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search movie titles..."
              aria-label="Search anime movies"
            />
          </label>

          <div className="movies-toolbar__sort">
            <SlidersHorizontal size={15} />
            <label htmlFor="movies-sort-select">Sort by:</label>
            <select
              id="movies-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
            >
              <option value="popularity">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Latest Release</option>
            </select>
          </div>
        </div>

        {/* Genre Pills */}
        <div className="movies-toolbar__genres" role="tablist" aria-label="Filter movies by genre">
          {GENRES.map(g => (
            <button
              key={g}
              type="button"
              className={selectedGenre === g ? 'active' : ''}
              onClick={() => setSelectedGenre(g)}
              aria-pressed={selectedGenre === g}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="movies-summary">
        <span>
          Showing {filteredMovies.length}{' '}
          {filteredMovies.length === 1 ? 'movie' : 'movies'}
          {selectedGenre !== 'All' ? ` in ${selectedGenre}` : ''}
          {query ? ` matching "${query}"` : ''}
        </span>
        {(query || selectedGenre !== 'All' || sortBy !== 'popularity') && (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery('')
              setSelectedGenre('All')
              setSortBy('popularity')
            }}
          >
            Reset filters
          </Button>
        )}
      </div>

      {/* Movie Grid */}
      {filteredMovies.length > 0 ? (
        <div className="movies-grid">
          {filteredMovies.map(movie => (
            <AnimeCard
              key={movie.id}
              anime={movie}
              isSaved={isSaved?.(movie.id)}
              onToggleSave={onToggleSave}
              onSelect={onSelectAnime}
              onPlay={onPlayAnime}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No movies found"
          description={
            loading
              ? 'Loading anime movies...'
              : 'No films match your search criteria. Try a different keyword or genre.'
          }
          action={
            <Button
              onClick={() => {
                setQuery('')
                setSelectedGenre('All')
                setSortBy('popularity')
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
    </section>
  )
}
