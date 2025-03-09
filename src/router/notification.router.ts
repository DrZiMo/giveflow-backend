import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import {
    allNotificationReaded,
    deleteAllNotifications,
    deleteNotification,
    getAllNotification,
    getNumberOfUnReaded,
    notificationReaded,
} from '../controller/notification.controller'

const router = Router()

router.get('/all', authenticate, getAllNotification)
router.post('/readed', authenticate, notificationReaded)
router.get('/all-readed', authenticate, allNotificationReaded)
router.delete('/delete/:id', authenticate, deleteNotification)
router.delete('/clear', authenticate, deleteAllNotifications)
router.get('/number', authenticate, getNumberOfUnReaded)

export default router
