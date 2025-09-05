import { PrismaClient } from '@prisma/client'
import { sendEmailHtml } from '../lib/send.email'
import cron from 'node-cron'

const prisma = new PrismaClient()

cron.schedule('0 9 1 * *', async () => {
  const users = await prisma.user.findMany({
    where: {
      user_settings: {
        some: {
          OR: [{ email_notifications: true }, { news_letter: true }],
        },
      },
    },
    include: {
      user_settings: true,
    },
  })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const topCauses = await prisma.cause.findMany({
    where: {
      donation: {
        some: {
          donated_at: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      },
    },
    include: {
      donation: true,
    },
  })

  const causesWithTotal = topCauses.map((cause) => {
    const total = cause.donation.reduce((acc, d) => acc + d.amount, 0)
    return { ...cause, total }
  })

  const top5Causes = causesWithTotal
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  for (const user of users) {
    try {
      const causeListHtml = top5Causes
        .map((c) => `<li>${c.name} — $${c.total.toLocaleString()}</li>`)
        .join('')

      await sendEmailHtml(
        user.email,
        'Monthly Updates & Newsletter',
        `<p>Hello ${user.first_name},</p>
         <p>Here are the top supported causes this month:</p>
         <ul>${causeListHtml}</ul>
         <p>Stay tuned and thank you for supporting our causes 💙</p>`
      )
      console.log(`Newsletter sent successfully to ${user.email}`)
    } catch (err) {
      console.error(`Failed to send newsletter to ${user.email}`, err)
    }
  }
})
