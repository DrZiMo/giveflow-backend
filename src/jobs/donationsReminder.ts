import cron from 'node-cron'
import { sendEmailHtml } from '../lib/send.email'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// '0 9 1 * *'

// run every Monday at 9AM
cron.schedule(
  '0 9 1 * *',
  async () => {
    const users = await prisma.user.findMany({
      where: {
        user_settings: {
          some: { donation_reminders: true },
        },
        saveForLater: {
          some: {},
        },
      },
      include: { saveForLater: true },
    })

    for (const user of users) {
      try {
        await sendEmailHtml(
          user.email,
          'Donation Reminder',
          `<p>You saved ${user.saveForLater.length} causes. Don't forget to support them 💙</p>`
        )
      } catch (err) {
        console.error(`Failed to send reminder to ${user.email}`, err)
      }
    }
  },
  {
    timezone: 'Africa/Mogadishu',
  }
)
