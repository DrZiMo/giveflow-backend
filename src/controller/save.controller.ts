import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../../types/request.types'
import { catchError } from '../../lib/catch.error'
import { resShort } from '../../lib/response'
import { sendNotification } from '../../lib/send.notification'

const prisma = new PrismaClient()

// get the save later items of the user
export const getSaveLater = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      resShort(res, 400, false, 'No user ID provided')
      return
    }

    const savedCauses = await prisma.save_for_later.findMany({
      where: { user_id: req.userId },
    })

    if (!savedCauses.length) {
      resShort(res, 404, false, 'No saved causes found')
      return
    }

    res.status(200).json({
      ok: true,
      savedCauses,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// toggle saved cause
export const toggleSaveCause = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      resShort(res, 400, false, 'No user ID provided')
      return
    }

    const { cause_id }: { cause_id: string } = req.body

    if (!cause_id) {
      resShort(res, 400, false, 'Enter the cause ID')
      return
    }

    const cause = await prisma.cause.findUnique({
      where: { id: cause_id },
    })

    if (!cause) {
      resShort(res, 404, false, 'Cause is not found')
      return
    }

    const isCauseSaved = await prisma.save_for_later.findFirst({
      where: { user_id: req.userId, cause_id },
    })

    if (isCauseSaved) {
      await prisma.save_for_later.delete({
        where: { id: isCauseSaved.id },
      })

      resShort(res, 200, true, 'Cause removed from the save later')
      return
    } else {
      await prisma.save_for_later.create({
        data: {
          user_id: req.userId,
          cause_id,
        },
      })

      resShort(res, 200, true, 'Cause added to the save later')
      return
    }
  } catch (error) {
    catchError(error, res)
  }
}

// clear all saved causes
export const clearAllSaves = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      resShort(res, 400, false, 'No user ID provided')
      return
    }

    const saves = await prisma.save_for_later.findMany({
      where: { user_id: req.userId },
    })

    if (!saves.length) {
      resShort(res, 404, false, 'No saves found for you')
      return
    }

    await prisma.save_for_later.deleteMany({
      where: { user_id: req.userId },
    })

    resShort(res, 200, true, 'Saves cleared successfully for this user')
  } catch (error) {
    catchError(error, res)
  }
}

// get users save list by the admin
export const userSavesAdmin = async (req: Request, res: Response) => {
  try {
    const { userId }: { userId: number } = req.body

    if (!userId) {
      resShort(res, 400, false, 'Enter the user ID')
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    const userSaves = await prisma.save_for_later.findMany({
      where: { user_id: userId },
    })

    if (!userSaves.length) {
      resShort(res, 404, false, 'No saves for this user')
      return
    }

    res.status(200).json({
      ok: true,
      saves: userSaves,
    })
  } catch (error) {
    catchError(error, res)
  }
}
