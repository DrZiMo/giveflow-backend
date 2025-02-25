import { Router } from 'express'
import { getAllUsers } from '../controller/user.controller'

const router = Router()

router.get('/all', getAllUsers)

export default router
