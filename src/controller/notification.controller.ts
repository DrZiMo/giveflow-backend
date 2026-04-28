import { Request, RequestHandler, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../types/request.types'
import { catchError } from '../lib/catch.error'
import { resShort } from '../lib/response'
import { sendEmailHtml } from '../lib/send.email'

const prisma = new PrismaClient()

// get all notifications of one user
export const getAllNotification = async (req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        user: true,
      },
    })

    if (!notifications.length) {
      resShort(res, 404, false, 'No notifications found')
      return
    }

    res.status(200).json({
      ok: true,
      notifications,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// delete notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string

    if (!id) {
      resShort(res, 400, false, 'Enter the notification ID')
      return
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      resShort(res, 404, false, 'Notification is not found')
      return
    }

    await prisma.notification.delete({
      where: { id },
    })

    resShort(res, 200, true, 'Notification deleted successfully')
  } catch (error) {
    catchError(error, res)
  }
}

// create announcements
export const createAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const { title, message } = req.body

    if (!title || !message) {
      return res.status(400).json({ ok: false, message: 'Missing fields' })
    }

    // get users who opted in
    const users = await prisma.user.findMany({
      where: { user_settings: { some: { email_notifications: true } } },
      select: { id: true, email: true },
    })

    if (!users.length) {
      return res.status(200).json({ ok: true, message: 'No users to notify' })
    }

    // store notifications in DB
    await prisma.notification.create({
      data: {
        name: title,
        message,
        user_id: req.userId!,
        number_of_users: users.length,
      },
    })

    // send email
    for (const user of users) {
      await sendEmailHtml(user.email, title, `<p>${message}</p>`)
    }

    return res.status(201).json({ ok: true, message: 'Announcement sent' })
  } catch (error) {
    catchError(error, res)
  }
}
