process.env.NODE_ENV = 'development'
import 'dotenv/config'
import prisma from '../backend/dist/db/client.js'

async function check() {
  const user = await prisma.user.findFirst({ select: { id: true } })
  if (user) {
    console.log('--- EXECUTING findUnique ---')
    await prisma.watchProgress.findUnique({
      where: {
        userId_anilistId_episodeNumber: {
          userId: user.id,
          anilistId: 21,
          episodeNumber: 1,
        },
      },
      select: { id: true, progressSeconds: true, completed: true },
    })

    console.log('--- EXECUTING upsert ---')
    await prisma.watchProgress.upsert({
      where: {
        userId_anilistId_episodeNumber: {
          userId: user.id,
          anilistId: 21,
          episodeNumber: 99999,
        },
      },
      update: { progressSeconds: 150, durationSeconds: 1440, completed: false },
      create: { userId: user.id, anilistId: 21, episodeNumber: 99999, progressSeconds: 150, durationSeconds: 1440, completed: false },
      select: { id: true, progressSeconds: true, completed: true },
    })

    await prisma.watchProgress.deleteMany({
      where: { userId: user.id, anilistId: 21, episodeNumber: 99999 },
    })
  }
  await prisma.$disconnect()
}

check().catch(console.error)
