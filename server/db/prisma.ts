/**
 * Singleton Prisma Client untuk Nitro (Nuxt server).
 *
 * Nitro memuat ulang modul saat hot-reload di mode dev. Kalau PrismaClient
 * dibuat baru di tiap reload, koneksi menumpuk dan database menolak. Solusinya
 * sama dengan pool MySQL2 yang lama: simpan instance di `globalThis`.
 *
 * Pola ini adalah rekomendasi resmi Prisma untuk Next.js/Nitro:
 * https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from '@prisma/client'

const PRISMA_KEY = Symbol.for('pivot.prisma.client')

interface PrismaHolder {
  [PRISMA_KEY]?: PrismaClient
}

export function getPrisma(): PrismaClient {
  const holder = globalThis as unknown as PrismaHolder
  if (holder[PRISMA_KEY]) return holder[PRISMA_KEY]!

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

  holder[PRISMA_KEY] = prisma
  return prisma
}

/** Instance langsung — dipakai di seluruh server/utils dan server/api. */
export const prisma = getPrisma()
