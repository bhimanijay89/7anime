import React, { useState, useEffect, useCallback } from 'react'
import {
  Award,
  Clock,
  Flame,
  Film,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck,
  Trophy,
  Bookmark,
  Tv,
  CheckCircle2,
  FolderHeart,
  Activity,
} from 'lucide-react'
import type { User } from '../../types/domain'
import type { AuthUser } from '../../types/auth'
import { ProfileSummary, AchievementCard } from './ProfileSummary'
import { AvatarModal } from './AvatarModal'
import { EditProfileModal } from './EditProfileModal'
import { WatchStreakHero } from '../streak/WatchStreakSection'
import { DailyActivityCalendar } from '../streak/DailyActivityCalendar'
import { StreakMilestones } from '../streak/StreakMilestones'
import { Button } from '../ui/Button'
import {
  fetchUserStreak,
  fetchStreakActivity,
  syncUserTimezone,
  UserStreakSummary,
  DailyActivityItem,
} from '../../services/streak'
import './profile.css'

export interface RecentWatchItem {
  id: string
  anilistId: number
  episodeNumber: number
  progressSeconds: number
  durationSeconds: number
  progressPercent: number
  completed: boolean
  updatedAt: string
  title: string
  poster: string
}

export interface UserProfileStats {
  totalAnimeWatched?: number
  totalEpisodesWatched?: number
  totalWatchSeconds?: number
  topGenre?: string
  communityRank?: string
  recentlyWatched?: RecentWatchItem[]
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
  libraryStats?: {
    watching: number
    completed: number
    planning: number
    dropped: number
    total: number
  }
}

export interface ProfileFullViewProps {
  user: User
  authUser?: AuthUser | null
  profileStats?: UserProfileStats
  onLogout?: () => void
  onOpenAuthModal?: () => void
  onProfileUpdated?: (updatedUser: Partial<User>) => void
  onNavigateLibrary?: () => void
}

const BACKEND_URL =
  (import.meta as unknown as { env?: { VITE_BACKEND_URL?: string } }).env?.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : '')

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('7anime_token') : null
  const headers: Record<string, string> = { ...extraHeaders }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export function ProfileFullView({
  user,
  authUser,
  profileStats,
  onLogout,
  onOpenAuthModal,
  onProfileUpdated,
  onNavigateLibrary,
}: ProfileFullViewProps) {
  const [streakData, setStreakData] = useState<UserStreakSummary | null>(null)
  const [activities, setActivities] = useState<DailyActivityItem[]>([])
  const [streakLoading, setStreakLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'achievements' | 'library'>('achievements')

  // Modals state
  const [avatarModalOpen, setAvatarModalOpen] = useState<boolean>(false)
  const [editProfileModalOpen, setEditProfileModalOpen] = useState<boolean>(false)

  // Local user state for instantaneous optimistic updates
  const [localUser, setLocalUser] = useState<User>(user)

  useEffect(() => {
    setLocalUser(user)
  }, [user])

  const loadStreak = useCallback(async () => {
    if (!authUser) {
      setStreakLoading(false)
      return
    }

    setStreakLoading(true)
    try {
      syncUserTimezone().catch(() => { })
      const [streak, activityRes] = await Promise.all([
        fetchUserStreak(),
        fetchStreakActivity(60),
      ])

      if (streak) {
        setStreakData(streak)
      }
      if (activityRes?.activities) {
        setActivities(activityRes.activities)
      }
    } catch (err) {
      console.error('Failed to load profile streak data:', err)
    } finally {
      setStreakLoading(false)
    }
  }, [authUser])

  useEffect(() => {
    loadStreak()
  }, [loadStreak])

  // Save Avatar Handler
  const handleSaveAvatar = async (avatarDataUrl: string): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/profile/avatar`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ avatar: avatarDataUrl }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.ok && data.data?.user) {
          const updated = data.data.user
          setLocalUser((prev) => ({
            ...prev,
            avatar: updated.avatar,
            displayName: updated.displayName || prev.displayName,
          }))
          onProfileUpdated?.(updated)
          return true
        }
      }
      return false
    } catch (err) {
      console.error('[Profile] Avatar update failed:', err)
      return false
    }
  }

  // Remove Avatar Handler
  const handleRemoveAvatar = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/profile/avatar`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        if (data.ok && data.data?.user) {
          const updated = data.data.user
          setLocalUser((prev) => ({
            ...prev,
            avatar: undefined,
          }))
          onProfileUpdated?.(updated)
          return true
        }
      }
      return false
    } catch (err) {
      console.error('[Profile] Avatar remove failed:', err)
      return false
    }
  }

  // Save Profile Handler (DisplayName, Bio)
  const handleSaveProfile = async (data: { displayName: string; bio: string }): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/profile`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const json = await res.json()
        if (json.ok && json.data?.user) {
          const updated = json.data.user
          setLocalUser((prev) => ({
            ...prev,
            displayName: updated.displayName,
            bio: updated.bio,
          }))
          onProfileUpdated?.(updated)
          return true
        }
      }
      return false
    } catch (err) {
      console.error('[Profile] Profile update failed:', err)
      return false
    }
  }

  // Derive verified statistics from backend
  const animeWatched = authUser ? (profileStats?.totalAnimeWatched ?? 0) : 0
  const episodesWatched = authUser ? (profileStats?.totalEpisodesWatched ?? 0) : 0
  const totalSeconds = authUser ? (profileStats?.totalWatchSeconds ?? 0) : 0
  const hoursStreamed = (totalSeconds / 3600).toFixed(1)
  const topGenre = authUser ? (profileStats?.topGenre ?? 'Action') : 'Action'
  const communityRank = authUser ? (profileStats?.communityRank ?? 'Anime Enthusiast') : 'Guest'

  const effectiveCurrentStreak = streakData ? streakData.currentStreak : user.streak.days

  const displayUser: User = {
    ...localUser,
    username: authUser ? authUser.username : 'Guest',
    displayName: localUser.displayName || (authUser ? authUser.displayName || authUser.username : 'Guest Explorer'),
    avatar: localUser.avatar || (authUser ? authUser.avatar || undefined : undefined),
    streak: {
      ...user.streak,
      days: effectiveCurrentStreak,
    },
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const achievementsList = profileStats?.achievements || []
  const libraryStats = profileStats?.libraryStats || { watching: 0, completed: 0, planning: 0, dropped: 0, total: 0 }

  return (
    <div className="profile-view-wrapper">
      <section className="profile-space" aria-label="User Profile Dashboard">
        {/* ─── Profile Header: Structured, elegant & guaranteed zero navbar overlap ─── */}
        <header className="profile-header glass-elevated">
          <div className="profile-header__main">
            <div className="profile-header__title-block">
              <div className="profile-header__badge-row">
                <span className="profile-header__status-badge">
                  <span className="status-dot status-dot--active" />
                  <span>Verified 7Anime Space</span>
                </span>
                <span className="profile-header__tag">
                  <ShieldCheck size={13} className="text-cyan-400" />
                  {displayUser.level.title}
                </span>
              </div>
              <h1 className="profile-header__title">Profile Dashboard</h1>
              <p className="profile-header__subtitle">
                Personalized discovery space, daily watch streaks, achievements, and streaming progression.
              </p>
            </div>

            <div className="profile-header__actions">
              {authUser ? (
                <div className="profile-header__user-controls">
                  <div className="profile-header__account-info">
                    <span className="account-label">Signed in as</span>
                    <span className="account-name">@{authUser.username}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="profile-header__signout-btn"
                    title="Sign out of 7anime"
                    aria-label="Sign out"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <Button onClick={onOpenAuthModal} className="profile-signin-btn">
                  <LogIn size={15} />
                  <span>Sign In / Register</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* ─── Guest Alert ─── */}
        {!authUser && (
          <div className="profile-guest-banner glass">
            <div className="profile-guest-banner__info">
              <UserCheck size={22} className="text-cyan-400" />
              <div>
                <strong>Viewing as Guest</strong>
                <span>Sign in to track watch streaks, unlock achievements, personalize your avatar, and sync history across devices.</span>
              </div>
            </div>
            <Button variant="glass" onClick={onOpenAuthModal} className="profile-guest-banner__btn">
              <LogIn size={14} />
              <span>Sign In</span>
            </Button>
          </div>
        )}

        {/* ─── Row 1: Profile Identity & Watch Streak (2-Column Grid) ─── */}
        <div className="profile-dashboard__top-grid">
          <ProfileSummary
            user={displayUser}
            isAuthenticated={!!authUser}
            onEditAvatar={() => setAvatarModalOpen(true)}
            onEditProfile={() => setEditProfileModalOpen(true)}
            onLogout={onLogout}
          />
          <WatchStreakHero
            isAuthenticated={!!authUser}
            streakData={streakData}
            loading={streakLoading}
            onRefresh={loadStreak}
            onOpenAuthModal={onOpenAuthModal}
          />
        </div>

        {/* ─── Row 2: Cinematic Unified Metrics Console ─── */}
        <section className="profile-metrics-console glass-elevated" aria-label="Lifetime Streaming Metrics">
          <div className="profile-metrics-console__header">
            <div className="profile-metrics-console__title-group">
              <Activity size={15} className="text-cyan-400" />
              <span className="profile-metrics-console__title">Verified Streaming Metrics</span>
            </div>
            <span className="profile-metrics-console__sync-tag">
              <CheckCircle2 size={13} className="text-emerald-400" /> Synchronized with Watch Progress
            </span>
          </div>

          <div className="profile-metrics-console__grid">
            {/* 1. Anime Watched */}
            <div className="profile-metric-zone">
              <div className="profile-metric-zone__top">
                <span className="profile-metric-zone__label">Anime Watched</span>
                <div className="profile-metric-zone__icon-badge profile-metric-zone__icon--cyan">
                  <Tv size={15} />
                </div>
              </div>
              <div className="profile-metric-zone__value-row">
                <strong className="profile-metric-zone__value">{animeWatched}</strong>
                <span className="profile-metric-zone__unit">titles</span>
              </div>
              <span className="profile-metric-zone__hint">Unique anime series</span>
            </div>

            {/* 2. Episodes Watched */}
            <div className="profile-metric-zone">
              <div className="profile-metric-zone__top">
                <span className="profile-metric-zone__label">Episodes Finished</span>
                <div className="profile-metric-zone__icon-badge profile-metric-zone__icon--cyan">
                  <Film size={15} />
                </div>
              </div>
              <div className="profile-metric-zone__value-row">
                <strong className="profile-metric-zone__value">{episodesWatched}</strong>
                <span className="profile-metric-zone__unit">eps</span>
              </div>
              <span className="profile-metric-zone__hint">≥ 80% duration verified</span>
            </div>

            {/* 3. Time Streamed */}
            <div className="profile-metric-zone">
              <div className="profile-metric-zone__top">
                <span className="profile-metric-zone__label">Playback Time</span>
                <div className="profile-metric-zone__icon-badge profile-metric-zone__icon--violet">
                  <Clock size={15} />
                </div>
              </div>
              <div className="profile-metric-zone__value-row">
                <strong className="profile-metric-zone__value">{hoursStreamed}</strong>
                <span className="profile-metric-zone__unit">hours</span>
              </div>
              <span className="profile-metric-zone__hint">Genuine accumulated seconds</span>
            </div>

            {/* 4. Favorite Genre */}
            <div className="profile-metric-zone">
              <div className="profile-metric-zone__top">
                <span className="profile-metric-zone__label">Top Genre</span>
                <div className="profile-metric-zone__icon-badge profile-metric-zone__icon--amber">
                  <Flame size={15} />
                </div>
              </div>
              <div className="profile-metric-zone__value-row">
                <strong className="profile-metric-zone__value" title={topGenre}>{topGenre}</strong>
              </div>
              <span className="profile-metric-zone__hint">Primary watched category</span>
            </div>

            {/* 5. Community Rank */}
            <div className="profile-metric-zone profile-metric-zone--last">
              <div className="profile-metric-zone__top">
                <span className="profile-metric-zone__label">Otaku Tier</span>
                <div className="profile-metric-zone__icon-badge profile-metric-zone__icon--gold">
                  <Award size={15} />
                </div>
              </div>
              <div className="profile-metric-zone__value-row">
                <strong className="profile-metric-zone__value" title={communityRank}>{communityRank}</strong>
              </div>
              <span className="profile-metric-zone__hint">Based on level & activity</span>
            </div>
          </div>
        </section>

        {/* ─── Row 3: Activity & Milestones Section (2-Column Balanced Grid) ─── */}
        <div className="profile-dashboard__activity-grid">
          <DailyActivityCalendar
            todayDate={streakData?.todayDate || todayStr}
            activities={activities}
            timezone={streakData?.timezone}
          />
          <StreakMilestones
            milestones={streakData?.milestones || []}
            currentStreak={effectiveCurrentStreak}
          />
        </div>

        {/* ─── Row 4: Tabbed Content Section (Achievements, Library) ─── */}
        <div className="profile-content-section glass">
              {/* Navigation Tabs */}
              <div className="profile-tabs-nav">
                <button
                  type="button"
                  className={`profile-nav-tab ${activeTab === 'achievements' ? 'profile-nav-tab--active' : ''}`}
                  onClick={() => setActiveTab('achievements')}
                >
                  <Trophy size={16} />
                  <span>Achievements</span>
                  {achievementsList.length > 0 && (
                    <span className="profile-tab-count">
                      {achievementsList.filter((a) => a.unlocked).length}/{achievementsList.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className={`profile-nav-tab ${activeTab === 'library' ? 'profile-nav-tab--active' : ''}`}
                  onClick={() => setActiveTab('library')}
                >
                  <Bookmark size={16} />
                  <span>My Library</span>
                  {libraryStats.total > 0 && <span className="profile-tab-count">{libraryStats.total}</span>}
                </button>
              </div>

              {/* Tab 1: Achievements */}
              {activeTab === 'achievements' && (
                <div className="profile-tab-pane">
                  {achievementsList.length > 0 ? (
                    <div className="profile-achievements__grid">
                      {achievementsList.map((ach) => (
                        <AchievementCard
                          key={ach.id}
                          title={ach.title}
                          description={ach.description}
                          unlocked={ach.unlocked}
                          unlockedAt={ach.unlockedAt}
                          xpReward={ach.xpReward}
                          coinReward={ach.coinReward}
                          rarity={ach.xpReward >= 1000 ? 'Legendary' : ach.xpReward >= 500 ? 'Epic' : ach.xpReward >= 300 ? 'Rare' : 'Common'}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="profile-empty-tab">
                      <Trophy size={36} className="profile-empty-tab__icon" />
                      <h3>No Achievements Yet</h3>
                      <p>Complete episodes and watch daily to earn rewards and badges.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Library Overview */}
              {activeTab === 'library' && (
                <div className="profile-tab-pane">
                  <div className="profile-library-overview">
                    <div className="profile-library-stat-card">
                      <Tv size={20} className="text-cyan-400" />
                      <div className="profile-library-stat-card__val">{libraryStats.watching}</div>
                      <div className="profile-library-stat-card__lbl">Watching</div>
                    </div>
                    <div className="profile-library-stat-card">
                      <CheckCircle2 size={20} className="text-emerald-400" />
                      <div className="profile-library-stat-card__val">{libraryStats.completed}</div>
                      <div className="profile-library-stat-card__lbl">Completed</div>
                    </div>
                    <div className="profile-library-stat-card">
                      <Bookmark size={20} className="text-violet-400" />
                      <div className="profile-library-stat-card__val">{libraryStats.planning}</div>
                      <div className="profile-library-stat-card__lbl">Plan to Watch</div>
                    </div>
                    <div className="profile-library-stat-card">
                      <FolderHeart size={20} className="text-amber-400" />
                      <div className="profile-library-stat-card__val">{libraryStats.total}</div>
                      <div className="profile-library-stat-card__lbl">Total Saved</div>
                    </div>
                  </div>

                  {onNavigateLibrary && (
                    <div className="profile-library-action-row">
                      <Button variant="glass" onClick={onNavigateLibrary} className="profile-view-library-btn">
                        <Bookmark size={15} />
                        <span>Open Full Library Collection</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── Avatar Modal ─── */}
            <AvatarModal
              isOpen={avatarModalOpen}
              currentAvatar={localUser.avatar}
              username={displayUser.username}
              onClose={() => setAvatarModalOpen(false)}
              onSaveAvatar={handleSaveAvatar}
              onRemoveAvatar={handleRemoveAvatar}
            />

            {/* ─── Edit Profile Modal ─── */}
            <EditProfileModal
              isOpen={editProfileModalOpen}
              currentDisplayName={displayUser.displayName}
              currentBio={displayUser.bio}
              username={displayUser.username}
              onClose={() => setEditProfileModalOpen(false)}
              onSaveProfile={handleSaveProfile}
            />
      </section>
    </div>
  )
}
