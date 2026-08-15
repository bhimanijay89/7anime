import {
    Clock3,
    Search,
    Sparkles,
    Star,
    X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Overlay'
import './search.css'

type SearchOverlayProps = {
    open: boolean
    onClose: () => void
}

const trendingSearches = [
    'Neon Ronin',
    'Velvet Horizon',
    'Ashes of Astra',
    'The Ninth Bloom',
]

const mockResults = [
    {
        title: 'Neon Ronin',
        type: 'TV',
        year: '2026',
        rating: '8.8',
        genres: ['Action', 'Sci-Fi'],
        image:
            'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=400&q=80',
    },
    {
        title: 'Velvet Horizon',
        type: 'TV',
        year: '2025',
        rating: '8.9',
        genres: ['Sci-Fi', 'Mystery'],
        image:
            'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=400&q=80',
    },
    {
        title: 'Ashes of Astra',
        type: 'TV',
        year: '2026',
        rating: '8.6',
        genres: ['Fantasy', 'Drama'],
        image:
            'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80',
    },
    {
        title: 'The Ninth Bloom',
        type: 'TV',
        year: '2026',
        rating: '8.4',
        genres: ['Fantasy', 'Adventure'],
        image:
            'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=400&q=80',
    },
]

export function SearchOverlay({
    open,
    onClose,
}: SearchOverlayProps) {
    const [query, setQuery] = useState('')

    useEffect(() => {
        if (!open) {
            setQuery('')
            return
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
                return
            }

            if (
                event.key === '/' &&
                document.activeElement?.tagName !== 'INPUT'
            ) {
                event.preventDefault()
                document
                    .getElementById('anime-search-input')
                    ?.focus()
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [open, onClose])

    const filteredResults = useMemo(() => {
        const value = query.trim().toLowerCase()

        if (!value) {
            return []
        }

        return mockResults.filter(anime => {
            const searchableText = [
                anime.title,
                anime.type,
                anime.year,
                ...anime.genres,
            ]
                .join(' ')
                .toLowerCase()

            return searchableText.includes(value)
        })
    }, [query])

    const hasQuery = query.trim().length > 0

    return (
        <Modal
            open={open}
            onClose={onClose}
            title=""
        >
            <div className="search-overlay">

                {/* Header */}
                <div className="search-overlay__header">
                    <div>
                        <div className="search-overlay__eyebrow">
                            <Sparkles size={14} />
                            <span>7ANIME SEARCH</span>
                        </div>

                        <h2>Find your next anime</h2>

                        <p>
                            Search titles, genres, years and more.
                        </p>
                    </div>
                </div>

                {/* Search input */}
                <div className="search-input-wrapper">
                    <Search
                        size={20}
                        aria-hidden="true"
                    />

                    <input
                        id="anime-search-input"
                        autoFocus
                        value={query}
                        onChange={event =>
                            setQuery(event.target.value)
                        }
                        placeholder="Search anime..."
                        aria-label="Search anime"
                        autoComplete="off"
                    />

                    {query ? (
                        <button
                            type="button"
                            className="search-input-clear"
                            onClick={() => setQuery('')}
                            aria-label="Clear search"
                        >
                            <X size={15} />
                        </button>
                    ) : (
                        <kbd>/</kbd>
                    )}
                </div>

                {/* Search content */}
                {!hasQuery ? (
                    <div className="search-discovery">

                        <div className="search-section-heading">
                            <div>
                                <span>DISCOVER</span>
                                <h3>Popular searches</h3>
                            </div>
                        </div>

                        <div className="search-trending">
                            {trendingSearches.map(
                                (title, index) => (
                                    <button
                                        type="button"
                                        key={title}
                                        className="search-trending__item"
                                        onClick={() =>
                                            setQuery(title)
                                        }
                                    >
                                        <span className="search-trending__number">
                                            {String(index + 1).padStart(
                                                2,
                                                '0',
                                            )}
                                        </span>

                                        <span className="search-trending__title">
                                            {title}
                                        </span>

                                        <Search size={15} />
                                    </button>
                                ),
                            )}
                        </div>

                        <div className="search-hint">
                            <Clock3 size={15} />

                            <span>
                                Start typing to search the
                                7anime catalog
                            </span>
                        </div>
                    </div>

                ) : filteredResults.length > 0 ? (

                    <div className="search-results">

                        <div className="search-section-heading">
                            <div>
                                <span>RESULTS</span>

                                <h3>
                                    {filteredResults.length}{' '}
                                    anime found
                                </h3>
                            </div>
                        </div>

                        <div className="search-results__list">
                            {filteredResults.map(
                                anime => (
                                    <button
                                        type="button"
                                        key={anime.title}
                                        className="search-result-card"
                                        onClick={onClose}
                                    >
                                        <div className="search-result-card__poster">
                                            <img
                                                src={anime.image}
                                                alt={anime.title}
                                            />
                                        </div>

                                        <div className="search-result-card__content">
                                            <h4>
                                                {anime.title}
                                            </h4>

                                            <div className="search-result-card__meta">
                                                <span>
                                                    {anime.type}
                                                </span>

                                                <span>
                                                    {anime.year}
                                                </span>

                                                <span className="search-result-card__rating">
                                                    <Star
                                                        size={13}
                                                        fill="currentColor"
                                                    />
                                                    {anime.rating}
                                                </span>
                                            </div>

                                            <div className="search-result-card__genres">
                                                {anime.genres.map(
                                                    genre => (
                                                        <span
                                                            key={genre}
                                                        >
                                                            {genre}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        </div>

                                        <Search
                                            className="search-result-card__arrow"
                                            size={17}
                                        />
                                    </button>
                                ),
                            )}
                        </div>
                    </div>

                ) : (

                    <div className="search-empty">
                        <div className="search-empty__icon">
                            <Search size={26} />
                        </div>

                        <h3>No anime found</h3>

                        <p>
                            We couldn't find anything
                            matching
                            <strong>
                                {' '}
                                "{query}"
                            </strong>
                            .
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                setQuery('')
                            }
                        >
                            Browse popular searches
                        </button>
                    </div>
                )}

            </div>
        </Modal>
    )
}