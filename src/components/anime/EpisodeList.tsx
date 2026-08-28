import {
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
  Search,
  SkipForward,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { Episode } from '../../types/domain'

import { Badge } from '../ui/Badge'

import './episodes.css'

const EPISODES_PER_PAGE = 100

export function EpisodeList({
  episodes = [],
  onPlayEpisode,
}: {
  episodes?: Episode[]
  onPlayEpisode: (episode: Episode) => void
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')

  /*
   * Always keep the list sorted by episode number.
   */
  const sortedEpisodes = useMemo(
    () =>
      [...episodes].sort(
        (a, b) => a.number - b.number,
      ),
    [episodes],
  )

  /*
   * Search only affects the currently loaded catalogue.
   */
  const filteredEpisodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return sortedEpisodes
    }

    return sortedEpisodes.filter(
      episode =>
        String(episode.number).includes(query) ||
        episode.title.toLowerCase().includes(query),
    )
  }, [sortedEpisodes, searchQuery])

  const totalEpisodes = filteredEpisodes.length

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalEpisodes / EPISODES_PER_PAGE,
    ),
  )

  /*
   * Keep page valid after search.
   */
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const startIndex =
    (currentPage - 1) * EPISODES_PER_PAGE

  const visibleEpisodes = filteredEpisodes.slice(
    startIndex,
    startIndex + EPISODES_PER_PAGE,
  )

  const firstEpisodeNumber =
    visibleEpisodes[0]?.number

  const lastEpisodeNumber =
    visibleEpisodes[
      visibleEpisodes.length - 1
    ]?.number

  /*
   * Page navigation.
   */
  const goToPage = (page: number) => {
    const safePage = Math.min(
      Math.max(page, 1),
      totalPages,
    )

    setCurrentPage(safePage)

    window.requestAnimationFrame(() => {
      document
        .querySelector('.episode-section')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
    })
  }

  /*
   * Search resets to first page.
   */
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  /*
   * Clear search.
   */
  const clearSearch = () => {
    setSearchQuery('')
    setCurrentPage(1)
  }

  /*
   * Jump to latest episode.
   */
  const goToLatest = () => {
    setSearchQuery('')
    setCurrentPage(totalPages)

    window.requestAnimationFrame(() => {
      document
        .querySelector('.episode-section')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
    })
  }

  /*
   * Empty state.
   */
  if (sortedEpisodes.length === 0) {
    return (
      <section
        className="episode-section glass"
        aria-label="Episodes"
      >
        <div className="episode-empty">
          <div className="episode-empty__icon">
            <Play size={22} />
          </div>

          <h2>Episodes unavailable</h2>

          <p>
            Episode information could not be
            loaded for this anime yet.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      className="episode-section glass"
      aria-label="Episodes"
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="episode-section__header">
        <div>
          <span className="episode-section__eyebrow">
            WATCH EPISODES
          </span>

          <h2>
            Episodes ({sortedEpisodes.length})
          </h2>

          {firstEpisodeNumber &&
            lastEpisodeNumber ? (
            <p>
              Showing EP {firstEpisodeNumber} –{' '}
              {lastEpisodeNumber}
            </p>
          ) : null}
        </div>

        <div className="episode-section__header-actions">
          {totalPages > 1 && (
            <button
              type="button"
              className="episode-latest-button"
              onClick={goToLatest}
            >
              <SkipForward size={15} />
              Latest
            </button>
          )}
        </div>
      </div>

      {/* =====================================================
          CONTROLS
      ====================================================== */}

      <div className="episode-controls">
        <div className="episode-search">
          <Search
            size={17}
            aria-hidden="true"
          />

          <input
            type="search"
            value={searchQuery}
            onChange={event =>
              handleSearch(
                event.target.value,
              )
            }
            placeholder="Search episodes..."
            aria-label="Search episodes"
          />

          {searchQuery && (
            <button
              type="button"
              className="episode-search__clear"
              onClick={clearSearch}
              aria-label="Clear episode search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="episode-count">
          {searchQuery
            ? `${totalEpisodes} result${totalEpisodes === 1
              ? ''
              : 's'
            }`
            : `${sortedEpisodes.length} episodes`}
        </div>
      </div>

      {/* =====================================================
          EPISODE GRID
      ====================================================== */}

      {visibleEpisodes.length > 0 ? (
        <div className="episode-grid">
          {visibleEpisodes.map(episode => (
            <article
              key={episode.id}
              className="episode-card"
              onClick={() =>
                onPlayEpisode(episode)
              }
              tabIndex={0}
              role="button"
              onKeyDown={event => {
                if (
                  event.key === 'Enter' ||
                  event.key === ' '
                ) {
                  event.preventDefault()

                  onPlayEpisode(episode)
                }
              }}
              aria-label={`Play episode ${episode.number}: ${episode.title}`}
            >
              <div className="episode-card__thumb">
                {episode.thumbnail ? (
                  <img
                    src={episode.thumbnail}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className="episode-card__placeholder">
                    <Play size={28} />
                  </div>
                )}

                <div className="episode-card__overlay">
                  <div className="episode-card__play">
                    <Play
                      size={20}
                      fill="currentColor"
                    />
                  </div>
                </div>

                {episode.watched && (
                  <div className="episode-card__badge">
                    <Badge tone="success">
                      <Check size={12} />
                      Watched
                    </Badge>
                  </div>
                )}

                {episode.filler && (
                  <div className="episode-card__filler">
                    Filler
                  </div>
                )}

                {episode.recap && (
                  <div className="episode-card__recap">
                    Recap
                  </div>
                )}
              </div>

              <div className="episode-card__info">
                <div className="episode-card__number">
                  EP {episode.number}
                </div>

                <h3 className="episode-card__title">
                  {episode.title ||
                    `Episode ${episode.number}`}
                </h3>

                {/* IMPORTANT:
                    No fake 24-minute fallback.
                 */}
                <span className="episode-card__meta">
                  {episode.duration
                    ? `${episode.duration} minutes`
                    : 'Duration unavailable'}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="episode-search-empty">
          <Search size={24} />

          <h3>No episodes found</h3>

          <p>
            Try another episode number or
            title.
          </p>

          <button
            type="button"
            onClick={clearSearch}
          >
            Clear search
          </button>
        </div>
      )}

      {/* =====================================================
          PAGINATION
      ====================================================== */}

      {totalPages > 1 && (
        <div className="episode-pagination">
          <button
            type="button"
            className="episode-page-arrow"
            onClick={() =>
              goToPage(currentPage - 1)
            }
            disabled={currentPage === 1}
            aria-label="Previous episode page"
          >
            <ChevronLeft size={18} />

            <span>Previous</span>
          </button>

          <div className="episode-page-list">
            {buildPageNumbers(
              currentPage,
              totalPages,
            ).map(item =>
              item === 'ellipsis' ? (
                <span
                  key={`ellipsis-${Math.random()}`}
                  className="episode-page-ellipsis"
                >
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={item}
                  className={`episode-page-button ${item === currentPage
                      ? 'is-active'
                      : ''
                    }`}
                  onClick={() =>
                    goToPage(item)
                  }
                  aria-label={`Episode page ${item}`}
                  aria-current={
                    item === currentPage
                      ? 'page'
                      : undefined
                  }
                >
                  {item}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            className="episode-page-arrow"
            onClick={() =>
              goToPage(currentPage + 1)
            }
            disabled={
              currentPage === totalPages
            }
            aria-label="Next episode page"
          >
            <span>Next</span>

            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <div className="episode-pagination-summary">
        Page{' '}
        <strong>{currentPage}</strong>{' '}
        of{' '}
        <strong>{totalPages}</strong>
      </div>
    </section>
  )
}

/* =========================================================
   PAGE NUMBER BUILDER
========================================================= */

function buildPageNumbers(
  currentPage: number,
  totalPages: number,
): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from(
      {
        length: totalPages,
      },
      (_, index) => index + 1,
    )
  }

  const pages: Array<
    number | 'ellipsis'
  > = []

  pages.push(1)

  if (currentPage > 4) {
    pages.push('ellipsis')
  }

  const start = Math.max(
    2,
    currentPage - 1,
  )

  const end = Math.min(
    totalPages - 1,
    currentPage + 1,
  )

  for (
    let page = start;
    page <= end;
    page += 1
  ) {
    pages.push(page)
  }

  if (
    currentPage <
    totalPages - 3
  ) {
    pages.push('ellipsis')
  }

  pages.push(totalPages)

  return pages
}