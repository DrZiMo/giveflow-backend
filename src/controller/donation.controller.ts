import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import { AuthRequest } from "../../types/request.types";
import { catchError } from "../../lib/catch.error";
import { Request, Response } from "express";
import { ICreateDonation } from "../../types/donation.types";
import { resShort } from "../../lib/response";

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY! as string)

// create new donation
export const createDonation = async (req: AuthRequest, res: Response) => {
    try {
        const {cause_id, amount}: ICreateDonation = req.body

        if(!cause_id || !amount) {
            resShort(res, 400, false, "Enter the cause ID and the amount")
            return
        }

        const cause = await prisma.cause.findUnique({
            where: {id: cause_id}
        })

        if(!cause) {
            resShort(res, 404, false, "Cause is not found")
            return
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            success_url: `${process.env.FRONT_END_URL}/donation-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONT_END_URL}/donation-cancel`,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {name: 'Donation to a cause'},
                        unit_amount: amount * 100
                    },
                    quantity: 1
                },
            ],
            metadata: {donor_id: String(req.userId), cause_id}
        })

        res.status(200).json({
            ok: true,
            sessionUrl: session.url
        })
    } catch (error) {
        catchError(error, res)
    }
}

// handle stripe webhook
export const handleStripeWebhook = async (req: Request, res: Response) => {
    try {
        const sig = req.headers['stripe-signature']
        let event

        try {
            event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_KEY! as string)
        } catch (error) {
            res.status(400).json({
                ok: false,
                message: `Webhook error: ${(error as any).message}`
            })
        }

        if(event && event.type === 'checkout.session.completed') {
            const session = event.data.object as any
            const {donor_id, cause_id} = session.metadata
            const amount = session.amount_total / 100

            await prisma.donation.create({
                data: {
                    user_id: donor_id,
                    cause_id,
                    amount
                }
            })
        }

        res.json({ received: true })
    } catch (error) {
        catchError(error, res)
    }
}