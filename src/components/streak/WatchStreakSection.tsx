import React from 'react';
import { Flame, Trophy, Calendar, Sparkles, LogIn, RefreshCw, AlertCircle } from 'lucide-react';
import { AnimatedFlame } from './AnimatedFlame';
import { UserStreakSummary } from '../../services/streak';
import './streak.css';

interface WatchStreakHeroProps {
  isAuthenticated?: boolean;
  streakData?: UserStreakSummary | null;
  loading?: boolean;
  onRefresh?: () => void;
  onOpenAuthModal?: () => void;
  className?: string;
}

export const WatchStreakHero: React.FC<WatchStreakHeroProps> = ({
  isAuthenticated = false,
  streakData,
  loading = false,
  onRefresh,
  onOpenAuthModal,
  className = '',
}) => {
  // 1. Loading Skeleton
  if (loading && isAuthenticated) {
    return (
      <div className={`streak-hero-card streak-hero-card--compact ${className}`} aria-label="Loading Streak">
        <div className="streak-skeleton" style={{ padding: '1rem' }}>
          <div className="streak-skeleton__row" style={{ width: '40%' }} />
          <div className="streak-skeleton__row" style={{ width: '75%', height: '32px' }} />
          <div className="streak-skeleton__row" style={{ width: '55%' }} />
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Guest State
  if (!isAuthenticated) {
    return (
      <div className={`streak-hero-card streak-hero-card--compact ${className}`} aria-label="Watch Streak Guest Preview">
        <div className="streak-hero-compact-top">
          <div className="streak-hero-flame-box streak-hero-flame-box--compact">
            <AnimatedFlame size="md" state="inactive" />
          </div>

          <div className="streak-hero-meta">
            <span className="streak-hero-tag">Daily Anime Ritual</span>
            <div className="streak-hero-count-row">
              <span className="streak-hero-number streak-hero-number--compact streak-hero-number--inactive">0</span>
              <span className="streak-hero-unit">Day Streak</span>
            </div>
            <p className="streak-hero-motivational streak-hero-motivational--compact">
              Sign in to ignite your streak! Complete 80% of an episode or watch 20+ min daily.
            </p>
          </div>
        </div>

        <div className="streak-hero-compact-footer">
          {onOpenAuthModal && (
            <button
              type="button"
              className="streak-calendar__today-btn"
              onClick={onOpenAuthModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', fontSize: '0.82rem' }}
            >
              <LogIn size={14} />
              Sign In to Track Streaks
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Authenticated Error State
  if (!streakData) {
    return (
      <div className={`streak-hero-card streak-hero-card--compact ${className}`} aria-label="Streak Data Unavailable">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.6rem', textAlign: 'center', padding: '1rem 0' }}>
          <AlertCircle size={28} className="text-amber-400" />
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.88rem' }}>
            Unable to synchronize streak statistics.
          </p>
          {onRefresh && (
            <button
              type="button"
              className="streak-calendar__today-btn"
              onClick={onRefresh}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.8rem', fontSize: '0.78rem' }}
            >
              <RefreshCw size={13} />
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // 4. Authenticated Active State
  const {
    currentStreak,
    longestStreak,
    totalActiveDays,
    isActiveToday,
    flameState,
    motivationalMessage,
    nextMilestone,
  } = streakData;

  return (
    <div className={`streak-hero-card streak-hero-card--compact ${className}`} aria-label="Duolingo Watch Streak Feature">
      <div className="streak-hero-compact-top">
        <div className="streak-hero-flame-box streak-hero-flame-box--compact">
          <AnimatedFlame size="md" state={flameState} />
        </div>

        <div className="streak-hero-meta">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={`streak-hero-tag ${isActiveToday ? 'streak-hero-tag--active' : ''}`}>
              <Sparkles size={13} />
              {isActiveToday ? 'Secured Today' : 'Daily Ritual'}
            </span>

            {onRefresh && (
              <button
                type="button"
                className="streak-calendar__nav-btn"
                onClick={onRefresh}
                title="Refresh Streak Data"
                style={{ width: '28px', height: '28px' }}
                aria-label="Refresh streak"
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>

          <div className="streak-hero-count-row">
            <span className="streak-hero-number streak-hero-number--compact">{currentStreak}</span>
            <span className="streak-hero-unit">{currentStreak === 1 ? 'Day Streak' : 'Days Streak'}</span>
          </div>

          <p className="streak-hero-motivational streak-hero-motivational--compact">{motivationalMessage}</p>
        </div>
      </div>

      {/* ─── Compact Stats Chips Row ─── */}
      <div className="streak-compact-chips">
        <div className="streak-compact-chip">
          <Trophy size={13} className="text-amber-400" />
          <span>Longest: <strong>{longestStreak}d</strong></span>
        </div>
        <div className="streak-compact-chip">
          <Calendar size={13} className="text-cyan-400" />
          <span>Active: <strong>{totalActiveDays}d</strong></span>
        </div>
      </div>

      {/* ─── Next Milestone Progress ─── */}
      {nextMilestone && (
        <div className="streak-progress-box streak-progress-box--compact">
          <div className="streak-progress-header">
            <span className="streak-progress-title" style={{ fontSize: '0.78rem' }}>
              <Flame size={13} />
              {nextMilestone.title} ({nextMilestone.days}d)
            </span>
            <span className="streak-progress-remaining" style={{ fontSize: '0.75rem' }}>
              {nextMilestone.remainingDays === 1 ? '1 day left' : `${nextMilestone.remainingDays} days left`}
            </span>
          </div>

          <div className="streak-progress-track" style={{ height: '7px' }}>
            <div
              className="streak-progress-fill"
              style={{ width: `${nextMilestone.progressPct}%` }}
              role="progressbar"
              aria-valuenow={nextMilestone.progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}
    </div>
  );
};
