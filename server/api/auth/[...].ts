import { NuxtAuthHandler } from '#auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default NuxtAuthHandler({
  secret: process.env.AUTH_SECRET || 'super-secret-default-key-please-change',
  adapter: PrismaAdapter(prisma),
  providers: [
    // @ts-expect-error - NextAuth types issue with import default
    GoogleProvider.default({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    })
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user && user) {
        // @ts-expect-error - Adding ID to session user
        session.user.id = user.id
      }
      return session
    }
  }
})
