import { Request, Response } from 'express'
import { PrismaClient, ROLE } from '@prisma/client'
import { catchError } from '../../lib/catch.error'
import { userSelect } from '../../lib/select/user.select'
import { ISearchUser, ISingUpUser } from '../../types/user.types'
import argon2 from 'argon2'
import { generateToken } from '../../lib/jwt'

const prisma = new PrismaClient()

// get all users
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: userSelect,
        })

        if (!users.length) {
            res.status(404).json({
                ok: false,
                message: 'Users not found',
            })

            return
        }

        res.status(200).json({
            ok: true,
            users,
        })

        return
    } catch (error) {
        catchError(error, res)
    }
}

// get single user by id, email, first name last name
export const getSingleUser = async (req: Request, res: Response) => {
    try {
        const { id, email, first_name, last_name }: ISearchUser = req.body

        if (!id && !email && !first_name && !last_name) {
            res.status(400).json({
                ok: false,
                message: 'You must provide ID, email, first name or last name',
            })

            return
        }

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    id ? { id } : {},
                    email ? { email } : {},
                    first_name ? { first_name } : {},
                    last_name ? { last_name } : {},
                ],
            },
            select: userSelect,
        })

        if (!users.length) {
            res.status(404).json({
                ok: false,
                message: 'No users found',
            })

            return
        }

        res.status(200).json({
            ok: true,
            users,
        })
    } catch (error) {
        catchError(error, res)
    }
}

// register user
export const singUp = async (req: Request, res: Response) => {
    try {
        const {
            first_name,
            last_name,
            email,
            password,
            confirm_password,
        }: ISingUpUser = req.body

        if (
            !first_name ||
            !last_name ||
            !email ||
            !password ||
            !confirm_password
        ) {
            res.status(400).json({
                ok: false,
                message: 'Fill all the inputs',
            })

            return
        }

        const isEmail = await prisma.user.findFirst({
            where: {
                email,
            },
        })

        if (isEmail) {
            res.status(400).json({
                ok: false,
                message: 'Email already exist',
            })

            return
        }

        if (password !== confirm_password) {
            res.status(400).json({
                ok: false,
                message: 'The password must match confirm password',
            })

            return
        }

        const hashedPassword = await argon2.hash(password)

        const newUser = await prisma.user.create({
            data: {
                first_name,
                last_name,
                email,
                password: hashedPassword,
                role: ROLE.USER,
                is_anonymous: false,
                is_deleted: false,
                is_verified: false,
            },
            select: userSelect,
        })

        if (!newUser) {
            throw new Error('Error while creating new user')
        }

        const { accessToken } = generateToken(newUser.id, res)

        res.status(200).json({
            ok: true,
            user: newUser,
            token: accessToken,
        })
    } catch (error) {
        catchError(error, res)
    }
}
