import { useState } from 'react'
import {
  Coins,
  Sparkles,
  Trophy,
  Camera,
  Edit3,
  Share2,
  Check,
  Shield,
  Calendar,
} from 'lucide-react'
import type { User } from '../../types/domain'
import { Progress } from '../ui/Progress'
import './profile.css'

export interface ProfileSummaryProps {
  user: User
  onEditAvatar?: () => void
  onEditProfile?: () => void
  onShareProfile?: () => void
  isAuthenticated?: boolean
}

export function ProfileSummary({
  user,
  onEditAvatar,
  onEditProfile,
  onShareProfile,
  isAuthenticated = true,
}: ProfileSummaryProps) {
  const [copied, setCopied] = useState<boolean>(false)

  const pct = Math.min(
    100,
    Math.round((user.level.currentXp / Math.max(1, user.level.nextLevelXp)) * 100),
  )
  const initial = user.username ? user.username.slice(0, 1).toUpperCase() : '7'
  const displayName = user.displayName || user.username
  const bio = user.bio || 'Anime enthusiast on 7anime. Streaming the greatest journeys.'

  const handleShareClick = () => {
    if (onShareProfile) {
      onShareProfile()
      return
    }

    // Default clipboard copy
    try {
      const shareUrl = window.location.origin + window.location.pathname + '#profile'
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // ignore
    }
  }

  return (
    <section
      className="profile-identity-card glass-elevated"
      aria-label="Profile Identity & Level"
    >
      {/* Ambient Gradient Glow Background */}
      <div className="profile-identity-card__ambient-glow" aria-hidden="true" />

      {/* Top Header: Avatar, Name & Coins */}
      <div className="profile-identity-card__top">
        <div className="profile-identity-card__user-cluster">
          {/* Avatar with Animated Gradient Ring */}
          <div
            className="profile-avatar-wrapper"
            onClick={isAuthenticated ? onEditAvatar : undefined}
            title={isAuthenticated ? 'Click to change avatar' : undefined}
            role={isAuthenticated ? 'button' : undefined}
            tabIndex={isAuthenticated ? 0 : undefined}
            onKeyDown={(e) => {
              if (isAuthenticated && (e.key === 'Enter' || e.key === ' ')) {
                onEditAvatar?.()
              }
            }}
          >
            <div className="profile-avatar-ring profile-avatar-ring--animated" />
            <div className="profile-avatar-mask">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="profile-avatar-img"
                  loading="eager"
                />
              ) : (
                <div className="profile-avatar-fallback">{initial}</div>
              )}

              {/* Hover Camera Icon */}
              {isAuthenticated && (
                <div className="profile-avatar-overlay" aria-hidden="true">
                  <Camera size={16} />
                </div>
              )}
            </div>

            {/* Level Badge anchored on avatar */}
            <span className="profile-avatar__level-chip">
              LVL {user.level.level}
            </span>
          </div>

          {/* User Details */}
          <div className="profile-identity-card__details">
            <div className="profile-identity-card__badges">
              <span className="profile-rank-chip">
                <Shield size={11} className="text-cyan-400" />
                {user.level.title}
              </span>
              <span className="profile-username-tag">@{user.username}</span>
            </div>

            <h2 className="profile-identity-card__display-name" title={displayName}>
              {displayName}
            </h2>

            <p className="profile-identity-card__bio" title={bio}>
              "{bio}"
            </p>
          </div>
        </div>

        {/* 7anime Coins Counter */}
        <div className="profile-identity-card__coins" title="7anime Coins Balance">
          <Coins size={17} className="coins-icon" />
          <div className="coins-text">
            <strong>{user.coins.toLocaleString()}</strong>
            <span>COINS</span>
          </div>
        </div>
      </div>

      {/* Level XP Progress Bar */}
      <div className="profile-identity-card__xp-section">
        <div className="profile-identity-card__xp-header">
          <span className="xp-label">
            <Sparkles size={13} className="text-cyan-400" /> Level Progression
          </span>
          <span className="xp-values">
            <strong>{user.level.currentXp.toLocaleString()}</strong> /{' '}
            {user.level.nextLevelXp.toLocaleString()} XP ({pct}%)
          </span>
        </div>
        <Progress value={pct} />
      </div>

      {/* Quick Action Buttons */}
      {isAuthenticated && (
        <div className="profile-identity-card__actions">
          <button
            type="button"
            className="profile-action-btn"
            onClick={onEditAvatar}
            aria-label="Change profile picture"
          >
            <Camera size={13} />
            <span>Change Avatar</span>
          </button>

          <button
            type="button"
            className="profile-action-btn"
            onClick={onEditProfile}
            aria-label="Edit profile details"
          >
            <Edit3 size={13} />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            className="profile-action-btn"
            onClick={handleShareClick}
            aria-label="Share profile"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
            <span>{copied ? 'Copied Link!' : 'Share'}</span>
          </button>
        </div>
      )}
    </section>
  )
}

export interface AchievementCardProps {
  title: string
  description: string
  unlocked?: boolean
  unlockedAt?: string | null
  rarity?: 'Common' | 'Rare' | 'Epic' | 'Legendary'
  xpReward?: number
  coinReward?: number
}

export function AchievementCard({
  title,
  description,
  unlocked = false,
  unlockedAt,
  rarity = 'Rare',
  xpReward = 100,
  coinReward = 50,
}: AchievementCardProps) {
  const formattedDate = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <article
      className={`achievement-card glass ${
        unlocked ? 'achievement-card--unlocked' : 'achievement-card--locked'
      }`}
    >
      <div className="achievement-card__icon-wrapper" aria-hidden="true">
        {unlocked ? (
          <Trophy size={20} className="achievement-card__icon--gold" />
        ) : (
          <Sparkles size={20} className="achievement-card__icon--muted" />
        )}
      </div>

      <div className="achievement-card__body">
        <div className="achievement-card__meta">
          <span className={`achievement-rarity achievement-rarity--${rarity.toLowerCase()}`}>
            {rarity}
          </span>
          {unlocked && formattedDate && (
            <span className="achievement-date">
              <Calendar size={11} /> {formattedDate}
            </span>
          )}
        </div>

        <h3 className="achievement-card__title">{title}</h3>
        <p className="achievement-card__desc">{description}</p>

        <div className="achievement-card__rewards">
          <span className="reward-chip reward-chip--xp">+{xpReward} XP</span>
          <span className="reward-chip reward-chip--coins">+{coinReward} Coins</span>
          <span className={`status-pill ${unlocked ? 'status-pill--unlocked' : 'status-pill--locked'}`}>
            {unlocked ? 'Unlocked' : 'Locked'}
          </span>
        </div>
      </div>
    </article>
  )
}
