import { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'
import { AuthRequest } from '../../types/request.types'

const prisma = new PrismaClient()

// get all settings
// export const getSettings = async (req: Request, res: Response) => {
//   try {
//     const settings = await prisma.user_settings.findMany()
//     if (!settings.length) {
//       res.status(404).json({ ok: false, message: 'No settings found' })
//       return
//     }

//     res.status(200).json({ ok: true, settings })
//   } catch (error) {
//     res.status(500).json({ ok: false, message: 'Failed to retrieve settings' })
//   }
// }

// create a new setting
export const createSetting = async (req: AuthRequest, res: Response) => {
  const {
    email_notifications,
    sms_notifications,
    push_notifications,
    news_letter,
    donation_receipts,
    donation_reminds,
  } = req.body

  try {
    const setting = await prisma.user_settings.create({
      data: {
        user_id: req.userId!,
        email_notifications,
        sms_notifications,
        push_notifications,
        news_letter,
        donation_receipts,
        donation_reminds,
      },
    })
    res.status(201).json({ ok: true, setting })
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to create setting' })
  }
}

// update a setting by id
export const updateSetting = async (req: Request, res: Response) => {
  const { id } = req.params
  const {
    email_notifications,
    sms_notifications,
    push_notifications,
    news_letter,
    donation_receipts,
    donation_reminds,
  } = req.body

  try {
    const setting = await prisma.user_settings.update({
      where: { id: id },
      data: {
        email_notifications,
        sms_notifications,
        push_notifications,
        news_letter,
        donation_receipts,
        donation_reminds,
      },
    })
    res.status(200).json({ ok: true, setting })
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to update setting' })
  }

  try {
    const setting = await prisma.user_settings.update({
      where: { id: id },
      data: {
        email_notifications,
        sms_notifications,
        push_notifications,
        news_letter,
        donation_receipts,
        donation_reminds,
      },
    })
    res.status(200).json({ ok: true, setting })
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to update setting' })
  }
}

// delete a setting by id
export const deleteSetting = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    await prisma.user_settings.delete({
      where: { id: id },
    })
    res.status(204).json({ ok: true })
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to delete setting' })
  }
}
