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

// change profile pic
export const changeProfilePic = async (req: AuthRequest, res: Response) => {
    try {
        // TODO: Add the cloudinary logic
        if (!req.userId) {
            resShort(res, 400, false, 'No user ID provided')
            return
        }

        const { profile_pic } = req.body

        if (!profile_pic) {
            resShort(res, 400, false, 'No Image provided')
            return
        }

        const user = await prisma.user.findFirst({
            where: {
                id: req.userId,
            },
        })

        if (!user) {
            resShort(res, 404, false, 'User not found')
            return
        }

        await prisma.user.update({
            where: { id: req.userId },
            data: { profile_pic },
        })

        resShort(res, 200, true, 'Profile picture changed successfullly')
    } catch (error) {
        catchError(error, res)
    }
}

// remove the profile pic
export const removeProfilePic = async (req: AuthRequest, res: Response) => {
    try {
        // TODO: Add the cloudinary logic
        if (!req.userId) {
            resShort(res, 400, false, 'No user ID provided')
            return
        }
        const user = await prisma.user.findFirst({
            where: {
                id: req.userId,
            },
        })

        if (!user) {
            resShort(res, 404, false, 'User not found')
            return
        }

        await prisma.user.update({
            where: { id: req.userId },
            data: { profile_pic: '' },
        })

        resShort(res, 200, true, 'Profile picture removed successfullly')
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

// delete user temperorly
export const deleteUserTemp = async (req: Request, res: Response) => {
    try {
        const { id } = req.body

        if (!id) {
            resShort(res, 400, false, 'You must provide ID')
            return
        }

        const user = await prisma.user.findFirst({
            where: {
                id,
            },
        })

        if (!user) {
            resShort(res, 404, false, 'User not found')
            return
        }

        if (user.is_deleted) {
            resShort(res, 400, false, 'User is already deleted')
            return
        }

        await prisma.user.update({
            where: {
                id,
            },
            data: {
                is_deleted: true,
            },
        })

        resShort(res, 200, true, `User deleted successfully`)
    } catch (error) {
        catchError(error, res)
    }
}

// restore user
export const restoreDeletedUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.body

        if (!id) {
            resShort(res, 400, false, 'You must provide ID')
            return
        }

        const user = await prisma.user.findFirst({
            where: {
                id,
            },
        })

        if (!user) {
            resShort(res, 404, false, 'User not found')
            return
        }

        if (!user.is_deleted) {
            resShort(res, 400, false, 'User is already not deleted')
            return
        }

        await prisma.user.update({
            where: {
                id,
            },
            data: {
                is_deleted: false,
            },
        })

        resShort(res, 200, true, `User restored successfully`)
    } catch (error) {
        catchError(error, res)
    }
}

// delete user permenantly by admin
export const deleteUserPerByAdmin = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        if (!id) {
            resShort(res, 400, false, 'You must provide ID')
            return
        }

        const user = await prisma.user.findFirst({
            where: {
                id: +id,
            },
        })

        if (!user) {
            resShort(res, 404, false, 'User not found')
            return
        }

        await prisma.user.delete({
            where: {
                id: +id,
            },
        })

        resShort(res, 200, true, `User ${user.id} deleted permenantly`)
    } catch (error) {
        catchError(error, res)
    }
}

// delete user permenantly by the user him self
export const deleteUserPerByUser = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.userId

        if (!id) {
            resShort(res, 400, false, 'User ID is not provided')
            return
        }

        const user = await prisma.user.findFirst({
            where: {
                id,
            },
        })

        if (!user) {
            resShort(res, 404, false, 'User not found')
            return
        }

        await prisma.user.delete({
            where: {
                id,
            },
        })

        resShort(res, 200, true, `User ${user.id} deleted permenantly`)
    } catch (error) {
        catchError(error, res)
    }
}

// verify user by the admin
export const toggleVerification = async (req: Request, res: Response) => {
    try {
        const { id } = req.body

        if (!id) {
            resShort(res, 400, false, 'You must provide ID')
            return
        }

        const user = await prisma.user.findFirst({
            where: {
                id,
            },
        })

        if (!user) {
            resShort(res, 404, false, 'User not found')
            return
        }

        await prisma.user.update({
            where: {
                id,
            },
            data: {
                is_verified: !user.is_verified,
            },
        })

        resShort(
            res,
            200,
            true,
            `User verification changed to: ${!user.is_verified}`
        )
    } catch (error) {
        catchError(error, res)
    }
}

// make the user anonymous
export const toggleAnonymousUser = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.userId) {
            resShort(res, 400, false, 'User ID is not provided')
            return
        }

        const user = await prisma.user.findFirst({
            where: { id: req.userId },
        })

        if (!user) {
            resShort(res, 404, false, 'User not found')
            return
        }

        await prisma.user.update({
            where: {
                id: req.body,
            },
            data: {
                is_anonymous: !user.is_anonymous,
            },
        })

        resShort(res, 200, true, 'User anonymouns changed successfully')
    } catch (error) {
        catchError(error, res)
    }
}
