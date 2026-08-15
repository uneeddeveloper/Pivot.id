import { createRequire } from 'node:module'
import tailwindcss from '@tailwindcss/vite'

const requireFromRoot = createRequire(`${process.cwd()}/nuxt.config.ts`)

/**
 * Resolve sebuah paket kalau ada, dan diam saja kalau tidak.
 *
 * Dipakai untuk paket binary per-platform: mesin dev Windows hanya punya
 * `win32-x64-msvc`, sedangkan Vercel hanya punya `linux-x64-gnu`. Yang tidak
 * cocok dengan platform saat ini memang WAJAR tidak ketemu dan tidak boleh
 * menggagalkan build.
 */
function resolveIfPresent(id: string): string[] {
  try {
    return [requireFromRoot.resolve(id)]
  } catch {
    return []
  }
}

/**
 * Origin publik aplikasi, dipakai @sidebase/nuxt-auth untuk menyusun URL callback.
 *
 * PENTING: modul `nuxt-auth` memasang Nitro plugin `assertOrigin` yang MELEMPAR
 * error saat server start kalau origin tidak ketemu di production. Di Vercel itu
 * berarti seluruh serverless function gagal boot — semua halaman 500
 * (FUNCTION_INVOCATION_FAILED), bukan cuma /api/auth.
 *
 * Set `AUTH_ORIGIN` di Vercel → Settings → Environment Variables ke domain tetap
 * (mis. https://pivot.vercel.app). `VERCEL_PROJECT_PRODUCTION_URL` hanya jaring
 * pengaman supaya situs tetap hidup kalau env var itu lupa diisi — URL-nya ikut
 * berubah tiap deploy, jadi jangan diandalkan untuk OAuth Google.
 */
const authOrigin =
  process.env.AUTH_ORIGIN ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@sidebase/nuxt-auth', '@nuxtjs/color-mode', '@nuxt/icon'],

  /**
   * `pdf-parse` menarik `pdfjs-dist`, yang saat diimpor memuat `@napi-rs/canvas`
   * untuk mem-polyfill DOMMatrix. Tanpa paket itu, impornya melempar
   * `ReferenceError: DOMMatrix is not defined` dan route-nya balas 500.
   *
   * Binary-nya di-resolve DINAMIS per platform di dalam `js-binding.js`
   * (`@napi-rs/canvas-linux-x64-gnu` di Vercel), jadi penelusur file Nitro
   * tidak bisa mengikutinya secara statis dan diam-diam meninggalkannya di luar
   * bundel serverless. Di lokal semuanya terlihat sehat karena node_modules
   * masih utuh — kegagalannya HANYA muncul setelah deploy.
   *
   * Masalah yang sama menimpa `pdf.worker.mjs`: pdfjs memuatnya lewat
   * spesifier yang dirakit saat runtime ("fake worker"), jadi file itu juga
   * tertinggal dan ekstraksi teks gagal dengan "Setting up fake worker failed".
   *
   * `traceInclude` memaksa semuanya ikut terbawa.
   */
  nitro: {
    externals: {
      traceInclude: [
        ...resolveIfPresent('@napi-rs/canvas'),
        ...resolveIfPresent('@napi-rs/canvas-linux-x64-gnu'),
        ...resolveIfPresent('pdfjs-dist/legacy/build/pdf.worker.mjs'),
      ],
    },

    /**
     * Panggilan LLM diukur 6+ detik untuk jawaban panjang, sementara
     * `SUMOPOD_TIMEOUT_MS` memberi ruang sampai 60 detik. Default fungsi Vercel
     * jauh lebih pendek dari itu, jadi tanpa baris ini permintaan yang wajar
     * pun bisa dipotong runtime di tengah jalan.
     */
    vercel: {
      functions: {
        maxDuration: 60,
      },
    },
  },
  
  colorMode: {
    classSuffix: '', // Important for Tailwind CSS (uses .dark instead of .dark-mode)
  },

  auth: {
    // Pada Vercel, WAJIB set Environment Variable:
    // AUTH_ORIGIN = https://<domain-vercel>.vercel.app
    // AUTH_SECRET = <string-acak>
    //
    // Dikosongkan saat dev supaya origin diambil dari request (localhost:3000,
    // port berapa pun). Lihat komentar `authOrigin` di atas.
    baseURL: authOrigin ? `${authOrigin}/api/auth` : undefined,
    provider: {
      type: 'authjs',
    },
  },

  // Urutan penting: CSS bawaan SweetAlert harus lebih dulu supaya blok
  // ".pivot-swal" di main.css bisa menimpanya tanpa !important.
  css: ['sweetalert2/dist/sweetalert2.min.css', '~/assets/css/main.css'],

  /**
   * Kunci di luar `public` HANYA terbaca di sisi server (server/**). Token
   * Sumopod dan SerpApi tidak boleh sampai ke bundel browser — itu sebabnya
   * seluruh pemanggilan LLM & pencarian lowongan lewat route di `server/api`.
   *
   * DATABASE_URL untuk Prisma dibaca langsung dari environment (tidak perlu
   * di sini) karena Prisma Client tidak menggunakan useRuntimeConfig().
   */
  runtimeConfig: {
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
      title: 'Pivot — Navigasi Karir & Pemulihan Finansial',
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
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/favicon.png' },
        // Inter (teks) + Plus Jakarta Sans (judul). Kalau jaringan mati saat demo,
        // rantai fallback di --font-sans / --font-display tetap menahan tampilan.
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600;1,700&display=swap',
        },
      ],
    },
  },
})
