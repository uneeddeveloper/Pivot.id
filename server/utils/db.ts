import { prisma } from '../db/prisma'

/**
 * Cek apakah database bisa dihubungi.
 *
 * Dipakai `/api/health` supaya pesan error yang sampai ke user menyebut
 * penyebabnya, bukan sekadar "500".
 *
 * Catatan: Pool MySQL2 + fungsi query/execute/withTransaction dihapus.
 * Gunakan langsung `prisma` dari `../db/prisma` di seluruh server/utils.
 */
export async function pingDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
