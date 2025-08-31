import express from 'express'

import bodyParser from 'body-parser'
import {
  createDonation,
  getAllDonations,
  getDonorsByCause,
  handleStripeWebhook,
} from '../controller/donation.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'

const router = express.Router()

router.get('/all', authenticate, authorize([ROLE.ADMIN]), getAllDonations)
router.post('/create-session', authenticate, createDonation)
router.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  handleStripeWebhook
)
router.get('/top-donors/:causeId', getDonorsByCause)

export default router
