import { Coins, Flame, Lock, Sparkles, Trophy } from 'lucide-react'
import type { User } from '../../types/domain'
import { Progress } from '../ui/Progress'
import './profile.css'

export function ProfileSummary({ user }: { user: User }) {
  const pct = Math.round((user.level.currentXp / user.level.nextLevelXp) * 100)
  const initial = user.username ? user.username.slice(0, 1).toUpperCase() : 'G'

  return (
    <section className="profile-summary glass-elevated">
      <div className="profile-summary__avatar-wrap">
        <div className="avatar">{initial}</div>
        <span className="profile-summary__level-badge">LVL {user.level.level}</span>
      </div>

      <div className="profile-summary__info">
        <div className="profile-summary__identity">
          <span className="profile-summary__rank-title">{user.level.title}</span>
          <h2>{user.username}</h2>
        </div>
        <p className="profile-summary__meta">
          <span className="profile-summary__streak-chip">
            <Flame size={14} className="streak-flame-icon" />
            {user.streak.days} Day Streak
          </span>
        </p>
      </div>

      <div className="profile-summary__xp">
        <div className="profile-summary__xp-header">
          <span>Level Progress</span>
          <span className="profile-summary__xp-values">
            {user.level.currentXp.toLocaleString()} / {user.level.nextLevelXp.toLocaleString()} XP
          </span>
        </div>
        <Progress value={pct} />
      </div>

      <div className="profile-summary__coins" title="7anime Coins">
        <Coins size={18} className="coins-icon" />
        <strong>{user.coins.toLocaleString()}</strong>
      </div>
    </section>
  )
}

export function StreakCard({ days = 0 }: { days?: number }) {
  // Compute how many dots in the 7-day strip are highlighted based on real streak days
  const activeCount = Math.min(7, Math.max(days > 0 ? 1 : 0, days % 7 === 0 && days > 0 ? 7 : days % 7))

  return (
    <section className="streak glass">
      <div className="streak__header">
        <div className="streak__flame-wrapper">
          <Flame size={28} className="streak-flame-icon" />
        </div>
        <div className="streak__info">
          <strong>{days} DAY STREAK</strong>
          <small>Keep your daily watch ritual alive</small>
        </div>
      </div>

      <div
        className="streak__calendar"
        aria-label={`${days} day activity streak`}
      >
        {Array.from({ length: 7 }, (_, i) => (
          <i
            key={i}
            className={i < activeCount ? 'active' : ''}
            title={`Day ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}

export function AchievementCard({
  title,
  description,
  unlocked = true,
}: {
  title: string
  description: string
  unlocked?: boolean
}) {
  return (
    <article className={`achievement ${unlocked ? 'achievement--unlocked' : 'achievement--locked'} glass`}>
      <div className="achievement__icon">
        {unlocked ? (
          <Sparkles size={18} className="achievement__sparkle" />
        ) : (
          <Lock size={16} className="achievement__lock" />
        )}
      </div>
      <div className="achievement__content">
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      {unlocked && <Trophy size={14} className="achievement__trophy" />}
    </article>
  )
}
