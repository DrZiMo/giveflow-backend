import { Router } from 'express'
import {
  addPhoneNumber,
  changePassword,
  changeProfilePic,
  changeRole,
  deleteUserPerByAdmin,
  deleteUserPerByUser,
  deleteUserTemp,
  getAllUsers,
  getDeletedUsers,
  getDonationHistory,
  getSingleUser,
  getUsers,
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
  toggleHistoryVisibility,
  toggleProfileVisibility,
  toggleTwoFactorAuthentication,
  updatePrivacySettings,
  updateUser,
  updateUserAdmin,
  verifyEmail,
  verifyPhoneNumber,
  verifyResetCode,
  verifyTwoFactorAuthentication,
  whoami,
} from '../controller/user.controller'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { ROLE } from '@prisma/client'
import upload from '../../middleware/multer'

const router = Router()

router.get('/all', authenticate, authorize([ROLE.ADMIN]), getAllUsers)
router.get('/search', authenticate, authorize([ROLE.ADMIN]), getUsers)
router.post('/single-user', authenticate, getSingleUser)
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
router.post('/phone-number', authenticate, addPhoneNumber)
router.post(
  '/profile-picture',
  authenticate,
  upload.single('profilePic'),
  changeProfilePic
)
// router.get('/profile-picture', authenticate, changeProfilePic)
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
router.get('/toggle-profile-visibility', authenticate, toggleProfileVisibility)
router.get('/toggle-history-visibility', authenticate, toggleHistoryVisibility)
router.put('/change-password', authenticate, changePassword)
router.put('/update-privacy-settings', authenticate, updatePrivacySettings)
router.get('/donation-history', authenticate, getDonationHistory)
router.post('/two-factor', authenticate, toggleTwoFactorAuthentication)
router.post('/verify-2fa', authenticate, verifyTwoFactorAuthentication)

export default router
