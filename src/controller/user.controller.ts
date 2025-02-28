import { Request, Response } from 'express'
import { PrismaClient, ROLE } from '@prisma/client'
import { catchError } from '../../lib/catch.error'
import { userSelect } from '../../lib/select/user.select'
import { ILoginUser, ISearchUser, ISingUpUser } from '../../types/user.types'
import argon2 from 'argon2'
import { generateToken } from '../../lib/jwt'
import { AuthRequest } from '../../types/request.types'
import { resShort } from '../../lib/response'

const prisma = new PrismaClient()

// get all users
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: userSelect,
        })

        if (!users.length) {
            resShort(res, 404, false, 'Users not found')
            return
        }

        res.status(200).json({ ok: true, users })
        return
    } catch (error) {
        catchError(error, res)
    }
}

// get single user by id, email, first name last name
export const getSingleUser = async (req: Request, res: Response) => {
    try {
        const { id, email, phone_number, first_name, last_name }: ISearchUser =
            req.body

        if (!id && !email && phone_number && !first_name && !last_name) {
            resShort(
                res,
                400,
                false,
                'You must provide ID, email, phone number, first name or last name'
            )
            return
        }

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    id ? { id } : {},
                    email ? { email } : {},
                    phone_number ? { phone_number } : {},
                    first_name ? { first_name } : {},
                    last_name ? { last_name } : {},
                ],
            },
            select: userSelect,
        })

        if (!users.length) {
            resShort(res, 404, false, 'No users found')
            return
        }

        res.status(200).json({ ok: true, users })
    } catch (error) {
        catchError(error, res)
    }
}

// register user
export const signUp = async (req: Request, res: Response) => {
    try {
        const {
            first_name,
            last_name,
            email,
            phone_number,
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
            resShort(res, 400, false, 'Fill all the inputs')
            return
        }

        const isEmail = await prisma.user.findFirst({ where: { email } })

        if (isEmail) {
            resShort(res, 400, false, 'Email already exist')
            return
        }

        if (password !== confirm_password) {
            resShort(
                res,
                400,
                false,
                'The password must match confirm password'
            )
            return
        }

        const hashedPassword = await argon2.hash(password)

        const newUser = await prisma.user.create({
            data: {
                first_name,
                last_name,
                email,
                phone_number: '',
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
        res.status(200).json({ ok: true, user: newUser, token: accessToken })
    } catch (error) {
        catchError(error, res)
    }
}

// login
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password }: ILoginUser = req.body

        if (!email || !password) {
            resShort(res, 400, false, 'Fill all the inputs')
            return
        }

        const user = await prisma.user.findFirst({ where: { email } })

        if (!user) {
            resShort(res, 400, false, 'Invalid credentials')
            return
        }

        const isPassword = await argon2.verify(user.password, password)

        if (!isPassword) {
            resShort(res, 400, false, 'Invalid credentials')
            return
        }

        const { accessToken } = generateToken(user.id, res)
        res.status(200).json({ ok: true, user, token: accessToken })
    } catch (error) {
        catchError(error, res)
    }
}

// add phone number
export const addPhoneNumber = async (req: AuthRequest, res: Response) => {
    try {
        const { phone_number } = req.body

        if (!phone_number) {
            resShort(res, 400, false, 'No phone number provided')
            return
        }

        const isPhoneNumber = await prisma.user.findFirst({
            where: { phone_number },
            select: userSelect,
        })

        if (isPhoneNumber) {
            resShort(res, 400, false, 'Phone number already exists')
            return
        }

        await prisma.user.update({
            where: { id: req.userId },
            data: { phone_number },
        })
        resShort(res, 200, true, 'Phone number added successfully')
    } catch (error) {
        catchError(error, res)
    }
}

// logout
export const logout = async (req: AuthRequest, res: Response) => {
    try {
        const token = req.cookies.token

        if (!token) {
            resShort(res, 400, false, 'Already logged out')
            return
        }

        res.clearCookie('token')
        res.clearCookie('refresh_token')
        resShort(res, 200, true, 'Logged out successfully')
    } catch (error) {
        catchError(error, res)
    }
}

// who am i end point
export const whoami = async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findFirst({ where: { id: req.userId } })

        if (!user) {
            resShort(res, 404, false, 'User not found')
            return
        }

        res.status(200).json({
            ok: true,
            user,
        })
    } catch (error) {
        catchError(error, res)
    }
}
