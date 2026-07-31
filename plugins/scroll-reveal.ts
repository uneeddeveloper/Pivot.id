/**
 * Direktif `v-reveal` — elemen memudar naik saat masuk viewport.
 *
 * Plugin ini WAJIB universal (bukan `.client.ts`). Direktif yang cuma
 * terdaftar di browser tetap ditemui renderer SSR saat halaman digambar di
 * server, dan Vue akan memanggil `getSSRProps` pada direktif yang undefined —
 * itulah "Cannot read properties of undefined (reading 'getSSRProps')" yang
 * memulangkan 500 di setiap halaman yang memakai v-reveal.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', {
    /**
     * Dipanggil hanya oleh renderer SSR. Tidak ada atribut yang perlu
     * ditanam ke HTML awal: kelas `reveal-up` sengaja baru dipasang setelah
     * mount supaya isi halaman tetap terbaca kalau JavaScript gagal jalan.
     */
    getSSRProps: () => ({}),

    // `mounted` tidak pernah jalan di server, jadi IntersectionObserver di
    // bawah aman tanpa penjagaan `import.meta.client`.
    mounted(el: HTMLElement) {
      el.classList.add('reveal-up')

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              el.classList.add('is-visible')
              observer.unobserve(el)
            }
          })
        },
        {
          rootMargin: '0px 0px -50px 0px',
          threshold: 0.1,
        },
      )

      observer.observe(el)
    },
  })
})
