import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import {
    clearAllSaves,
    getSaveLater,
    toggleSaveCause,
    userSavesAdmin,
} from '../controller/save.controller'
import { authorize } from '../middleware/authorize'
import { ROLE } from '@prisma/client'

const router = Router()

router.post('/', authenticate, authorize([ROLE.ADMIN]), userSavesAdmin)
router.get('/all', authenticate, getSaveLater)
router.post('/toggle', authenticate, toggleSaveCause)
router.get('/clear', authenticate, clearAllSaves)

export default router
