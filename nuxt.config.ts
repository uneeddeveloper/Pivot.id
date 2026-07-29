import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

  /**
   * Kunci di luar `public` HANYA terbaca di sisi server (server/**). Token
   * Sumopod dan SerpApi tidak boleh sampai ke bundel browser — itu sebabnya
   * seluruh pemanggilan LLM & pencarian lowongan lewat route di `server/api`.
   */
  runtimeConfig: {
    mysql: {
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'rintisulang',
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    },
    sumopod: {
      apiKey: process.env.SUMOPOD_API_KEY || '',
      baseUrl: process.env.SUMOPOD_BASE_URL || 'https://ai.sumopod.com/v1',
      model: process.env.SUMOPOD_MODEL || 'gpt-4o-mini',
      modelSmart: process.env.SUMOPOD_MODEL_SMART || '',
      timeoutMs: Number(process.env.SUMOPOD_TIMEOUT_MS || 60_000),
    },
    serpapi: {
      apiKey: process.env.SERPAPI_KEY || '',
      location: process.env.JOB_SEARCH_LOCATION || 'Indonesia',
      hl: process.env.JOB_SEARCH_HL || 'id',
      gl: process.env.JOB_SEARCH_GL || 'id',
    },
    cache: {
      jobTtlHours: Number(process.env.JOB_CACHE_TTL_HOURS || 6),
      llmTtlDays: Number(process.env.LLM_CACHE_TTL_DAYS || 14),
    },
  },

  // Nama komponen tanpa prefix folder: components/financial/DebtInputForm.vue
  // dipakai sebagai <DebtInputForm />.
  components: [{ path: '~/components', pathPrefix: false }],

  vite: {
    plugins: [tailwindcss()],
  },

  typescript: {
    strict: true,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'RintisUlang — Navigasi Karir & Pemulihan Finansial',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#fffbd4' },
        {
          name: 'description',
          content:
            'Hitung Target Income — penghasilan bulanan yang benar-benar kamu butuhkan — lalu kejar lewat roadmap keterampilan, CV ATS, dan lowongan terfilter. Untuk fresh graduate, korban PHK, dan siapa pun yang sedang keluar dari jerat utang. Data utangmu tidak pernah meninggalkan perangkat ini.',
        },
      ],
      link: [
        // Inter (teks) + Plus Jakarta Sans (judul). Kalau jaringan mati saat demo,
        // rantai fallback di --font-sans / --font-display tetap menahan tampilan.
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap',
        },
      ],
    },
  },
})
