import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import { AuthRequest } from '../../types/request.types'
import { catchError } from '../../lib/catch.error'
import { Request, Response } from 'express'
import { ICreateDonation } from '../../types/donation.types'
import { resShort } from '../../lib/response'
import { userSelect } from '../../lib/select/user.select'

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
