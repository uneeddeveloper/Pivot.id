/**
 * GET /api/health
 *
 * Ringkasan kesiapan tiap layanan luar. Berguna saat menyiapkan aplikasi:
 * begitu satu token belum diisi, halaman terkait bisa menampilkan pesan yang
 * menyebut penyebabnya, bukan sekadar gagal diam-diam.
 *
 * Tidak pernah membocorkan nilai token — hanya sudah-diisi atau belum.
 */
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const db = await pingDatabase()

  let catalogCount = { skills: 0, roles: 0, gigs: 0 }
  if (db.ok) {
    try {
      const [skills, roles, gigs] = await Promise.all([loadSkills(), loadRoles(), loadGigs()])
      catalogCount = { skills: skills.length, roles: roles.length, gigs: gigs.length }
    } catch {
      // Tabel belum dibuat — sudah tercermin di `seeded: false` di bawah.
    }
  }

  // Ambil info koneksi dari DATABASE_URL untuk ditampilkan (tanpa kredensial)
  const dbUrl = process.env.DATABASE_URL || ''
  const dbInfo = (() => {
    try {
      const url = new URL(dbUrl)
      return { host: url.host, name: url.pathname.replace('/', '') }
    } catch {
      return { host: 'tidak dikonfigurasi', name: '-' }
    }
  })()

  return {
    database: {
      ok: db.ok,
      error: db.error,
      host: dbInfo.host,
      name: dbInfo.name,
      seeded:
        catalogCount.skills > 0 && catalogCount.roles > 0 && catalogCount.gigs > 0,
      ...catalogCount,
    },
    llm: {
      configured: Boolean(config.sumopod.apiKey),
      baseUrl: config.sumopod.baseUrl,
      model: config.sumopod.model,
      modelSmart: config.sumopod.modelSmart || config.sumopod.model,
    },
    jobSearch: {
      configured: Boolean(config.serpapi.apiKey),
      provider: 'serpapi_google_jobs',
      location: config.serpapi.location,
      cacheTtlHours: config.cache.jobTtlHours,
    },
  }
})
