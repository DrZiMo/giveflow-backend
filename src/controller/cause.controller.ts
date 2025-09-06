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
import { causeInclude } from '../../lib/include/cause.include'
import { sendNotification } from '../../lib/send.notification'
import { AuthRequest } from '../../types/request.types'

const prisma = new PrismaClient()

// get all causes with the search, filter and cause
export const getAllCauses = async (req: Request, res: Response) => {
  try {
    const { search, category, sort } = req.query as {
      search?: string
      category?: string
      sort?: string
    }

    const whereClause: any = {}

    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive',
      }
    }

    if (category && category !== 'All') {
      whereClause.category = { name: category }
    }

    const causes = await prisma.cause.findMany({
      where: whereClause,
      include: {
        ...causeInclude,
        _count: { select: { like: true } },
        donation: true,
      },
    })

    if (!causes.length) {
      return resShort(res, 404, false, 'No causes found')
    }

    // JS sorting for special cases
    let sortedCauses = [...causes]

    switch (sort) {
      case 'Most Liked':
        sortedCauses.sort((a, b) => (b._count.like || 0) - (a._count.like || 0))
        break
      case 'Most Funded':
        sortedCauses.sort(
          (a, b) =>
            (b.donation.reduce((sum, d) => sum + d.amount, 0) || 0) -
            (a.donation.reduce((sum, d) => sum + d.amount, 0) || 0)
        )
        break
      case 'Nearly Funded':
        sortedCauses.sort(
          (a, b) =>
            (a.amount_needed -
              a.donation.reduce((sum, d) => sum + d.amount, 0) || 0) -
            (b.amount_needed -
              b.donation.reduce((sum, d) => sum + d.amount, 0) || 0)
        )
        break
      case 'Newest Causes':
        sortedCauses.sort(
          (a, b) => b.created_at.getTime() - a.created_at.getTime()
        )
        break
      case 'Oldest Causes':
        sortedCauses.sort(
          (a, b) => a.created_at.getTime() - b.created_at.getTime()
        )
        break
      case 'Highest Amount Needed':
        sortedCauses.sort((a, b) => b.amount_needed - a.amount_needed)
        break
      case 'Least Funded':
        sortedCauses.sort(
          (a, b) =>
            (a.donation.reduce((sum, d) => sum + d.amount, 0) || 0) -
            (b.donation.reduce((sum, d) => sum + d.amount, 0) || 0)
        )
        break
      case 'Urgency Level':
        sortedCauses.sort(
          (a, b) => Number(b.urgency_level) - Number(a.urgency_level)
        )
        break
      default:
        break
    }

    res.status(200).json({
      ok: true,
      causes: sortedCauses,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// get single cause
export const getSingleCause = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      resShort(res, 400, false, 'Enter the ID of the cause')
      return
    }

    const cause = await prisma.cause.findFirst({
      where: { id },
      include: causeInclude,
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

// get related causes
export const getRelatedCauses = async (req: Request, res: Response) => {
  try {
    const { cause_id }: { cause_id: string } = req.body

    if (!cause_id) {
      resShort(res, 400, false, 'Enter the cause ID')
      return
    }

    const cause = await prisma.cause.findFirst({
      where: { id: cause_id },
    })

    if (!cause) {
      resShort(res, 404, false, 'Cause is not found')
      return
    }

    const relatedCauses = await prisma.cause.findMany({
      where: { category_id: cause.category_id },
      include: causeInclude,
      take: 10,
    })

    if (!relatedCauses.length) {
      resShort(res, 404, false, 'No related causes found')
      return
    }

    res.status(200).json({
      ok: true,
      causes: relatedCauses,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// get all featured causes
export const getFeaturedCauses = async (req: Request, res: Response) => {
  try {
    const causes = await prisma.cause.findMany({
      where: { is_featured: true },
      include: causeInclude,
    })

    if (!causes.length) {
      resShort(res, 404, false, 'No featured causes')
      return
    }

    res.status(200).json({
      ok: true,
      causes,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// get temperorly deleted causes
export const getDeletedCauses = async (req: Request, res: Response) => {
  try {
    const deletedCauses = await prisma.cause.findMany({
      where: { is_deleted: true },
      include: causeInclude,
    })

    if (!deletedCauses.length) {
      resShort(res, 404, false, 'No deleted causes found')
      return
    }

    res.status(200).json({
      ok: true,
      causes: deletedCauses,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// search the cause
export const searchCause = async (req: Request, res: Response) => {
  try {
    const { name }: { name: string } = req.body

    if (!name) {
      resShort(res, 400, false, 'Enter the name')
      return
    }

    const causes = await prisma.cause.findMany({
      where: {
        name: { contains: name },
      },
      include: causeInclude,
    })

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

// get cause by category
export const causeByCategory = async (req: Request, res: Response) => {
  try {
    const { category_id }: { category_id: string } = req.body

    if (!category_id) {
      resShort(res, 400, false, 'Enter the category ID')
      return
    }

    const category = await prisma.category.findFirst({
      where: { id: category_id },
    })

    if (!category) {
      resShort(res, 404, false, 'Category is not found')
      return
    }

    const causes = await prisma.cause.findMany({
      where: { category_id },
      include: causeInclude,
    })

    if (!causes.length) {
      resShort(res, 404, false, 'No causes found')
      return
    }

    res.status(200).json({
      ok: true,
      causes,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// get cause by category
export const causeByUrgencyLevel = async (req: Request, res: Response) => {
  try {
    const { urgency_level }: { urgency_level: URGENCY_LEVEL } = req.body

    if (!urgency_level) {
      resShort(res, 400, false, 'Enter the urgency level')
      return
    }

    if (!Object.values(URGENCY_LEVEL).includes(urgency_level)) {
      resShort(res, 404, false, 'Urgency level is not valid')
      return
    }

    const causes = await prisma.cause.findMany({
      where: { urgency_level },
      include: causeInclude,
    })

    if (!causes.length) {
      resShort(res, 404, false, 'No causes found')
      return
    }

    res.status(200).json({
      ok: true,
      causes,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// addd new cause
export const addNewCause = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      short_description,
      long_description,
      amount_needed,
      category_id,
      urgency_level,
      expiration_date,
    }: IAddNewCause = req.body

    if (
      !name ||
      !amount_needed ||
      !urgency_level ||
      !category_id ||
      !expiration_date
    ) {
      resShort(res, 400, false, 'Fill all the inputs')
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

    let result = null
    if (req.file && req.file.path) {
      const cloudinaryUpload = await cloudinary.uploader.upload(req.file.path, {
        folder: 'cause_pics',
      })
      result = {
        path: cloudinaryUpload.secure_url,
        public_id: cloudinaryUpload.public_id,
      }
    }

    const newCause = await prisma.cause.create({
      data: {
        user_id: req.userId!,
        name,
        short_description: short_description ? short_description : '',
        long_description: long_description ? long_description : '',
        cause_pic: result ? result.path : '',
        cause_pic_public_id: result ? result.public_id : '',
        amount_needed,
        current_amount: 0,
        status: CAUSE_STATUS.INACTIVE,
        category_id,
        urgency_level,
        expiration_date,
      },
      include: causeInclude,
    })

    res.status(201).json({
      ok: false,
      cause: newCause,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// change cause picture
export const causePicture = async (req: Request, res: Response) => {
  try {
    const { cause_id }: { cause_id: string } = req.body

    if (!cause_id) {
      resShort(res, 400, false, 'Enter the cause ID')
      return
    }

    const cause = await prisma.cause.findUnique({
      where: { id: cause_id },
    })

    if (!cause) {
      resShort(res, 404, false, 'Cause is not found')
      return
    }

    if (!req.file || !req.file.path) {
      resShort(res, 400, false, 'No file request found')
      return
    }

    if (cause.cause_pic !== '') {
      await cloudinary.uploader.destroy(cause.cause_pic_public_id)
    }

    const cloudinaryUpload = await cloudinary.uploader.upload(req.file.path, {
      folder: 'cause_pics',
    })
    const result = {
      path: cloudinaryUpload.secure_url,
      public_id: cloudinaryUpload.public_id,
    }

    await prisma.cause.update({
      where: { id: cause.id },
      data: {
        cause_pic: result.path,
        cause_pic_public_id: result.public_id,
      },
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
      include: causeInclude,
    })

    res.status(200).json({
      ok: true,
      cause: updatedCause,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// get trending causes
export const getTrendingCauses = async (req: Request, res: Response) => {
  try {
    const trendingCauses = await prisma.cause.findMany({
      where: {
        is_deleted: false,
        is_expired: false,
        donation: {
          some: {
            donated_at: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
      orderBy: {
        donation: {
          _count: 'desc',
        },
      },
      take: 10,
      include: causeInclude,
    })

    if (!trendingCauses.length) {
      resShort(res, 404, false, 'No Trending causes at the moment')
      return
    }

    await prisma.cause.updateMany({
      where: {
        id: {
          in: trendingCauses.map((cause) => cause.id),
        },
      },
      data: {
        is_trending: true,
      },
    })

    await prisma.cause.updateMany({
      where: {
        id: {
          notIn: trendingCauses.map((cause) => cause.id),
        },
      },
      data: {
        is_trending: false,
      },
    })

    res.status(200).json({
      ok: true,
      causes: trendingCauses,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// toggle featured
export const toggleFeatured = async (req: Request, res: Response) => {
  try {
    const { cause_id }: { cause_id: string } = req.body

    if (!cause_id) {
      resShort(res, 400, false, 'Enter the cause ID')
      return
    }

    const cause = await prisma.cause.findFirst({
      where: { id: cause_id },
    })

    if (!cause) {
      resShort(res, 404, false, 'Cause is not found')
      return
    }

    if (cause.is_featured) {
      await prisma.cause.update({
        where: { id: cause.id },
        data: { is_featured: false },
      })

      resShort(res, 200, true, 'Cause is featured successfully')
      return
    } else {
      await prisma.cause.update({
        where: { id: cause.id },
        data: { is_featured: true },
      })

      resShort(res, 200, true, 'Cause is unfeatured successfully')
      return
    }
  } catch (error) {
    catchError(error, res)
  }
}

// get the number of donors for each cause
export const getNumberOfDonors = async (req: Request, res: Response) => {
  try {
    const { causeId } = req.params
    const donors = await prisma.donation.groupBy({
      by: ['user_id'],
      where: { cause_id: causeId },
      _sum: { amount: true },
    })

    const donorsCount = donors.length
    res.status(200).json({
      ok: true,
      donorsCount,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// like a cause
export const toggleLikeCause = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId

    if (!userId) {
      resShort(res, 400, false, 'No user ID provided')
      return
    }

    const { causeId } = req.params

    if (!causeId) {
      resShort(res, 400, false, 'No cause ID provided')
      return
    }

    const existing = await prisma.like.findUnique({
      where: { user_id_cause_id: { user_id: userId, cause_id: causeId } },
    })

    if (existing) {
      await prisma.like.delete({
        where: { user_id_cause_id: { user_id: userId, cause_id: causeId } },
      })

      res.status(200).json({
        ok: true,
        message: 'Cause liked successfully',
      })

      return
    } else {
      await prisma.like.create({
        data: { user_id: userId, cause_id: causeId },
      })

      res.status(200).json({
        ok: true,
        message: 'Cause disliked successfully',
      })

      return
    }
  } catch (error) {
    catchError(error, res)
  }
}
