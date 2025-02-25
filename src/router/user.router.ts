import { Router } from 'express'
import { getAllUsers, getSingleUser, singUp } from '../controller/user.controller'

const router = Router()

router.get('/all', getAllUsers)
router.post('/search', getSingleUser)
router.post('/signup', singUp)

export default router
