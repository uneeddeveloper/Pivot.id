import type { MicroGig } from '../../types/gigs'

/**
 * GET /api/gigs
 *
 * Katalog micro-gig dari MySQL — sumber data satu-satunya untuk halaman /gigs.
 *
 * KENAPA TERPISAH DARI /api/catalog
 *   Katalognya hanya dibutuhkan satu halaman, dan isinya (deskripsi, cara
 *   memulai, peringatan, kanal) jauh lebih berat daripada daftar skill & peran.
 *   Menggabungkannya berarti setiap halaman yang membaca katalog ikut menarik
 *   muatan yang tidak dipakainya — mahal untuk user berkuota terbatas, yang
 *   justru mayoritas audiens aplikasi ini.
 *
 * PRIVASI
 *   Endpoint ini hanya membaca. Tidak menerima body, tidak menerima kondisi
 *   keuangan user, dan tidak mencatat apa pun. Seluruh pencocokan gig dengan
 *   kebutuhan user terjadi di browser lewat `composables/useGigPlanner.ts`.
 */
export default defineEventHandler(async (): Promise<{ gigs: MicroGig[] }> => {
  try {
    return { gigs: await loadGigs() }
  } catch (error) {
    throw catalogUnavailableError(error, 'Katalog micro-gig')
  }
})
