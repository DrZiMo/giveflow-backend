import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { getUserLikes } from '../controller/like.controller'

const router = Router()

router.get('/', authenticate, getUserLikes)

export default router
