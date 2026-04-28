import { Response } from 'express'

export const resShort = (
    res: Response,
    statusCode: number,
    ok: boolean,
    message: string
) => {
    res.status(statusCode).json({
        ok,
        message,
    })
}
