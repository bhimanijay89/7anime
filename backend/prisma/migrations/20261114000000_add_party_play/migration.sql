-- CreateEnum
CREATE TYPE "PartyRole" AS ENUM ('HOST', 'MEMBER');
CREATE TYPE "ParticipantStatus" AS ENUM ('ACTIVE', 'DISCONNECTED', 'LEFT', 'KICKED');
CREATE TYPE "PartyRoomStatus" AS ENUM ('ACTIVE');

-- CreateTable party_rooms
CREATE TABLE "party_rooms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "inviteTokenHash" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'tv',
    "anilistId" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL DEFAULT 1,
    "audioType" TEXT NOT NULL DEFAULT 'sub',
    "serverId" TEXT NOT NULL DEFAULT 'server1',
    "stateRevision" INTEGER NOT NULL DEFAULT 1,
    "lastEventId" TEXT NOT NULL,
    "lastUpdatedById" TEXT,
    "status" "PartyRoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxParticipants" INTEGER NOT NULL DEFAULT 10,
    "hostGraceExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "party_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable party_participants
CREATE TABLE "party_participants" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PartyRole" NOT NULL DEFAULT 'MEMBER',
    "status" "ParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable party_messages
CREATE TABLE "party_messages" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "party_rooms_code_key" ON "party_rooms"("code");
CREATE UNIQUE INDEX "party_rooms_inviteTokenHash_key" ON "party_rooms"("inviteTokenHash");
CREATE INDEX "party_rooms_status_expiresAt_hostGraceExpiresAt_idx" ON "party_rooms"("status", "expiresAt", "hostGraceExpiresAt");

CREATE UNIQUE INDEX "party_participants_roomId_userId_key" ON "party_participants"("roomId", "userId");
CREATE INDEX "party_participants_roomId_status_idx" ON "party_participants"("roomId", "status");

CREATE INDEX "party_messages_roomId_createdAt_idx" ON "party_messages"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "party_rooms" ADD CONSTRAINT "party_rooms_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_rooms" ADD CONSTRAINT "party_rooms_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys with ON DELETE CASCADE to guarantee automatic atomic cleanup upon room destruction
ALTER TABLE "party_participants" ADD CONSTRAINT "party_participants_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "party_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_participants" ADD CONSTRAINT "party_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "party_messages" ADD CONSTRAINT "party_messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "party_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_messages" ADD CONSTRAINT "party_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
