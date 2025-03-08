import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'
import {
    deleteAllSearches,
    deleteSearch,
    getAllSearches,
    getAllSearchesUser,
    newSearch,
} from '../controller/search.controller'

const router = Router()

router.get('/all', authenticate, authorize([ROLE.ADMIN]), getAllSearches)
router.get('/all-user', authenticate, getAllSearchesUser)
router.post('/new', authenticate, newSearch)
router.delete('/delete/:search_id', authenticate, deleteSearch)
router.delete('/delete', authenticate, deleteAllSearches)

export default router
