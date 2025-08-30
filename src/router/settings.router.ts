import { Router } from 'express'
import {
  createSetting,
  deleteSetting,
  updateSetting,
} from '../controller/settings.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'

const router = Router()

// router.get('/', authenticate, getSettings)
router.post('/new', authenticate, createSetting)
router.put('/update', authenticate, updateSetting)
router.delete('/delete', authenticate, deleteSetting)

export default router
