import 'dotenv/config'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

// Ensure .env is loaded even if imported early or cwd is nested
if (!process.env.DATABASE_URL) {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') })
    dotenv.config({ path: path.resolve(__dirname, '../../.env') })
  } catch {
    // ignore
  }
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const connectionString = process.env.DATABASE_URL

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log:
            process.env.NODE_ENV === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
    })

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}

export default prisma
