/**
 * 7Anime Party Play — Shared Domain Types (Backend Copy)
 */

export type PartyRole = 'HOST' | 'MEMBER';

export type ParticipantStatus = 'ACTIVE' | 'DISCONNECTED' | 'LEFT' | 'KICKED';

export type PartyMediaType = 'movie' | 'tv';

export type PartyServerId = 'server1' | 'server2' | 'server3' | 'server4';

export type PartyAudioType = 'sub' | 'dub';

export interface PartyParticipantUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

export interface PartyParticipant {
  id: string;
  roomId: string;
  userId: string;
  role: PartyRole;
  status: ParticipantStatus;
  joinedAt: string;
  lastSeenAt: string;
  user: PartyParticipantUser;
}

export interface PartyPlaybackState {
  roomId: string;
  mediaType: PartyMediaType;
  anilistId: number;
  episodeNumber: number;
  audioType: PartyAudioType;
  serverId: PartyServerId;
  stateRevision: number;
  lastEventId: string;
  updatedAt: string;
  updatedBy: {
    userId: string;
    username: string;
    displayName: string | null;
  };
}

export interface PartyMessage {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

export interface PartyRoomDetails {
  id: string;
  code: string;
  inviteToken?: string; // Only returned to Host or upon initial creation/rotation
  ownerId: string;
  mediaType: PartyMediaType;
  maxParticipants: number;
  playback: PartyPlaybackState;
  participants: PartyParticipant[];
  messages: PartyMessage[];
  createdAt: string;
  expiresAt: string;
}

export interface CreatePartyRoomInput {
  anilistId: number;
  mediaType?: PartyMediaType;
  episodeNumber?: number;
  audioType?: PartyAudioType;
  serverId?: PartyServerId;
}

export interface JoinPartyRoomInput {
  tokenOrCode: string; // Either 64-char inviteToken or 8-char code
}

export interface ReenterPartyRoomInput {
  roomId: string;
}

export interface PlaybackSyncPayload {
  roomId: string;
  anilistId: number;
  episodeNumber: number;
  audioType: PartyAudioType;
  serverId: PartyServerId;
  expectedRevision: number;
}

export interface SendChatPayload {
  roomId: string;
  content: string;
}

export interface SendReactionPayload {
  roomId: string;
  emoji: string;
}

export interface PartyClosedPayload {
  roomId: string;
  reason: 'HOST_CLOSED' | 'HOST_LEFT' | 'HOST_STREAM_CLOSED' | 'HOST_GRACE_EXPIRED' | 'MOVIE_ENDED' | 'AUTO_EXPIRED';
  message: string;
  timestamp: string;
}
