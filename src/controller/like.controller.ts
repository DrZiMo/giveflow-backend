import { Response } from 'express'
import { AuthRequest } from '../../types/request.types'
import { PrismaClient } from '@prisma/client'
import { catchError } from '../../lib/catch.error'
import { resShort } from '../../lib/response'

const prisma = new PrismaClient()

export const getUserLikes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId

    if (!userId) {
      resShort(res, 400, false, 'No user ID provided')
      return
    }

    const userLikes = await prisma.like.findMany({
      where: { user_id: userId },
      select: {
        cause: true,
      },
    })

    res.status(200).json({
      ok: true,
      causes: userLikes,
    })
  } catch (error) {
    catchError(error, res)
  }
}
