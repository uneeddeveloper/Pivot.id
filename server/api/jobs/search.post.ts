import { z } from 'zod'
import type { JobListing, JobMatch, JobSearchResponse } from '../../../types/jobs'
import {
  fetchGoogleJobs,
  fetchGoogleJobsNationwide,
  isJobSearchConfigured,
  JobSearchUnavailableError,
  type RawGoogleJob,
} from '../../utils/serpapi'
import { normalizeJobs } from '../../utils/jobNormalizer'
import {
  findFreshSearch,
  hashSearch,
  loadJobsForSearch,
  loadRecentJobs,
  saveSearch,
} from '../../utils/jobRepository'

/**
 * POST /api/jobs/search
 *
 * Alur satu permintaan:
 *   1. Tentukan kata kunci (dari `roleId` atau `query` bebas).
 *   2. Cek `job_searches` — kalau masih segar, layani dari MySQL. Ini yang
 *      menjaga kuota SerpApi tetap hidup.
 *   3. Kalau kedaluwarsa: panggil Google Jobs, normalisasi + validasi dengan
 *      LLM, simpan, lalu sajikan.
 *   4. Kalau langkah 3 gagal apa pun sebabnya, sajikan lowongan terakhir yang
 *      masih ada di database beserta peringatan yang menyebut penyebabnya.
 *
 * CATATAN PRIVASI
 *   `minSalary` adalah Target Income — satu angka teragregasi. Rincian utang,
 *   bunga, dan cicilan yang membentuknya tidak pernah dikirim ke sini, dan
 *   tidak ada yang disimpan per-user. Body permintaan ini tidak dicatat.
 */

const BodySchema = z.object({
  /** Kata kunci bebas. Diabaikan bila `roleId` diisi. */
  query: z.string().trim().max(120).optional(),
  /** ID peran dari katalog — `search_query`-nya yang dipakai. */
  roleId: z.string().trim().max(64).optional(),
  location: z.string().trim().max(120).optional(),
  /** Target Income user (Rupiah/bulan). 0 berarti tanpa ambang gaji. */
  minSalary: z.number().min(0).max(1_000_000_000).default(0),
  remoteOnly: z.boolean().default(false),
  /** Keterampilan user, untuk menghitung cakupan tiap lowongan. */
  ownedSkills: z.array(z.string().max(64)).max(100).default([]),
  /** Paksa ambil ulang dari Google walau cache masih segar. */
  refresh: z.boolean().default(false),
})

/** Lepas diakritik & tanda baca supaya perbandingan lokasi tidak terlalu kaku. */
function normalizeLocationText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Cocokkan lokasi lowongan dengan lokasi yang diminta user.
 *   `null`  — user tidak mengisi lokasi (cari se-Indonesia), tidak ada preferensi.
 *   `true`  — lowongan remote, atau teks lokasinya memuat lokasi yang dicari.
 *   `false` — lowongan onsite di daerah lain.
 *
 * Dipakai untuk MENGURUTKAN, bukan menyaring — lowongan beda daerah tetap
 * tampil, hanya turun peringkat. Menyembunyikannya sepenuhnya berisiko
 * mengosongkan halaman untuk kota kecil yang lowongannya jarang ditandai
 * persis dengan nama kota itu di Google Jobs.
 */
function matchesLocation(job: JobListing, searchLocation: string): boolean | null {
  if (!searchLocation) return null
  if (job.isRemote) return true

  const needle = normalizeLocationText(searchLocation)
  if (!needle) return null

  return normalizeLocationText(job.location).includes(needle)
}

/** Susun `JobMatch` dari lowongan + kondisi user. */
function toMatch(
  job: JobListing,
  owned: Set<string>,
  minSalary: number,
  searchLocation: string,
): JobMatch {
  const ownedSkills = job.skills.filter((id) => owned.has(id))
  const missing = job.skills.filter((id) => !owned.has(id))

  return {
    job,
    // Lowongan tanpa nominal gaji TIDAK dianggap gagal memenuhi target —
    // sebagian besar iklan di Indonesia memang tidak mencantumkan angka, dan
    // membuangnya akan mengosongkan hampir seluruh halaman.
    meetsTarget: minSalary <= 0 || !job.salaryStated || job.salaryMax >= minSalary,
    owned: ownedSkills,
    missing,
    coverage: job.skills.length === 0 ? 0 : ownedSkills.length / job.skills.length,
    locationMatch: matchesLocation(job, searchLocation),
  }
}

export default defineEventHandler(async (event): Promise<JobSearchResponse> => {
  const body = BodySchema.parse(await readBody(event))
  
  const config = useRuntimeConfig()

  // ── 1. Tentukan kata kunci ────────────────────────────────────────────────
  let searchQuery = body.query?.trim() ?? ''
  let roleId: string | null = null

  if (body.roleId) {
    const roles = await loadRoles().catch((error: unknown) => {
      throw catalogUnavailableError(error, 'Katalog peran')
    })
    const role = roles.find((item) => item.id === body.roleId)
    if (!role) {
      throw createError({ statusCode: 404, statusMessage: 'Peran tidak ditemukan di katalog' })
    }
    roleId = role.id
    searchQuery = role.searchQuery || role.title
  }

  if (!searchQuery) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Isi `query` atau `roleId` untuk memulai pencarian',
    })
  }

  // `locationInput` adalah lokasi APA ADANYA dari user (bisa kosong).
  // `fetchGoogleJobs` yang menjatuhkannya ke JOB_SEARCH_LOCATION bila kosong —
  // Google Jobs wajib diberi satu titik lokasi, tidak punya mode "seluruh
  // negara" (lihat catatan di server/utils/serpapi.ts). `location` di bawah
  // ini cuma label untuk cache key & tampilan supaya kolom kosong terbaca
  // "Seluruh Indonesia", bukan string default env yang mungkin membingungkan.
  const locationInput = body.location?.trim() ?? ''
  const location = locationInput || 'Seluruh Indonesia'
  const identity = { query: searchQuery, location, remoteOnly: body.remoteOnly, roleId }

  const owned = new Set(body.ownedSkills)
  const warnings: string[] = []

  /** Jadikan daftar lowongan sebagai jawaban akhir, lengkap dengan penyaringan. */
  const respond = (
    listings: JobListing[],
    meta: { cached: boolean; fetchedAt: string; totalFound: number; llmUsed: boolean },
  ): JobSearchResponse => {
    const valid = listings.filter((job) => job.redFlags.length < 3)
    const hiddenByValidation = listings.length - valid.length

    const matches = valid
      .map((job) => toMatch(job, owned, body.minSalary, locationInput))
      .sort((a, b) => {
        // Yang menutup Target Income lebih dulu, lalu yang lokasinya benar-benar
        // cocok dengan yang dicari, lalu keterampilan paling banyak dimiliki,
        // baru yang iklannya paling meyakinkan.
        if (a.meetsTarget !== b.meetsTarget) return a.meetsTarget ? -1 : 1

        const locationRank = (value: boolean | null) => (value === true ? 2 : value === null ? 1 : 0)
        const locationDelta = locationRank(b.locationMatch) - locationRank(a.locationMatch)
        if (locationDelta !== 0) return locationDelta

        if (b.coverage !== a.coverage) return b.coverage - a.coverage
        return b.job.qualityScore - a.job.qualityScore
      })

    return {
      matches,
      meta: {
        query: searchQuery,
        location,
        cached: meta.cached,
        fetchedAt: meta.fetchedAt,
        provider: 'Google Jobs (via SerpApi)',
        totalFound: meta.totalFound,
        hiddenBySalary: matches.filter((match) => !match.meetsTarget).length,
        hiddenByValidation,
        llmUsed: meta.llmUsed,
        warnings,
      },
    }
  }

  // ── 2. Cache pencarian ────────────────────────────────────────────────────
  const queryHash = hashSearch(identity)

  if (!body.refresh) {
    const fresh = await findFreshSearch(queryHash)
    if (fresh) {
      const listings = await loadJobsForSearch(Number(fresh.id))
      return respond(listings, {
        cached: true,
        fetchedAt: new Date(fresh.fetchedAt).toISOString(),
        totalFound: fresh.rawCount,
        // Hasil tersimpan sudah melewati normalisasi saat pertama diambil.
        llmUsed: true,
      })
    }
  }

  // ── 3. Ambil dari Google Jobs ─────────────────────────────────────────────
  if (!isJobSearchConfigured()) {
    warnings.push(
      'SERPAPI_KEY belum diisi di .env — belum ada lowongan baru yang bisa diambil dari Google Jobs.',
    )
    return respond(await loadRecentJobs(), {
      cached: true,
      fetchedAt: new Date().toISOString(),
      totalFound: 0,
      llmUsed: false,
    })
  }

  try {
    // Lokasi kosong = cari se-Indonesia: fan-out ke beberapa kota besar
    // sekaligus (lihat `fetchGoogleJobsNationwide`), karena Google Jobs tidak
    // punya mode "seluruh negara" bawaan. Lokasi terisi = satu titik lokasi,
    // tapi disusuri sampai beberapa halaman kalau hasilnya lebih dari satu
    // halaman — tidak lagi berhenti di 10 hasil pertama begitu saja.
    let raw: RawGoogleJob[]
    if (locationInput) {
      raw = await fetchGoogleJobs({
        query: searchQuery,
        location: locationInput,
        remoteOnly: body.remoteOnly,
      })
    } else {
      const nationwide = await fetchGoogleJobsNationwide({
        query: searchQuery,
        remoteOnly: body.remoteOnly,
      })
      raw = nationwide.jobs
      if (nationwide.failedLocations.length > 0) {
        warnings.push(
          `Gagal mengambil lowongan dari ${nationwide.failedLocations.join(', ')} — hasil dari kota lain tetap ditampilkan.`,
        )
      }
    }
    const skills = await loadSkills()
    const normalized = await normalizeJobs(raw, skills)
    warnings.push(...normalized.warnings)

    const searchId = await saveSearch(identity, normalized.jobs, config.cache.jobTtlHours)
    const listings = await loadJobsForSearch(searchId)

    return respond(listings, {
      cached: false,
      fetchedAt: new Date().toISOString(),
      totalFound: raw.length,
      llmUsed: normalized.llmUsed,
    })
  } catch (error) {
    // ── 4. Jalan mundur: sajikan yang sudah ada ─────────────────────────────
    if (error instanceof JobSearchUnavailableError) {
      warnings.push(
        `${error.userMessage} Yang tampil di bawah adalah lowongan yang terakhir tersimpan.`,
      )
      return respond(await loadRecentJobs(), {
        cached: true,
        fetchedAt: new Date().toISOString(),
        totalFound: 0,
        llmUsed: false,
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Pencarian lowongan gagal',
      data: { message: error instanceof Error ? error.message : String(error) },
    })
  }
})
