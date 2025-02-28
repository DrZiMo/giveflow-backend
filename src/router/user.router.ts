import { Router } from 'express'
import {
    getAllUsers,
    getSingleUser,
    login,
    logout,
    signUp,
    whoami,
} from '../controller/user.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'

const router = Router()

router.get('/all', authenticate, authorize([ROLE.ADMIN]), getAllUsers)
router.post('/search', authenticate, authorize([ROLE.ADMIN]), getSingleUser)
router.post('/signup', signUp)
router.post('/login', login)
router.get('/whoami', authenticate, whoami)
router.get('/logout', authenticate, logout)

export default router
