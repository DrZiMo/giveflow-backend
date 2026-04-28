import { PrismaClient } from '@prisma/client'
import { ROLE } from '@prisma/client'
import { NextFunction, Response } from 'express'
import { AuthRequest } from '../types/request.types'
import { catchError } from '../lib/catch.error'

const prisma = new PrismaClient()

export const authorize = (role: ROLE[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.userId) {
                res.status(400).json({
                    ok: false,
                    message: 'No user ID provided',
                })

                return
            }
            const user = await prisma.user.findFirst({
                where: { id: req.userId },
            })

            if (!user) {
                res.status(404).json({
                    ok: false,
                    message: 'User not found',
                })

                return
            }

            if (!role.includes(user.role)) {
                res.status(403).json({
                    ok: false,
                    message: 'Forbidden',
                })

                return
            }

            next()
        } catch (error) {
            catchError(error, res)
        }
    }
}
