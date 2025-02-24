import express from 'express'
import dotenv from 'dotenv'
import userRouter from './router/user.router'

const app = express()
dotenv.config()

app.use('/api/users', userRouter)

const PORT = process.env.PORT || 5000

app.listen(() => {
    console.log('Listening to port: ', PORT)
})
