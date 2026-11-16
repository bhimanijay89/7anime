/**
 * 7Anime Party Play — Frontend API & Real-Time Socket Service
 * Handles REST endpoints and Socket.IO client communication.
 */

import { io, Socket } from 'socket.io-client'
import { BACKEND_URL } from './anilist'
import type {
  CreatePartyRoomInput,
  JoinPartyRoomInput,
  PartyRoomDetails,
  PartyPlaybackState,
  PartyMessage,
  PartyParticipant,
  PlaybackSyncPayload,
  SendChatPayload,
  SendReactionPayload,
  PartyClosedPayload,
} from '../types/party'

function getAuthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }
  const token = localStorage.getItem('7anime_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export interface ReactionBurstEvent {
  roomId: string
  userId: string
  username: string
  emoji: string
  timestamp: string
}

export interface HostDisconnectedEvent {
  roomId: string
  hostUserId: string
  graceExpiresAt: string
  gracePeriodSeconds: number
  message: string
}

export interface PartySocketCallbacks {
  onPlaybackUpdated?: (state: PartyPlaybackState) => void
  onChatMessage?: (message: PartyMessage) => void
  onReactionBurst?: (reaction: ReactionBurstEvent) => void
  onParticipantJoined?: (payload: { roomId: string; participant: PartyParticipant }) => void
  onParticipantLeft?: (payload: { roomId: string; userId: string; username: string }) => void
  onParticipantKicked?: (payload: { roomId: string; targetUserId: string }) => void
  onParticipantDisconnected?: (payload: { roomId: string; userId: string; username: string }) => void
  onHostDisconnected?: (payload: HostDisconnectedEvent) => void
  onHostReconnected?: (payload: { roomId: string; hostUserId: string; message: string }) => void
  onPartyClosed?: (payload: PartyClosedPayload) => void
  onError?: (payload: { code: string; message: string }) => void
  onConnect?: () => void
  onDisconnect?: (reason: string) => void
}

class PartyClientService {
  private socket: Socket | null = null
  private currentRoomId: string | null = null
  private callbacks: PartySocketCallbacks = {}

  /* =========================================================
     REST API METHODS
  ========================================================= */

  async createRoom(input: CreatePartyRoomInput): Promise<PartyRoomDetails> {
    const res = await fetch(`${BACKEND_URL}/api/party/rooms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
      credentials: 'include',
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      throw new Error(data.error?.message || `Failed to create watch party (HTTP ${res.status})`)
    }

    return data.data as PartyRoomDetails
  }

  async joinRoom(tokenOrCode: string): Promise<PartyRoomDetails> {
    const res = await fetch(`${BACKEND_URL}/api/party/rooms/join`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tokenOrCode }),
      credentials: 'include',
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      const err: any = new Error(data.error?.message || `Failed to join watch party (HTTP ${res.status})`)
      err.status = res.status
      err.code = data.error?.code
      err.details = data.error?.details
      throw err
    }

    return data.data as PartyRoomDetails
  }

  async reenterRoom(roomId: string): Promise<PartyRoomDetails> {
    const res = await fetch(`${BACKEND_URL}/api/party/rooms/reenter`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ roomId }),
      credentials: 'include',
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      throw new Error(data.error?.message || `Failed to re-enter watch party (HTTP ${res.status})`)
    }

    return data.data as PartyRoomDetails
  }

  async getRoomDetails(roomId: string): Promise<PartyRoomDetails> {
    const res = await fetch(`${BACKEND_URL}/api/party/rooms/${encodeURIComponent(roomId)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      throw new Error(data.error?.message || `Failed to fetch watch party details (HTTP ${res.status})`)
    }

    return data.data as PartyRoomDetails
  }

  async rotateInviteToken(roomId: string): Promise<{ inviteToken: string; expiresAt: string }> {
    const res = await fetch(`${BACKEND_URL}/api/party/rooms/${encodeURIComponent(roomId)}/rotate-token`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      throw new Error(data.error?.message || `Failed to rotate invite token (HTTP ${res.status})`)
    }

    return data.data
  }

  async leaveRoom(roomId: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/api/party/rooms/${encodeURIComponent(roomId)}/leave`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      throw new Error(data.error?.message || `Failed to leave watch party (HTTP ${res.status})`)
    }
  }

  async kickParticipant(roomId: string, targetUserId: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/api/party/rooms/${encodeURIComponent(roomId)}/kick`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetUserId }),
      credentials: 'include',
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      throw new Error(data.error?.message || `Failed to kick participant (HTTP ${res.status})`)
    }
  }

  async closeRoom(roomId: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/api/party/rooms/${encodeURIComponent(roomId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      throw new Error(data.error?.message || `Failed to close watch party (HTTP ${res.status})`)
    }
  }

  /* =========================================================
     SOCKET.IO REAL-TIME SUBSCRIPTION
  ========================================================= */

  connectSocket(roomId: string, callbacks: PartySocketCallbacks): Socket {
    this.currentRoomId = roomId
    this.callbacks = callbacks

    if (this.socket && this.socket.connected) {
      this.socket.emit('party:join', { roomId })
      return this.socket
    }

    const token = localStorage.getItem('7anime_token') || ''

    this.socket = io(BACKEND_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    this.socket.on('connect', () => {
      console.log('[PartyClient] Socket connected. Joining room:', roomId)
      this.socket?.emit('party:join', { roomId })
      this.callbacks.onConnect?.()
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[PartyClient] Socket disconnected:', reason)
      this.callbacks.onDisconnect?.(reason)
    })

    this.socket.on('party:joined-success', (payload) => {
      console.log('[PartyClient] Joined room successfully:', payload)
    })

    this.socket.on('playback:updated', (payload: PartyPlaybackState) => {
      this.callbacks.onPlaybackUpdated?.(payload)
    })

    this.socket.on('chat:message', (payload: PartyMessage) => {
      this.callbacks.onChatMessage?.(payload)
    })

    this.socket.on('reaction:burst', (payload: ReactionBurstEvent) => {
      this.callbacks.onReactionBurst?.(payload)
    })

    this.socket.on('participant:joined', (payload: { roomId: string; participant: PartyParticipant }) => {
      this.callbacks.onParticipantJoined?.(payload)
    })

    this.socket.on('participant:left', (payload: { roomId: string; userId: string; username: string }) => {
      this.callbacks.onParticipantLeft?.(payload)
    })

    this.socket.on('participant:kicked', (payload: { roomId: string; targetUserId: string }) => {
      this.callbacks.onParticipantKicked?.(payload)
    })

    this.socket.on('participant:disconnected', (payload: { roomId: string; userId: string; username: string }) => {
      this.callbacks.onParticipantDisconnected?.(payload)
    })

    this.socket.on('host:disconnected', (payload: HostDisconnectedEvent) => {
      this.callbacks.onHostDisconnected?.(payload)
    })

    this.socket.on('host:reconnected', (payload: { roomId: string; hostUserId: string; message: string }) => {
      this.callbacks.onHostReconnected?.(payload)
    })

    this.socket.on('party:closed', (payload: PartyClosedPayload) => {
      this.callbacks.onPartyClosed?.(payload)
    })

    this.socket.on('party:error', (payload: { code: string; message: string }) => {
      this.callbacks.onError?.(payload)
    })

    return this.socket
  }

  syncPlayback(payload: PlaybackSyncPayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('playback:sync-stream', payload)
    } else {
      console.warn('[PartyClient] Cannot sync stream: Socket not connected')
    }
  }

  sendChat(payload: SendChatPayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('chat:send', payload)
    } else {
      console.warn('[PartyClient] Cannot send chat: Socket not connected')
    }
  }

  sendReaction(payload: SendReactionPayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('reaction:send', payload)
    }
  }

  disconnectSocket(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.currentRoomId = null
    this.callbacks = {}
  }
}

export const partyService = new PartyClientService()
