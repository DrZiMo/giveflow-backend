import { Router } from 'express'
import {
    addPhoneNumber,
    changeProfilePic,
    changeRole,
    deleteUserPerByAdmin,
    deleteUserPerByUser,
    deleteUserTemp,
    getAllUsers,
    getDeletedUsers,
    getSingleUser,
    login,
    logout,
    refreshToken,
    removeProfilePic,
    resetPassword,
    restoreDeletedUser,
    sendCodeEmail,
    sendCodePhoneNumber,
    signUp,
    toggleAnonymousUser,
    toggleVerification,
    updateUser,
    updateUserAdmin,
    verifyEmail,
    verifyPhoneNumber,
    verifyResetCode,
    whoami,
} from '../controller/user.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'

const router = Router()

router.get('/all', authenticate, authorize([ROLE.ADMIN]), getAllUsers)
router.post('/search', authenticate, authorize([ROLE.ADMIN]), getSingleUser)
router.get(
    '/recycle-pin',
    authenticate,
    authorize([ROLE.ADMIN]),
    getDeletedUsers
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
router.put(
    '/update-user-admin',
    authenticate,
    authorize([ROLE.ADMIN]),
    updateUserAdmin
)
router.delete(
    '/delete/:id',
    authenticate,
    authorize([ROLE.ADMIN]),
    deleteUserPerByAdmin
)
router.get('/delete-temp', authenticate, deleteUserTemp)
router.post('/change-role', authenticate, authorize([ROLE.ADMIN]), changeRole)
router.post('/signup', signUp)
router.post('/login', login)
router.get('/phone-number', authenticate, addPhoneNumber)
router.get('/profile-picture', authenticate, changeProfilePic)
router.get('/remove-profile-picture', authenticate, removeProfilePic)
router.post('/anonymous', authenticate, toggleAnonymousUser)
router.post('/send-code-email', authenticate, sendCodeEmail)
router.post('/send-code-phone-number', authenticate, sendCodePhoneNumber)
router.post('/verify-email', authenticate, verifyEmail)
router.post('/verify-phone-number', authenticate, verifyPhoneNumber)
router.post('/verify-reset-code', authenticate, verifyResetCode)
router.post('/reset-password', authenticate, resetPassword)
router.get('/whoami', authenticate, whoami)
router.get('/logout', authenticate, logout)
router.put('/update-user', authenticate, updateUser)
router.delete('/delete-current/:id', authenticate, deleteUserPerByUser)
router.get('/refresh-token', refreshToken)

export default router
