import React, { useState } from 'react';
import { Award, Check, Lock, Sparkles, X, Coins, Zap } from 'lucide-react';
import { AnimatedFlame, FlameState } from './AnimatedFlame';
import { StreakMilestone } from '../../services/streak';

interface StreakMilestonesProps {
  milestones: StreakMilestone[];
  currentStreak: number;
  className?: string;
}

export const StreakMilestones: React.FC<StreakMilestonesProps> = ({
  milestones = [],
  currentStreak = 0,
  className = '',
}) => {
  const [selectedMilestone, setSelectedMilestone] = useState<StreakMilestone | null>(null);

  const getFlameStateForDays = (days: number): FlameState => {
    if (days >= 30) return 'master';
    if (days >= 14) return 'roaring';
    if (days >= 7) return 'bright';
    if (days >= 3) return 'growing';
    return 'small';
  };

  return (
    <div className={`streak-milestones-card glass ${className}`} aria-label="Streak Milestones">
      <div className="streak-milestones__header">
        <div className="streak-milestones__title-group">
          <div className="streak-milestones__icon-wrapper">
            <Award size={18} className="streak-milestones__trophy" />
          </div>
          <div>
            <h4 className="streak-milestones__title">Streak Milestones</h4>
            <span className="streak-milestones__subtitle">
              {milestones.filter(m => m.unlocked).length} of {milestones.length} Unlocked
            </span>
          </div>
        </div>
      </div>

      <div className="streak-milestones__grid" role="list">
        {milestones.map(m => {
          const isUnlocked = m.unlocked || currentStreak >= m.days;
          const flameState = isUnlocked ? getFlameStateForDays(m.days) : 'inactive';

          return (
            <div
              key={m.days}
              role="listitem"
              className={`streak-milestone-item ${isUnlocked ? 'streak-milestone-item--unlocked' : 'streak-milestone-item--locked'}`}
              onClick={() => setSelectedMilestone(m)}
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedMilestone(m);
                }
              }}
              title={isUnlocked ? `Unlocked: ${m.title}` : `Reach ${m.days} days to unlock ${m.title}`}
            >
              <div className="streak-milestone-item__flame">
                <AnimatedFlame size="sm" state={flameState} />
                {isUnlocked ? (
                  <div className="streak-milestone-item__badge streak-milestone-item__badge--unlocked">
                    <Check size={11} strokeWidth={3} />
                  </div>
                ) : (
                  <div className="streak-milestone-item__badge streak-milestone-item__badge--locked">
                    <Lock size={10} />
                  </div>
                )}
              </div>

              <div className="streak-milestone-item__content">
                <div className="streak-milestone-item__top">
                  <span className="streak-milestone-item__days">{m.days} Days</span>
                  <div className="streak-milestone-item__rewards">
                    <span className="reward-chip reward-chip--coins">
                      <Coins size={11} />
                      +{m.rewardCoins}
                    </span>
                    <span className="reward-chip reward-chip--xp">
                      <Zap size={11} />
                      +{m.rewardXp} XP
                    </span>
                  </div>
                </div>

                <strong className="streak-milestone-item__title">{m.title}</strong>
                <p className="streak-milestone-item__desc">{m.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail / Celebration Modal */}
      {selectedMilestone && (
        <div
          className="streak-modal-backdrop"
          onClick={() => setSelectedMilestone(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="streak-modal-content glass"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className="streak-modal-close"
              onClick={() => setSelectedMilestone(null)}
              aria-label="Close milestone details"
            >
              <X size={18} />
            </button>

            <div className="streak-modal-hero">
              <AnimatedFlame
                size="lg"
                state={selectedMilestone.unlocked || currentStreak >= selectedMilestone.days ? getFlameStateForDays(selectedMilestone.days) : 'inactive'}
              />
            </div>

            <div className="streak-modal-info">
              <span className="streak-modal-tag">
                {selectedMilestone.unlocked || currentStreak >= selectedMilestone.days ? (
                  <>
                    <Sparkles size={14} className="text-amber-400" />
                    Milestone Unlocked!
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    {selectedMilestone.days - currentStreak} Days Remaining
                  </>
                )}
              </span>

              <h3 className="streak-modal-title">{selectedMilestone.title}</h3>
              <p className="streak-modal-desc">{selectedMilestone.description}</p>

              <div className="streak-modal-rewards-box">
                <div className="streak-modal-reward">
                  <Coins size={20} className="text-amber-400" />
                  <div>
                    <strong>+{selectedMilestone.rewardCoins} Coins</strong>
                    <small>7Anime Store currency</small>
                  </div>
                </div>
                <div className="streak-modal-reward">
                  <Zap size={20} className="text-cyan-400" />
                  <div>
                    <strong>+{selectedMilestone.rewardXp} XP</strong>
                    <small>Account progression</small>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="streak-modal-btn"
                onClick={() => setSelectedMilestone(null)}
              >
                {selectedMilestone.unlocked || currentStreak >= selectedMilestone.days ? 'Awesome!' : 'Keep Watching'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
