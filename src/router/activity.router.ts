import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { getUserActivities } from '../controller/activity.controller'

const router = Router()

router.get('/', authenticate, getUserActivities)

export default router
