import { Check, Play, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
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
  const [activeRangeIndex, setActiveRangeIndex] = useState(0)

  const RANGE_SIZE = 100

  /*
   * ---------------------------------------------------------
   * Episode duration formatter
   * ---------------------------------------------------------
   *
   * Supports values such as:
   *   85
   *   "85"
   *   "85m"
   *   "1h 25m"
   *   "01:25:00"
   *   "25:00"
   *
   * We intentionally DO NOT use a fake "24m" fallback.
   */
  const formatDuration = (duration: unknown): string | null => {
    if (duration === null || duration === undefined) {
      return null
    }

    if (typeof duration === 'number') {
      if (!Number.isFinite(duration) || duration <= 0) {
        return null
      }

      return `${Math.round(duration)}m`
    }

    if (typeof duration !== 'string') {
      return null
    }

    const value = duration.trim()

    if (!value) {
      return null
    }

    /*
     * Already formatted duration:
     * "1h 25m", "85m", "24 min", etc.
     */
    if (/[a-zA-Z]/.test(value)) {
      return value
    }

    /*
     * HH:MM:SS
     */
    const hmsMatch = value.match(
      /^(\d{1,2}):(\d{2}):(\d{2})$/
    )

    if (hmsMatch) {
      const hours = Number(hmsMatch[1])
      const minutes = Number(hmsMatch[2])

      if (hours > 0) {
        return `${hours}h ${minutes}m`
      }

      return `${minutes}m`
    }

    /*
     * MM:SS
     */
    const msMatch = value.match(
      /^(\d{1,3}):(\d{2})$/
    )

    if (msMatch) {
      const minutes = Number(msMatch[1])

      if (Number.isFinite(minutes) && minutes > 0) {
        return `${minutes}m`
      }
    }

    /*
     * Plain numeric string.
     */
    const numericValue = Number(value)

    if (
      Number.isFinite(numericValue) &&
      numericValue > 0
    ) {
      return `${Math.round(numericValue)}m`
    }

    return value
  }

  /*
   * ---------------------------------------------------------
   * Episode ranges
   * ---------------------------------------------------------
   */
  const ranges = useMemo(() => {
    if (episodes.length <= 50) {
      return []
    }

    const chunks: {
      label: string
      start: number
      end: number
    }[] = []

    for (
      let i = 0;
      i < episodes.length;
      i += RANGE_SIZE
    ) {
      const end = Math.min(
        i + RANGE_SIZE,
        episodes.length
      )

      chunks.push({
        label: `${i + 1}-${end}`,
        start: i,
        end
      })
    }

    return chunks
  }, [episodes.length])

  /*
   * ---------------------------------------------------------
   * Current episode
   * ---------------------------------------------------------
   */
  const currentEpIndex = useMemo(() => {
    return episodes.findIndex(
      ep => ep.id === currentEpisodeId
    )
  }, [episodes, currentEpisodeId])

  /*
   * Automatically switch to the range containing
   * the currently playing episode.
   */
  const effectiveRangeIndex = useMemo(() => {
    if (ranges.length === 0) {
      return 0
    }

    if (query.trim()) {
      return -1
    }

    if (currentEpIndex >= 0) {
      const rangeIdx = Math.floor(
        currentEpIndex / RANGE_SIZE
      )

      if (rangeIdx < ranges.length) {
        return rangeIdx
      }
    }

    return activeRangeIndex
  }, [
    ranges.length,
    query,
    currentEpIndex,
    activeRangeIndex
  ])

  /*
   * ---------------------------------------------------------
   * Filtered episodes
   * ---------------------------------------------------------
   */
  const filtered = useMemo(() => {
    const list = episodes

    if (query.trim()) {
      const q = query
        .toLowerCase()
        .trim()

      return list.filter(ep =>
        `ep ${ep.number} ${ep.title}`
          .toLowerCase()
          .includes(q)
      )
    }

    if (
      ranges.length > 0 &&
      effectiveRangeIndex >= 0
    ) {
      const range =
        ranges[effectiveRangeIndex]

      if (range) {
        return list.slice(
          range.start,
          range.end
        )
      }
    }

    return list
  }, [
    episodes,
    query,
    ranges,
    effectiveRangeIndex
  ])

  return (
    <aside
      className="player-sidebar glass"
      aria-label="Episode list"
    >
      {/* -------------------------------------------------
          Header
      ------------------------------------------------- */}
      <div className="player-sidebar__header">
        <div>
          <h3>Episodes</h3>

          <span className="player-sidebar__count">
            {episodes.length} Available
          </span>
        </div>

        {currentEpIndex >= 0 && (
          <Badge tone="accent">
            Playing #
            {episodes[currentEpIndex]?.number}
          </Badge>
        )}
      </div>

      {/* -------------------------------------------------
          Search
      ------------------------------------------------- */}
      <div className="player-sidebar__search">
        <Search
          size={14}
          className="search-icon"
        />

        <input
          value={query}
          onChange={e =>
            setQuery(e.target.value)
          }
          placeholder="Search episode 1, 100..."
          aria-label="Filter episodes"
        />

        {query && (
          <button
            type="button"
            className="search-clear"
            onClick={() =>
              setQuery('')
            }
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* -------------------------------------------------
          Episode ranges
      ------------------------------------------------- */}
      {ranges.length > 0 &&
        !query.trim() && (
          <div
            className="player-sidebar__ranges"
            aria-label="Episode ranges"
          >
            {ranges.map((range, index) => (
              <button
                key={range.label}
                type="button"
                className={`player-sidebar__range-btn ${index === effectiveRangeIndex
                    ? 'active'
                    : ''
                  }`}
                onClick={() =>
                  setActiveRangeIndex(index)
                }
              >
                {range.label}
              </button>
            ))}
          </div>
        )}

      {/* -------------------------------------------------
          Episode list
      ------------------------------------------------- */}
      <div className="player-sidebar__list">
        {filtered.length === 0 ? (
          <div className="player-sidebar__empty">
            <p>
              No episodes match "{query}"
            </p>
          </div>
        ) : (
          filtered.map(ep => {
            const active =
              ep.id === currentEpisodeId

            const duration =
              formatDuration(ep.duration)

            return (
              <article
                key={ep.id}
                className={`player-sidebar__item ${active ? 'active' : ''
                  }`}
                onClick={() =>
                  onSelectEpisode(ep)
                }
                tabIndex={0}
                role="button"
                onKeyDown={event => {
                  if (
                    event.key === 'Enter' ||
                    event.key === ' '
                  ) {
                    event.preventDefault()
                    onSelectEpisode(ep)
                  }
                }}
              >
                {/* -----------------------------------------
                    Thumbnail
                ----------------------------------------- */}
                <div className="player-sidebar__thumb">
                  {ep.thumbnail ? (
                    <img
                      src={ep.thumbnail}
                      alt=""
                      loading="lazy"
                      onError={event => {
                        event.currentTarget.style.display =
                          'none'
                      }}
                    />
                  ) : (
                    <div className="player-sidebar__thumb-fallback">
                      EP {ep.number}
                    </div>
                  )}

                  <div className="player-sidebar__play-icon">
                    <Play
                      size={16}
                      fill="currentColor"
                    />
                  </div>

                  {active && (
                    <div className="player-sidebar__now-playing">
                      <span className="player-sidebar__equalizer">
                        <span className="bar bar-1" />
                        <span className="bar bar-2" />
                        <span className="bar bar-3" />
                      </span>
                      <span>PLAYING</span>
                    </div>
                  )}
                </div>

                {/* -----------------------------------------
                    Episode information
                ----------------------------------------- */}
                <div className="player-sidebar__info">
                  <div className="player-sidebar__title-row">
                    <strong>
                      EP {ep.number}: {ep.title}
                    </strong>
                  </div>

                  <div className="player-sidebar__meta">
                    {duration ? (
                      <small>{duration}</small>
                    ) : (
                      <small className="player-sidebar__duration-unavailable">
                        Duration N/A
                      </small>
                    )}

                    {ep.watched && (
                      <Badge tone="success">
                        <Check size={10} />
                        Watched
                      </Badge>
                    )}

                    {active && (
                      <span className="player-sidebar__playing-tag">
                        Playing Now
                      </span>
                    )}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </aside>
  )
}