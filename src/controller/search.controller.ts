import { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'
import { catchError } from '../../lib/catch.error'
import { AuthRequest } from '../../types/request.types'
import { resShort } from '../../lib/response'
import { IAddNewSearch, IDeleteSearch } from '../../types/search.types'

const prisma = new PrismaClient()

// get all searches
export const getAllSearches = async (req: Request, res: Response) => {
    try {
        const searches = await prisma.search_history.findMany({
            orderBy: { created_at: 'desc' },
        })

        if (!searches.length) {
            resShort(res, 404, false, 'No search history found')
            return
        }

        res.status(200).json({
            ok: true,
            searches,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// get all search histories of a user
export const getAllSearchesUser = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.userId) {
            resShort(res, 400, false, 'No user ID provided')
            return
        }

        const searches = await prisma.search_history.findMany({
            where: { user_id: req.userId },
            orderBy: { created_at: 'desc' },
        })

        res.status(200).json({
            ok: true,
            searches,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// add new search
export const newSearch = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.userId) {
            resShort(res, 400, false, 'No user ID provided')
            return
        }

        const { search }: IAddNewSearch = req.body

        if (!search) {
            resShort(res, 400, false, 'Enter the search')
            return
        }

        const newSearch = await prisma.search_history.create({
            data: {
                user_id: req.userId,
                search,
            },
        })

        res.status(200).json({
            ok: true,
            search: newSearch,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// delete one search
export const deleteSearch = async (req: Request, res: Response) => {
    try {
        const { search_id } = req.params

        if (!search_id) {
            resShort(res, 400, false, 'No search ID')
            return
        }

        const search = await prisma.search_history.findFirst({
            where: { id: search_id },
        })

        if (!search) {
            resShort(res, 404, false, 'Search is not found')
            return
        }

        await prisma.search_history.delete({
            where: { id: search.id },
        })

        resShort(res, 200, true, 'Search is deleted successfully')
    } catch (error) {
        catchError(error, res)
    }
}

// delete all searches
export const deleteAllSearches = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.userId) {
            resShort(res, 400, false, 'No user ID provided')
            return
        }

        const searches = await prisma.search_history.findMany({
            where: { user_id: req.userId },
        })

        if (!searches.length) {
            resShort(res, 404, false, 'No searches to delete')
            return
        }

        await prisma.search_history.deleteMany({
            where: { user_id: req.userId },
        })

        resShort(res, 200, true, 'All searches cleared successfully')
    } catch (error) {
        catchError(error, res)
    }
}
