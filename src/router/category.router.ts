import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'
import {
    addNewCategory,
    deleteCategory,
    getAllCategories,
    searchCategory,
    updateCategory,
} from '../controller/category.controller'

const router = Router()

router.get('/all', authenticate, getAllCategories)
router.post('/search', authenticate, searchCategory)
router.post('/new', authenticate, authorize([ROLE.ADMIN]), addNewCategory)
router.put('/update', authenticate, authorize([ROLE.ADMIN]), updateCategory)
router.delete(
    '/delete/:id',
    authenticate,
    authorize([ROLE.ADMIN]),
    deleteCategory
)

export default router
