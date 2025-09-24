import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import {
  createAnnouncements,
  deleteNotification,
  getAllNotification,
} from '../controller/notification.controller'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'

const router = Router()

router.get('/all', authenticate, authorize([ROLE.ADMIN]), getAllNotification)
router.delete(
  '/delete/:id',
  authenticate,
  authorize([ROLE.ADMIN]),
  deleteNotification
)
router.post('/new', authenticate, authorize([ROLE.ADMIN]), createAnnouncements)

export default router
