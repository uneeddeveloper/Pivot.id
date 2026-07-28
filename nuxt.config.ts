import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

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
