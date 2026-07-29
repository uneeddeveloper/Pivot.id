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

  let catalogCount = { skills: 0, roles: 0 }
  if (db.ok) {
    try {
      const [skills, roles] = await Promise.all([loadSkills(), loadRoles()])
      catalogCount = { skills: skills.length, roles: roles.length }
    } catch {
      // Tabel belum dibuat — sudah tercermin di `seeded: false` di bawah.
    }
  }

  return {
    database: {
      ok: db.ok,
      error: db.error,
      host: `${config.mysql.host}:${config.mysql.port}`,
      name: config.mysql.database,
      seeded: catalogCount.skills > 0 && catalogCount.roles > 0,
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
