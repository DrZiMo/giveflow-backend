import { CAUSE_STATUS, PrismaClient, URGENCY_LEVEL } from '@prisma/client'
import { catchError } from '../../lib/catch.error'
import { Request, Response } from 'express'
import { resShort } from '../../lib/response'
import {
    IAddNewCause,
    IGetSingleCause,
    IUpdateCause,
} from '../../types/cause.types'
import cloudinary from '../../utils/cloudinary'

const prisma = new PrismaClient()

// get all the causes
export const getAllCauses = async (req: Request, res: Response) => {
    try {
        const causes = await prisma.cause.findMany()

        if (!causes.length) {
            resShort(res, 404, false, 'No causes found')
            return
        }

        res.status(200).json({
            ok: false,
            causes,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// get single cause
export const getSingleCause = async (req: Request, res: Response) => {
    try {
        const { id }: IGetSingleCause = req.body

        if (!id) {
            resShort(res, 400, false, 'Enter the ID of the cause')
            return
        }

        const cause = await prisma.cause.findFirst({
            where: { id },
        })

        if (!cause) {
            resShort(res, 404, false, 'Cause not found')
            return
        }

        res.status(200).json({
            ok: true,
            cause,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// addd new cause
export const addNewCause = async (req: Request, res: Response) => {
    try {
        const {
            giving_page_id,
            name,
            short_description,
            long_description,
            amount_needed,
            category_id,
            urgency_level,
            expiration_date,
        }: IAddNewCause = req.body

        if (!req.file || !req.file.path) {
            resShort(res, 400, false, 'No file request found')
            return
        }

        if (
            !giving_page_id ||
            !name ||
            !amount_needed ||
            !urgency_level ||
            !category_id ||
            !expiration_date
        ) {
            resShort(res, 400, false, 'Fill all the inputs')
            return
        }

        const giving_page = await prisma.giving_page.findFirst({
            where: { id: giving_page_id },
        })

        if (!giving_page) {
            resShort(res, 404, false, 'Giving page not found')
            return
        }

        const category = await prisma.category.findFirst({
            where: { id: category_id },
        })

        if (!category) {
            resShort(res, 404, false, 'Category not found')
            return
        }

        if (!Object.values(URGENCY_LEVEL).includes(urgency_level)) {
            resShort(res, 400, false, 'Invalid urgency level')
            return
        }

        const cloudinaryUpload = await cloudinary.uploader.upload(
            req.file.path,
            { folder: 'cause_pics' }
        )
        const result = {
            path: cloudinaryUpload.secure_url,
            public_id: cloudinaryUpload.public_id,
        }

        const newCause = await prisma.cause.create({
            data: {
                giving_page_id,
                name,
                short_description: short_description ? short_description : '',
                long_description: long_description ? long_description : '',
                cause_pic: result.path,
                cause_pic_public_id: result.public_id,
                amount_needed,
                current_amount: 0,
                status: CAUSE_STATUS.PENDING,
                category_id,
                urgency_level,
                expiration_date,
            },
        })

        res.status(200).json({
            ok: false,
            cause: newCause,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// delete cause temperorly
export const deleteCauseTemp = async (req: Request, res: Response) => {
    try {
        const { id } = req.body

        if (!id) {
            resShort(res, 400, false, 'Enter the ID')
            return
        }

        const cause = await prisma.cause.findFirst({
            where: { id },
        })

        if (!cause) {
            resShort(res, 404, false, 'Cause is not found')
            return
        }

        if (cause.is_deleted) {
            resShort(res, 400, false, 'Cause is already deleted')
            return
        }

        await prisma.cause.update({
            where: { id },
            data: { is_deleted: true },
        })

        resShort(res, 200, true, 'Cause deleted successfully')
    } catch (error) {
        catchError(error, res)
    }
}

// delete cause permenantly
export const deleteCausePerm = async (req: Request, res: Response) => {
    try {
        const { id } = req.body

        if (!id) {
            resShort(res, 400, false, 'Enter the ID')
            return
        }

        const cause = await prisma.cause.findFirst({
            where: { id },
        })

        if (!cause) {
            resShort(res, 404, false, 'Cause is not found')
            return
        }

        await prisma.cause.delete({
            where: { id },
        })

        resShort(res, 200, true, 'Cause deleted successfully')
    } catch (error) {
        catchError(error, res)
    }
}

// restore cause
export const restoreCause = async (req: Request, res: Response) => {
    try {
        const { id } = req.body

        if (!id) {
            resShort(res, 400, false, 'Enter the ID')
            return
        }

        const cause = await prisma.cause.findFirst({
            where: { id },
        })

        if (!cause) {
            resShort(res, 404, false, 'Cause is not found')
            return
        }

        if (!cause.is_deleted) {
            resShort(res, 400, false, 'Cause is not deleted')
            return
        }

        await prisma.cause.update({
            where: { id },
            data: { is_deleted: false },
        })

        resShort(res, 200, true, 'Cause restored successfully')
    } catch (error) {
        catchError(error, res)
    }
}

// update the cause
export const updateCause = async (req: Request, res: Response) => {
    try {
        const {
            id,
            name,
            short_description,
            long_description,
            amount_needed,
            expiration_date,
            urgency_level,
        }: IUpdateCause = req.body

        if (!id) {
            resShort(res, 400, false, 'Enter the ID')
            return
        }

        if (
            !name &&
            !short_description &&
            !long_description &&
            !amount_needed &&
            !expiration_date &&
            !urgency_level
        ) {
            resShort(res, 400, false, 'No fields to update')
            return
        }

        if (!Object.values(URGENCY_LEVEL).includes(urgency_level)) {
            resShort(res, 400, false, 'Invalid urgency level')
            return
        }

        const cause = await prisma.cause.findFirst({
            where: { id },
        })

        if (!cause) {
            resShort(res, 404, false, 'Cause is not found')
            return
        }

        const updatedCause = await prisma.cause.update({
            where: { id },
            data: {
                name,
                short_description,
                long_description,
                amount_needed,
                expiration_date,
                urgency_level,
            },
        })

        res.status(200).json({
            ok: true,
            cause: updatedCause,
        })
    } catch (error) {
        catchError(error, res)
    }
}
