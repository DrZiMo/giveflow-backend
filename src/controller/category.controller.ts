import { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'
import { catchError } from '../../lib/catch.error'
import { resShort } from '../../lib/response'

const prisma = new PrismaClient()

// get all categories
export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany()

        if (!categories.length) {
            resShort(res, 404, false, 'No categories found')
            return
        }

        res.status(200).json({
            ok: true,
            categories,
        })
    } catch (error) {
        catchError(error, res)
    }
}
