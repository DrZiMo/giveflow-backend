import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MY_GMAIL,
        pass: process.env.MY_PASS,
    },
})
