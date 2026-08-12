import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Anime, Episode } from '../../types/domain'
import { ShareButton } from '../share/ShareButton'
import { Badge } from '../ui/Badge'
import { Button, IconButton } from '../ui/Button'
import { EpisodeSidebar } from './EpisodeSidebar'
import './player.css'
import { ServerSelector } from './ServerSelector'

const defaultEpisodes: Episode[] = [
  { id: 'e1', number: 1, title: 'Rain & Chrome', duration: 24, watched: true, thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80' },
  { id: 'e2', number: 2, title: 'Ghosts in the Signal', duration: 23, watched: true, thumbnail: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=80' },
  { id: 'e3', number: 3, title: 'Katanas at Midnight', duration: 24, watched: true, thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80' },
  { id: 'e4', number: 4, title: 'Sub-Level Protocol', duration: 24, watched: false, thumbnail: 'https://images.unsplash.com/photo-1519608487953-e999c86e7454?auto=format&fit=crop&w=400&q=80' },
]

export function FullPlayerView({
  anime,
  initialEpisode,
  onBack
}: {
  anime: Anime
  initialEpisode?: Episode
  onBack: () => void
}) {
  const episodesList = anime.episodesList || defaultEpisodes
  const [currentEpisode, setCurrentEpisode] = useState<Episode>(initialEpisode || episodesList[0])
  const [isPlaying, setIsPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(38)
  const [speed, setSpeed] = useState('1.0x')
  const [quality, setQuality] = useState('1080p HD')

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        setIsPlaying(p => !p)
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        setProgress(p => Math.min(100, p + 5))
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        setProgress(p => Math.max(0, p - 5))
      } else if (e.key.toLowerCase() === 'm') {
        setMuted(m => !m)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleNextEpisode = () => {
    const idx = episodesList.findIndex(ep => ep.id === currentEpisode.id)
    if (idx !== -1 && idx < episodesList.length - 1) {
      setCurrentEpisode(episodesList[idx + 1])
      setProgress(0)
    }
  }

  const handlePrevEpisode = () => {
    const idx = episodesList.findIndex(ep => ep.id === currentEpisode.id)
    if (idx > 0) {
      setCurrentEpisode(episodesList[idx - 1])
      setProgress(0)
    }
  }

  return (
    <section className="cinema-player" aria-label="Cinema mode video player">
      <div className="cinema-player__topbar glass">
        <div className="cinema-player__title-group">
          <Button variant="glass" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Details
          </Button>
          <div>
            <h2>{anime.title}</h2>
            <p>EP {currentEpisode.number}: {currentEpisode.title}</p>
          </div>
        </div>
        <ShareButton
          data={{
            title: `${anime.title} - EP ${currentEpisode.number}`,
            url: typeof window !== 'undefined' ? window.location.href : 'https://7anime.app',
            description: `Watching ${anime.title} Episode ${currentEpisode.number} on 7anime`
          }}
        />
      </div>

      <div className="cinema-player__layout">
        <div className="cinema-player__stage-container">
          <div className="cinema-player__stage">
            <div className="cinema-player__ambient" />
            <img
              src={currentEpisode.thumbnail || anime.cover || anime.poster}
              alt=""
              className="stage-bg"
            />

            <div className="cinema-player__center-controls">
              <button
                className="cinema-player__seek-btn"
                onClick={() => setProgress(p => Math.max(0, p - 10))}
                aria-label="Rewind 10 seconds"
              >
                <RotateCcw size={18} />
              </button>
              <button
                className="cinema-player__big-btn"
                onClick={() => setIsPlaying(p => !p)}
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
              </button>
              <button
                className="cinema-player__seek-btn"
                onClick={() => setProgress(p => Math.min(100, p + 10))}
                aria-label="Fast forward 10 seconds"
              >
                <RotateCw size={18} />
              </button>
            </div>

            <button
              className="cinema-player__skip"
              onClick={() => setProgress(85)}
            >
              Skip Intro (+85s)
            </button>

            <div className="cinema-player__controls">
              <div
                className="cinema-player__scrub"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100)
                  setProgress(Math.max(0, Math.min(100, pct)))
                }}
              >
                <div
                  className="cinema-player__scrub-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="cinema-player__toolbar">
                <div className="cinema-player__toolbar-left">
                  <IconButton
                    label="Previous episode"
                    onClick={handlePrevEpisode}
                  >
                    <ChevronLeft size={16} />
                  </IconButton>
                  <IconButton
                    label={isPlaying ? 'Pause' : 'Play'}
                    onClick={() => setIsPlaying(p => !p)}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </IconButton>
                  <IconButton
                    label="Next episode"
                    onClick={handleNextEpisode}
                  >
                    <ChevronRight size={16} />
                  </IconButton>

                  <span>
                    {Math.floor((progress * 24 * 60) / 100 / 60)}:
                    {String(Math.floor(((progress * 24 * 60) / 100) % 60)).padStart(2, '0')} / 24:00
                  </span>
                </div>

                <div className="cinema-player__toolbar-right">
                  <IconButton
                    label={muted ? 'Unmute' : 'Mute'}
                    onClick={() => setMuted(m => !m)}
                  >
                    {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </IconButton>

                  <select
                    value={speed}
                    onChange={e => setSpeed(e.target.value)}
                    style={{ background: 'rgba(20,26,38,0.8)', color: '#fff', border: '1px solid var(--color-glass-border)', borderRadius: 'var(--radius-sm)', padding: '2px 6px', fontSize: '0.8rem' }}
                    aria-label="Playback speed"
                  >
                    <option value="0.75x">0.75x</option>
                    <option value="1.0x">1.0x</option>
                    <option value="1.25x">1.25x</option>
                    <option value="1.5x">1.5x</option>
                    <option value="2.0x">2.0x</option>
                  </select>

                  <select
                    value={quality}
                    onChange={e => setQuality(e.target.value)}
                    style={{ background: 'rgba(20,26,38,0.8)', color: '#fff', border: '1px solid var(--color-glass-border)', borderRadius: 'var(--radius-sm)', padding: '2px 6px', fontSize: '0.8rem' }}
                    aria-label="Video quality"
                  >
                    <option value="1080p HD">1080p HD</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                  </select>

                  <Badge tone="accent">SUB</Badge>

                  <IconButton label="Fullscreen">
                    <Maximize size={16} />
                  </IconButton>
                </div>
              </div>
            </div>
          </div>

          <ServerSelector />
        </div>

        <EpisodeSidebar
          episodes={episodesList}
          currentEpisodeId={currentEpisode.id}
          onSelectEpisode={ep => {
            setCurrentEpisode(ep)
            setProgress(0)
          }}
        />
      </div>
    </section>
  )
}
