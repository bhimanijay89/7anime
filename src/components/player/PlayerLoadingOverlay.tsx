import { useMemo } from 'react'
import { AlertCircle, RotateCcw, ArrowLeft, Radio, Sparkles } from 'lucide-react'
import logoImg from '../../../public/logo.png'
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
        return 'Server 1 (0vidads)'
      case 'server2':
        return 'Server 2 (MegaPlay)'
      case 'server3':
      case 'server4':
        return 'Server 3 (MegaPlay)'
      default:
        return 'Server 1 (0vidads)'
    }
  }, [server])

  const episodeLabel = useMemo(() => {
    if (!currentEpisode) return null
    const epNum = currentEpisode.number
    const season = anime.seasonNumber || 1
    const isMovie = isMovieMediaType(anime.type) || isMovieMediaType(anime.mediaType)

    if (isMovie) {
      return 'Movie Presentation'
    }
    if (anime.seasonNumber && anime.seasonNumber > 1) {
      return `Season ${season} • Episode ${epNum}`
    }
    return `Episode ${epNum}`
  }, [currentEpisode, anime.seasonNumber, anime.type, anime.mediaType])

  const backdropImage = useMemo(() => {
    return anime.cover || anime.banner || anime.poster || ''
  }, [anime.cover, anime.banner, anime.poster])

  // Contextual text based on loading phase
  const statusDetails = useMemo(() => {
    switch (state) {
      case 'resolving_metadata':
        return {
          title: 'Resolving Streaming Metadata',
          subtitle: 'Connecting to provider database to optimize streaming route...',
        }
      case 'preparing_url':
        return {
          title: `Connecting to ${serverLabel}`,
          subtitle: 'Securing video embed stream...',
        }
      case 'error':
        return {
          title: 'Playback Route Unavailable',
          subtitle:
            errorMessage ||
            'Unable to establish a streaming connection on this server. Please try again or switch to another server.',
        }
      case 'loading_stream':
      default:
        return {
          title: 'Preparing your episode',
          subtitle: 'Getting everything ready for your viewing experience...',
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
      {/* Cinematic Backdrop Image with Blur and Gradient Overlay */}
      {backdropImage && (
        <div
          className="player-loader__backdrop"
          style={{ backgroundImage: `url(${backdropImage})` }}
          aria-hidden="true"
        />
      )}
      <div className="player-loader__gradient-overlay" aria-hidden="true" />
      <div className="player-loader__ambient-glow" aria-hidden="true" />

      {/* Centered Composition */}
      <div className="player-loader__content">
        {/* 7Anime Branding */}
        <div className="player-loader__brand">
          <img src={logoImg} alt="7anime" className="player-loader__logo" />
        </div>

        {/* Animated Loading Indicator or Error Icon */}
        <div className="player-loader__indicator-wrap">
          {isError ? (
            <div className="player-loader__error-icon-box">
              <AlertCircle size={38} className="player-loader__error-icon" />
            </div>
          ) : (
            <div className="player-loader__spinner" role="status" aria-label="Loading video stream">
              <div className="player-loader__spinner-ring player-loader__spinner-ring--outer" />
              <div className="player-loader__spinner-ring player-loader__spinner-ring--inner" />
              <div className="player-loader__spinner-core" />
            </div>
          )}
        </div>

        {/* Status Typography */}
        <div className="player-loader__typography">
          <h2 className="player-loader__title">{statusDetails.title}</h2>
          <p className="player-loader__subtitle">{statusDetails.subtitle}</p>
        </div>

        {/* Anime Title, Episode, and Server Details Pill */}
        <div className="player-loader__meta-pill glass">
          <span className="player-loader__anime-name" title={anime.title}>
            {anime.title}
          </span>
          {episodeLabel && (
            <>
              <span className="player-loader__separator" aria-hidden="true">
                •
              </span>
              <span className="player-loader__ep-text">{episodeLabel}</span>
            </>
          )}
          <span className="player-loader__separator" aria-hidden="true">
            •
          </span>
          <span className="player-loader__server-text">
            {server === 'server1' ? (
              <Sparkles size={11} className="player-loader__server-icon" />
            ) : (
              <Radio size={11} className="player-loader__server-icon" />
            )}
            {serverLabel}
          </span>
        </div>

        {/* Error / Timeout Actions */}
        {isError && (
          <div className="player-loader__actions">
            {onRetry && (
              <Button variant="primary" onClick={onRetry} className="player-loader__action-btn">
                <RotateCcw size={15} />
                Try Again
              </Button>
            )}

            <div className="player-loader__server-switches">
              {server !== 'server1' && onSelectServer && (
                <Button
                  variant="glass"
                  onClick={() => onSelectServer('server1')}
                  className="player-loader__server-btn"
                >
                  <Sparkles size={13} />
                  Switch to Server 1
                </Button>
              )}
              {server !== 'server2' && onSelectServer && (
                <Button
                  variant="glass"
                  onClick={() => onSelectServer('server2')}
                  className="player-loader__server-btn"
                >
                  <Radio size={13} />
                  Switch to Server 2
                </Button>
              )}
              {server !== 'server3' && onSelectServer && (
                <Button
                  variant="glass"
                  onClick={() => onSelectServer('server3')}
                  className="player-loader__server-btn"
                >
                  <Radio size={13} />
                  Switch to Server 3
                </Button>
              )}
            </div>

            {onBack && (
              <button
                type="button"
                className="player-loader__back-btn"
                onClick={onBack}
              >
                <ArrowLeft size={14} />
                Back to Details
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
