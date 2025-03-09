import { Request, RequestHandler, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../../types/request.types'
import { catchError } from '../../lib/catch.error'
import { resShort } from '../../lib/response'
import { ISendNotification } from '../../types/notification.types'

const prisma = new PrismaClient()

// get all notifications of one user
export const getAllNotification = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.userId) {
            resShort(res, 400, false, 'No user ID provided')
            return
        }

        const notifications = await prisma.notification.findMany({
            where: { user_id: req.userId },
            orderBy: { created_at: 'desc' },
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

// mark notification as readed
export const notificationReaded = async (req: Request, res: Response) => {
    try {
        const { id }: { id: string } = req.body

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

        await prisma.notification.update({
            where: { id },
            data: { is_read: true },
        })

        resShort(res, 200, true, 'Notification marked as readed')
    } catch (error) {
        catchError(error, res)
    }
}

// mark all notification as readed
export const allNotificationReaded = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.userId) {
            resShort(res, 400, false, 'No user ID provided')
            return
        }

        const notification = await prisma.notification.findMany({
            where: { user_id: req.userId },
        })

        if (!notification.length) {
            resShort(res, 404, false, 'Notifications are not found')
            return
        }

        await prisma.notification.updateMany({
            where: { user_id: req.userId },
            data: { is_read: true },
        })

        resShort(res, 200, true, 'All notifications are marked as readed')
    } catch (error) {
        catchError(error, res)
    }
}

// delete notification
export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

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

// delete all notifications
export const deleteAllNotifications = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.userId) {
            resShort(res, 400, false, 'No user ID provided')
            return
        }

        const notification = await prisma.notification.findMany({
            where: { user_id: req.userId },
        })

        if (!notification.length) {
            resShort(res, 404, false, 'No notifications found')
            return
        }

        await prisma.notification.deleteMany({
            where: { user_id: req.userId },
        })

        resShort(res, 200, true, 'Notifications are deleted successfully')
    } catch (error) {
        catchError(error, res)
    }
}

// get the number of unreaded messages
export const getNumberOfUnReaded = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.userId) {
            resShort(res, 400, false, 'No user ID provided')
            return
        }

        const count = await prisma.notification.count({
            where: { user_id: req.userId, is_read: false },
        })

        res.status(200).json({
            ok: true,
            count,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// send notification to all users
export const sendNotificationToAll = async (req: Request, res: Response) => {
    try {
        const { name, message }: ISendNotification = req.body

        if (!name || !message) {
            resShort(res, 400, false, 'Enter the name and the message')
            return
        }

        const users = await prisma.user.findMany({
            select: { id: true },
        })

        const notifications = users.map((user) => ({
            user_id: user.id,
            name,
            message,
        }))

        await prisma.notification.createMany({
            data: notifications,
        })

        resShort(
            res,
            200,
            true,
            'Notification is sent to all users successfully'
        )
    } catch (error) {
        catchError(error, res)
    }
}
