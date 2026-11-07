import React, { useId } from 'react';
import './flame.css';

export type FlameState = 'inactive' | 'small' | 'growing' | 'bright' | 'roaring' | 'master';
export type FlameSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AnimatedFlameProps {
  state?: FlameState;
  size?: FlameSize;
  className?: string;
  ariaLabel?: string;
}

export const AnimatedFlame: React.FC<AnimatedFlameProps> = ({
  state = 'small',
  size = 'md',
  className = '',
  ariaLabel,
}) => {
  const idPrefix = useId().replace(/:/g, '');
  const outerGradId = `${idPrefix}-outerGrad`;
  const midGradId = `${idPrefix}-midGrad`;
  const coreGradId = `${idPrefix}-coreGrad`;

  const isMaster = state === 'master';
  const isInactive = state === 'inactive';

  return (
    <div
      className={`anime-flame-wrapper anime-flame-wrapper--${size} anime-flame-wrapper--${state} ${className}`}
      role="img"
      aria-label={ariaLabel || `Flame intensity: ${state}`}
    >
      {/* Dynamic ambient backdrop glow */}
      <div className="anime-flame__glow" aria-hidden="true" />

      {/* Flame SVG graphic */}
      <svg
        className="anime-flame-svg"
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Outer Layer Gradient */}
          <linearGradient id={outerGradId} x1="50" y1="10" x2="50" y2="115" gradientUnits="userSpaceOnUse">
            {isInactive ? (
              <>
                <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#475569" stopOpacity="0.5" />
              </>
            ) : isMaster ? (
              <>
                <stop offset="0%" stopColor="#ff4500" />
                <stop offset="50%" stopColor="#ff2a00" />
                <stop offset="100%" stopColor="#d50000" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#ff5722" />
                <stop offset="60%" stopColor="#f44336" />
                <stop offset="100%" stopColor="#d32f2f" />
              </>
            )}
          </linearGradient>

          {/* Middle Tongue Gradient */}
          <linearGradient id={midGradId} x1="50" y1="30" x2="50" y2="110" gradientUnits="userSpaceOnUse">
            {isInactive ? (
              <>
                <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#64748b" stopOpacity="0.5" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#ffca28" />
                <stop offset="45%" stopColor="#ff9800" />
                <stop offset="100%" stopColor="#ff5722" />
              </>
            )}
          </linearGradient>

          {/* Inner Core Gradient */}
          <linearGradient id={coreGradId} x1="50" y1="55" x2="50" y2="105" gradientUnits="userSpaceOnUse">
            {isInactive ? (
              <>
                <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.4" />
              </>
            ) : isMaster ? (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#a5f3fc" />
                <stop offset="100%" stopColor="#06b6d4" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#fff9c4" />
                <stop offset="100%" stopColor="#ffb300" />
              </>
            )}
          </linearGradient>
        </defs>

        {/* 1. Outer Flame Silhouette */}
        <path
          className="anime-flame__outer"
          d="M50 8C47 18 42 28 35 37C28 46 17 56 16 71C15 88 28 108 50 112C72 108 85 88 84 71C83 54 73 44 68 33C63 22 55 14 50 8Z"
          fill={`url(#${outerGradId})`}
        />

        {/* 2. Middle Layer */}
        <path
          className="anime-flame__mid"
          d="M49 28C47 38 43 47 38 54C33 61 25 68 25 78C25 90 35 104 50 106C65 104 74 90 74 78C74 65 67 58 63 49C59 40 53 33 49 28Z"
          fill={`url(#${midGradId})`}
        />

        {/* 3. Incandescent Core / Plasma Nucleus */}
        <path
          className="anime-flame__core"
          d="M50 56C48 64 45 69 42 74C39 79 35 84 35 91C35 98 41 102 50 103C59 102 65 98 65 91C65 83 60 78 57 73C54 68 51 63 50 56Z"
          fill={`url(#${coreGradId})`}
        />
      </svg>

      {/* Floating ember particles for active flames */}
      {!isInactive && (
        <div className="anime-flame__particles" aria-hidden="true">
          <span className="anime-flame__particle anime-flame__particle--1" />
          <span className="anime-flame__particle anime-flame__particle--2" />
          <span className="anime-flame__particle anime-flame__particle--3" />
          <span className="anime-flame__particle anime-flame__particle--4" />
        </div>
      )}
    </div>
  );
};
