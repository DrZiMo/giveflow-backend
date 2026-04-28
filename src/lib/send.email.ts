import { transporter } from '../utils/nodemailer'

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    await transporter.sendMail({
      from: '"GiveFlow" <zuhaybhamar@gmail.com>',
      to,
      subject,
      text,
    })
  } catch (error) {
    console.log('Error sending email: ' + error)
  }
}

export const sendEmailMessage = async (
  from: string,
  subject: string,
  text: string
) => {
  try {
    await transporter.sendMail({
      from,
      to: 'zuhaybhamar@gmail.com',
      subject,
      text,
    })
  } catch (error) {
    console.log('Error sending email: ' + error)
  }
}

export const sendEmailHtml = async (
  to: string,
  subject: string,
  html: string
) => {
  try {
    await transporter.sendMail({
      from: '"GiveFlow" <zuhaybhamar@gmail.com>',
      to,
      subject,
      html,
    })
  } catch (error) {
    console.log('Error sending email: ' + error)
  }
}
