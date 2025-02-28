import { NextFunction, Response } from 'express'
import { catchError } from '../lib/catch.error'
import jwt from 'jsonwebtoken'
import { AuthRequest } from '../types/request.types'

interface JWTPayload {
    userId: number
}

export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.cookies.token

        if (!token) {
            res.status(401).json({
                ok: false,
                message: 'Unautherized - No token provided',
            })

            return
        }

        const user = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET as string
        ) as JWTPayload

        if (!user || !user.userId) {
            res.status(400).json({
                ok: false,
                message: 'Unautherized - Invalid token',
            })

            return
        }

        req.userId = user.userId

        next()
    } catch (error) {
        catchError(error, res)
    }
}
