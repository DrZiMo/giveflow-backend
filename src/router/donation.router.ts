import express from 'express'

import bodyParser from 'body-parser'
import {
  createDonation,
  getAllDonations,
  getUserDonationSummary,
  getDonorsByCause,
  getUserMonthlyDonations,
  getUserTopSupportedCauses,
  handleStripeWebhook,
  getDonationSummary,
  getMonthlyDonations,
  getTopSupportedCauses,
} from '../controller/donation.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'

const router = express.Router()

router.get(
  '/all',
  authenticate,
  authorize([ROLE.ADMIN, ROLE.MODERATOR]),
  getAllDonations
)
router.post('/create-session', authenticate, createDonation)
router.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  handleStripeWebhook
)
router.get('/top-donors/:causeId', getDonorsByCause)
router.get(
  '/summary-admin',
  authenticate,
  authorize([ROLE.ADMIN, ROLE.MODERATOR]),
  getDonationSummary
)
router.get(
  '/monthly-admin',
  authenticate,
  authorize([ROLE.ADMIN, ROLE.MODERATOR]),
  getMonthlyDonations
)
router.get(
  '/supported-causes-admin',
  authenticate,
  authorize([ROLE.ADMIN, ROLE.MODERATOR]),
  getTopSupportedCauses
)
router.get('/summary', authenticate, getUserDonationSummary)
router.get('/monthly', authenticate, getUserMonthlyDonations)
router.get('/supported-causes', authenticate, getUserTopSupportedCauses)
export default router
