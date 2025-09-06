import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import { AuthRequest } from '../../types/request.types'
import { catchError } from '../../lib/catch.error'
import { Request, Response } from 'express'
import { ICreateDonation } from '../../types/donation.types'
import { resShort } from '../../lib/response'
import { userSelect } from '../../lib/select/user.select'
import { sendEmailHtml } from '../../lib/send.email'

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY! as string)

// get all donations
export const getAllDonations = async (req: Request, res: Response) => {
  try {
    const donations = await prisma.donation.findMany()

    if (!donations.length) {
      resShort(res, 404, false, 'No donations found')
      return
    }

    res.status(200).json({
      ok: true,
      donations,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// create new donation
export const createDonation = async (req: AuthRequest, res: Response) => {
  try {
    const { cause_id, amount }: ICreateDonation = req.body

    if (!cause_id || !amount) {
      resShort(res, 400, false, 'Enter the cause ID and the amount')
      return
    }

    const cause = await prisma.cause.findUnique({
      where: { id: cause_id },
    })

    if (!cause) {
      resShort(res, 404, false, 'Cause is not found')
      return
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/causes/cause/${cause_id}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/causes/cause/${cause_id}?canceled=true`,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Donation to a cause' },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      metadata: { donor_id: String(req.userId), cause_id },
    })

    res.status(200).json({
      ok: true,
      sessionUrl: session.url,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// handle stripe webhook
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig!,
      process.env.STRIPE_WEBHOOK_KEY! as string
    )
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error)
    res.status(400).send(`Webhook Error: ${(error as any).message}`)
    return
  }

  try {
    // Only handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      const { donor_id, cause_id } = session.metadata
      const amount = session.amount_total / 100

      if (!donor_id || !cause_id || !amount) {
        console.error('Missing data in session metadata')
        res.status(400).send('Missing donor_id, cause_id, or amount')
        return
      }

      await prisma.donation.create({
        data: {
          user_id: Number(donor_id),
          cause_id,
          amount,
        },
      })

      await prisma.cause.update({
        where: { id: cause_id },
        data: {
          current_amount: {
            increment: amount,
          },
        },
      })

      const cause = await prisma.cause.findUnique({ where: { id: cause_id } })

      await prisma.recent_activity.create({
        data: {
          user_id: Number(donor_id),
          cause_id: cause_id,
          amount: String(amount),
          name: `Donated to ${cause?.name}`,
          status: 'Completed',
        },
      })

      const user = await prisma.user.findUnique({
        where: { id: Number(donor_id) },
        include: { user_settings: true },
      })

      const settings = user?.user_settings?.[0]

      if (settings?.donation_receipts) {
        await sendEmailHtml(
          user!.email,
          'Your Donation Receipt',
          `<h1>Thank you for your donation!</h1><p>You donated <b>$${amount}</b> to <b>${cause?.name}</b></p>`
        )
      }
    }

    // Return 200 for all events to Stripe
    res.json({ received: true })
  } catch (err) {
    console.error('Error handling Stripe event:', err)
    res.status(500).send('Internal server error')
  }
}

// get donors per cause with total donation amount
export const getDonorsByCause = async (req: Request, res: Response) => {
  try {
    const { causeId } = req.params

    if (!causeId) {
      resShort(res, 400, false, 'Cause ID is required')
      return
    }

    // group donations by user_id for this cause
    const donors = await prisma.donation.groupBy({
      by: ['user_id', 'cause_id'],
      where: {
        cause_id: causeId,
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: 10,
    })

    // fetch donor details
    const donorsWithDetails = await Promise.all(
      donors.map(async (donor) => {
        const user = await prisma.user.findUnique({
          where: { id: Number(donor.user_id) },
          select: userSelect,
        })

        return {
          ...user,
          totalAmount: donor._sum.amount ?? 0,
        }
      })
    )

    res.status(200).json({
      ok: true,
      donors: donorsWithDetails,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// get the summary of all donations
export const getDonationSummary = async (req: AuthRequest, res: Response) => {
  try {
    const donations = await prisma.donation.findMany({
      select: { amount: true, cause_id: true },
    })

    if (!donations.length) {
      res.status(200).json({
        ok: true,
        totalDonated: 0,
        causesSupported: 0,
        averageDonation: 0,
        highestDonation: 0,
      })
      return
    }

    const totalDonated = donations.reduce((acc, d) => acc + d.amount, 0)
    const causesSupported = new Set(donations.map((d) => d.cause_id)).size
    const averageDonation = totalDonated / donations.length
    const highestDonation = Math.max(...donations.map((d) => d.amount))

    res.status(200).json({
      ok: true,
      totalDonated,
      causesSupported,
      averageDonation,
      highestDonation,
    })
  } catch (error) {
    catchError(error, res)
  }
}

// get monthly donation totals (all users)
export const getMonthlyDonations = async (req: AuthRequest, res: Response) => {
  try {
    const donations = await prisma.donation.findMany({
      select: { amount: true, donated_at: true },
    })

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]

    const monthlyTotals = months.map((month, idx) => {
      const total = donations
        .filter((d) => d.donated_at.getMonth() === idx)
        .reduce((sum, d) => sum + d.amount, 0)
      return { month, amount: total }
    })

    res.status(200).json({ ok: true, monthlyTotals })
  } catch (error) {
    catchError(error, res)
  }
}

// get top supported causes (all users)
export const getTopSupportedCauses = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const topCauses = await prisma.donation.groupBy({
      by: ['cause_id'],
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    })

    const detailedCauses = await Promise.all(
      topCauses.map(async (c) => {
        const cause = await prisma.cause.findUnique({
          where: { id: c.cause_id },
          include: { category: true },
        })
        return {
          cause: cause?.category?.name || 'Unknown',
          amount: c._sum.amount || 0,
        }
      })
    )

    res.status(200).json({ ok: true, causes: detailedCauses })
  } catch (error) {
    catchError(error, res)
  }
}

// get the summary of the donation
export const getUserDonationSummary = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId

    const donations = await prisma.donation.findMany({
      where: { user_id: userId },
      select: { amount: true, cause_id: true },
    })

    if (!donations.length) {
      res.status(200).json({
        ok: true,
        totalDonated: 0,
        causesSupported: 0,
        averageDonation: 0,
        highestDonation: 0,
      })
      return
    }

    const totalDonated = donations.reduce((acc, d) => acc + d.amount, 0)
    const causesSupported = new Set(donations.map((d) => d.cause_id)).size
    const averageDonation = totalDonated / donations.length
    const highestDonation = Math.max(...donations.map((d) => d.amount))

    res.status(200).json({
      ok: true,
      totalDonated,
      causesSupported,
      averageDonation,
      highestDonation,
    })
    return
  } catch (error) {
    catchError(error, res)
  }
}

// get monthly donation
export const getUserMonthlyDonations = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId

    const donations = await prisma.donation.findMany({
      where: { user_id: userId },
      select: { amount: true, donated_at: true },
    })

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]

    const monthlyTotals = months.map((month, idx) => {
      const total = donations
        .filter((d) => d.donated_at.getMonth() === idx)
        .reduce((sum, d) => sum + d.amount, 0)
      return { month, amount: total }
    })

    res.status(200).json({ ok: true, monthlyTotals })
  } catch (error) {
    catchError(error, res)
  }
}

// get supported causes
export const getUserTopSupportedCauses = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId

    const topCauses = await prisma.donation.groupBy({
      by: ['cause_id'],
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      where: { user_id: userId },
      take: 5,
    })

    const detailedCauses = await Promise.all(
      topCauses.map(async (c) => {
        const cause = await prisma.cause.findUnique({
          where: { id: c.cause_id },
          include: { category: true },
        })
        return {
          cause: cause?.category?.name || 'Unknown',
          amount: c._sum.amount || 0,
        }
      })
    )

    res.status(200).json({ ok: true, causes: detailedCauses })
  } catch (error) {
    catchError(error, res)
  }
}
