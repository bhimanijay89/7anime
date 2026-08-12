import { Award, Clock, Flame, Film, ShieldCheck } from 'lucide-react'
import type { User } from '../../types/domain'
import { previewAchievements } from '../../data/anime'
import { AchievementCard, ProfileSummary, StreakCard } from './ProfileSummary'
import './profile.css'

export function ProfileFullView({ user }: { user: User }) {
  return (
    <section className="profile-space" aria-label="User Profile Space">
      <header className="profile-space__header">
        <p className="eyebrow"><ShieldCheck size={16} /> Member Profile</p>
        <h1>My 7anime Space</h1>
      </header>

      <ProfileSummary user={user} />

      <div className="profile-space__grid">
        <StreakCard days={user.streak.days} />

        <div className="profile-stats glass">
          <div className="profile-stats__item">
            <Film size={20} className="icon" />
            <div>
              <strong>142</strong>
              <span>Episodes Watched</span>
            </div>
          </div>
          <div className="profile-stats__item">
            <Clock size={20} className="icon" />
            <div>
              <strong>56.8 hrs</strong>
              <span>Time Streamed</span>
            </div>
          </div>
          <div className="profile-stats__item">
            <Flame size={20} className="icon" />
            <div>
              <strong>Cyberpunk</strong>
              <span>Top Genre</span>
            </div>
          </div>
          <div className="profile-stats__item">
            <Award size={20} className="icon" />
            <div>
              <strong>Top 5%</strong>
              <span>Community Rank</span>
            </div>
          </div>
        </div>
      </div>

      <section className="profile-achievements glass" aria-label="Achievements Showcase">
        <header className="profile-achievements__header">
          <h2>Achievements ({previewAchievements.filter(a => a.unlocked).length} / {previewAchievements.length})</h2>
          <span>Earn XP & 7anime coins by unlocking watch milestones</span>
        </header>

        <div className="profile-achievements__grid">
          {previewAchievements.map(item => (
            <AchievementCard
              key={item.id}
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
