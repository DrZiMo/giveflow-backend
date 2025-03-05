import { Router } from 'express'
import { getAllCauses } from '../controller/cause.controller'

const router = Router()

router.get('/all', getAllCauses)

export default router
