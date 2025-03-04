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
    restoreDeletedPage,
    searchPage,
    updatePage,
} from '../controller/page.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'

const router = Router()

router.get('/all', getAllPages)
router.post('/detail', getSinglePage)
router.post('/search', searchPage)
router.get('/user', authenticate, getUserPages)
router.post('/new', authenticate, createPage)
router.put('/update', authenticate, updatePage)
router.post('/profile-pic', authenticate, changeProfilePic)
router.post('/cover-pic', authenticate, changeCoverPic)
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
