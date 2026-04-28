import { PrismaClient } from '@prisma/client'
import cron from 'node-cron'
import { causeInclude } from '../lib/include/cause.include'

const prisma = new PrismaClient()

// every week: 0 0 * * 0
// every minu: * * * * *

cron.schedule('* * * * *', async () => {
  console.log('Updating weekly trending causes...')

  try {
    const trendingCauses = await prisma.cause.findMany({
      where: {
        is_deleted: false,
        is_expired: false,
        donation: {
          some: {
            donated_at: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
      orderBy: {
        donation: {
          _count: 'desc',
        },
      },
      take: 5,
      include: causeInclude,
    })

    // Update trending causes
    await prisma.cause.updateMany({
      where: {
        id: { in: trendingCauses.map((c) => c.id) },
      },
      data: { is_trending: true },
    })

    // Update non-trending causes
    await prisma.cause.updateMany({
      where: {
        id: { notIn: trendingCauses.map((c) => c.id) },
      },
      data: { is_trending: false },
    })

    console.log('Trending causes updated ✅')
  } catch (error) {
    console.error('Error updating trending causes:', error)
  }
})
