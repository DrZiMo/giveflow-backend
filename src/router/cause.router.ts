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
  getNumberOfDonors,
  getRelatedCauses,
  getSingleCause,
  getTrendingCauses,
  restoreCause,
  searchCause,
  toggleActiveCause,
  toggleFeatured,
  toggleLikeCause,
  updateCause,
} from '../controller/cause.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'
import upload from '../../middleware/multer'

const router = Router()

router.get('/all', getAllCauses)
router.get('/detail/:id', getSingleCause)
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
router.post(
  '/delete-temp',
  authenticate,
  authorize([ROLE.ADMIN]),
  deleteCauseTemp
)
router.post(
  '/delete-perm',
  authenticate,
  authorize([ROLE.ADMIN]),
  deleteCausePerm
)
router.post('/restore', authenticate, authorize([ROLE.ADMIN]), restoreCause)
router.put('/update', authenticate, authorize([ROLE.ADMIN]), updateCause)
router.post(
  '/toggle-featured',
  authenticate,
  authorize([ROLE.ADMIN]),
  toggleFeatured
)
router.post(
  '/toggle-active',
  authenticate,
  authorize([ROLE.ADMIN]),
  toggleActiveCause
)
router.get('/donors/:causeId', getNumberOfDonors)
router.post('/like/:causeId', authenticate, toggleLikeCause)

export default router
