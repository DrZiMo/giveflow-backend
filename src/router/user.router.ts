import { Router } from 'express'
import {
    addPhoneNumber,
    changeProfilePic,
    deleteUserPerByAdmin,
    deleteUserPerByUser,
    deleteUserTemp,
    getAllUsers,
    getSingleUser,
    login,
    logout,
    removeProfilePic,
    restoreDeletedUser,
    signUp,
    toggleAnonymousUser,
    toggleVerification,
    whoami,
} from '../controller/user.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'

const router = Router()

router.get('/all', authenticate, authorize([ROLE.ADMIN]), getAllUsers)
router.post('/search', authenticate, authorize([ROLE.ADMIN]), getSingleUser)
router.get(
    '/delete-temp',
    authenticate,
    authorize([ROLE.ADMIN]),
    deleteUserTemp
)
router.get(
    '/restore',
    authenticate,
    authorize([ROLE.ADMIN]),
    restoreDeletedUser
)
router.post(
    '/verify',
    authenticate,
    authorize([ROLE.ADMIN]),
    toggleVerification
)
router.delete(
    '/delete/:id',
    authenticate,
    authorize([ROLE.ADMIN]),
    deleteUserPerByAdmin
)
router.post('/signup', signUp)
router.post('/login', login)
router.get('/phone-number', authenticate, addPhoneNumber)
router.get('/profile-picture', authenticate, changeProfilePic)
router.get('/remove-profile-picture', authenticate, removeProfilePic)
router.post('/anonymous', authenticate, toggleAnonymousUser)
router.get('/whoami', authenticate, whoami)
router.get('/logout', authenticate, logout)
router.delete('/delete-current/:id', authenticate, deleteUserPerByUser)

export default router
