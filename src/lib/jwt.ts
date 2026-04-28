import { Response } from 'express'
import jwt from 'jsonwebtoken'

export const generateToken = (userId: number, res: Response) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: '15m' }
  )

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: '7d' }
  )

  res.cookie('access_token', accessToken, {
    maxAge: 15 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  res.cookie('refresh_token', refreshToken, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return { accessToken, refreshToken }
}
