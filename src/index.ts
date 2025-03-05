import express from 'express'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import userRouter from './router/user.router'
import pageRouter from './router/page.router'
import causeRouter from './router/cause.router'

const app = express()
dotenv.config()
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', userRouter)
app.use('/api/pages', pageRouter)
app.use('/api/cause', causeRouter)

const PORT = process.env.PORT || 3002

app.listen(PORT, () => console.log('Server is running on port: ', PORT))
