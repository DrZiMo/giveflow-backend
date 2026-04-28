import { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'
import { catchError } from '../lib/catch.error'
import { resShort } from '../lib/response'
import { ISearchCategory } from '../types/category.types'
import { categoryInclude } from '../lib/include/category.include'

const prisma = new PrismaClient()

// get all categories
export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany({
            include: categoryInclude,
        })

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

// search category
export const searchCategory = async (req: Request, res: Response) => {
    try {
        const { category_name }: ISearchCategory = req.body

        if (!category_name) {
            resShort(res, 400, false, 'Enter the category name')
            return
        }

        const categories = await prisma.category.findMany({
            where: {
                name: {
                    contains: category_name,
                },
            },
            include: categoryInclude,
        })

        if (!categories.length) {
            resShort(res, 404, false, 'No category found')
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

// add new category
export const addNewCategory = async (req: Request, res: Response) => {
    try {
        const { name }: { name: string } = req.body

        if (!name) {
            resShort(res, 400, false, 'Enter the name')
            return
        }

        const isCategory = await prisma.category.findFirst({
            where: { name },
        })

        if (isCategory) {
            resShort(res, 400, false, 'Category already exist')
            return
        }

        const newCategory = await prisma.category.create({
            data: { name },
            include: categoryInclude,
        })

        res.status(200).json({
            ok: true,
            category: newCategory,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// update category
export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id, name }: { id: string; name: string } = req.body

        if (!id || !name) {
            resShort(res, 400, false, 'Enter the id and name')
            return
        }

        const category = await prisma.category.findUnique({
            where: { id },
        })

        if (!category) {
            resShort(res, 404, false, 'Category not found')
            return
        }

        const updatedCategory = await prisma.category.update({
            where: { id },
            data: { name },
            include: categoryInclude,
        })

        res.status(200).json({
            ok: true,
            category: updatedCategory,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// delete category
export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        if (!id) {
            resShort(res, 400, false, 'Enter the id')
            return
        }

        const category = await prisma.category.findUnique({
            where: { id },
        })

        if (!category) {
            resShort(res, 404, false, 'Category not found')
            return
        }

        await prisma.category.delete({
            where: { id },
        })

        resShort(res, 200, true, 'Category deleted successfully')
    } catch (error) {
        catchError(error, res)
    }
}
