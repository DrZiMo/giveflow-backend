import { Router } from 'express'
import {
    addNewCause,
    causeByCategory,
    causeByUrgencyLevel,
    causePicture,
    deleteCausePerm,
    deleteCauseTemp,
    getAllCauses,
    getDeletedCauses,
    getFeaturedCauses,
    getRelatedCauses,
    getSingleCause,
    getTrendingCauses,
    restoreCause,
    searchCause,
    toggleFeatured,
    updateCause,
    verifyCause,
} from '../controller/cause.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'
import upload from '../../middleware/multer'

const router = Router()

router.get('/all', getAllCauses)
router.get('/detail', getSingleCause)
router.get('/related', getRelatedCauses)
router.get('/featured', getFeaturedCauses)
router.get(
    '/recycle-bin',
    authenticate,
    authorize([ROLE.ADMIN]),
    getDeletedCauses
)
router.get('/trending', authenticate, getTrendingCauses)
router.post('/search', searchCause)
router.post('/category', causeByCategory)
router.post('/urgency-level', causeByUrgencyLevel)
router.post('/new', authenticate, upload.single('causePic'), addNewCause)
router.post('/cause-pic', authenticate, upload.single('causePic'), causePicture)
router.post('/delete-temp', authenticate, deleteCauseTemp)
router.post(
    '/delete-perm',
    authenticate,
    authorize([ROLE.ADMIN]),
    deleteCausePerm
)
router.post('/restore', authenticate, authorize([ROLE.ADMIN]), restoreCause)
router.put('/update', authenticate, updateCause)
router.post(
    '/toggle-featured',
    authenticate,
    authorize([ROLE.ADMIN]),
    toggleFeatured
)
router.post('/verify', authenticate, authorize([ROLE.ADMIN]), verifyCause)

export default router
