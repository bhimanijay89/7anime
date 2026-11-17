import { useMemo } from 'react'
import { AlertCircle, RotateCcw, ArrowLeft, Radio, Sparkles } from 'lucide-react'
import type { Anime, Episode } from '../../types/domain'
import { isMovieMediaType } from '../../services/videoResolver'
import { Button } from '../ui/Button'
import './playerLoadingOverlay.css'

export type PlayerLoadingState =
  | 'resolving_metadata'
  | 'preparing_url'
  | 'loading_stream'
  | 'error'
  | 'ready'

interface PlayerLoadingOverlayProps {
  state: PlayerLoadingState
  anime: Anime
  currentEpisode?: Episode
  server: string
  errorMessage?: string | null
  onRetry?: () => void
  onSelectServer?: (server: string) => void
  onBack?: () => void
}

export function PlayerLoadingOverlay({
  state,
  anime,
  currentEpisode,
  server,
  errorMessage,
  onRetry,
  onSelectServer,
  onBack,
}: PlayerLoadingOverlayProps) {
  const isVisible = state !== 'ready'
  const isError = state === 'error'

  const serverLabel = useMemo(() => {
    switch (server) {
      case 'server1':
        return 'Server 1'
      case 'server2':
        return 'Server 2'
      case 'server3':
        return 'Server 3'
      case 'server4':
        return 'Server 4'
      default:
        return 'Server 1'
    }
  }, [server])

  const episodeLabel = useMemo(() => {
    if (!currentEpisode) return null
    const epNum = currentEpisode.number
    const isMovie = isMovieMediaType(anime.type) || isMovieMediaType(anime.mediaType)

    if (isMovie) {
      return 'Movie'
    }
    return `EP ${epNum}`
  }, [currentEpisode, anime.type, anime.mediaType])

  const backdropImage = useMemo(() => {
    return anime.cover || anime.banner || anime.poster || ''
  }, [anime.cover, anime.banner, anime.poster])

  // Contextual text based on loading phase
  const statusDetails = useMemo(() => {
    switch (state) {
      case 'resolving_metadata':
        return {
          title: 'Resolving Route',
          subtitle: 'Connecting to database...',
        }
      case 'preparing_url':
        return {
          title: `Connecting to ${serverLabel}`,
          subtitle: 'Securing video stream...',
        }
      case 'error':
        return {
          title: 'Playback Route Unavailable',
          subtitle:
            errorMessage ||
            'Unable to connect to this server. Try another server or retry below.',
        }
      case 'loading_stream':
      default:
        return {
          title: 'Loading Stream',
          subtitle: 'Buffering video stream...',
        }
    }
  }, [state, serverLabel, errorMessage])

  return (
    <div
      className={`player-loader ${isVisible ? 'player-loader--active' : 'player-loader--hidden'} ${
        isError ? 'player-loader--error' : ''
      }`}
      aria-live="polite"
      aria-busy={isVisible && !isError}
    >
      {/* Subtle atmospheric backdrop with soft blur */}
      {backdropImage && (
        <div
          className="player-loader__backdrop"
          style={{ backgroundImage: `url(${backdropImage})` }}
          aria-hidden="true"
        />
      )}
      <div className="player-loader__scrim" aria-hidden="true" />

      {/* Centered Composition */}
      <div className="player-loader__content">
        {/* Animated Loading Indicator or Error Icon */}
        <div className="player-loader__indicator-wrap">
          {isError ? (
            <div className="player-loader__error-icon-box">
              <AlertCircle size={32} className="player-loader__error-icon" />
            </div>
          ) : (
            <div className="player-loader__spinner" role="status" aria-label="Loading video stream">
              <div className="player-loader__spinner-track" />
              <div className="player-loader__spinner-arc" />
              <div className="player-loader__spinner-dot" />
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="player-loader__typography">
          <h2 className="player-loader__title">{statusDetails.title}</h2>
          <p className="player-loader__subtitle">{statusDetails.subtitle}</p>
        </div>

        {/* Context Chip */}
        <div className="player-loader__context-chip">
          <span className="player-loader__chip-anime" title={anime.title}>
            {anime.title}
          </span>
          {episodeLabel && (
            <>
              <span className="player-loader__chip-dot">•</span>
              <span className="player-loader__chip-ep">{episodeLabel}</span>
            </>
          )}
          <span className="player-loader__chip-dot">•</span>
          <span className="player-loader__chip-server">
            {server === 'server1' || server === 'server2' ? (
              <Sparkles size={11} className="player-loader__chip-icon" />
            ) : (
              <Radio size={11} className="player-loader__chip-icon" />
            )}
            {serverLabel}
          </span>
        </div>

        {/* Error / Timeout Actions */}
        {isError && (
          <div className="player-loader__actions">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="player-loader__retry-btn"
              >
                <RotateCcw size={14} />
                <span>Try Again</span>
              </button>
            )}

            <div className="player-loader__server-switches">
              {server !== 'server1' && onSelectServer && (
                <button
                  type="button"
                  onClick={() => onSelectServer('server1')}
                  className="player-loader__switch-pill"
                >
                  <Sparkles size={12} />
                  <span>Server 1</span>
                </button>
              )}
              {server !== 'server2' && onSelectServer && (
                <button
                  type="button"
                  onClick={() => onSelectServer('server2')}
                  className="player-loader__switch-pill"
                >
                  <Sparkles size={12} />
                  <span>Server 2</span>
                </button>
              )}
              {server !== 'server3' && onSelectServer && (
                <button
                  type="button"
                  onClick={() => onSelectServer('server3')}
                  className="player-loader__switch-pill"
                >
                  <Radio size={12} />
                  <span>Server 3</span>
                </button>
              )}
              {server !== 'server4' && onSelectServer && (
                <button
                  type="button"
                  onClick={() => onSelectServer('server4')}
                  className="player-loader__switch-pill"
                >
                  <Radio size={12} />
                  <span>Server 4</span>
                </button>
              )}
            </div>

            {onBack && (
              <button
                type="button"
                className="player-loader__back-btn"
                onClick={onBack}
              >
                <ArrowLeft size={13} />
                <span>Back to Details</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
