import {
    Clock3,
    Search,
    Sparkles,
    Star,
    X,
} from 'lucide-react'
import {
    useEffect,
    useState,
} from 'react'
import type { Anime } from '../../types/domain'
import { searchAnime } from '../../services/anilist'
import { Modal } from '../ui/Overlay'
import './search.css'

type SearchOverlayProps = {
    open: boolean
    onClose: () => void
    onSelectAnime?: (anime: Anime) => void
}

const trendingSearches = [
    'One Piece',
    'Naruto',
    'Bleach',
    'Attack on Titan',
]

export function SearchOverlay({
    open,
    onClose,
    onSelectAnime,
}: SearchOverlayProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] =
        useState<Anime[]>([])
    const [loading, setLoading] =
        useState(false)
    const [error, setError] =
        useState<string | null>(null)

    /*
     * Reset search whenever the overlay closes.
     */
    useEffect(() => {
        if (!open) {
            setQuery('')
            setResults([])
            setLoading(false)
            setError(null)
        }
    }, [open])

    /*
     * Keyboard shortcuts:
     * Escape = close
     * / = focus search input
     */
    useEffect(() => {
        if (!open) return

        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            if (event.key === 'Escape') {
                onClose()
                return
            }

            if (
                event.key === '/' &&
                document.activeElement?.tagName !==
                'INPUT'
            ) {
                event.preventDefault()

                document
                    .getElementById(
                        'anime-search-input',
                    )
                    ?.focus()
            }
        }

        window.addEventListener(
            'keydown',
            handleKeyDown,
        )

        return () => {
            window.removeEventListener(
                'keydown',
                handleKeyDown,
            )
        }
    }, [open, onClose])

    /*
     * Real AniList search.
     *
     * Debounce prevents an API request for
     * every single character typed.
     */
    useEffect(() => {
        const normalizedQuery =
            query.trim()

        if (!normalizedQuery) {
            setResults([])
            setLoading(false)
            setError(null)
            return
        }

        let cancelled = false

        const timer = window.setTimeout(
            async () => {
                setLoading(true)
                setError(null)

                try {
                    const anime =
                        await searchAnime(
                            normalizedQuery,
                            1,
                            12,
                        )

                    if (cancelled) return

                    setResults(anime)
                } catch (requestError) {
                    if (cancelled) return

                    console.error(
                        'AniList search failed:',
                        requestError,
                    )

                    setResults([])

                    setError(
                        'Unable to search AniList right now. Please try again.',
                    )
                } finally {
                    if (!cancelled) {
                        setLoading(false)
                    }
                }
            },
            350,
        )

        return () => {
            cancelled = true
            window.clearTimeout(timer)
        }
    }, [query])

    const hasQuery =
        query.trim().length > 0

    const handleSelect = (
        anime: Anime,
    ) => {
        if (onSelectAnime) {
            onSelectAnime(anime)
        }

        onClose()
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title=""
        >
            <div className="search-overlay">

                {/* =====================================================
            HEADER
        ====================================================== */}

                <div className="search-overlay__header">
                    <div>
                        <div className="search-overlay__eyebrow">
                            <Sparkles size={14} />
                            <span>7ANIME SEARCH</span>
                        </div>

                        <h2>
                            Find your next anime
                        </h2>

                        <p>
                            Search the AniList catalog
                            for titles, genres and more.
                        </p>
                    </div>
                </div>

                {/* =====================================================
            SEARCH INPUT
        ====================================================== */}

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
                            setQuery(
                                event.target.value,
                            )
                        }
                        placeholder="Search anime..."
                        aria-label="Search anime"
                        autoComplete="off"
                    />

                    {query ? (
                        <button
                            type="button"
                            className="search-input-clear"
                            onClick={() =>
                                setQuery('')
                            }
                            aria-label="Clear search"
                        >
                            <X size={15} />
                        </button>
                    ) : (
                        <kbd>/</kbd>
                    )}
                </div>

                {/* =====================================================
            DISCOVERY STATE
        ====================================================== */}

                {!hasQuery ? (
                    <div className="search-discovery">

                        <div className="search-section-heading">
                            <div>
                                <span>
                                    DISCOVER
                                </span>

                                <h3>
                                    Popular searches
                                </h3>
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
                                            {String(
                                                index + 1,
                                            ).padStart(
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
                                Start typing to search
                                the AniList catalog
                            </span>
                        </div>
                    </div>

                ) : loading ? (

                    /* =====================================================
                       LOADING
                    ====================================================== */

                    <div className="search-empty">
                        <div className="search-empty__icon">
                            <Search size={26} />
                        </div>

                        <h3>
                            Searching AniList...
                        </h3>

                        <p>
                            Looking for anime matching
                            <strong>
                                {' '}
                                "{query.trim()}"
                            </strong>
                        </p>
                    </div>

                ) : error ? (

                    /* =====================================================
                       ERROR
                    ====================================================== */

                    <div className="search-empty">
                        <div className="search-empty__icon">
                            <X size={26} />
                        </div>

                        <h3>
                            Search unavailable
                        </h3>

                        <p>
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                setQuery(
                                    current =>
                                        current + ' ',
                                )
                            }
                        >
                            Try again
                        </button>
                    </div>

                ) : results.length > 0 ? (

                    /* =====================================================
                       RESULTS
                    ====================================================== */

                    <div className="search-results">

                        <div className="search-section-heading">
                            <div>
                                <span>
                                    ANILIST RESULTS
                                </span>

                                <h3>
                                    {results.length}{' '}
                                    anime found
                                </h3>
                            </div>
                        </div>

                        <div className="search-results__list">
                            {results.map(
                                anime => (
                                    <button
                                        type="button"
                                        key={anime.id}
                                        className="search-result-card"
                                        onClick={() =>
                                            handleSelect(
                                                anime,
                                            )
                                        }
                                    >

                                        <div className="search-result-card__poster">
                                            {anime.poster ? (
                                                <img
                                                    src={
                                                        anime.poster
                                                    }
                                                    alt={
                                                        anime.title
                                                    }
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div
                                                    aria-hidden="true"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                    }}
                                                />
                                            )}
                                        </div>

                                        <div className="search-result-card__content">

                                            <h4>
                                                {anime.title}
                                            </h4>

                                            <div className="search-result-card__meta">

                                                {anime.type && (
                                                    <span>
                                                        {anime.type}
                                                    </span>
                                                )}

                                                {anime.year && (
                                                    <span>
                                                        {anime.year}
                                                    </span>
                                                )}

                                                {anime.rating !==
                                                    undefined && (
                                                        <span className="search-result-card__rating">
                                                            <Star
                                                                size={13}
                                                                fill="currentColor"
                                                            />
                                                            {anime.rating.toFixed(
                                                                1,
                                                            )}
                                                        </span>
                                                    )}

                                            </div>

                                            {anime.genres &&
                                                anime.genres.length >
                                                0 && (
                                                    <div className="search-result-card__genres">
                                                        {anime.genres
                                                            .slice(
                                                                0,
                                                                3,
                                                            )
                                                            .map(
                                                                genre => (
                                                                    <span
                                                                        key={
                                                                            genre
                                                                        }
                                                                    >
                                                                        {
                                                                            genre
                                                                        }
                                                                    </span>
                                                                ),
                                                            )}
                                                    </div>
                                                )}

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

                    /* =====================================================
                       EMPTY
                    ====================================================== */

                    <div className="search-empty">

                        <div className="search-empty__icon">
                            <Search size={26} />
                        </div>

                        <h3>
                            No anime found
                        </h3>

                        <p>
                            We couldn't find anything
                            matching
                            <strong>
                                {' '}
                                "{query.trim()}"
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