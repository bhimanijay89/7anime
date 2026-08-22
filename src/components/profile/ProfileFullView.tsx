import { Award, Clock, Flame, Film, LogIn, LogOut, ShieldCheck, UserCheck } from 'lucide-react'
import type { User } from '../../types/domain'
import type { AuthUser } from '../../types/auth'
import { defaultAchievements } from '../../data/anime'
import { AchievementCard, ProfileSummary, StreakCard } from './ProfileSummary'
import { Button } from '../ui/Button'
import './profile.css'

export interface UserProfileStats {
  totalEpisodesWatched?: number
  totalWatchSeconds?: number
  topGenre?: string
  communityRank?: string
  achievements?: Array<{
    id: string
    key: string
    title: string
    description: string
    xpReward: number
    coinReward: number
    unlocked: boolean
    unlockedAt?: string | null
  }>
}

export interface ProfileFullViewProps {
  user: User
  authUser?: AuthUser | null
  profileStats?: UserProfileStats
  onLogout?: () => void
  onOpenAuthModal?: () => void
}

export function ProfileFullView({
  user,
  authUser,
  profileStats,
  onLogout,
  onOpenAuthModal,
}: ProfileFullViewProps) {
  const displayUser: User = {
    ...user,
    username: authUser ? authUser.username : 'Guest',
  }

  const episodesWatched = authUser ? (profileStats?.totalEpisodesWatched ?? 0) : 0
  const totalSeconds = authUser ? (profileStats?.totalWatchSeconds ?? 0) : 0
  const hoursStreamed = (totalSeconds / 3600).toFixed(1)
  const topGenre = authUser ? (profileStats?.topGenre ?? 'Discovery') : 'Discovery'
  const communityRank = authUser ? (profileStats?.communityRank ?? 'Member') : 'Guest'

  const achievementsList = authUser && profileStats?.achievements && profileStats.achievements.length > 0
    ? profileStats.achievements
    : defaultAchievements

  const unlockedCount = achievementsList.filter(a => a.unlocked).length

  return (
    <section className="profile-space" aria-label="User Profile Space">
      <header className="profile-space__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <p className="eyebrow"><ShieldCheck size={16} /> Member Profile</p>
          <h1>My 7anime Space</h1>
        </div>

        {authUser ? (
          <Button variant="glass" onClick={onLogout}>
            <LogOut size={16} />
            Sign Out
          </Button>
        ) : (
          <Button onClick={onOpenAuthModal}>
            <LogIn size={16} />
            Sign In / Register
          </Button>
        )}
      </header>

      {!authUser && (
        <div className="glass" style={{ padding: 'var(--space-4) var(--space-5)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', background: 'linear-gradient(135deg, rgba(85, 216, 255, 0.08), rgba(20, 26, 38, 0.6))', border: '1px solid rgba(85, 216, 255, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <UserCheck size={22} style={{ color: 'var(--color-accent)' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>Viewing as Guest</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Sign in to save watch history, progress, achievements, and custom library lists across devices.</span>
            </div>
          </div>
          <Button variant="glass" onClick={onOpenAuthModal}>
            <LogIn size={15} />
            Sign In
          </Button>
        </div>
      )}

      <ProfileSummary user={displayUser} />

      <div className="profile-space__grid">
        <StreakCard days={displayUser.streak.days} />

        <div className="profile-stats glass">
          <div className="profile-stats__item">
            <Film size={20} className="icon" />
            <div>
              <strong>{episodesWatched}</strong>
              <span>Episodes Watched</span>
            </div>
          </div>
          <div className="profile-stats__item">
            <Clock size={20} className="icon" />
            <div>
              <strong>{hoursStreamed} hrs</strong>
              <span>Time Streamed</span>
            </div>
          </div>
          <div className="profile-stats__item">
            <Flame size={20} className="icon" />
            <div>
              <strong>{topGenre}</strong>
              <span>Top Genre</span>
            </div>
          </div>
          <div className="profile-stats__item">
            <Award size={20} className="icon" />
            <div>
              <strong>{communityRank}</strong>
              <span>Community Rank</span>
            </div>
          </div>
        </div>
      </div>

      <section className="profile-achievements glass" aria-label="Achievements Showcase">
        <header className="profile-achievements__header">
          <h2>Achievements ({unlockedCount} / {achievementsList.length})</h2>
          <span>Earn XP & 7anime coins by unlocking watch milestones</span>
        </header>

        <div className="profile-achievements__grid">
          {achievementsList.map(item => (
            <AchievementCard
              key={item.id || item.key}
              title={item.title}
              description={item.description}
              unlocked={item.unlocked}
            />
          ))}
        </div>
      </section>
    </section>
  )
}
