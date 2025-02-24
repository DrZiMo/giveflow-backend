import { Request, Response } from 'express'
import { catchError } from '../../lib/catch.error'

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        res.status(200).json({
            ok: true,
            message: 'All Users',
        })

        return
    } catch (error) {
        catchError(error, res)
    }
}
