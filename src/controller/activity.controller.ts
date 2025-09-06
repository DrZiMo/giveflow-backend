import { Response } from 'express'
import { AuthRequest } from '../../types/request.types'
import { catchError } from '../../lib/catch.error'
import { resShort } from '../../lib/response'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// get user recent activities
export const getUserActivities = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId

    if (!userId) {
      resShort(res, 400, false, 'User ID is not provided')
      return
    }

    const activities = await prisma.recent_activity.findMany({
      where: { user_id: userId },
      orderBy: {
        created_at: 'desc',
      },
      take: 5,
    })

    if (!activities.length) {
      resShort(res, 404, false, 'No activities found')
      return
    }

    res.status(200).json({
      ok: true,
      activities,
    })
  } catch (error) {
    catchError(error, res)
  }
}
