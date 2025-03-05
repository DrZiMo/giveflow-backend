import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { catchError } from '../../lib/catch.error'
import { resShort } from '../../lib/response'
import {
    IChangeCoverPic,
    IChangeProfilePic,
    ICreatePage,
    IDeletePageTemp,
    IRemoveProfilePic,
    IRestorePage,
    ISeacrPage,
    ISinglePage,
    IUpdatePage,
} from '../../types/page.types'
import { AuthRequest } from '../../types/request.types'
import { pageInclude } from '../../lib/include/page.include'
import cloudinary from '../../utils/cloudinary'

const prisma = new PrismaClient()

// get all pages
export const getAllPages = async (req: Request, res: Response) => {
    try {
        const pages = await prisma.giving_page.findMany({
            include: pageInclude,
        })

        if (!pages.length) {
            resShort(res, 404, false, 'No giving pages found')
            return
        }

        res.status(200).json({
            ok: true,
            pages,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// get single page
export const getSinglePage = async (req: Request, res: Response) => {
    try {
        const { id }: ISinglePage = req.body

        if (!id) {
            resShort(res, 400, false, 'Enter the page ID')
            return
        }

        const page = await prisma.giving_page.findFirst({
            where: { id },
            include: pageInclude,
        })

        if (!page) {
            resShort(res, 404, false, 'The page is not found')
            return
        }

        res.status(200).json({
            ok: true,
            page,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// search page
export const searchPage = async (req: Request, res: Response) => {
    try {
        const { name }: ISeacrPage = req.body

        if (!name) {
            resShort(res, 400, false, 'Enter the name of the giving page')
            return
        }

        const searchedPages = await prisma.giving_page.findMany({
            where: {
                name: { contains: name },
            },
            include: pageInclude,
        })

        if (!searchedPages) {
            resShort(res, 404, false, 'No giving pages found')
            return
        }

        res.status(200).json({
            ok: true,
            pages: searchedPages,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// get my own pages
export const getUserPages = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.userId) {
            resShort(res, 400, false, 'No user ID provided')
            return
        }

        const pages = await prisma.giving_page.findMany({
            where: {
                created_by_id: req.userId,
            },
            include: pageInclude,
        })

        if (!pages) {
            resShort(res, 404, false, 'No giving pages found')
            return
        }

        res.status(200).json({
            ok: true,
            pages,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// create new giving page
export const createPage = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.userId) {
            resShort(res, 400, false, 'No user ID provided')
            return
        }
        const { name, description }: ICreatePage = req.body

        if (!name) {
            resShort(res, 400, false, 'Fill the name input')
        }

        const createdPage = await prisma.giving_page.create({
            data: {
                name,
                description: description ? description : '',
                profile_pic: '',
                cover_pic: '',
                created_by_id: req.userId,
            },
            include: pageInclude,
        })

        res.status(200).json({
            ok: true,
            page: createdPage,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// update giving page
export const updatePage = async (req: Request, res: Response) => {
    try {
        const { id, name, description }: IUpdatePage = req.body

        if (!id) {
            resShort(res, 400, false, 'Enter the page ID')
            return
        }

        if (!name && !description) {
            resShort(res, 400, false, 'Enter the name or the description')
            return
        }

        const isPage = await prisma.giving_page.findFirst({
            where: { id },
        })

        if (!isPage) {
            resShort(res, 404, false, 'Giving page is not found')
            return
        }

        const updatedPage = await prisma.giving_page.update({
            where: { id },
            data: {
                name,
                description,
            },
            include: pageInclude,
        })

        res.status(200).json({
            ok: true,
            page: updatedPage,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// change the profile picture
export const changeProfilePic = async (req: Request, res: Response) => {
    try {
        const { id }: IChangeProfilePic = req.body

        if (!id) {
            resShort(res, 404, false, 'Enter the ID')
            return
        }

        if (!req.file || !req.file.path) {
            resShort(res, 404, false, 'No file request sent')
            return
        }

        const page = await prisma.giving_page.findFirst({
            where: { id },
        })

        if (!page) {
            resShort(res, 404, false, 'Giving page is not found')
            return
        }

        // TODO: Cloudinary logic
        const cloudinaryUpload = await cloudinary.uploader.upload(
            req.file.path,
            { folder: 'profile_pics' }
        )
        const result = {
            path: cloudinaryUpload.secure_url,
            public_id: cloudinaryUpload.public_id,
        }
        await prisma.giving_page.update({
            where: { id },
            data: {
                profile_pic: result.path,
                profile_pic_public_id: result.public_id,
            },
        })

        resShort(
            res,
            200,
            true,
            'Profile picture changes successfully ' + result.path
        )
    } catch (error) {
        catchError(error, res)
    }
}

// change the cover picture
export const changeCoverPic = async (req: Request, res: Response) => {
    try {
        const { id, cover_pic }: IChangeCoverPic = req.body

        if (!id || !cover_pic) {
            resShort(res, 404, false, 'Fill all the inputs')
            return
        }

        const page = await prisma.giving_page.findFirst({
            where: { id },
        })

        if (!page) {
            resShort(res, 404, false, 'Giving page is not found')
            return
        }

        // TODO: Cloudinary logic
        await prisma.giving_page.update({
            where: { id },
            data: { cover_pic },
        })

        resShort(res, 200, true, 'Cover picture changes successfully')
    } catch (error) {
        catchError(error, res)
    }
}

// remove the profile picture
export const removeProfilePic = async (req: Request, res: Response) => {
    try {
        const { id, public_id }: IRemoveProfilePic = req.body

        if (!id) {
            resShort(res, 400, false, 'You must provide the giving page id')
            return
        }

        if (!public_id) {
            resShort(res, 400, false, 'You must provide the public id')
            return
        }

        const page = await prisma.giving_page.findFirst({
            where: { id },
        })

        if (!page) {
            resShort(res, 404, false, 'Giving page not found')
            return
        }

        const result = await cloudinary.uploader.destroy(public_id)

        if (result.result !== 'ok') {
            res.status(400).json({ error: 'Failed to delete image' })
            return
        }

        await prisma.giving_page.update({
            where: { id },
            data: { profile_pic: '', profile_pic_public_id: '' },
        })

        resShort(res, 200, true, 'Profile picture removed successfullly')
    } catch (error) {
        catchError(error, res)
    }
}

// remove the cover picture
export const removeCoverPic = async (req: Request, res: Response) => {
    try {
        const { id, public_id }: IRemoveProfilePic = req.body

        if (!id) {
            resShort(res, 400, false, 'You must provide the giving page id')
            return
        }

        if (!public_id) {
            resShort(res, 400, false, 'You must provide the public id')
            return
        }

        const page = await prisma.giving_page.findFirst({
            where: { id },
        })

        if (!page) {
            resShort(res, 404, false, 'Giving page not found')
            return
        }

        const result = await cloudinary.uploader.destroy(public_id)

        if (result.result !== 'ok') {
            res.status(400).json({ error: 'Failed to delete image' })
            return
        }

        await prisma.giving_page.update({
            where: { id },
            data: { cover_pic: '', cover_pic_public_id: '' },
        })

        resShort(res, 200, true, 'Profile picture removed successfullly')
    } catch (error) {
        catchError(error, res)
    }
}

// delete giving page
export const deletePageTemp = async (req: Request, res: Response) => {
    try {
        const { id }: IDeletePageTemp = req.body

        if (!id) {
            resShort(res, 400, false, 'Enter the ID')
            return
        }

        const page = await prisma.giving_page.findFirst({
            where: { id },
        })

        if (!page) {
            resShort(res, 404, false, 'Giving page is not found')
            return
        }

        if (page.is_deleted) {
            resShort(res, 400, false, 'Giving page is already deleted')
            return
        }

        await prisma.giving_page.update({
            where: { id },
            data: { is_deleted: true },
        })

        resShort(res, 200, true, 'Giving page is deleted successfully')
    } catch (error) {
        catchError(error, res)
    }
}

// get the page recycle pin
export const getDeletedPages = async (req: Request, res: Response) => {
    try {
        const deletedPages = await prisma.giving_page.findMany({
            where: { is_deleted: true },
        })

        if (!deletedPages) {
            resShort(res, 404, false, 'No deleted giving pages')
            return
        }

        res.status(200).json({
            ok: true,
            users: deletedPages,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// restore giving page
export const restoreDeletedPage = async (req: Request, res: Response) => {
    try {
        const { id }: IRestorePage = req.body

        if (!id) {
            resShort(res, 400, false, 'You must provide ID')
            return
        }

        const page = await prisma.giving_page.findFirst({
            where: {
                id,
            },
        })

        if (!page) {
            resShort(res, 404, false, 'Giving page not found')
            return
        }

        if (!page.is_deleted) {
            resShort(res, 400, false, 'Giving page is already not deleted')
            return
        }

        await prisma.giving_page.update({
            where: {
                id,
            },
            data: {
                is_deleted: false,
            },
        })

        resShort(res, 200, true, `Giving page restored successfully`)
    } catch (error) {
        catchError(error, res)
    }
}

// delete page permenantly
export const deletePagePerm = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        if (!id) {
            resShort(res, 400, false, 'Enter the ID of the giving page')
            return
        }

        const page = await prisma.giving_page.findFirst({
            where: { id },
        })

        if (!page) {
            resShort(res, 404, false, 'Giving page is not found')
            return
        }

        await prisma.giving_page.delete({
            where: { id },
        })
    } catch (error) {
        catchError(error, res)
    }
}
