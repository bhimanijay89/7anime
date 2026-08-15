import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Anime } from '../../types/domain'
import { Badge } from '../ui/Badge'
import { IconButton } from '../ui/Button'
import './schedule.css'

interface ScheduleViewProps {
    anime: Anime[]
}

type ScheduleMode = 'day' | 'week'

interface ScheduleItem {
    id: string
    anime: Anime
    episode: number
    date: Date
    time: string
}

const RELEASE_TIMES = [
    '10:30 AM',
    '01:00 PM',
    '06:30 PM',
    '08:00 PM',
    '07:30 PM',
    '09:00 PM',
    '10:00 PM',
]

function startOfDay(date: Date) {
    const result = new Date(date)
    result.setHours(0, 0, 0, 0)
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
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
    }).format(date)
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
    }).format(date)
}

function formatLongDate(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(date)
}

export function ScheduleView({
    anime,
}: ScheduleViewProps) {
    const today = useMemo(
        () => startOfDay(new Date()),
        [],
    )

    const [mode, setMode] =
        useState<ScheduleMode>('day')

    const [selectedDate, setSelectedDate] =
        useState<Date>(today)

    /*
     * Generate upcoming mock schedule data.
     *
     * This keeps the schedule UI independent from
     * the anime episode API for now.
     */
    const scheduleItems = useMemo(() => {
        if (!anime.length) return []

        const items: ScheduleItem[] = []

        const scheduleAnime = anime.slice(0, 10)

        scheduleAnime.forEach((item, index) => {
            const dateOffset = index % 7

            items.push({
                id: `${item.id}-${dateOffset}`,
                anime: item,
                episode: 13 + index,
                date: addDays(today, dateOffset),
                time:
                    RELEASE_TIMES[
                    index % RELEASE_TIMES.length
                    ],
            })
        })

        return items
    }, [anime, today])

    /*
     * Seven days starting from the selected date.
     */
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, index) =>
            addDays(selectedDate, index),
        )
    }, [selectedDate])

    /*
     * Items for the selected day.
     */
    const dayItems = useMemo(() => {
        return scheduleItems.filter(item =>
            sameDay(item.date, selectedDate),
        )
    }, [scheduleItems, selectedDate])

    /*
     * Items for each day in week mode.
     */
    const weekItems = useMemo(() => {
        return weekDays.map(date => ({
            date,
            items: scheduleItems.filter(item =>
                sameDay(item.date, date),
            ),
        }))
    }, [scheduleItems, weekDays])

    /*
     * Navigation.
     *
     * Day:
     * previous/next day
     *
     * Week:
     * previous/next 7 days
     */
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

    return (
        <section
            className="schedule-page"
            aria-label="Anime release schedule"
        >
            {/* ───────────────────────────────────────
          Header
          ─────────────────────────────────────── */}

            <header className="schedule-header">
                <div>
                    <p className="schedule-eyebrow">
                        <CalendarDays size={14} />
                        EPISODE CALENDAR
                    </p>

                    <h1>Schedule</h1>

                    <p className="schedule-description">
                        Stay up to date with upcoming anime
                        episodes and their release times.
                    </p>
                </div>
            </header>

            {/* ───────────────────────────────────────
          Controls
          ─────────────────────────────────────── */}

            <div className="schedule-toolbar">
                <div className="schedule-tabs">
                    <button
                        type="button"
                        className={
                            mode === 'day'
                                ? 'schedule-tab active'
                                : 'schedule-tab'
                        }
                        onClick={() =>
                            setMode('day')
                        }
                    >
                        Day
                    </button>

                    <button
                        type="button"
                        className={
                            mode === 'week'
                                ? 'schedule-tab active'
                                : 'schedule-tab'
                        }
                        onClick={() =>
                            setMode('week')
                        }
                    >
                        Week
                    </button>
                </div>

                <div className="schedule-date-controls">
                    <IconButton
                        label={
                            mode === 'day'
                                ? 'Previous day'
                                : 'Previous week'
                        }
                        onClick={goPrevious}
                    >
                        <ChevronLeft size={18} />
                    </IconButton>

                    <button
                        type="button"
                        className="schedule-today"
                        onClick={goToday}
                    >
                        Today
                    </button>

                    <IconButton
                        label={
                            mode === 'day'
                                ? 'Next day'
                                : 'Next week'
                        }
                        onClick={goNext}
                    >
                        <ChevronRight size={18} />
                    </IconButton>
                </div>
            </div>

            {/* ═══════════════════════════════════════
          DAY VIEW
          ═══════════════════════════════════════ */}

            {mode === 'day' && (
                <div className="schedule-day-view">
                    <div className="schedule-day-heading">
                        <div>
                            <span>
                                {formatDayName(selectedDate)}
                            </span>

                            <strong>
                                {formatDate(selectedDate)}
                            </strong>
                        </div>

                        <p>
                            {formatLongDate(selectedDate)}
                        </p>
                    </div>

                    {dayItems.length > 0 ? (
                        <div className="schedule-day-list">
                            {dayItems.map(item => (
                                <ScheduleCard
                                    key={item.id}
                                    item={item}
                                />
                            ))}
                        </div>
                    ) : (
                        <ScheduleEmptyState
                            date={selectedDate}
                        />
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════
          WEEK VIEW
          ═══════════════════════════════════════ */}

            {mode === 'week' && (
                <div className="schedule-week-view">
                    <div className="schedule-week-grid">
                        {weekItems.map(
                            ({ date, items }) => (
                                <div
                                    className={`schedule-week-column ${sameDay(date, today)
                                            ? 'is-today'
                                            : ''
                                        }`}
                                    key={date.toISOString()}
                                >
                                    {/* Day header */}
                                    <div className="schedule-week-day">
                                        <span>
                                            {formatDayName(date)}
                                        </span>

                                        <strong>
                                            {formatDate(date)}
                                        </strong>

                                        {sameDay(
                                            date,
                                            today,
                                        ) && (
                                                <em>
                                                    TODAY
                                                </em>
                                            )}
                                    </div>

                                    {/* Episodes */}
                                    <div className="schedule-week-items">
                                        {items.length > 0 ? (
                                            items.map(item => (
                                                <ScheduleCard
                                                    key={item.id}
                                                    item={item}
                                                    compact
                                                />
                                            ))
                                        ) : (
                                            <div className="schedule-no-episode">
                                                <span>
                                                    No releases
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                </div>
            )}
        </section>
    )
}

/* ═══════════════════════════════════════════════
   Schedule Card
   ═══════════════════════════════════════════════ */

function ScheduleCard({
    item,
    compact = false,
}: {
    item: ScheduleItem
    compact?: boolean
}) {
    return (
        <article
            className={
                compact
                    ? 'schedule-card schedule-card--compact'
                    : 'schedule-card'
            }
        >
            <div className="schedule-card__time">
                <Clock size={14} />
                <span>{item.time}</span>
            </div>

            <div className="schedule-card__poster">
                <img
                    src={item.anime.poster}
                    alt={`${item.anime.title} poster`}
                    loading="lazy"
                />
            </div>

            <div className="schedule-card__content">
                <h3>
                    {item.anime.title}
                </h3>

                <p>
                    Episode {item.episode}
                </p>

                <Badge tone="info">
                    Upcoming
                </Badge>
            </div>
        </article>
    )
}

/* ═══════════════════════════════════════════════
   Empty State
   ═══════════════════════════════════════════════ */

function ScheduleEmptyState({
    date,
}: {
    date: Date
}) {
    return (
        <div className="schedule-empty">
            <CalendarDays size={32} />

            <h2>
                No episodes scheduled
            </h2>

            <p>
                There are no upcoming episodes
                scheduled for {formatDate(date)}.
            </p>
        </div>
    )
}