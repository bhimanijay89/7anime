/**
 * 7Anime Party Play — Global Party Context & State Management
 * Connects REST APIs, Socket.IO real-time stream sync, live chat, and reactions.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import type {
  PartyRoomDetails,
  PartyPlaybackState,
  PartyMessage,
  PartyParticipant,
  PartyParticipantUser,
  CreatePartyRoomInput,
  PartyClosedPayload,
  PartyAudioType,
  PartyServerId,
} from '../types/party'
import {
  partyService,
  type ReactionBurstEvent,
  type HostDisconnectedEvent,
} from '../services/partyService'
import { useToast } from '../components/ui/Toast'

export interface ActiveReaction {
  id: string
  emoji: string
  leftPercent: number
}

export interface PartyContextType {
  room: PartyRoomDetails | null
  isHost: boolean
  myParticipant: PartyParticipant | null
  isDrawerOpen: boolean
  activeTab: 'chat' | 'participants' | 'reactions' | 'room'
  unreadMessages: number
  reactions: ActiveReaction[]
  hostGraceCountdown: number | null
  closedInfo: PartyClosedPayload | null
  joinModalOpen: boolean
  createModalOpen: boolean
  createInitialData: Partial<CreatePartyRoomInput> | null
  openCreateModal: (initialData?: Partial<CreatePartyRoomInput>) => void
  closeCreateModal: () => void
  openJoinModal: (codeOrToken?: string) => void
  closeJoinModal: () => void
  toggleDrawer: () => void
  setDrawerOpen: (open: boolean) => void
  setActiveTab: (tab: 'chat' | 'participants' | 'reactions' | 'room') => void
  createRoom: (input: CreatePartyRoomInput) => Promise<PartyRoomDetails>
  joinRoom: (tokenOrCode: string) => Promise<PartyRoomDetails>
  leaveRoom: () => Promise<void>
  kickMember: (userId: string) => Promise<void>
  closeRoom: () => Promise<void>
  syncPlayback: (options: {
    anilistId: number
    episodeNumber: number
    audioType: PartyAudioType
    serverId: PartyServerId
  }) => void
  sendMessage: (content: string) => void
  sendReaction: (emoji: string) => void
  rotateInviteToken: () => Promise<string>
  dismissClosedModal: () => void
  onPlaybackChangeCallback?: (state: PartyPlaybackState) => void
  setOnPlaybackChangeCallback: (cb?: (state: PartyPlaybackState) => void) => void
  setAuthUserId: (id?: string) => void
}

const PartyContext = createContext<PartyContextType | null>(null)

export function PartyProvider({
  children,
  currentUserId: initialUserId,
}: {
  children: ReactNode
  currentUserId?: string
}) {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(() => {
    if (initialUserId) return initialUserId
    try {
      const stored = localStorage.getItem('7anime_user')
      if (stored) return JSON.parse(stored).id
    } catch {}
    return undefined
  })

  const setAuthUserId = useCallback((id?: string) => {
    setCurrentUserId(id)
  }, [])
  const [room, setRoom] = useState<PartyRoomDetails | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'reactions' | 'room'>('chat')
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [reactions, setReactions] = useState<ActiveReaction[]>([])
  const [hostGraceCountdown, setHostGraceCountdown] = useState<number | null>(null)
  const [closedInfo, setClosedInfo] = useState<PartyClosedPayload | null>(null)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createInitialData, setCreateInitialData] = useState<Partial<CreatePartyRoomInput> | null>(null)

  const playbackCallbackRef = useRef<((state: PartyPlaybackState) => void) | undefined>(undefined)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { notify } = useToast()

  const setOnPlaybackChangeCallback = useCallback((cb?: (state: PartyPlaybackState) => void) => {
    playbackCallbackRef.current = cb
  }, [])

  const isHost = Boolean(
    room && (
      (currentUserId && room.ownerId === currentUserId) ||
      room.participants.some(p => p.userId === currentUserId && p.role === 'HOST')
    )
  )

  const myParticipant = room && currentUserId
    ? room.participants.find(p => p.userId === currentUserId) || null
    : null

  // Clear countdown interval helper
  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setHostGraceCountdown(null)
  }, [])

  // Socket listener callbacks
  useEffect(() => {
    if (!room) return

    partyService.connectSocket(room.id, {
      onPlaybackUpdated: (updatedState) => {
        console.log('[PartyContext] Playback updated:', updatedState)
        setRoom((prev) => {
          if (!prev) return null
          return {
            ...prev,
            playback: updatedState,
          }
        })

        if (playbackCallbackRef.current) {
          playbackCallbackRef.current(updatedState)
        }

        const changer = updatedState.updatedBy?.displayName || updatedState.updatedBy?.username || 'Someone'
        const serverLabel =
          updatedState.serverId === 'server1'
            ? 'Server 1'
            : updatedState.serverId === 'server2'
            ? 'Server 2'
            : 'Server 3'
        notify(
          `${changer} synced to Ep ${updatedState.episodeNumber} (${updatedState.audioType.toUpperCase()}) on ${serverLabel}`,
          'info',
        )
      },

      onChatMessage: (message) => {
        setRoom((prev) => {
          if (!prev) return null
          // Avoid duplicate messages
          if (prev.messages.some((m) => m.id === message.id)) return prev
          return {
            ...prev,
            messages: [...prev.messages, message],
          }
        })

        // Increment unread count if drawer is closed or not on chat tab
        if (!isDrawerOpen || activeTab !== 'chat') {
          setUnreadMessages((count) => count + 1)
        }
      },

      onReactionBurst: (reaction) => {
        const id = `${reaction.userId}-${Date.now()}-${Math.random()}`
        const leftPercent = 15 + Math.random() * 70 // 15% to 85%
        setReactions((prev) => [...prev, { id, emoji: reaction.emoji, leftPercent }])

        // Remove reaction after 2.4s animation
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== id))
        }, 2400)
      },

      onParticipantJoined: ({ participant }) => {
        setRoom((prev) => {
          if (!prev) return null
          const rawUser: any = participant.user || participant
          const normalizedUser: PartyParticipantUser = {
            id: rawUser?.id || rawUser?.userId || participant.userId,
            username: rawUser?.username || 'Member',
            displayName: rawUser?.displayName || null,
            avatar: rawUser?.avatar || null,
          }
          const normalized: PartyParticipant = {
            id: participant.id || `p-${participant.userId}`,
            roomId: participant.roomId || prev.id,
            userId: participant.userId,
            role: participant.role || (prev.ownerId === participant.userId ? 'HOST' : 'MEMBER'),
            status: participant.status || 'ACTIVE',
            joinedAt: participant.joinedAt || new Date().toISOString(),
            lastSeenAt: participant.lastSeenAt || new Date().toISOString(),
            user: normalizedUser,
          }
          const existingIdx = prev.participants.findIndex((p) => p.userId === participant.userId)
          let updatedList = [...prev.participants]
          if (existingIdx >= 0) {
            updatedList[existingIdx] = normalized
          } else {
            updatedList.push(normalized)
          }
          return { ...prev, participants: updatedList }
        })
        const name = participant.user?.displayName || participant.user?.username || (participant as any).displayName || (participant as any).username || 'A member'
        notify(`${name} joined the watch party!`, 'info')
      },

      onParticipantLeft: ({ userId, username }) => {
        setRoom((prev) => {
          if (!prev) return null
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.userId === userId ? { ...p, status: 'LEFT' } : p
            ),
          }
        })
        notify(`${username} left the watch party.`, 'info')
      },

      onParticipantKicked: ({ targetUserId }) => {
        if (targetUserId === currentUserId) {
          // You were kicked
          partyService.disconnectSocket()
          setRoom(null)
          notify('You were removed from the watch party by the host.', 'error')
        } else {
          setRoom((prev) => {
            if (!prev) return null
            return {
              ...prev,
              participants: prev.participants.filter((p) => p.userId !== targetUserId),
            }
          })
        }
      },

      onParticipantDisconnected: ({ userId, username }) => {
        setRoom((prev) => {
          if (!prev) return null
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.userId === userId ? { ...p, status: 'DISCONNECTED' } : p
            ),
          }
        })
      },

      onHostDisconnected: (payload: HostDisconnectedEvent) => {
        notify('Host disconnected. 60s reconnect grace period initiated.', 'warning')
        const expiresAt = new Date(payload.graceExpiresAt).getTime()
        const updateRemaining = () => {
          const diff = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
          setHostGraceCountdown(diff)
          if (diff <= 0) {
            clearCountdown()
          }
        }
        updateRemaining()
        clearCountdown()
        countdownIntervalRef.current = setInterval(updateRemaining, 1000)
      },

      onHostReconnected: () => {
        clearCountdown()
        notify('Host has returned! Normal party play resumed.', 'info')
        setRoom((prev) => {
          if (!prev) return null
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.role === 'HOST' ? { ...p, status: 'ACTIVE' } : p
            ),
          }
        })
      },

      onPartyClosed: (payload: PartyClosedPayload) => {
        clearCountdown()
        partyService.disconnectSocket()
        setRoom(null)
        setClosedInfo(payload)
      },

      onError: (err) => {
        console.error('[PartyContext] Socket error:', err)
        notify(err.message, 'error')
      },
    })

    return () => {
      // Don't disconnect immediately on rerender if room didn't change
    }
  }, [room?.id, currentUserId, isDrawerOpen, activeTab, notify, clearCountdown])

  // Reset unread count when opening chat tab
  useEffect(() => {
    if (isDrawerOpen && activeTab === 'chat') {
      setUnreadMessages(0)
    }
  }, [isDrawerOpen, activeTab])

  /* =========================================================
     ACTIONS
  ========================================================= */

  const openCreateModal = useCallback((initialData?: Partial<CreatePartyRoomInput>) => {
    setCreateInitialData(initialData || null)
    setCreateModalOpen(true)
  }, [])

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false)
    setCreateInitialData(null)
  }, [])

  const openJoinModal = useCallback((codeOrToken?: string) => {
    if (codeOrToken) {
      setJoinModalOpen(true)
    } else {
      setJoinModalOpen(true)
    }
  }, [])

  const closeJoinModal = useCallback(() => {
    setJoinModalOpen(false)
  }, [])

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev)
  }, [])

  const setDrawerOpen = useCallback((open: boolean) => {
    setIsDrawerOpen(open)
  }, [])

  const createRoom = useCallback(async (input: CreatePartyRoomInput) => {
    const newRoom = await partyService.createRoom(input)
    setRoom(newRoom)
    setIsDrawerOpen(true)
    setCreateModalOpen(false)
    notify(`Watch Party created! Room Code: ${newRoom.code}`, 'info')
    return newRoom
  }, [notify])

  const joinRoom = useCallback(async (tokenOrCode: string) => {
    const joinedRoom = await partyService.joinRoom(tokenOrCode)
    setRoom(joinedRoom)
    setIsDrawerOpen(true)
    setJoinModalOpen(false)
    notify(`Joined Watch Party! (${joinedRoom.code})`, 'info')
    return joinedRoom
  }, [notify])

  const leaveRoom = useCallback(async () => {
    if (!room) return
    const roomId = room.id
    partyService.disconnectSocket()
    setRoom(null)
    setIsDrawerOpen(false)
    clearCountdown()

    try {
      await partyService.leaveRoom(roomId)
      notify('You left the watch party.', 'info')
    } catch (err) {
      console.warn('Failed to leave room cleanly:', err)
    }
  }, [room, clearCountdown, notify])

  const kickMember = useCallback(async (targetUserId: string) => {
    if (!room) return
    await partyService.kickParticipant(room.id, targetUserId)
    setRoom((prev) => {
      if (!prev) return null
      return {
        ...prev,
        participants: prev.participants.filter((p) => p.userId !== targetUserId),
      }
    })
    notify('Participant removed from the party.', 'info')
  }, [room, notify])

  const closeRoom = useCallback(async () => {
    if (!room) return
    const roomId = room.id
    clearCountdown()
    partyService.disconnectSocket()
    setRoom(null)
    setIsDrawerOpen(false)

    try {
      await partyService.closeRoom(roomId)
      notify('Watch Party closed.', 'info')
    } catch (err) {
      console.warn('Failed to close room cleanly:', err)
    }
  }, [room, clearCountdown, notify])

  const syncPlayback = useCallback((options: {
    anilistId: number
    episodeNumber: number
    audioType: PartyAudioType
    serverId: PartyServerId
  }) => {
    if (!room) return

    partyService.syncPlayback({
      roomId: room.id,
      anilistId: options.anilistId,
      episodeNumber: options.episodeNumber,
      audioType: options.audioType,
      serverId: options.serverId,
      expectedRevision: room.playback.stateRevision,
    })
  }, [room])

  const sendMessage = useCallback((content: string) => {
    if (!room || !content.trim()) return
    partyService.sendChat({
      roomId: room.id,
      content: content.trim(),
    })
  }, [room])

  const sendReaction = useCallback((emoji: string) => {
    if (!room || !emoji) return
    partyService.sendReaction({
      roomId: room.id,
      emoji,
    })
  }, [room])

  const rotateInviteToken = useCallback(async () => {
    if (!room) throw new Error('No active room')
    const { inviteToken } = await partyService.rotateInviteToken(room.id)
    setRoom((prev) => (prev ? { ...prev, inviteToken } : null))
    notify('New invite link generated! Old invite links have been revoked.', 'info')
    return inviteToken
  }, [room, notify])

  const dismissClosedModal = useCallback(() => {
    setClosedInfo(null)
  }, [])

  return (
    <PartyContext.Provider
      value={{
        room,
        isHost,
        myParticipant,
        isDrawerOpen,
        activeTab,
        unreadMessages,
        reactions,
        hostGraceCountdown,
        closedInfo,
        joinModalOpen,
        createModalOpen,
        createInitialData,
        openCreateModal,
        closeCreateModal,
        openJoinModal,
        closeJoinModal,
        toggleDrawer,
        setDrawerOpen,
        setActiveTab,
        createRoom,
        joinRoom,
        leaveRoom,
        kickMember,
        closeRoom,
        syncPlayback,
        sendMessage,
        sendReaction,
        rotateInviteToken,
        dismissClosedModal,
        setOnPlaybackChangeCallback,
        setAuthUserId,
      }}
    >
      {children}
    </PartyContext.Provider>
  )
}

export function usePartyPlay() {
  const context = useContext(PartyContext)
  if (!context) {
    throw new Error('usePartyPlay must be used within a PartyProvider')
  }
  return context
}
