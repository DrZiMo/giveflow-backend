import express from 'express'
import dotenv from 'dotenv'
import userRouter from './router/user.router'

const app = express()
dotenv.config()
app.use(express.json())

app.use('/api/users', userRouter)

const PORT = process.env.PORT || 3002

app.listen(PORT, () => console.log("Server is running on port: ", PORT))
