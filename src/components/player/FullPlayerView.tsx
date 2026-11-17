import {
  ArrowLeft,
  Bookmark,
  Cast,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogIn,
  Maximize,
  Radio,
  Sparkles,
  Star,
  Users,
  Volume2,
} from 'lucide-react'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type {
  Anime,
  Episode,
} from '../../types/domain'

import {
  isMovieMediaType,
  resolveVideoEmbedUrl,
  type ServerId,
} from '../../services/videoResolver'
import { resolveMalId } from '../../services/malResolver'
import { AnimeTVPlusIframe } from './AnimeTVPlusIframe'
import { MegaPlayIframe } from './MegaPlayIframe'

import {
  fetchAnimeMapping,
} from '../../services/anilist'

import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ShareButton } from '../share/ShareButton'
import { EpisodeSidebar } from './EpisodeSidebar'
import { CastModal } from './CastModal'
import { PlayerLoadingOverlay, type PlayerLoadingState } from './PlayerLoadingOverlay'
import { isDevToolsActive, onDevToolsChange } from '../../utils/security'
import { DevToolsDecoyView } from '../security/DevToolsDecoyView'
import { usePartyPlay } from '../../context/PartyContext'
import { PartyBar } from '../party/PartyBar'
import { PartyReactionOverlay } from '../party/PartyReactionOverlay'
import { PartyDrawer } from '../party/PartyDrawer'
import type { PartyAudioType, PartyServerId, PartyPlaybackState } from '../../types/party'

import './player.css'

/* =========================================================
   FULL PLAYER VIEW
========================================================= */

export function FullPlayerView({
  anime,
  initialEpisode,
  isSaved,
  onToggleSave,
  onProgressUpdate,
  onBack,
  currentUserId,
}: {
  anime: Anime
  initialEpisode?: Episode
  isSaved?: boolean
  onToggleSave?: (anime: Anime) => void
  onProgressUpdate?: (
    animeId: string | number,
    episodeNumber: number,
    progressSeconds: number,
    durationSeconds: number,
    completed?: boolean,
  ) => void
  onBack: () => void
  currentUserId?: string
}) {
  /* =======================================================
     EPISODES
  ======================================================== */

  const episodes = useMemo(() => {
    if (
      anime.episodesList &&
      anime.episodesList.length > 0
    ) {
      return anime.episodesList
    }

    const count =
      anime.totalEpisodes &&
        anime.totalEpisodes > 0
        ? anime.totalEpisodes
        : 12

    return Array.from(
      {
        length: count,
      },
      (_, index) => ({
        id: `fallback-ep-${index + 1}`,
        number: index + 1,
        title: `Episode ${index + 1}`,
        thumbnail:
          anime.poster ||
          anime.cover ||
          '',
      }),
    )
  }, [anime])

  const initial =
    initialEpisode ||
    episodes[0]

  const [
    currentEpisode,
    setCurrentEpisode,
  ] = useState<
    Episode | undefined
  >(initial)

  const [
    server,
    setServer,
  ] = useState<
    ServerId | string
  >('server1')

  const [tmdbData, setTmdbData] = useState<{
    tmdbId?: number | null
    mediaType?: 'movie' | 'tv' | null
    season?: number
  }>({
    tmdbId: anime.tmdbId,
    mediaType: anime.mediaType || (isMovieMediaType(anime.type) ? 'movie' : 'tv'),
    season: anime.seasonNumber || 1,
  })

  const [mappingLoading, setMappingLoading] = useState<boolean>(!anime.tmdbId)
  const [mappingError, setMappingError] = useState<string | null>(null)
  const [isIframeLoaded, setIsIframeLoaded] = useState(false)
  const [iframeTimedOut, setIframeTimedOut] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // Resolved MAL ID fallback state (when anime.malId or currentEpisode.malId is missing)
  const [resolvedMalId, setResolvedMalId] = useState<number | null>(null)
  const [malResolving, setMalResolving] = useState<boolean>(false)

  // Background TMDB mapping fetch (preserves TMDB/IMDb metadata for upcoming Hindi features)
  useEffect(() => {
    if (anime.tmdbId) {
      setTmdbData({
        tmdbId: anime.tmdbId,
        mediaType: anime.mediaType || (isMovieMediaType(anime.type) ? 'movie' : 'tv'),
        season: anime.seasonNumber || 1,
      })
      setMappingLoading(false)
      setMappingError(null)
      return
    }

    let isMounted = true
    setMappingLoading(true)
    setMappingError(null)

    fetchAnimeMapping(anime.id)
      .then(data => {
        if (!isMounted) return
        if (data.tmdbId) {
          setTmdbData({
            tmdbId: data.tmdbId,
            mediaType: data.mediaType || (isMovieMediaType(anime.type) ? 'movie' : 'tv'),
            season: data.season || 1,
          })
          setMappingError(null)
        }
      })
      .catch(err => {
        if (!isMounted) return
        console.warn('[FullPlayerView] Background TMDB mapping not found or unavailable:', err)
      })
      .finally(() => {
        if (isMounted) {
          setMappingLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [anime.id, anime.tmdbId, anime.mediaType, anime.seasonNumber, anime.type])

  // Fallback: If Server 1 (AnimeTVPlus MAL) or Server 4 (MegaPlay MAL) is selected and MAL ID is missing, attempt backend resolution
  useEffect(() => {
    const activeMal = currentEpisode?.malId ?? anime.malId ?? resolvedMalId
    if (activeMal || (server !== 'server1' && server !== 'server4')) {
      return
    }

    let isMounted = true
    setMalResolving(true)

    resolveMalId({
      anilistId: anime.id,
      currentMalId: anime.malId,
      title: anime.title,
    })
      .then(id => {
        if (!isMounted) return
        if (id) {
          setResolvedMalId(id)
        }
      })
      .finally(() => {
        if (isMounted) {
          setMalResolving(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [server, anime.id, anime.malId, anime.title, currentEpisode?.malId, resolvedMalId, retryKey])

  const [
    autoNext,
    setAutoNext,
  ] = useState(true)

  const [
    inList,
    setInList,
  ] = useState(
    isSaved || false,
  )

  const [
    language,
    setLanguage,
  ] = useState<
    'sub' | 'dub'
  >('sub')

  const [isDescExpanded, setIsDescExpanded] = useState(false)
  const [isCastModalOpen, setIsCastModalOpen] = useState(false)

  // Party Play Integration
  const {
    room,
    isHost,
    openCreateModal,
    openJoinModal,
    toggleDrawer,
    unreadMessages,
    syncPlayback,
    closeRoom,
    setOnPlaybackChangeCallback,
  } = usePartyPlay()

  const handleSelectEpisode = useCallback((ep: Episode) => {
    setCurrentEpisode(ep)
    if (room) {
      syncPlayback({
        anilistId: Number(anime.id),
        episodeNumber: ep.number,
        audioType: language as PartyAudioType,
        serverId: (server as PartyServerId) || 'server1',
      })
    }
  }, [anime.id, language, room, server, syncPlayback])

  const handleSelectServer = useCallback((newServer: string) => {
    setServer(newServer)
    if (room && (newServer === 'server1' || newServer === 'server2' || newServer === 'server3' || newServer === 'server4')) {
      syncPlayback({
        anilistId: Number(anime.id),
        episodeNumber: currentEpisode?.number || 1,
        audioType: language as PartyAudioType,
        serverId: newServer as PartyServerId,
      })
    }
  }, [anime.id, currentEpisode?.number, language, room, syncPlayback])

  const handleSelectLanguage = useCallback((newLang: 'sub' | 'dub') => {
    setLanguage(newLang)
    if (room) {
      syncPlayback({
        anilistId: Number(anime.id),
        episodeNumber: currentEpisode?.number || 1,
        audioType: newLang,
        serverId: (server as PartyServerId) || 'server1',
      })
    }
  }, [anime.id, currentEpisode?.number, room, server, syncPlayback])

  useEffect(() => {
    setOnPlaybackChangeCallback((state: PartyPlaybackState) => {
      if (String(state.anilistId) === String(anime.id)) {
        if (currentEpisode && currentEpisode.number !== state.episodeNumber) {
          const targetEp = episodes.find((e) => e.number === state.episodeNumber)
          if (targetEp) {
            setCurrentEpisode(targetEp)
          }
        }
        if (state.audioType !== language) {
          setLanguage(state.audioType)
        }
        if (state.serverId !== server) {
          setServer(state.serverId)
        }
      }
    })

    return () => {
      setOnPlaybackChangeCallback(undefined)
    }
  }, [anime.id, currentEpisode, language, server, episodes, setOnPlaybackChangeCallback])

  const handleBackWithPartyCheck = useCallback(() => {
    if (room && isHost) {
      if (window.confirm('Leaving the video player as host will close the watch party for all participants. Are you sure you want to exit?')) {
        closeRoom()
        onBack()
      }
    } else {
      onBack()
    }
  }, [room, isHost, closeRoom, onBack])

  const [isDecoyActive, setIsDecoyActive] = useState(() => isDevToolsActive())

  useEffect(() => {
    return onDevToolsChange(detected => {
      console.log(`[PLAYER] security event=${detected}`)
      console.log(`[PLAYER] isDecoyActive=${detected}`)
      setIsDecoyActive(detected)
    })
  }, [])

  const iframeRef =
    useRef<
      HTMLIFrameElement
    >(null)

  /* =======================================================
     SYNC WATCHLIST
  ======================================================== */

  useEffect(() => {
    if (
      isSaved !== undefined
    ) {
      setInList(isSaved)
    }
  }, [isSaved])



  /* =======================================================
     INITIAL EPISODE
  ======================================================== */

  useEffect(() => {
    if (initialEpisode) {
      setCurrentEpisode(
        initialEpisode,
      )
    }
  }, [
    initialEpisode,
  ])

  /* =======================================================
     WATCH PROGRESS
     
     IMPORTANT:
     We do NOT fake 50% progress anymore.
     
     MegaPlay is loaded inside a cross-origin iframe.
     Therefore the parent page cannot directly access
     iframe.currentTime.
     
     We listen for player progress through postMessage.
  ======================================================== */

  const progressRef = useRef({
    episodeNumber:
      currentEpisode?.number ?? 0,

    progressSeconds: 0,

    durationSeconds:
      currentEpisode?.duration
        ? currentEpisode.duration *
        60
        : 0,
  })

  const lastSavedRef = useRef({
    progressSeconds: -1,
    durationSeconds: -1,
    completed: false,
    savedAt: 0,
  })

  /* =======================================================
     SAVE PROGRESS
  ======================================================== */

  const saveProgress =
    useCallback(
      (
        episodeNumber: number,
        progressSeconds: number,
        durationSeconds: number,
        completed = false,
        force = false,
      ) => {
        if (
          isDecoyActive ||
          isDevToolsActive() ||
          !anime.id ||
          episodeNumber <= 0
        ) {
          if (isDecoyActive || isDevToolsActive()) {
            console.log('[7anime player security] Player initialization blocked')
          }
          return
        }

        const safeDuration =
          Math.max(
            0,
            Math.floor(
              Number.isFinite(
                durationSeconds,
              )
                ? durationSeconds
                : 0,
            ),
          )

        const safeProgress =
          Math.max(
            0,
            Math.floor(
              Number.isFinite(
                progressSeconds,
              )
                ? progressSeconds
                : 0,
            ),
          )

        const clampedProgress =
          safeDuration > 0
            ? Math.min(
              safeProgress,
              safeDuration,
            )
            : safeProgress

        const shouldComplete =
          completed ||
          (
            safeDuration > 0 &&
            clampedProgress >=
            Math.floor(
              safeDuration * 0.9,
            )
          )

        const now =
          Date.now()

        const last =
          lastSavedRef.current

        /*
         * Supabase Egress Optimization:
         * Throttle background progress heartbeats to 15 seconds.
         * Force saves (pause, ended, episode switch, unmount) bypass this check immediately.
         */
        if (
          !force &&
          now - last.savedAt < 15000 &&
          Math.abs(
            clampedProgress -
            last.progressSeconds,
          ) < 15 &&
          safeDuration ===
          last.durationSeconds &&
          shouldComplete ===
          last.completed
        ) {
          return
        }

        lastSavedRef.current = {
          progressSeconds:
            clampedProgress,

          durationSeconds:
            safeDuration,

          completed:
            shouldComplete,

          savedAt: now,
        }

        onProgressUpdate?.(
          anime.id,
          episodeNumber,
          clampedProgress,
          safeDuration,
          shouldComplete,
        )
      },
      [
        anime.id,
        onProgressUpdate,
        isDecoyActive,
      ],
    )

  /* =======================================================
     EXTRACT PLAYER PROGRESS
  ======================================================== */

  const extractProgressFromMessage =
    useCallback(
      (
        event: MessageEvent,
      ) => {
        let data: unknown =
          event.data

        /*
         * Some players send JSON strings.
         */
        if (
          typeof data ===
          'string'
        ) {
          try {
            data =
              JSON.parse(data)
          } catch {
            return null
          }
        }

        if (
          !data ||
          typeof data !==
          'object'
        ) {
          return null
        }

        const root =
          data as Record<
            string,
            unknown
          >

        /*
         * Different player implementations
         * can wrap their payload differently.
         */
        const candidates:
          Record<
            string,
            unknown
          >[] = [root]

        for (
          const key of [
            'data',
            'detail',
            'payload',
            'progress',
          ]
        ) {
          const nested =
            root[key]

          if (
            nested &&
            typeof nested ===
            'object'
          ) {
            candidates.push(
              nested as Record<
                string,
                unknown
              >,
            )
          }
        }

        for (
          const candidate of
          candidates
        ) {
          const currentRaw =
            candidate.currentTime ??
            candidate.currentTimeSeconds ??
            candidate.progressSeconds ??
            candidate.progress ??
            candidate.position

          const durationRaw =
            candidate.duration ??
            candidate.durationSeconds ??
            candidate.totalDuration

          const current =
            typeof currentRaw ===
              'number'
              ? currentRaw
              : typeof currentRaw ===
                'string'
                ? Number(
                  currentRaw,
                )
                : NaN

          const duration =
            typeof durationRaw ===
              'number'
              ? durationRaw
              : typeof durationRaw ===
                'string'
                ? Number(
                  durationRaw,
                )
                : NaN

          if (
            Number.isFinite(
              current,
            ) &&
            current >= 0
          ) {
            return {
              progressSeconds:
                current,

              durationSeconds:
                Number.isFinite(
                  duration,
                ) &&
                  duration >= 0
                  ? duration
                  : progressRef
                    .current
                    .durationSeconds,

              completed:
                candidate.completed ===
                true ||
                candidate.ended ===
                true ||
                candidate.event ===
                'ended' ||
                candidate.type ===
                'ended',

              isPaused:
                candidate.paused ===
                true ||
                candidate.event ===
                'pause' ||
                candidate.type ===
                'pause',
            }
          }
        }

        return null
      },
      [],
    )

  /* =======================================================
     WATCH PROGRESS LISTENER
  ======================================================== */

  useEffect(() => {
    if (isDecoyActive || isDevToolsActive() || !currentEpisode) {
      if (isDecoyActive || isDevToolsActive()) {
        console.log('[7anime player security] Player initialization blocked')
      }
      return
    }

    /*
     * Reset progress state for the new episode.
     */
    progressRef.current = {
      episodeNumber:
        currentEpisode.number,

      progressSeconds: 0,

      durationSeconds:
        currentEpisode.duration
          ? currentEpisode.duration *
          60
          : 0,
    }

    lastSavedRef.current = {
      progressSeconds: -1,
      durationSeconds: -1,
      completed: false,
      savedAt: 0,
    }

    /*
     * Register the episode at 0 seconds.
     *
     * This is intentionally NOT 50%.
     */
    saveProgress(
      currentEpisode.number,
      0,
      progressRef.current
        .durationSeconds,
      false,
      true,
    )

    /* =====================================================
       RECEIVE PLAYER postMessage
    ===================================================== */

    const handleMessage = (
      event: MessageEvent,
    ) => {
      /*
       * Only accept messages from
       * our currently loaded iframe.
       */
      if (
        iframeRef.current
          ?.contentWindow &&
        event.source &&
        event.source !==
        iframeRef.current
          .contentWindow
      ) {
        return
      }

      setIsIframeLoaded(true)
      setIframeTimedOut(false)

      const progress =
        extractProgressFromMessage(
          event,
        )

      if (!progress) {
        return
      }

      progressRef.current.progressSeconds =
        progress.progressSeconds

      if (
        progress.durationSeconds >
        0
      ) {
        progressRef.current.durationSeconds =
          progress.durationSeconds
      }

      const shouldForce = progress.completed || progress.isPaused === true

      saveProgress(
        progressRef.current
          .episodeNumber,

        progressRef.current
          .progressSeconds,

        progressRef.current
          .durationSeconds,

        progress.completed,
        shouldForce,
      )
    }

    /* =====================================================
       SAVE WHEN PAGE IS LEAVING
    ===================================================== */

    const saveCurrentProgress =
      () => {
        saveProgress(
          progressRef.current
            .episodeNumber,

          progressRef.current
            .progressSeconds,

          progressRef.current
            .durationSeconds,

          false,
          true,
        )
      }

    window.addEventListener(
      'message',
      handleMessage,
    )

    window.addEventListener(
      'pagehide',
      saveCurrentProgress,
    )

    return () => {
      /*
       * Save latest known position
       * before changing episode/unmounting.
       */
      saveCurrentProgress()

      window.removeEventListener(
        'message',
        handleMessage,
      )

      window.removeEventListener(
        'pagehide',
        saveCurrentProgress,
      )
    }
  }, [
    currentEpisode?.number,
    currentEpisode?.duration,
    extractProgressFromMessage,
    saveProgress,
    isDecoyActive,
  ])

  /* =======================================================
     CURRENT EPISODE INDEX
  ======================================================== */

  const currentIndex =
    useMemo(() => {
      if (
        !currentEpisode
      ) {
        return -1
      }

      return episodes.findIndex(
        episode =>
          episode.id ===
          currentEpisode.id,
      )
    }, [
      episodes,
      currentEpisode,
    ])

  /* =======================================================
     STREAM URL (FOUR-SERVER ARCHITECTURE)
  ======================================================== */

  const activeMalId = currentEpisode?.malId ?? anime.malId ?? resolvedMalId

  const embedUrl = useMemo(() => {
    if (isDecoyActive || isDevToolsActive() || !currentEpisode) {
      if (isDecoyActive || isDevToolsActive()) {
        console.log('[7anime player security] Player initialization blocked')
      }
      return ''
    }

    return resolveVideoEmbedUrl({
      server,
      tmdbId: tmdbData.tmdbId,
      mediaType: tmdbData.mediaType,
      seasonNumber: tmdbData.season,
      malId: activeMalId,
      anilistId: anime.id,
      episodeNumber: currentEpisode.number,
      language,
    })
  }, [
    isDecoyActive,
    currentEpisode,
    server,
    activeMalId,
    anime.id,
    language,
    tmdbData.tmdbId,
    tmdbData.mediaType,
    tmdbData.season,
  ])

  /* =======================================================
     IFRAME LIFECYCLE & LOADING TIMEOUT
  ======================================================== */

  useEffect(() => {
    setIsIframeLoaded(false)
    setIframeTimedOut(false)

    if (!embedUrl) return

    // 24-second timeout before switching to actionable fallback state
    const timer = setTimeout(() => {
      setIsIframeLoaded(loaded => {
        if (!loaded) {
          setIframeTimedOut(true)
        }
        return loaded
      })
    }, 24000)

    return () => clearTimeout(timer)
  }, [embedUrl, retryKey])

  const playerLoaderState: PlayerLoadingState = useMemo(() => {
    if ((server === 'server1' || server === 'server4') && malResolving && !activeMalId) {
      return 'resolving_metadata'
    }
    if (iframeTimedOut && !isIframeLoaded) {
      return 'error'
    }
    if (!embedUrl) {
      return 'error'
    }
    if (!isIframeLoaded) {
      return 'loading_stream'
    }
    return 'ready'
  }, [server, malResolving, activeMalId, iframeTimedOut, isIframeLoaded, embedUrl])

  const playerErrorMessage = useMemo(() => {
    if (iframeTimedOut && !isIframeLoaded) {
      return 'Streaming connection timed out while loading the player. Please try again or switch to an alternate server.'
    }
    if (!embedUrl) {
      const serverNum = server === 'server1' ? 'Server 1' : server === 'server2' ? 'Server 2' : server === 'server3' ? 'Server 3' : 'Server 4'
      if ((server === 'server1' || server === 'server4') && !activeMalId) {
        return `Stream is currently unavailable on ${serverNum}. Please switch to Server 2 or Server 3.`
      }
      return `Stream route unavailable on ${serverNum}. Please switch to another server.`
    }
    return null
  }, [server, activeMalId, iframeTimedOut, isIframeLoaded, embedUrl])

  const handleRetryStream = useCallback(() => {
    setIsIframeLoaded(false)
    setIframeTimedOut(false)
    setRetryKey(k => k + 1)
  }, [])

  /* =======================================================
     PREVIOUS EPISODE
  ======================================================== */

  const goPrevious =
    useCallback(() => {
      if (
        currentIndex > 0
      ) {
        setCurrentEpisode(
          episodes[
          currentIndex - 1
          ],
        )
      }
    }, [
      currentIndex,
      episodes,
    ])

  /* =======================================================
     NEXT EPISODE
  ======================================================== */

  const goNext =
    useCallback(() => {
      if (
        currentIndex >= 0 &&
        currentIndex <
        episodes.length - 1
      ) {
        setCurrentEpisode(
          episodes[
          currentIndex + 1
          ],
        )
      }
    }, [
      currentIndex,
      episodes,
    ])

  /* =======================================================
     KEYBOARD CONTROLS
  ======================================================== */

  useEffect(() => {
    const handleKeyDown =
      (
        event: KeyboardEvent,
      ) => {
        if (
          event.target instanceof
          HTMLInputElement ||
          event.target instanceof
          HTMLSelectElement ||
          event.target instanceof
          HTMLTextAreaElement
        ) {
          return
        }

        if (
          event.code ===
          'ArrowLeft'
        ) {
          event.preventDefault()
          goPrevious()
        }

        if (
          event.code ===
          'ArrowRight'
        ) {
          event.preventDefault()
          goNext()
        }
      }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [
    goPrevious,
    goNext,
  ])

  /* =======================================================
     FULLSCREEN
  ======================================================== */

  const requestFullscreen =
    async () => {
      try {
        await iframeRef.current?.requestFullscreen()
      } catch {
        /*
         * Browser blocked fullscreen.
         */
      }
    }

  /* =======================================================
     DEVTOOLS DECOY OVERLAY
  ======================================================== */

  if (isDecoyActive || isDevToolsActive()) {
    console.log('[7anime player security] Player cleanup executed')
    return <DevToolsDecoyView />
  }

  /* =======================================================
     NO EPISODE STATE
  ======================================================== */

  if (!currentEpisode) {
    return (
      <section
        className="cinema-player"
        aria-label="Anime player"
      >
        <div className="cinema-player__topbar glass">
          <button
            type="button"
            className="cinema-player__back-btn"
            onClick={onBack}
          >
            <ArrowLeft
              size={16}
            />

            <span>
              Back to Details
            </span>
          </button>
        </div>

        <div
          className="cinema-player__stage cinema-player__stage--empty"
        >
          <div className="cinema-player__empty-notice">
            <Radio
              size={36}
              className="cinema-player__empty-icon"
            />

            <h2>
              Episodes Unavailable
            </h2>

            <p>
              No episodes were found
              for this anime. Please
              return to details or
              check back later.
            </p>

            <Button
              variant="glass"
              onClick={onBack}
            >
              Return to Anime Details
            </Button>
          </div>
        </div>
      </section>
    )
  }

  /* =======================================================
     MAIN PLAYER VIEW
  ======================================================== */

  return (
    <section
      className="cinema-player"
      aria-label="Cinema mode video player"
    >
      {(anime.cover || anime.poster) && (
        <div
          className="cinema-player__bg-art"
          style={{ backgroundImage: `url(${anime.cover || anime.poster})` }}
          aria-hidden="true"
        />
      )}
      {/* =================================================
          COMPACT ANIME HEADER
      ================================================== */}

      <header className="cinema-player__header cinema-player__topbar glass">
        <div className="cinema-player__header-left cinema-player__title-group">
          <button
            type="button"
            className="cinema-player__back-btn"
            onClick={handleBackWithPartyCheck}
            aria-label="Back to Anime Details"
            title="Back to Details"
          >
            <ArrowLeft size={16} />
            <span className="cinema-player__back-label">Back</span>
          </button>

          <div className="cinema-player__title-meta">
            <h2 className="cinema-player__anime-title" title={anime.title}>
              {anime.title}
            </h2>

            <div className="cinema-player__ep-badge">
              <span className="cinema-player__ep-tag">
                EP {currentEpisode.number}
              </span>

              <span className="cinema-player__ep-title">
                {currentEpisode.title}
              </span>
            </div>
          </div>
        </div>

        <div className="cinema-player__topbar-actions">
          {/* Watch Party Action */}
          {room ? (
            <button
              type="button"
              className="party-bar__btn cinema-player__party-btn"
              onClick={toggleDrawer}
              title="Open Watch Party Drawer"
            >
              <div className="party-bar__live-pill" style={{ margin: 0 }}>
                <span className="party-bar__live-dot" />
                <span>Party</span>
              </div>
              <Users size={14} />
              <span>
                {
                  room.participants.filter(
                    (p) => p.status === 'ACTIVE' || p.status === 'DISCONNECTED'
                  ).length
                }
              </span>
              {unreadMessages > 0 && (
                <span className="party-bar__badge">{unreadMessages}</span>
              )}
            </button>
          ) : (
            <>
              <Button
                variant="glass"
                className="cinema-player__party-btn"
                onClick={() =>
                  openCreateModal({
                    anilistId: Number(anime.id),
                    mediaType: isMovieMediaType(anime.type) ? 'movie' : 'tv',
                    episodeNumber: currentEpisode?.number || 1,
                    audioType: language as PartyAudioType,
                    serverId: (server as PartyServerId) || 'server1',
                  })
                }
                title="Start a Watch Party with friends"
              >
                <Users size={14} />
                <span>Party</span>
              </Button>

              <Button
                variant="glass"
                className="cinema-player__action-btn--join"
                onClick={() => openJoinModal()}
                title="Join a Watch Party with a room code or link"
              >
                <LogIn size={14} />
                <span>Join</span>
              </Button>
            </>
          )}

          <Button
            variant={inList ? 'success' : 'glass'}
            onClick={() => {
              setInList(value => !value)
              onToggleSave?.(anime)
            }}
            aria-label={inList ? 'In Watchlist' : 'Add to Watchlist'}
          >
            {inList ? <Check size={14} /> : <Bookmark size={14} />}
            <span>{inList ? 'In List' : 'Add to List'}</span>
          </Button>

          <ShareButton
            data={{
              title: `${anime.title} - EP ${currentEpisode.number}`,
              url:
                typeof window !== 'undefined'
                  ? window.location.href
                  : 'https://7anime.app',
              description: `Watching ${anime.title} Episode ${currentEpisode.number} on 7anime`,
            }}
          />
        </div>
      </header>

      {/* =================================================
          PLAYER LAYOUT
      ================================================== */}

      <div className="cinema-player__layout">
        <div className="cinema-player__stage-container">
          {/* Active Party Bar & Disconnect Alert */}
          <PartyBar />

          {/* ===============================================
              VIDEO PLAYER STAGE
          ============================================== */}

          <div className="cinema-player__stage">
            <PartyReactionOverlay />
            <div
              className="cinema-player__ambient"
              aria-hidden="true"
            />

            {embedUrl && (
              (server === 'server1' || server === 'server2') ? (
                <AnimeTVPlusIframe
                  key={`animetvplus-${server}-${embedUrl}-${retryKey}`}
                  ref={iframeRef}
                  embedUrl={embedUrl}
                  title={`${anime.title} Episode ${currentEpisode?.number ?? 1}`}
                  className="cinema-player__iframe"
                  onLoad={() => {
                    setIsIframeLoaded(true)
                    setIframeTimedOut(false)
                  }}
                />
              ) : (
                <MegaPlayIframe
                  key={`megaplay-${server}-${embedUrl}-${retryKey}`}
                  ref={iframeRef}
                  embedUrl={embedUrl}
                  title={`${anime.title} Episode ${currentEpisode?.number ?? 1}`}
                  className="cinema-player__iframe"
                  onLoad={() => {
                    setIsIframeLoaded(true)
                    setIframeTimedOut(false)
                  }}
                />
              )
            )}

            {/* Premium Cinematic Loading & Error Transition Screen */}
            <PlayerLoadingOverlay
              state={playerLoaderState}
              anime={anime}
              currentEpisode={currentEpisode}
              server={server}
              errorMessage={playerErrorMessage}
              onRetry={handleRetryStream}
              onSelectServer={setServer}
              onBack={onBack}
            />
          </div>

          {/* ===============================================
              PRIMARY CONTROL DECK (DIRECTLY UNDER PLAYER)
          ============================================== */}

          <div className="cinema-player__deck glass">
            {/* Row 1: Quick Episode Navigation */}
            <div className="cinema-player__nav-row">
              <button
                type="button"
                className="cinema-player__nav-btn cinema-player__nav-btn--prev cinema-player__control-btn"
                onClick={goPrevious}
                disabled={currentIndex <= 0}
                aria-label="Previous episode"
                title="Previous Episode (←)"
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <div className="cinema-player__ep-dropdown-wrap">
                <span className="cinema-player__ep-dropdown-text">
                  Episode {currentEpisode.number} of {episodes.length}
                </span>
                <ChevronDown size={14} className="cinema-player__dropdown-icon" />
                <select
                  value={currentEpisode.id}
                  onChange={event => {
                    const episode = episodes.find(
                      item => item.id === event.target.value
                    )
                    if (episode) {
                      setCurrentEpisode(episode)
                    }
                  }}
                  className="cinema-player__select"
                  aria-label="Jump to Episode"
                >
                  {episodes.map(episode => (
                    <option key={episode.id} value={episode.id}>
                      EP {episode.number}: {episode.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="cinema-player__nav-btn cinema-player__nav-btn--next cinema-player__control-btn"
                onClick={goNext}
                disabled={currentIndex < 0 || currentIndex >= episodes.length - 1}
                aria-label="Next episode"
                title="Next Episode (→)"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Row 2: Playback Toolbar & Party Group */}
            <div className="cinema-player__toolbar cinema-player__mobile-actions">
              <div className="cinema-player__toolbar-left">
                <label
                  className="cinema-player__autonext"
                  title="Automatically start next episode"
                >
                  <input
                    type="checkbox"
                    checked={autoNext}
                    onChange={event => setAutoNext(event.target.checked)}
                  />
                  <span className="cinema-player__switch-track">
                    <span className="cinema-player__switch-thumb" />
                  </span>
                  <span className="cinema-player__switch-label">Auto Next</span>
                </label>
              </div>

              <div className="cinema-player__toolbar-right cinema-player__mobile-utility-btns">
                {/* Watch Party Action Cluster */}
                {room ? (
                  <button
                    type="button"
                    className="cinema-player__party-pill cinema-player__mobile-party-btn cinema-player__room-pill active"
                    onClick={toggleDrawer}
                    title="Open Watch Party Drawer"
                  >
                    <span className="party-bar__live-dot" />
                    <Users size={14} />
                    <span>
                      {
                        room.participants.filter(
                          (p) => p.status === 'ACTIVE' || p.status === 'DISCONNECTED'
                        ).length
                      }
                    </span>
                    {unreadMessages > 0 && (
                      <span className="party-bar__badge">{unreadMessages}</span>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="cinema-player__party-pill cinema-player__mobile-party-btn"
                      onClick={() =>
                        openCreateModal({
                          anilistId: Number(anime.id),
                          mediaType: isMovieMediaType(anime.type) ? 'movie' : 'tv',
                          episodeNumber: currentEpisode?.number || 1,
                          audioType: language as PartyAudioType,
                          serverId: (server as PartyServerId) || 'server1',
                        })
                      }
                      title="Start Watch Party"
                    >
                      <Users size={14} />
                      <span>Party</span>
                    </button>

                    <button
                      type="button"
                      className="cinema-player__party-pill cinema-player__party-pill--join cinema-player__mobile-party-btn cinema-player__mobile-party-btn--join"
                      onClick={() => openJoinModal()}
                      title="Join Watch Party with code"
                    >
                      <LogIn size={14} />
                      <span>Join</span>
                    </button>
                  </>
                )}

                {/* Quick Action Cluster */}
                <div className="cinema-player__quick-actions">
                  <button
                    type="button"
                    className={`cinema-player__control-btn icon-only ${inList ? 'active' : ''}`}
                    onClick={() => {
                      setInList(value => !value)
                      onToggleSave?.(anime)
                    }}
                    aria-label={inList ? 'Remove from List' : 'Add to List'}
                    title={inList ? 'In My List' : 'Add to List'}
                  >
                    {inList ? <Check size={16} /> : <Bookmark size={16} />}
                  </button>

                  <button
                    type="button"
                    className="cinema-player__control-btn icon-only"
                    onClick={() => setIsCastModalOpen(true)}
                    aria-label="Cast to Android TV / Chromecast"
                    title="Cast to TV"
                  >
                    <Cast size={16} />
                  </button>

                  <button
                    type="button"
                    className="cinema-player__control-btn icon-only"
                    onClick={requestFullscreen}
                    aria-label="Fullscreen player"
                    title="Fullscreen"
                  >
                    <Maximize size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===============================================
              STREAMING SERVERS & AUDIO CONFIGURATION PANEL
          ============================================== */}

          <div className="cinema-player__config-panel cinema-player__servers glass">
            {/* 2x2 Streaming Servers Grid */}
            <div className="cinema-player__server-group">
              <div className="cinema-player__section-header">
                <div className="cinema-player__section-title-wrap">
                  <Radio size={13} className="cinema-player__section-icon" />
                  <span className="cinema-player__server-label">
                    STREAMING SERVERS
                  </span>
                </div>
                <span className="cinema-player__section-subnote">
                  Switch server if stream buffers or fails
                </span>
              </div>

              <div className="cinema-player__server-grid">
                <button
                  type="button"
                  className={`cinema-player__server-card cinema-player__server-chip ${
                    server === 'server1' ? 'active' : ''
                  }`}
                  onClick={() => handleSelectServer('server1')}
                  title="Server 1"
                >
                  <div className="cinema-player__server-card-top">
                    <span className="cinema-player__server-name">
                      <Sparkles size={13} className="cinema-player__server-icon" />
                      Server 1
                    </span>
                    <div className="cinema-player__server-badges">
                      <span className="server-badge server-badge--hd">HD</span>
                    </div>
                  </div>
                  <div className="cinema-player__server-card-sub">
                    <span>Multi-Audio</span>
                    {server === 'server1' && <Check size={13} className="cinema-player__server-check" />}
                  </div>
                </button>

                <button
                  type="button"
                  className={`cinema-player__server-card cinema-player__server-chip ${
                    server === 'server2' ? 'active' : ''
                  }`}
                  onClick={() => handleSelectServer('server2')}
                  title="Server 2"
                >
                  <div className="cinema-player__server-card-top">
                    <span className="cinema-player__server-name">
                      <Sparkles size={13} className="cinema-player__server-icon" />
                      Server 2
                    </span>
                    <div className="cinema-player__server-badges">
                      <span className="server-badge server-badge--fast">Fast</span>
                    </div>
                  </div>
                  <div className="cinema-player__server-card-sub">
                    <span>Sub & Dub</span>
                    {server === 'server2' && <Check size={13} className="cinema-player__server-check" />}
                  </div>
                </button>

                <button
                  type="button"
                  className={`cinema-player__server-card cinema-player__server-chip ${
                    server === 'server3' ? 'active' : ''
                  }`}
                  onClick={() => handleSelectServer('server3')}
                  title="Server 3"
                >
                  <div className="cinema-player__server-card-top">
                    <span className="cinema-player__server-name">
                      <Radio size={13} className="cinema-player__server-icon" />
                      Server 3
                    </span>
                    <div className="cinema-player__server-badges">
                      <span className="server-badge server-badge--backup">Backup</span>
                    </div>
                  </div>
                  <div className="cinema-player__server-card-sub">
                    <span>Fast Stream</span>
                    {server === 'server3' && <Check size={13} className="cinema-player__server-check" />}
                  </div>
                </button>

                <button
                  type="button"
                  className={`cinema-player__server-card cinema-player__server-chip ${
                    server === 'server4' ? 'active' : ''
                  }`}
                  onClick={() => handleSelectServer('server4')}
                  title="Server 4"
                >
                  <div className="cinema-player__server-card-top">
                    <span className="cinema-player__server-name">
                      <Radio size={13} className="cinema-player__server-icon" />
                      Server 4
                    </span>
                    <div className="cinema-player__server-badges">
                      <span className="server-badge server-badge--mirror">Mirror</span>
                    </div>
                  </div>
                  <div className="cinema-player__server-card-sub">
                    <span>Mirror Stream</span>
                    {server === 'server4' && <Check size={13} className="cinema-player__server-check" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Audio Track Selector */}
            <div className="cinema-player__audio-group">
              <div className="cinema-player__section-header">
                <div className="cinema-player__section-title-wrap">
                  <Volume2 size={13} className="cinema-player__section-icon" />
                  <span className="cinema-player__server-label">
                    AUDIO TRACK
                  </span>
                </div>
              </div>

              {server === 'server1' ? (
                <div className="cinema-player__audio-multi-card">
                  <div className="cinema-player__audio-multi-badge cinema-player__lang-chip active">
                    <Volume2 size={13} />
                    <span>Multi-Audio (In-Player)</span>
                  </div>
                  <p className="cinema-player__audio-multi-desc">
                    Multiple audio languages (Japanese, English, Spanish, etc.) can be switched directly inside the video player controls.
                  </p>
                </div>
              ) : (
                <div className="cinema-player__audio-segmented cinema-player__audio-grid">
                  <button
                    type="button"
                    className={`cinema-player__audio-pill cinema-player__lang-chip ${
                      language === 'sub' ? 'active' : ''
                    }`}
                    onClick={() => handleSelectLanguage('sub')}
                  >
                    <span className="cinema-player__audio-pill-title">SUB</span>
                    <span className="cinema-player__audio-pill-sub">Original Audio</span>
                  </button>

                  <button
                    type="button"
                    className={`cinema-player__audio-pill cinema-player__lang-chip ${
                      language === 'dub' ? 'active' : ''
                    }`}
                    onClick={() => handleSelectLanguage('dub')}
                  >
                    <span className="cinema-player__audio-pill-title">DUB</span>
                    <span className="cinema-player__audio-pill-sub">English Dub</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ===============================================
              ANIME INFORMATION CARD
          ============================================== */}

          <article className="cinema-player__info-card glass">
            <div className="cinema-player__info-poster">
              <img
                src={
                  anime.poster
                }
                alt={
                  anime.title
                }
                loading="lazy"
              />

              <div className="cinema-player__poster-overlay" />
            </div>

            <div className="cinema-player__info-body">
              <div className="cinema-player__info-header">
                <h3>
                  {anime.title}
                </h3>
              </div>

              <div className="cinema-player__info-meta">

                {anime.rating && (
                  <span
                    className="cinema-player__rating"
                    title="Rating"
                  >
                    <Star
                      size={14}
                      fill="currentColor"
                    />

                    <span>
                      {
                        anime.rating
                      }
                    </span>
                  </span>
                )}

                {anime.type && (
                  <Badge
                    tone="neutral"
                  >
                    {
                      anime.type
                    }
                  </Badge>
                )}

                {anime.status && (
                  <Badge
                    tone={
                      anime.status ===
                        'Airing'
                        ? 'success'
                        : 'neutral'
                    }
                  >
                    {
                      anime.status
                    }
                  </Badge>
                )}

                {anime.totalEpisodes &&
                  anime.totalEpisodes >
                  0 && (
                    <span className="cinema-player__meta-pill">
                      {
                        anime.totalEpisodes
                      }{" "}
                      Episodes
                    </span>
                  )}

                {anime.studio && (
                  <span className="cinema-player__studio-tag">
                    Studio:{' '}
                    <strong>
                      {
                        anime.studio
                      }
                    </strong>
                  </span>
                )}
              </div>

              {anime.synopsis && (
                <div className="cinema-player__synopsis-wrap">
                  <p className={`cinema-player__synopsis ${isDescExpanded ? 'expanded' : ''}`}>
                    {anime.synopsis}
                  </p>
                  {anime.synopsis.length > 100 && (
                    <button
                      type="button"
                      className="cinema-player__synopsis-toggle"
                      onClick={() => setIsDescExpanded(prev => !prev)}
                      aria-expanded={isDescExpanded}
                    >
                      {isDescExpanded ? 'Show less' : 'View more'}
                    </button>
                  )}
                </div>
              )}

              {anime.genres &&
                anime.genres.length >
                0 && (
                  <div className="cinema-player__genres">
                    {anime.genres.map(
                      genre => (
                        <span
                          key={
                            genre
                          }
                          className="cinema-player__genre-chip"
                        >
                          {
                            genre
                          }
                        </span>
                      ),
                    )}
                  </div>
                )}
            </div>
          </article>
        </div>

        {/* =================================================
            EPISODE SIDEBAR
        ================================================== */}

        <EpisodeSidebar
          episodes={
            episodes
          }
          currentEpisodeId={
            currentEpisode.id
          }
          onSelectEpisode={
            episode =>
              handleSelectEpisode(
                episode,
              )
          }
        />
      </div>

      <CastModal
        open={isCastModalOpen}
        onClose={() => setIsCastModalOpen(false)}
        animeTitle={anime.title}
        episodeNumber={currentEpisode?.number}
      />

      {/* Live Party Drawer (Chat & Participants) */}
      <PartyDrawer currentUserId={currentUserId} />
    </section>
  )
}