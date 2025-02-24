import { Response } from 'express'

export const catchError = (error: any, res: Response) => {
    console.log(error)
    res.status(500).json({
        ok: false,
        message: 'Something went wrong',
    })
}
