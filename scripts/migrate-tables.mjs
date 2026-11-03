import 'dotenv/config'
import prisma from '../backend/src/db/client.js'

async function migrate() {
  try {
    console.log('Applying DDL for anime_tmdb_mappings...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "anime_tmdb_mappings" (
          "anilistId" INTEGER NOT NULL,
          "tmdbId" INTEGER NOT NULL,
          "mediaType" TEXT NOT NULL DEFAULT 'tv',
          "season" INTEGER NOT NULL DEFAULT 1,
          "title" TEXT,
          "source" TEXT NOT NULL DEFAULT 'auto',
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "anime_tmdb_mappings_pkey" PRIMARY KEY ("anilistId")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anime_tmdb_mappings_tmdbId_idx" ON "anime_tmdb_mappings"("tmdbId");
    `)
    console.log('anime_tmdb_mappings table created or already exists.')

    console.log('Applying DDL for anime_tmdb_logos...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "anime_tmdb_logos" (
          "id" TEXT NOT NULL,
          "anilistId" INTEGER NOT NULL,
          "tmdbId" INTEGER,
          "mediaType" TEXT,
          "logoUrl" TEXT,
          "aspectRatio" DOUBLE PRECISION,
          "width" INTEGER,
          "height" INTEGER,
          "language" TEXT,
          "filePath" TEXT,
          "notFound" BOOLEAN NOT NULL DEFAULT false,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "anime_tmdb_logos_pkey" PRIMARY KEY ("id")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "anime_tmdb_logos_anilistId_key" ON "anime_tmdb_logos"("anilistId");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anime_tmdb_logos_anilistId_idx" ON "anime_tmdb_logos"("anilistId");
    `)
    console.log('anime_tmdb_logos table created or already exists.')

    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    console.log('Verification: Tables in public schema:', tables)
  } catch (err) {
    console.error('Migration failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

migrate()

