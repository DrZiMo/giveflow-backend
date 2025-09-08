import { Request, Response } from 'express'
import { PrismaClient, ROLE } from '@prisma/client'
import { catchError } from '../../lib/catch.error'
import { userSelect } from '../../lib/select/user.select'
import {
  ILoginUser,
  ISearchUser,
  ISingUpUser,
  IUpdateUser,
} from '../../types/user.types'
import argon2 from 'argon2'
import { generateToken } from '../../lib/jwt'
import { AuthRequest } from '../../types/request.types'
import { resShort } from '../../lib/response'
import jwt from 'jsonwebtoken'
import { generateCode } from '../../lib/generate.code'
import { sendEmail } from '../../lib/send.email'
import cloudinary from '../../utils/cloudinary'

const prisma = new PrismaClient()

// get all users with pagination and donation stats
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // pagination params
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    // fetch users and count in parallel
    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: userSelect,
      }),
      prisma.user.count(),
    ])

    if (!users.length) {
      resShort(res, 404, false, 'Users not found')
      return
    }

    // attach donation stats to each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const donations = await prisma.donation.findMany({
          where: { user_id: user.id },
          select: { amount: true, cause_id: true },
        })

        const totalDonated = donations.reduce((acc, d) => acc + d.amount, 0)
        const causesSupported = new Set(donations.map((d) => d.cause_id)).size

        return {
          ...user,
          totalDonated,
          causesSupported,
        }
      })
    )

    res.status(200).json({
      ok: true,
      users: usersWithStats,
      number: totalUsers,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit),
      },
    })
  } catch (error) {
    catchError(error, res)
  }
}

// get users by id, email, first name last name
export const getUsers = async (req: Request, res: Response) => {
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

// get single user by id
export const getSingleUser = async (req: Request, res: Response) => {
  try {
    const { id }: { id: number } = req.body

    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    })

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    res.status(200).json({ ok: true, user })
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

    if (!first_name || !last_name || !email || !password || !confirm_password) {
      resShort(res, 400, false, 'Fill all the inputs')
      return
    }

    const isEmail = await prisma.user.findFirst({ where: { email } })

    if (isEmail) {
      resShort(res, 400, false, 'Email already exist')
      return
    }

    if (phone_number) {
      const isPhoneNumber = await prisma.user.findFirst({
        where: { phone_number },
      })
      if (isPhoneNumber) {
        resShort(res, 400, false, 'Phone number already exists')
        return
      }
    }

    if (password !== confirm_password) {
      resShort(res, 400, false, 'The password must match confirm password')
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
        user_settings: {
          create: {
            email_notifications: true,
            sms_notifications: false,
            push_notifications: false,
            news_letter: false,
            donation_receipts: false,
            donation_reminders: false,
          },
        },
      },
      select: userSelect,
    })

    if (!newUser) {
      throw new Error('Error while creating new user')
    }

    const tokens = generateToken(newUser.id, res)
    res.status(200).json({ ok: true, user: newUser })
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

    const user = await prisma.user.findFirst({
      where: { email },
    })

    if (!user) {
      resShort(res, 400, false, 'Invalid credentials')
      return
    }

    const { password: _, ...safeUser } = user
    const isPassword = await argon2.verify(user.password, password)

    if (!isPassword) {
      resShort(res, 400, false, 'Invalid credentials')
      return
    }

    if (user.is_deleted) {
      resShort(res, 400, false, 'Account suspended')
      return
    }

    const tokens = generateToken(user.id, res)
    res.status(200).json({ ok: true, user: safeUser })
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
    const { profile_pic } = req.body
    if (!req.userId) {
      resShort(res, 400, false, 'No user ID provided')
      return
    }

    if (!req.file || !req.file.path) {
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

    const cloudinaryUploader = await cloudinary.uploader.upload(req.file.path, {
      folder: 'profile_pics',
    })
    const result = {
      path: cloudinaryUploader.secure_url,
      public_id: cloudinaryUploader.public_id,
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        profile_pic: result.path,
        profile_pic_public_id: result.public_id,
      },
    })

    resShort(res, 200, true, 'Profile picture changed successfullly')
  } catch (error) {
    catchError(error, res)
  }
}

// remove the profile pic
export const removeProfilePic = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      resShort(res, 400, false, 'No user ID provided')
      return
    }

    const { public_id }: { public_id: string } = req.body

    if (!public_id) {
      resShort(res, 400, false, 'You must provide the public id')
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

    const result = await cloudinary.uploader.destroy(public_id)

    if (result.result !== 'ok') {
      res.status(400).json({ error: 'Failed to delete image' })
      return
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { profile_pic: '', profile_pic_public_id: '' },
    })

    resShort(res, 200, true, 'Profile picture removed successfullly')
  } catch (error) {
    catchError(error, res)
  }
}

// logout
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      resShort(res, 400, false, 'No user ID provided')
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    })

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        is_logged_in: false,
      },
    })

    const token = req.cookies.access_token

    if (!token) {
      resShort(res, 400, false, 'Already logged out')
      return
    }

    res.clearCookie('access_token')
    res.clearCookie('refresh_token')
    resShort(res, 200, true, 'Logged out successfully')
  } catch (error) {
    catchError(error, res)
  }
}

// who am i end point
export const whoami = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.userId },
      select: userSelect,
    })

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
    const id = Number(req.params.id)

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

// get the user recycle pin
export const getDeletedUsers = async (req: Request, res: Response) => {
  try {
    const deletedUsers = await prisma.user.findMany({
      where: { is_deleted: true },
    })

    if (!deletedUsers) {
      resShort(res, 404, false, 'No deleted users')
      return
    }

    res.status(200).json({
      ok: true,
      users: deletedUsers,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// restore user
export const restoreDeletedUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)

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

// update the user by the admin
export const updateUserAdmin = async (req: Request, res: Response) => {
  try {
    const { id, first_name, last_name }: IUpdateUser = req.body

    if (!id) {
      resShort(res, 400, false, 'Enter the user ID')
      return
    }

    await prisma.user.update({
      where: { id },
      data: {
        first_name,
        last_name,
      },
    })

    resShort(res, 200, true, 'User updated successfully')
  } catch (error) {
    catchError(error, res)
  }
}

// update the user by the admin
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { first_name, last_name }: { first_name: string; last_name: string } =
      req.body

    if (!req.userId) {
      resShort(res, 400, false, 'Enter the user ID')
      return
    }

    if (!first_name && !last_name) {
      resShort(res, 400, false, 'Enter the first name or the last name')
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        first_name,
        last_name,
      },
    })

    res.status(200).json({ ok: true, user })
    return
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

// change role - only by the admin
export const changeRole = async (req: Request, res: Response) => {
  try {
    const { id, role }: { id: number; role: ROLE } = req.body

    if (!id || !role) {
      resShort(res, 400, false, 'Fill the inputs')
      return
    }

    const user = await prisma.user.findFirst({
      where: { id },
    })

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    if (user.role == role) {
      resShort(res, 400, false, `User role is already ${role}`)
      return
    }

    await prisma.user.update({
      where: { id },
      data: { role },
    })

    resShort(res, 200, true, `User role changed successfully to: ${role}`)
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

// send code to email
export const sendCodeEmail = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.userId },
    })

    if (!user) {
      resShort(res, 404, false, 'User is not found')
      return
    }

    const email = user.email
    const code = generateCode()
    const expiry = new Date(Date.now() + 2 * 60 * 1000)

    if (!email) {
      resShort(res, 400, false, 'Enter the email')
      return
    }

    await prisma.verification_code.create({
      data: {
        user_id: user.id,
        code,
        expiry,
      },
    })

    sendEmail(email, 'GiveFlow verification code', code)

    resShort(res, 200, true, 'The verification code is sent successfully')
  } catch (error) {
    catchError(error, res)
  }
}

// send code to phone number
export const sendCodePhoneNumber = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.userId },
    })

    if (!user) {
      resShort(res, 404, false, 'User is not found')
      return
    }

    const phone_number = user.phone_number
    const code = generateCode()
    const expiry = new Date(Date.now() + 2 * 60 * 1000)

    if (!phone_number) {
      resShort(res, 400, false, 'Enter the phone number')
      return
    }

    await prisma.verification_code.create({
      data: {
        user_id: user.id,
        code,
        expiry,
      },
    })

    // TODO: phone number sending logic

    resShort(res, 200, true, 'The verification code is sent successfully')
  } catch (error) {
    catchError(error, res)
  }
}

// email verification
export const verifyEmail = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.userId },
    })

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    const { code } = req.body

    if (!code) {
      resShort(res, 400, false, 'Enter the code')
      return
    }

    if (user.is_email_verified) {
      resShort(res, 400, false, 'User email is already verified')
      return
    }

    const confirmCode = await prisma.verification_code.findFirst({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    })

    if (!confirmCode) {
      resShort(res, 404, false, 'No verification code registered')
      return
    }

    if (confirmCode.expiry.getTime() < Date.now()) {
      await prisma.verification_code.delete({
        where: { id: confirmCode.id },
      })
      resShort(res, 400, false, 'Verification code expired')
      return
    }

    if (confirmCode.code !== code) {
      resShort(res, 400, false, 'Incorrect verification code')
      return
    }

    await prisma.verification_code.update({
      where: { id: confirmCode.id },
      data: { verified: true },
    })

    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: { is_email_verified: true },
    })

    res.status(200).json({
      ok: true,
      user: verifiedUser,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// phone number verification
export const verifyPhoneNumber = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.userId },
    })

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    const { code } = req.body

    if (!code) {
      resShort(res, 400, false, 'Enter the code')
      return
    }

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    if (user.is_phone_number_verified) {
      resShort(res, 400, false, 'User phone number is already verified')
      return
    }

    const confirmCode = await prisma.verification_code.findFirst({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    })

    if (!confirmCode) {
      resShort(res, 404, false, 'No verification code registered')
      return
    }

    if (confirmCode.expiry.getTime() < Date.now()) {
      await prisma.verification_code.delete({
        where: { id: confirmCode.id },
      })
      resShort(res, 400, false, 'Verification code expired')
      return
    }

    if (confirmCode.code !== code) {
      resShort(res, 400, false, 'Incorrect verification code')
      return
    }

    await prisma.verification_code.update({
      where: { id: confirmCode.id },
      data: { verified: true },
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { is_phone_number_verified: true },
    })

    resShort(res, 200, true, 'Phone number is verified')
  } catch (error) {
    catchError(error, res)
  }
}

// verify reset code
export const verifyResetCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body

    if (!email || !code) {
      resShort(res, 400, false, 'Fill all inputs')
      return
    }

    const user = await prisma.user.findFirst({
      where: { email },
    })

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    const confirmCode = await prisma.verification_code.findFirst({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    })

    if (!confirmCode) {
      resShort(res, 404, false, 'No verification code found')
      return
    }

    if (confirmCode.expiry.getTime() < Date.now()) {
      await prisma.verification_code.delete({
        where: { id: confirmCode.id },
      })
      resShort(res, 400, false, 'Verification code expired')
      return
    }

    if (confirmCode.code !== code) {
      resShort(res, 400, false, 'Incorrect verification code')
      return
    }
    await prisma.verification_code.update({
      where: { id: confirmCode.id },
      data: { verified: true },
    })

    resShort(
      res,
      200,
      true,
      'Verification code is correct, proceed to reset password'
    )
  } catch (error) {
    catchError(error, res)
  }
}

// reset password
export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { newPassword, confirmPassword } = req.body

    if (!newPassword || !confirmPassword) {
      resShort(res, 400, false, 'Fill all the inputs')
      return
    }

    if (newPassword !== confirmPassword) {
      resShort(res, 400, false, 'Passwords must match')
      return
    }

    const user = await prisma.user.findFirst({
      where: { id: userId },
    })

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    const verificationCode = await prisma.verification_code.findFirst({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    })

    if (!verificationCode) {
      resShort(res, 400, false, 'No verification code registered')
      return
    }

    if (!verificationCode.verified) {
      resShort(res, 400, false, 'Not verified')
      return
    }

    const newPasswordHasshed = await argon2.hash(newPassword)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: newPasswordHasshed },
    })

    resShort(res, 200, true, 'Password successfully resetted')
  } catch (error) {
    catchError(error, res)
  }
}

// refresh token logic
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refresh_token = req.cookies.refresh_token

    if (!refresh_token) {
      resShort(res, 401, false, 'Unauthorized - No refresh token provided')
      return
    }

    const decode = jwt.verify(
      refresh_token,
      process.env.JWT_REFRESH_SECRET as string
    ) as { userId: number }

    if (!decode) {
      resShort(res, 401, false, 'Unauthorized - Invalid refresh token')
      return
    }

    const accessToken = jwt.sign(
      { userId: decode.userId },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: '15m' }
    )

    res.cookie('access_token', accessToken, {
      maxAge: 15 * 60 * 1000,
      sameSite: 'lax',
      httpOnly: true,
    })

    resShort(res, 201, true, 'Access token created successfully')
  } catch (error) {
    catchError(error, res)
  }
}

// toggle user profile public
export const toggleProfileVisibility = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId

    if (!userId) {
      resShort(res, 400, false, 'User not found')
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    await prisma.user.update({
      where: { id: userId },
      data: { is_public: !user.is_public },
    })

    resShort(
      res,
      200,
      true,
      `User profile visibility changed to: ${!user.is_public}`
    )
  } catch (error) {
    catchError(error, res)
  }
}

// toggle user history visibility
export const toggleHistoryVisibility = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId

    if (!userId) {
      resShort(res, 400, false, 'User not found')
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    await prisma.user.update({
      where: { id: userId },
      data: { is_history_visible: !user.is_history_visible },
    })

    resShort(
      res,
      200,
      true,
      `User history visibility changed to: ${!user.is_history_visible}`
    )
  } catch (error) {
    catchError(error, res)
  }
}

// change password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!currentPassword || !newPassword || !confirmPassword) {
      resShort(res, 400, false, 'Fill all the inputs')
      return
    }

    if (newPassword !== confirmPassword) {
      resShort(
        res,
        400,
        false,
        'New password and confirm password do not match'
      )
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
    })

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    const isMatch = await argon2.verify(user.password, currentPassword)

    if (!isMatch) {
      resShort(res, 400, false, 'Old password is incorrect')
      return
    }

    const newPasswordHasshed = await argon2.hash(newPassword)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: newPasswordHasshed },
    })

    resShort(res, 200, true, 'Password successfully changed')
  } catch (error) {
    catchError(error, res)
  }
}

// updating the privacy settings
export const updatePrivacySettings = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId
    const { is_public, is_history_visible, is_anonymous } = req.body

    if (!userId) {
      resShort(res, 400, false, 'User not found')
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    await prisma.user.update({
      where: { id: userId },
      data: { is_public, is_history_visible, is_anonymous },
    })

    resShort(res, 200, true, 'Privacy settings updated successfully')
  } catch (error) {
    catchError(error, res)
  }
}

// get the donation history for each user
export const getDonationHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { search, time } = req.query

    // Handle time filter
    let dateFilter: Date | undefined
    const now = new Date()

    switch (time) {
      case '24h':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        dateFilter = new Date(now.setMonth(now.getMonth() - 1))
        break
      case 'year':
        dateFilter = new Date(now.setFullYear(now.getFullYear() - 1))
        break
    }

    const donationHistory = await prisma.donation.findMany({
      where: {
        user_id: req.userId,
        ...(search && {
          cause: {
            name: {
              contains: search as string,
              mode: 'insensitive',
            },
          },
        }),
        ...(dateFilter && {
          donated_at: {
            gte: dateFilter,
          },
        }),
      },
      include: {
        cause: true,
      },
      orderBy: {
        donated_at: 'desc',
      },
    })

    if (!donationHistory.length) {
      resShort(res, 404, false, 'No donation history found')
      return
    }

    res.status(200).json({
      ok: true,
      history: donationHistory,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// enable / disable two factor authentication
export const toggleTwoFactorAuthentication = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId

    if (!userId) {
      resShort(res, 400, false, 'No userId provided')
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      resShort(res, 400, false, 'User not found')
      return
    }

    if (user.is_two_factor_authentication) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          is_two_factor_authentication: false,
        },
      })

      resShort(res, 200, true, 'Two factor authentication disabled')
      return
    } else if (!user.is_two_factor_authentication) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          is_two_factor_authentication: true,
        },
      })

      resShort(res, 200, true, 'Two factor authentication enabled')
      return
    }
  } catch (error) {
    catchError(error, res)
  }
}

// very two factor authentication
export const verifyTwoFactorAuthentication = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.userId },
    })

    if (!user) {
      resShort(res, 404, false, 'User not found')
      return
    }

    const { code } = req.body

    if (!code) {
      resShort(res, 400, false, 'Enter the code')
      return
    }

    const confirmCode = await prisma.verification_code.findFirst({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    })

    if (!confirmCode) {
      resShort(res, 404, false, 'No verification code registered')
      return
    }

    if (new Date(confirmCode.expiry).getTime() < Date.now()) {
      await prisma.verification_code.delete({
        where: { id: confirmCode.id },
      })
      resShort(res, 400, false, 'Verification code expired')
      return
    }

    if (confirmCode.code !== code) {
      resShort(res, 400, false, 'Incorrect verification code')
      return
    }

    await prisma.verification_code.update({
      where: { id: confirmCode.id },
      data: { verified: true },
    })

    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: { is_logged_in: true },
    })

    res.status(200).json({
      ok: true,
      user: verifiedUser,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// get top donors
export const getTopDonors = async (req: Request, res: Response) => {
  try {
    const topDonors = await prisma.donation.groupBy({
      by: ['user_id'],
      _sum: {
        amount: true,
      },
      _count: {
        cause_id: true, // counts donations, but not distinct causes
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: 5,
    })

    const donorsWithUser = await Promise.all(
      topDonors.map(async (donor) => {
        const user = await prisma.user.findUnique({
          where: { id: donor.user_id },
          select: userSelect,
        })

        // distinct cause count
        const supportedCauses = await prisma.donation.findMany({
          where: { user_id: donor.user_id },
          select: { cause_id: true },
          distinct: ['cause_id'],
        })

        return {
          ...user,
          totalDonated: donor._sum.amount ?? 0,
          supportedCauses: supportedCauses.length,
        }
      })
    )

    res.status(200).json({
      ok: true,
      donors: donorsWithUser,
    })
  } catch (error) {
    catchError(error, res)
  }
}
