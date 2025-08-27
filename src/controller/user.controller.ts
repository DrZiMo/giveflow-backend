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

    await prisma.user.update({
      where: { id: req.userId },
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

    await prisma.user.update({
      where: { id: user.id },
      data: { is_email_verified: true },
    })

    resShort(res, 200, true, 'Email is verified')
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
    const { email, phone_number, code } = req.body

    if ((!email && !phone_number) || !code) {
      resShort(res, 400, false, 'Fill all inputs')
      return
    }

    const user = await prisma.user.findFirst({
      where: email ? { email } : { phone_number },
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
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, phone_number, newPassword } = req.body

    if ((!email && !phone_number) || newPassword) {
      resShort(res, 400, false, 'Fill all the inputs')
      return
    }

    const user = await prisma.user.findFirst({
      where: email ? { email } : { phone_number },
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
      process.env.JWT_ACCESS_SECRET as string
    )

    res.cookie('token', accessToken, {
      maxAge: 15 * 60 * 1000,
      sameSite: 'strict',
      httpOnly: true,
    })

    resShort(res, 201, true, 'Access token created successfully')
  } catch (error) {
    catchError(error, res)
  }
}
