// lib/notification.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const sendNotification = async (
    userId: number,
    name: string,
    message: string
) => {
    try {
        await prisma.notification.create({
            data: {
                user_id: userId,
                name,
                message,
            },
        })
    } catch (error) {
        console.error('Error sending notification:', error)
    }
}
