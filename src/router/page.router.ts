import { Router } from 'express'
import {
    changeCoverPic,
    changeProfilePic,
    createPage,
    deletePagePerm,
    deletePageTemp,
    getAllPages,
    getDeletedPages,
    getSinglePage,
    getUserPages,
    removeCoverPic,
    removeProfilePic,
    restoreDeletedPage,
    searchPage,
    updatePage,
} from '../controller/page.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'
import upload from '../../middleware/multer'

const router = Router()

router.get('/all', getAllPages)
router.post('/detail', getSinglePage)
router.post('/search', searchPage)
router.get('/user', authenticate, getUserPages)
router.post('/new', authenticate, createPage)
router.put('/update', authenticate, updatePage)
router.post(
    '/profile-pic',
    authenticate,
    upload.single('profilePic'),
    changeProfilePic
)
router.post(
    '/cover-pic',
    authenticate,
    upload.single('coverPic'),
    changeCoverPic
)
router.post('/remove-profile-pic', authenticate, removeProfilePic)
router.post('/remove-cover-pic', authenticate, removeCoverPic)
router.post('/delete-temp', authenticate, deletePageTemp)
router.get(
    '/recycle-bin',
    authenticate,
    authorize([ROLE.ADMIN]),
    getDeletedPages
)
router.post(
    '/restore',
    authenticate,
    authorize([ROLE.ADMIN]),
    restoreDeletedPage
)
router.delete(
    '/delete/:id',
    authenticate,
    authorize([ROLE.ADMIN]),
    deletePagePerm
)
export default router
