import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Tv,
  Calendar as CalendarIcon,
  Sparkles,
  Award,
  Film,
  Zap,
} from 'lucide-react';
import { AnimatedFlame } from './AnimatedFlame';
import { DailyActivityItem, fetchStreakActivity } from '../../services/streak';

export interface DailyActivityCalendarProps {
  todayDate: string; // YYYY-MM-DD
  activities?: DailyActivityItem[];
  timezone?: string;
  className?: string;
  onDateSelect?: (dateStr: string, activity?: DailyActivityItem) => void;
}

const WEEKDAY_HEADERS = [
  { full: 'Monday', short: 'Mon', initial: 'M' },
  { full: 'Tuesday', short: 'Tue', initial: 'T' },
  { full: 'Wednesday', short: 'Wed', initial: 'W' },
  { full: 'Thursday', short: 'Thu', initial: 'T' },
  { full: 'Friday', short: 'Fri', initial: 'F' },
  { full: 'Saturday', short: 'Sat', initial: 'S' },
  { full: 'Sunday', short: 'Sun', initial: 'S' },
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface CalendarCell {
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  fullDateLabel: string;
  colIndex: number; // 0 to 6
  rowIndex: number; // 0 to 5
}

export const DailyActivityCalendar: React.FC<DailyActivityCalendarProps> = ({
  todayDate,
  activities = [],
  className = '',
  onDateSelect,
}) => {
  // Parse todayDate safely (YYYY-MM-DD)
  const parsedToday = useMemo(() => {
    const fallback = new Date().toISOString().slice(0, 10);
    const validStr = todayDate && /^\d{4}-\d{2}-\d{2}$/.test(todayDate) ? todayDate : fallback;
    const [y, m, d] = validStr.split('-').map(Number);
    return {
      year: y,
      month: m, // 1-12
      day: d,
      dateStr: validStr,
    };
  }, [todayDate]);

  // Calendar view state (year and 1-based month)
  const [viewYear, setViewYear] = useState<number>(parsedToday.year);
  const [viewMonth, setViewMonth] = useState<number>(parsedToday.month);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [fetchedActivities, setFetchedActivities] = useState<Map<string, DailyActivityItem>>(new Map());

  // Merge passed activities and any fetched month activities
  const activityMap = useMemo(() => {
    const map = new Map<string, DailyActivityItem>();
    for (const act of activities) {
      if (act?.activityDate) {
        map.set(act.activityDate, act);
      }
    }
    fetchedActivities.forEach((act, date) => {
      map.set(date, act);
    });
    return map;
  }, [activities, fetchedActivities]);

  // Load activities when viewing a month not yet fully covered by props
  useEffect(() => {
    const monthKey = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;
    const isViewingCurrent = viewYear === parsedToday.year && viewMonth === parsedToday.month;

    if (!isViewingCurrent) {
      fetchStreakActivity({ month: monthKey })
        .then((res) => {
          if (res?.activities) {
            setFetchedActivities((prev) => {
              const updated = new Map(prev);
              res.activities.forEach((item) => updated.set(item.activityDate, item));
              return updated;
            });
          }
        })
        .catch((err) => {
          console.warn('[Calendar] Failed to fetch month activity:', err);
        });
    }
  }, [viewYear, viewMonth, parsedToday.year, parsedToday.month]);

  // Navigation bounds check: Disallow navigating into future months beyond today's month
  const isCurrentMonthView = viewYear === parsedToday.year && viewMonth === parsedToday.month;
  const isFutureMonthView =
    viewYear > parsedToday.year || (viewYear === parsedToday.year && viewMonth > parsedToday.month);
  const canGoNextMonth = !isCurrentMonthView && !isFutureMonthView;

  const handlePrevMonth = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      if (viewMonth === 1) {
        setViewYear((y) => y - 1);
        setViewMonth(12);
      } else {
        setViewMonth((m) => m - 1);
      }
      setIsTransitioning(false);
    }, 120);
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    if (!canGoNextMonth) return;
    setIsTransitioning(true);
    setTimeout(() => {
      if (viewMonth === 12) {
        setViewYear((y) => y + 1);
        setViewMonth(1);
      } else {
        setViewMonth((m) => m + 1);
      }
      setIsTransitioning(false);
    }, 120);
  }, [canGoNextMonth, viewMonth]);

  const handleTodayShortcut = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setViewYear(parsedToday.year);
      setViewMonth(parsedToday.month);
      setSelectedDate(parsedToday.dateStr);
      setIsTransitioning(false);
    }, 120);
  }, [parsedToday]);

  // 2D Monthly Grid Calculation (Monday through Sunday)
  const calendarCells = useMemo<CalendarCell[]>(() => {
    const daysInCurrentMonth = new Date(viewYear, viewMonth, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
    // Monday is column 0, Sunday is column 6
    const startOffset = (firstDayOfWeek + 6) % 7;

    const prevMonthYear = viewMonth === 1 ? viewYear - 1 : viewYear;
    const prevMonthNum = viewMonth === 1 ? 12 : viewMonth - 1;
    const daysInPrevMonth = new Date(viewYear, viewMonth - 1, 0).getDate();

    const nextMonthYear = viewMonth === 12 ? viewYear + 1 : viewYear;
    const nextMonthNum = viewMonth === 12 ? 1 : viewMonth + 1;

    const rawCells: Omit<CalendarCell, 'colIndex' | 'rowIndex'>[] = [];

    // 1. Leading days from previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateStr = `${prevMonthYear}-${String(prevMonthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dObj = new Date(prevMonthYear, prevMonthNum - 1, dayNum);
      rawCells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isPast: dateStr < parsedToday.dateStr,
        isToday: dateStr === parsedToday.dateStr,
        isFuture: dateStr > parsedToday.dateStr,
        fullDateLabel: dObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      });
    }

    // 2. Days of active month (1 through daysInCurrentMonth)
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dObj = new Date(viewYear, viewMonth - 1, d);
      rawCells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isPast: dateStr < parsedToday.dateStr,
        isToday: dateStr === parsedToday.dateStr,
        isFuture: dateStr > parsedToday.dateStr,
        fullDateLabel: dObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      });
    }

    // 3. Trailing days to round up to full 7-day rows (multiples of 7)
    const remainder = rawCells.length % 7;
    const trailingCount = remainder === 0 ? 0 : 7 - remainder;
    for (let d = 1; d <= trailingCount; d++) {
      const dateStr = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dObj = new Date(nextMonthYear, nextMonthNum - 1, d);
      rawCells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isPast: dateStr < parsedToday.dateStr,
        isToday: dateStr === parsedToday.dateStr,
        isFuture: dateStr > parsedToday.dateStr,
        fullDateLabel: dObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      });
    }

    // Attach row and column indices for layout and tooltip bounding
    return rawCells.map((c, idx) => ({
      ...c,
      colIndex: idx % 7,
      rowIndex: Math.floor(idx / 7),
    }));
  }, [viewYear, viewMonth, parsedToday.dateStr]);

  // Monthly Summary Calculations (Derived strictly from real database records)
  const monthSummary = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    let activeDays = 0;
    let qualifiedDays = 0;
    let totalEpisodes = 0;
    let totalSeconds = 0;
    let maxStreakInMonth = 0;
    let currentStreakRun = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const act = activityMap.get(dateStr);
      if (act) {
        const hasTime = (act.qualifyingWatchSeconds || 0) > 0;
        const hasEps = (act.completedEpisodes || 0) > 0;
        if (hasTime || hasEps) {
          activeDays++;
        }
        if (act.qualified) {
          qualifiedDays++;
          currentStreakRun++;
          if (currentStreakRun > maxStreakInMonth) {
            maxStreakInMonth = currentStreakRun;
          }
        } else {
          currentStreakRun = 0;
        }
        totalEpisodes += act.completedEpisodes || 0;
        totalSeconds += act.qualifyingWatchSeconds || 0;
      } else {
        currentStreakRun = 0;
      }
    }

    const hours = totalSeconds / 3600;
    const formattedWatchTime =
      hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(totalSeconds / 60)}m`;

    return {
      activeDays,
      qualifiedDays,
      totalEpisodes,
      totalSeconds,
      formattedWatchTime,
      maxStreakInMonth,
    };
  }, [viewYear, viewMonth, activityMap]);

  // Selected date details
  const selectedActivity = useMemo(() => {
    if (!selectedDate) return null;
    return activityMap.get(selectedDate) || null;
  }, [selectedDate, activityMap]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  const handleCellClick = (cell: CalendarCell) => {
    if (!cell.isCurrentMonth) {
      // If clicking an outside cell, navigate to that month if it's not a future month
      const [y, m] = cell.dateStr.split('-').map(Number);
      if (y > parsedToday.year || (y === parsedToday.year && m > parsedToday.month)) {
        return;
      }
      setViewYear(y);
      setViewMonth(m);
      setSelectedDate(cell.dateStr);
      onDateSelect?.(cell.dateStr, activityMap.get(cell.dateStr));
      return;
    }

    if (selectedDate === cell.dateStr) {
      setSelectedDate(null);
    } else {
      setSelectedDate(cell.dateStr);
      onDateSelect?.(cell.dateStr, activityMap.get(cell.dateStr));
    }
  };

  const currentMonthHeading = `${MONTH_NAMES[viewMonth - 1]} ${viewYear}`;

  const monthSubtitle = useMemo(() => {
    if (isCurrentMonthView) {
      if (monthSummary.qualifiedDays > 0) {
        return `Your anime journey this month • ${monthSummary.qualifiedDays} streak day${
          monthSummary.qualifiedDays > 1 ? 's' : ''
        } verified`;
      }
      return 'Your anime journey this month • Stream 20m or 1 episode to qualify';
    }
    return `Historical streaming record for ${MONTH_NAMES[viewMonth - 1]} ${viewYear}`;
  }, [isCurrentMonthView, monthSummary.qualifiedDays, viewMonth, viewYear]);

  return (
    <div
      className={`streak-calendar-card glass ${className}`}
      aria-label="Monthly Watch Activity Calendar"
    >
      {/* ─── Header: Month & Year Title, Motivational Subtitle, Controls ─── */}
      <div className="streak-calendar__header">
        <div className="streak-calendar__title-group">
          <div className="streak-calendar__icon-badge">
            <CalendarIcon size={17} className="streak-calendar__icon" />
          </div>
          <div className="streak-calendar__title-meta">
            <h4 className="streak-calendar__title">{currentMonthHeading}</h4>
            <span className="streak-calendar__subtitle">{monthSubtitle}</span>
          </div>
        </div>

        <div className="streak-calendar__controls">
          {!isCurrentMonthView && (
            <button
              type="button"
              className="streak-calendar__today-btn"
              onClick={handleTodayShortcut}
              title="Return to current month"
            >
              Today
            </button>
          )}

          <div className="streak-calendar__arrows">
            <button
              type="button"
              className="streak-calendar__nav-btn"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              title="View previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className={`streak-calendar__nav-btn ${
                !canGoNextMonth ? 'streak-calendar__nav-btn--disabled' : ''
              }`}
              onClick={handleNextMonth}
              disabled={!canGoNextMonth}
              aria-label="Next month"
              title={canGoNextMonth ? 'View next month' : 'No future activity records available'}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 5-Card Monthly Statistics Console (Refined Numerical Hierarchy) ─── */}
      <div className="streak-calendar__stats-console">
        {/* Card 1: Active Days */}
        <div className="streak-stat-console-card streak-stat-console-card--cyan">
          <div className="streak-stat-console-card__top">
            <div className="streak-stat-console-card__icon-box">
              <Sparkles size={13} />
            </div>
            <span className="streak-stat-console-card__label">Active Days</span>
          </div>
          <div className="streak-stat-console-card__val-row">
            <strong className="streak-stat-console-card__val">{monthSummary.activeDays}</strong>
            <span className="streak-stat-console-card__unit">days</span>
          </div>
          <span className="streak-stat-console-card__sub">days streamed</span>
        </div>

        {/* Card 2: Qualified Days */}
        <div className="streak-stat-console-card streak-stat-console-card--amber">
          <div className="streak-stat-console-card__top">
            <div className="streak-stat-console-card__icon-box">
              <Flame size={13} />
            </div>
            <span className="streak-stat-console-card__label">Streak Days</span>
          </div>
          <div className="streak-stat-console-card__val-row">
            <strong className="streak-stat-console-card__val">{monthSummary.qualifiedDays}</strong>
            <span className="streak-stat-console-card__unit">qualified</span>
          </div>
          <span className="streak-stat-console-card__sub">target achieved</span>
        </div>

        {/* Card 3: Episodes */}
        <div className="streak-stat-console-card streak-stat-console-card--violet">
          <div className="streak-stat-console-card__top">
            <div className="streak-stat-console-card__icon-box">
              <Film size={13} />
            </div>
            <span className="streak-stat-console-card__label">Episodes</span>
          </div>
          <div className="streak-stat-console-card__val-row">
            <strong className="streak-stat-console-card__val">{monthSummary.totalEpisodes}</strong>
            <span className="streak-stat-console-card__unit">eps</span>
          </div>
          <span className="streak-stat-console-card__sub">completed (80%+)</span>
        </div>

        {/* Card 4: Watch Time */}
        <div className="streak-stat-console-card streak-stat-console-card--emerald">
          <div className="streak-stat-console-card__top">
            <div className="streak-stat-console-card__icon-box">
              <Clock size={13} />
            </div>
            <span className="streak-stat-console-card__label">Watch Time</span>
          </div>
          <div className="streak-stat-console-card__val-row">
            <strong className="streak-stat-console-card__val">{monthSummary.formattedWatchTime}</strong>
          </div>
          <span className="streak-stat-console-card__sub">streamed time</span>
        </div>

        {/* Card 5: Best Streak */}
        <div className="streak-stat-console-card streak-stat-console-card--gold">
          <div className="streak-stat-console-card__top">
            <div className="streak-stat-console-card__icon-box">
              <Award size={13} />
            </div>
            <span className="streak-stat-console-card__label">Best Streak</span>
          </div>
          <div className="streak-stat-console-card__val-row">
            <strong className="streak-stat-console-card__val">{monthSummary.maxStreakInMonth}d</strong>
          </div>
          <span className="streak-stat-console-card__sub">month record</span>
        </div>
      </div>

      {/* ─── 2D Calendar Grid & Weekdays ─── */}
      <div
        className={`streak-calendar__month-view ${
          isTransitioning ? 'streak-calendar__month-view--animating' : ''
        }`}
      >
        {/* Weekday Column Headers (Mon through Sun) with Glass Bar */}
        <div className="streak-calendar__weekdays-row" role="row">
          {WEEKDAY_HEADERS.map((col, idx) => {
            const isWeekend = idx >= 5;
            return (
              <div
                key={idx}
                className={`streak-calendar__weekday-head ${
                  isWeekend ? 'streak-calendar__weekday-head--weekend' : ''
                }`}
                title={col.full}
                role="columnheader"
              >
                <span className="streak-weekday-short">{col.short}</span>
                <span className="streak-weekday-initial">{col.initial}</span>
              </div>
            );
          })}
        </div>

        {/* 7-Column Date Grid */}
        <div
          className="streak-calendar__grid"
          role="grid"
          aria-label={`Calendar dates for ${currentMonthHeading}`}
        >
          {calendarCells.map((cell) => {
            const activity = activityMap.get(cell.dateStr);
            const isQualified = Boolean(activity?.qualified);
            const qualifyingSeconds = activity?.qualifyingWatchSeconds || 0;
            const completedEps = activity?.completedEpisodes || 0;
            const minutesWatched = Math.round(qualifyingSeconds / 60);
            const isSelected = selectedDate === cell.dateStr;

            // Determine Activity Intensity Level:
            // 0: Missed / inactive
            // 1: Partial (<20m and 0 completed episodes)
            // 2: Qualified standard (1 episode or 20-44m)
            // 3: Heavy watch day (2+ completed episodes or >=45m)
            let activityLevel = 0;
            if (isQualified && (completedEps >= 2 || qualifyingSeconds >= 2700)) {
              activityLevel = 3;
            } else if (isQualified) {
              activityLevel = 2;
            } else if (cell.isPast && qualifyingSeconds > 0) {
              activityLevel = 1;
            }

            // Cell styling state classes
            let cellStateClass: string;
            if (!cell.isCurrentMonth) {
              cellStateClass = 'streak-cell--outside';
            } else if (cell.isToday) {
              cellStateClass = isQualified
                ? 'streak-cell--today-qualified'
                : 'streak-cell--today-pending';
            } else if (activityLevel === 3) {
              cellStateClass = 'streak-cell--qualified streak-cell--level3';
            } else if (activityLevel === 2) {
              cellStateClass = 'streak-cell--qualified streak-cell--level2';
            } else if (activityLevel === 1) {
              cellStateClass = 'streak-cell--partial';
            } else if (cell.isPast) {
              cellStateClass = 'streak-cell--missed';
            } else {
              cellStateClass = 'streak-cell--future';
            }

            if (isSelected) {
              cellStateClass += ' streak-cell--selected';
            }

            // Tooltip positioning
            const tooltipPosClass =
              cell.rowIndex === 0 ? 'streak-cell__tooltip--bottom' : 'streak-cell__tooltip--top';
            const tooltipAlignClass =
              cell.colIndex === 0
                ? 'streak-cell__tooltip--align-left'
                : cell.colIndex === 6
                ? 'streak-cell__tooltip--align-right'
                : 'streak-cell__tooltip--align-center';

            return (
              <button
                key={cell.dateStr}
                type="button"
                className={`streak-calendar__cell ${cellStateClass}`}
                onClick={() => handleCellClick(cell)}
                aria-label={`${cell.fullDateLabel}${
                  isQualified ? ' - Qualified watch day' : cell.isToday ? ' - Today' : ''
                }`}
                aria-selected={isSelected}
                tabIndex={cell.isCurrentMonth ? 0 : -1}
              >
                {/* ─── Top Row: Date Number + Mini Badges ─── */}
                <div className="streak-cell__top-bar">
                  <span className="streak-cell__day-num">{cell.dayNum}</span>

                  {cell.isCurrentMonth && cell.isToday && (
                    <span className="streak-cell__today-tag">TODAY</span>
                  )}
                  {cell.isCurrentMonth && !cell.isToday && isQualified && (
                    <span className="streak-cell__streak-pip" title="Streak active">
                      <Zap size={9} />
                    </span>
                  )}
                </div>

                {/* ─── Middle Section: Activity Visual Indicator ─── */}
                <div className="streak-cell__indicator-zone">
                  {cell.isCurrentMonth && isQualified ? (
                    <div className="streak-cell__flame">
                      <AnimatedFlame
                        size="sm"
                        state={activityLevel === 3 ? 'roaring' : 'bright'}
                      />
                    </div>
                  ) : cell.isCurrentMonth && cell.isToday ? (
                    <div className="streak-cell__today-pulse" title="Pending Today">
                      <Clock size={13} className="streak-cell__clock-icon" />
                    </div>
                  ) : cell.isCurrentMonth && activityLevel === 1 ? (
                    <div className="streak-cell__partial-indicator">
                      <span className="streak-cell__partial-dot" />
                    </div>
                  ) : cell.isCurrentMonth && cell.isPast ? (
                    <span className="streak-cell__missed-resting-plate" />
                  ) : cell.isCurrentMonth ? (
                    <span className="streak-cell__future-resting-plate" />
                  ) : null}
                </div>

                {/* ─── Bottom Row: Episode / Duration Activity Pill ─── */}
                <div className="streak-cell__bottom-bar">
                  {cell.isCurrentMonth && activityLevel === 3 ? (
                    <span className="streak-cell__badge streak-cell__badge--level3">
                      {completedEps > 0 ? `${completedEps} eps` : `${minutesWatched}m`}
                    </span>
                  ) : cell.isCurrentMonth && activityLevel === 2 ? (
                    <span className="streak-cell__badge streak-cell__badge--level2">
                      {completedEps > 0 ? `${completedEps} ep` : `${minutesWatched}m`}
                    </span>
                  ) : cell.isCurrentMonth && activityLevel === 1 ? (
                    <span className="streak-cell__badge streak-cell__badge--partial">
                      {minutesWatched}m
                    </span>
                  ) : cell.isCurrentMonth && cell.isToday && !isQualified ? (
                    <span className="streak-cell__badge streak-cell__badge--pending">
                      <span className="streak-badge-full">20m left</span>
                      <span className="streak-badge-short">20m</span>
                    </span>
                  ) : null}
                </div>

                {/* ─── High-End Instant Liquid Glass Hover Tooltip ─── */}
                {cell.isCurrentMonth && (
                  <div
                    className={`streak-cell__tooltip glass-elevated ${tooltipPosClass} ${tooltipAlignClass}`}
                    role="tooltip"
                  >
                    <div className="streak-tooltip__header">
                      <strong className="streak-tooltip__date">{cell.fullDateLabel}</strong>
                    </div>

                    <div className="streak-tooltip__status-pill">
                      {isQualified ? (
                        <span className="streak-tooltip-tag streak-tooltip-tag--qualified">
                          <Flame size={11} /> Qualified Streak Day
                        </span>
                      ) : cell.isToday ? (
                        <span className="streak-tooltip-tag streak-tooltip-tag--today">
                          <Clock size={11} /> In Progress Today
                        </span>
                      ) : activityLevel === 1 ? (
                        <span className="streak-tooltip-tag streak-tooltip-tag--partial">
                          <Clock size={11} /> Partial Playback ({minutesWatched}m)
                        </span>
                      ) : cell.isPast ? (
                        <span className="streak-tooltip-tag streak-tooltip-tag--missed">
                          No Activity
                        </span>
                      ) : (
                        <span className="streak-tooltip-tag streak-tooltip-tag--future">
                          Upcoming Day
                        </span>
                      )}
                    </div>

                    <div className="streak-tooltip__stats-row">
                      <span className="streak-tooltip__stat">
                        <Film size={11} /> {completedEps} episode{completedEps === 1 ? '' : 's'}
                      </span>
                      <span className="streak-tooltip__stat">
                        <Clock size={11} /> {minutesWatched}m playback
                      </span>
                    </div>

                    <span className="streak-tooltip__hint">Click for full breakdown</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Interactive Date Detail Panel / Drawer ─── */}
      {selectedDate && (
        <div
          className="streak-calendar__detail-drawer glass-elevated"
          role="region"
          aria-label="Selected date activity breakdown"
        >
          <div className="streak-detail__header">
            <div className="streak-detail__title-row">
              <CalendarIcon size={15} className="streak-detail__cal-icon" />
              <strong className="streak-detail__date-title">{selectedDateLabel}</strong>
            </div>

            <button
              type="button"
              className="streak-detail__close-btn"
              onClick={() => setSelectedDate(null)}
              aria-label="Close activity detail panel"
            >
              <X size={15} />
            </button>
          </div>

          <div className="streak-detail__body">
            {/* Qualification Status Banner */}
            <div
              className={`streak-detail__status-badge ${
                selectedActivity?.qualified
                  ? 'streak-detail__status--qualified'
                  : selectedDate === parsedToday.dateStr
                  ? 'streak-detail__status--today'
                  : selectedDate > parsedToday.dateStr
                  ? 'streak-detail__status--future'
                  : (selectedActivity?.qualifyingWatchSeconds || 0) > 0
                  ? 'streak-detail__status--partial'
                  : 'streak-detail__status--missed'
              }`}
            >
              {selectedActivity?.qualified ? (
                <>
                  <Flame size={14} className="streak-detail__status-icon" />
                  <span>Streak Target Met — Verified Daily Watch Progress</span>
                </>
              ) : selectedDate === parsedToday.dateStr ? (
                <>
                  <Clock size={14} className="streak-detail__status-icon" />
                  <span>Today In Progress — Watch 20 minutes or 1 episode (80%) to qualify</span>
                </>
              ) : selectedDate > parsedToday.dateStr ? (
                <>
                  <Sparkles size={14} className="streak-detail__status-icon" />
                  <span>Upcoming Day</span>
                </>
              ) : (selectedActivity?.qualifyingWatchSeconds || 0) > 0 ? (
                <>
                  <AlertCircle size={14} className="streak-detail__status-icon" />
                  <span>Incomplete Target — Watched under 20m or did not finish an episode</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} className="streak-detail__status-icon" />
                  <span>No Watch Activity Recorded</span>
                </>
              )}
            </div>

            {/* Daily Stats Grid */}
            <div className="streak-detail__metrics-grid">
              <div className="streak-detail__stat-card">
                <span className="streak-detail__stat-label">Episodes Completed</span>
                <strong className="streak-detail__stat-value">
                  {selectedActivity?.completedEpisodes ?? 0}
                </strong>
                <span className="streak-detail__stat-sub">
                  {(selectedActivity?.completedEpisodes ?? 0) >= 1 ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Target Met (80%+)
                    </span>
                  ) : (
                    'Verified unique episodes'
                  )}
                </span>
              </div>

              <div className="streak-detail__stat-card">
                <span className="streak-detail__stat-label">Stream Duration</span>
                <strong className="streak-detail__stat-value">
                  {selectedActivity
                    ? Math.round(selectedActivity.qualifyingWatchSeconds / 60)
                    : 0}{' '}
                  mins
                </strong>
                <span className="streak-detail__stat-sub">
                  {(selectedActivity?.qualifyingWatchSeconds ?? 0) >= 1200 ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> 20m Target Met
                    </span>
                  ) : (
                    'Accumulated playback'
                  )}
                </span>
              </div>
            </div>

            {/* Episode Breakdown if present in episodesJson */}
            {selectedActivity?.episodesJson &&
              Object.keys(selectedActivity.episodesJson).length > 0 && (
                <div className="streak-detail__episodes-list">
                  <span className="streak-detail__episodes-title">
                    <Tv size={12} /> Streaming Breakdown
                  </span>
                  <div className="streak-detail__episodes-items">
                    {Object.entries(selectedActivity.episodesJson).map(([key, ep]) => {
                      const mins = Math.round((ep.progressSeconds || 0) / 60);
                      const durMins = Math.round((ep.durationSeconds || 0) / 60);
                      const title =
                        ep.animeTitle ||
                        (ep.anilistId ? `Anime #${ep.anilistId}` : 'Episode');
                      const epNum = ep.episodeNumber ? `Ep ${ep.episodeNumber}` : '';

                      return (
                        <div key={key} className="streak-detail__episode-row">
                          <div className="streak-detail__ep-info">
                            <span className="streak-detail__ep-name">
                              {title} {epNum && `• ${epNum}`}
                            </span>
                            <span className="streak-detail__ep-time">
                              {mins}m / {durMins > 0 ? `${durMins}m` : 'ongoing'}
                            </span>
                          </div>
                          {ep.completed && (
                            <span className="streak-detail__ep-tag">
                              <CheckCircle2 size={11} /> Completed
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Clean Encouraging Empty State */}
            {(!selectedActivity ||
              (selectedActivity.qualifyingWatchSeconds === 0 &&
                selectedActivity.completedEpisodes === 0)) && (
              <p className="streak-detail__empty-note">
                No watch activity was recorded on this date. Stream any anime episode for at least
                20 minutes or finish 80% to earn streak qualification.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Legend Footer ─── */}
      <div className="streak-calendar__legend">
        <div className="streak-legend__item">
          <span className="streak-legend__icon streak-legend__icon--qualified">
            <Flame size={12} />
          </span>
          <span>Qualified (80%+ or 20m)</span>
        </div>
        <div className="streak-legend__item">
          <span className="streak-legend__icon streak-legend__icon--today" />
          <span>Today</span>
        </div>
        <div className="streak-legend__item">
          <span className="streak-legend__icon streak-legend__icon--partial" />
          <span>Partial</span>
        </div>
        <div className="streak-legend__item">
          <span className="streak-legend__icon streak-legend__icon--missed" />
          <span>Missed</span>
        </div>
      </div>
    </div>
  );
};
