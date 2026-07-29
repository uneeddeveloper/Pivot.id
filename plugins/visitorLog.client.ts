export default defineNuxtPlugin(async () => {
  const { status } = useAuth()
  
  // Kalau user sudah login, kirim data log visitor ke backend
  if (status.value === 'authenticated') {
    try {
      await $fetch('/api/user/log-visitor', { method: 'POST' })
    } catch (err) {
      console.error('Gagal mencatat visitor log:', err)
    }
  }
})
