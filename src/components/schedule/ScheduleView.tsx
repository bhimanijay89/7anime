import {
    AlertCircle,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    Play,
    RefreshCw,
    Sparkles,
    Tv,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    type AiringScheduleEntry,
    getAiringSchedule,
} from '../../services/anilist'
import type { Anime } from '../../types/domain'
import { Badge } from '../ui/Badge'
import { IconButton } from '../ui/Button'
import './schedule.css'

interface ScheduleViewProps {
    anime?: Anime[]
    onSelectAnime?: (anime: Anime) => void
}

type ScheduleMode = 'day' | 'week'

function startOfDay(date: Date) {
    const result = new Date(date)
    result.setHours(0, 0, 0, 0)
    return result
}

function endOfDay(date: Date) {
    const result = new Date(date)
    result.setHours(23, 59, 59, 999)
    return result
}

function addDays(date: Date, amount: number) {
    const result = new Date(date)
    result.setDate(result.getDate() + amount)
    return result
}

function sameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}

function formatDayName(date: Date) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
    }).format(date)
}

function formatFullDayName(date: Date) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
    }).format(date)
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
    }).format(date)
}

function formatLongDate(date: Date) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(date)
}

function formatLocalTime(airingAtSeconds: number) {
    const date = new Date(airingAtSeconds * 1000)
    return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    }).format(date)
}

export function ScheduleView({
    onSelectAnime,
}: ScheduleViewProps) {
    const today = useMemo(
        () => startOfDay(new Date()),
        [],
    )

    const [mode, setMode] = useState<ScheduleMode>('day')
    const [selectedDate, setSelectedDate] = useState<Date>(today)
    const [scheduleItems, setScheduleItems] = useState<AiringScheduleEntry[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    /*
     * Seven days starting from the selected date.
     */
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, index) =>
            addDays(selectedDate, index),
        )
    }, [selectedDate])

    /*
     * Interactive 7-day strip for day mode quick picking.
     */
    const dayStripDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, index) => {
            const offset = index - 3
            return addDays(selectedDate, offset)
        })
    }, [selectedDate])

    /*
     * Fetch real AniList airing schedule data.
     */
    const fetchSchedule = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            let startSec: number
            let endSec: number

            if (mode === 'day') {
                startSec = Math.floor(startOfDay(selectedDate).getTime() / 1000)
                endSec = Math.floor(endOfDay(selectedDate).getTime() / 1000)
            } else {
                const weekStart = weekDays[0]
                const weekEnd = weekDays[6]
                startSec = Math.floor(startOfDay(weekStart).getTime() / 1000)
                endSec = Math.floor(endOfDay(weekEnd).getTime() / 1000)
            }

            const entries = await getAiringSchedule(startSec, endSec, 1, 50)
            setScheduleItems(entries)
        } catch (err) {
            console.error('Failed to load AniList schedule:', err)
            setError(err instanceof Error ? err.message : 'Unable to fetch airing schedule from AniList.')
            setScheduleItems([])
        } finally {
            setLoading(false)
        }
    }, [selectedDate, mode, weekDays])

    useEffect(() => {
        fetchSchedule()
    }, [fetchSchedule])

    /*
     * Items for the selected day in day mode.
     */
    const dayItems = useMemo(() => {
        return scheduleItems.filter(item =>
            sameDay(new Date(item.airingAt * 1000), selectedDate),
        )
    }, [scheduleItems, selectedDate])

    /*
     * Items for each day in week mode.
     */
    const weekItems = useMemo(() => {
        return weekDays.map(date => ({
            date,
            items: scheduleItems.filter(item =>
                sameDay(new Date(item.airingAt * 1000), date),
            ),
        }))
    }, [scheduleItems, weekDays])

    const goPrevious = () => {
        setSelectedDate(
            addDays(
                selectedDate,
                mode === 'day' ? -1 : -7,
            ),
        )
    }

    const goNext = () => {
        setSelectedDate(
            addDays(
                selectedDate,
                mode === 'day' ? 1 : 7,
            ),
        )
    }

    const goToday = () => {
        setSelectedDate(today)
    }

    const isCurrentDateToday = sameDay(selectedDate, today)

    return (
        <section
            className="schedule-page"
            aria-label="Anime release schedule"
        >
            {/* Header */}
            <header className="schedule-header">
                <div className="schedule-header__main">
                    <p className="schedule-eyebrow">
                        <CalendarDays size={14} />
                        EPISODE CALENDAR
                    </p>

                    <div className="schedule-header__title-row">
                        <h1>Schedule</h1>
                        <span className="schedule-header__badge">
                            <Tv size={13} />
                            Weekly Broadcasts
                        </span>
                    </div>

                    <p className="schedule-description">
                        Track real-time upcoming anime episode releases, airing times, and broadcast calendars powered by AniList.
                    </p>
                </div>
            </header>

            {/* Toolbar Controls */}
            <div className="schedule-toolbar">
                <div className="schedule-tabs">
                    <button
                        type="button"
                        className={mode === 'day' ? 'schedule-tab active' : 'schedule-tab'}
                        onClick={() => setMode('day')}
                    >
                        <CalendarDays size={14} />
                        Day View
                    </button>

                    <button
                        type="button"
                        className={mode === 'week' ? 'schedule-tab active' : 'schedule-tab'}
                        onClick={() => setMode('week')}
                    >
                        <Sparkles size={14} />
                        Week View
                    </button>
                </div>

                <div className="schedule-date-controls">
                    <IconButton
                        label={mode === 'day' ? 'Previous day' : 'Previous week'}
                        onClick={goPrevious}
                    >
                        <ChevronLeft size={18} />
                    </IconButton>

                    <button
                        type="button"
                        className={`schedule-today ${isCurrentDateToday ? 'is-active-today' : ''}`}
                        onClick={goToday}
                    >
                        Today
                    </button>

                    <IconButton
                        label={mode === 'day' ? 'Next day' : 'Next week'}
                        onClick={goNext}
                    >
                        <ChevronRight size={18} />
                    </IconButton>
                </div>
            </div>

            {/* Day Selector Strip */}
            {mode === 'day' && (
                <nav className="schedule-day-strip" aria-label="Select day">
                    <div className="schedule-day-strip__scroller">
                        {dayStripDays.map(date => {
                            const isSelected = sameDay(date, selectedDate)
                            const isTodayDate = sameDay(date, today)

                            return (
                                <button
                                    key={date.toISOString()}
                                    type="button"
                                    className={`schedule-day-pill ${isSelected ? 'schedule-day-pill--active' : ''} ${isTodayDate ? 'schedule-day-pill--today' : ''}`}
                                    onClick={() => setSelectedDate(date)}
                                >
                                    <span className="schedule-day-pill__name">{formatDayName(date)}</span>
                                    <span className="schedule-day-pill__date">{date.getDate()}</span>
                                    {isTodayDate && <span className="schedule-day-pill__tag">TODAY</span>}
                                </button>
                            )
                        })}
                    </div>
                </nav>
            )}

            {/* Loading Skeleton State */}
            {loading && <ScheduleSkeleton compact={mode === 'week'} />}

            {/* Error State */}
            {!loading && error && (
                <ScheduleErrorState
                    message={error}
                    onRetry={fetchSchedule}
                />
            )}

            {/* DAY VIEW */}
            {!loading && !error && mode === 'day' && (
                <div className="schedule-day-view">
                    <div className="schedule-day-heading">
                        <div className="schedule-day-heading__info">
                            <div className="schedule-day-heading__primary">
                                <span>{formatFullDayName(selectedDate)}</span>
                                <strong>{formatDate(selectedDate)}</strong>
                                {isCurrentDateToday && (
                                    <span className="schedule-day-heading__today-badge">TODAY</span>
                                )}
                            </div>
                            <p className="schedule-day-heading__full-date">{formatLongDate(selectedDate)}</p>
                        </div>

                        <div className="schedule-day-heading__count">
                            <span>{dayItems.length} {dayItems.length === 1 ? 'Release' : 'Releases'} Scheduled</span>
                        </div>
                    </div>

                    {dayItems.length > 0 ? (
                        <div className="schedule-day-list">
                            {dayItems.map(item => (
                                <ScheduleCard
                                    key={item.id}
                                    item={item}
                                    onSelect={onSelectAnime}
                                />
                            ))}
                        </div>
                    ) : (
                        <ScheduleEmptyState
                            date={selectedDate}
                            onGoToday={goToday}
                        />
                    )}
                </div>
            )}

            {/* WEEK VIEW */}
            {!loading && !error && mode === 'week' && (
                <div className="schedule-week-view">
                    <div className="schedule-week-grid">
                        {weekItems.map(({ date, items }) => {
                            const isTodayDate = sameDay(date, today)

                            return (
                                <div
                                    className={`schedule-week-column ${isTodayDate ? 'is-today' : ''}`}
                                    key={date.toISOString()}
                                >
                                    <div className="schedule-week-day">
                                        <span className="schedule-week-day__name">{formatDayName(date)}</span>
                                        <strong className="schedule-week-day__date">{formatDate(date)}</strong>
                                        {isTodayDate && (
                                            <em className="schedule-week-day__today-tag">TODAY</em>
                                        )}
                                    </div>

                                    <div className="schedule-week-items">
                                        {items.length > 0 ? (
                                            items.map(item => (
                                                <ScheduleCard
                                                    key={item.id}
                                                    item={item}
                                                    compact
                                                    onSelect={onSelectAnime}
                                                />
                                            ))
                                        ) : (
                                            <div className="schedule-no-episode">
                                                <CalendarDays size={18} opacity={0.4} />
                                                <span>No releases</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </section>
    )
}

/* Schedule Card Component */
interface ScheduleCardProps {
    item: AiringScheduleEntry
    compact?: boolean
    onSelect?: (anime: Anime) => void
}

function ScheduleCard({
    item,
    compact = false,
    onSelect,
}: ScheduleCardProps) {
    const handleCardClick = () => {
        if (onSelect) {
            onSelect(item.anime)
        }
    }

    const localTimeStr = formatLocalTime(item.airingAt)
    const isAired = item.airingAt * 1000 <= Date.now()

    return (
        <article
            className={`schedule-card ${compact ? 'schedule-card--compact' : ''} ${onSelect ? 'schedule-card--clickable' : ''}`}
            onClick={handleCardClick}
            tabIndex={onSelect ? 0 : undefined}
            role={onSelect ? 'button' : undefined}
            onKeyDown={e => {
                if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onSelect(item.anime)
                }
            }}
        >
            <div className="schedule-card__top">
                <div className="schedule-card__time">
                    <Clock size={13} />
                    <span>{localTimeStr}</span>
                </div>

                <span className="schedule-card__ep-badge">
                    EP {item.episode}
                </span>
            </div>

            <div className="schedule-card__poster">
                <img
                    src={item.anime.poster || 'https://placehold.co/300x450/1e2330/55d8ff?text=No+Cover'}
                    alt={`${item.anime.title} poster`}
                    loading="lazy"
                />
                <div className="schedule-card__poster-overlay">
                    <div className="schedule-card__play-btn">
                        <Play size={16} fill="currentColor" />
                    </div>
                </div>
            </div>

            <div className="schedule-card__content">
                <h3>{item.anime.title}</h3>

                {item.anime.genres && item.anime.genres.length > 0 && !compact && (
                    <div className="schedule-card__genres">
                        {item.anime.genres.slice(0, 2).map(genre => (
                            <span key={genre} className="schedule-card__genre-tag">
                                {genre}
                            </span>
                        ))}
                    </div>
                )}

                <div className="schedule-card__footer">
                    <Badge tone={isAired ? 'success' : 'info'}>
                        {isAired ? 'Aired' : 'Upcoming'}
                    </Badge>
                    {!compact && (
                        <span className="schedule-card__action">
                            View Details
                        </span>
                    )}
                </div>
            </div>
        </article>
    )
}

/* Skeleton Loading State Component */
function ScheduleSkeleton({ compact = false }: { compact?: boolean }) {
    const skeletonCount = compact ? 7 : 6

    return (
        <div className={compact ? 'schedule-week-skeleton' : 'schedule-day-list'}>
            {Array.from({ length: skeletonCount }).map((_, index) => (
                <div key={index} className="schedule-skeleton-card">
                    <div className="schedule-skeleton-poster" />
                    <div className="schedule-skeleton-text-wrap">
                        <div className="schedule-skeleton-line short" />
                        <div className="schedule-skeleton-line long" />
                        <div className="schedule-skeleton-line medium" />
                    </div>
                </div>
            ))}
        </div>
    )
}

/* Error State Component */
interface ScheduleErrorStateProps {
    message: string
    onRetry: () => void
}

function ScheduleErrorState({ message, onRetry }: ScheduleErrorStateProps) {
    return (
        <div className="schedule-empty schedule-error">
            <div className="schedule-empty__icon-wrap error-icon">
                <AlertCircle size={32} />
            </div>

            <h2>Failed to Load Schedule</h2>

            <p>{message}</p>

            <button
                type="button"
                className="schedule-empty__btn"
                onClick={onRetry}
            >
                <RefreshCw size={14} style={{ marginRight: '0.4rem', display: 'inline-block', verticalAlign: 'middle' }} />
                Try Again
            </button>
        </div>
    )
}

/* Empty State Component */
interface ScheduleEmptyStateProps {
    date: Date
    onGoToday?: () => void
}

function ScheduleEmptyState({
    date,
    onGoToday,
}: ScheduleEmptyStateProps) {
    return (
        <div className="schedule-empty">
            <div className="schedule-empty__icon-wrap">
                <CalendarDays size={32} />
            </div>

            <h2>No Episodes Scheduled</h2>

            <p>
                There are no anime episode releases scheduled for {formatDate(date)}. Select another day from the calendar strip above or check the full week schedule.
            </p>

            {onGoToday && (
                <button
                    type="button"
                    className="schedule-empty__btn"
                    onClick={onGoToday}
                >
                    Back to Today
                </button>
            )}
        </div>
    )
}