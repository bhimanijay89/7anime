-- CreateTable
CREATE TABLE IF NOT EXISTS "anime_tmdb_mappings" (
    "anilistId" INTEGER NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'tv',
    "season" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT,
    "source" TEXT NOT NULL DEFAULT 'auto',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anime_tmdb_mappings_pkey" PRIMARY KEY ("anilistId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "anime_tmdb_mappings_tmdbId_idx" ON "anime_tmdb_mappings"("tmdbId");
