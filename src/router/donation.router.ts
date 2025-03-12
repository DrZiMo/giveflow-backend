import express from 'express'

import bodyParser from 'body-parser'
import { createDonation, handleStripeWebhook } from '../controller/donation.controller'
import { authenticate } from '../../middleware/authenticate'

const router = express.Router()

router.post('/create-session', authenticate, createDonation)
router.post('/webhook', bodyParser.raw({ type: 'application/json' }), handleStripeWebhook)

export default router
