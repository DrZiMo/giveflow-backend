import express from 'express'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import userRouter from './router/user.router'
import causeRouter from './router/cause.router'
import categoryRouter from './router/category.router'
import saveRouter from './router/save.router'
import notificationRouter from './router/notification.router'
import donationRouter from './router/donation.router'
import morgan from 'morgan'
import cors from 'cors'
import settingsRouter from './router/settings.router'
import likesRouter from './router/like.router'
import activityRouter from './router/activity.router'
import '../jobs/donationsReminder'
import '../jobs/newsLetterReminders'

const app = express()
dotenv.config()

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

app.use((req, res, next) => {
  if (req.originalUrl === '/api/donations/webhook') {
    next()
  } else {
    express.json()(req, res, next)
  }
})

app.use(cookieParser())

app.use(
  cors({
    origin: [process.env.FRONTEND_URL!],
    credentials: true,
  })
)

app.use('/api/auth', userRouter)
app.use('/api/causes', causeRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/saves', saveRouter)
app.use('/api/notifications', notificationRouter)
app.use('/api/donations', donationRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/likes', likesRouter)
app.use('/api/activities', activityRouter)

const PORT = process.env.PORT || 3002

app.listen(PORT, () => console.log('Server is running on port: ', PORT))
