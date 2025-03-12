import express from 'express'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import userRouter from './router/user.router'
import pageRouter from './router/page.router'
import causeRouter from './router/cause.router'
import searchRouter from './router/search.router'
import categoryRouter from './router/category.router'
import saveRouter from './router/save.router'
import notificationRouter from './router/notification.router'
import followerRouter from './router/follower.router'
import donationRouter from './router/donation.router'

const app = express()
dotenv.config()
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', userRouter)
app.use('/api/pages', pageRouter)
app.use('/api/causes', causeRouter)
app.use('/api/searches', searchRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/saves', saveRouter)
app.use('/api/notifications', notificationRouter)
app.use('/api/followers', followerRouter)
app.use('/api/donations', donationRouter)

const PORT = process.env.PORT || 3002

app.listen(PORT, () => console.log('Server is running on port: ', PORT))
