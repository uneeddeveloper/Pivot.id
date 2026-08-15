import { getServerSession } from '#auth'
import { prisma } from '../../db/prisma'

export default defineEventHandler(async (event) => {
  // 1. Get the current user session
  const session = await getServerSession(event)
  if (!session || !session.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  // @ts-expect-error - Custom user id added in callbacks
  const userId = session.user.id as string
  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID not found in session',
    })
  }

  // 2. Extract IP and User-Agent from the request headers
  const req = event.node.req
  let ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
  if (Array.isArray(ipAddress)) {
    ipAddress = ipAddress[0]
  }
  const userAgent = req.headers['user-agent'] || ''

  // 3. Rate limiting: Check if we already logged this user within the last 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  
  const recentLog = await prisma.visitorLog.findFirst({
    where: {
      userId,
      createdAt: {
        gte: oneHourAgo,
      },
    },
  })

  // If there's already a log within the last hour, don't create a new one to prevent spam
  if (recentLog) {
    return { success: true, message: 'Log already exists recently', skipped: true }
  }

  // 4. Create the log
  await prisma.visitorLog.create({
    data: {
      userId,
      ipAddress: ipAddress.toString().slice(0, 45), // Ensure it fits in VarChar(45)
      userAgent,
    },
  })

  return { success: true, message: 'Visitor logged' }
})
