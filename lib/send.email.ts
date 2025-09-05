import { transporter } from '../utils/nodemailer'

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    await transporter.sendMail({
      from: '',
      to,
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
      from: '',
      to,
      subject,
      html,
    })
  } catch (error) {
    console.log('Error sending email: ' + error)
  }
}
