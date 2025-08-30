import { Router } from 'express'
import { createSetting, updateSetting } from '../controller/settings.controller'
import { authenticate } from '../../middleware/authenticate'

const router = Router()

// router.get('/', authenticate, getSettings)
router.post('/new', authenticate, createSetting) // for development
router.put('/update', authenticate, updateSetting)

export default router
