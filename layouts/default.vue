<script setup lang="ts">
const { status, data, signIn, signOut } = useAuth()
const colorMode = useColorMode()

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

/**
 * Nav links: hanya halaman static yang berguna sebagai navigasi global.
 * Alur langkah (audit, skill-gap, dst) dihapus dari navbar karena diakses
 * dari halaman landing, bukan dari global nav.
 */
const navLinks = [
  { to: '/', label: 'Beranda' },
  { to: '/#alur', label: 'Cara Kerja' },
]

const helplines = [
  { label: 'Pengaduan pinjaman ilegal — OJK', value: '157' },
  { label: 'Layanan kesehatan jiwa — Kemenkes', value: '119 ext. 8' },
]

const footerLinks = [
  { label: 'Kebijakan Privasi', to: '#' },
  { label: 'Cara Kerja', to: '/#alur' },
  { label: 'Tentang Pivot', to: '#' },
]

/** Scroll progress untuk progress bar (0–1) */
const { progress } = useScrollProgress()

/**
 * Header solid state — IntersectionObserver sentinel (bukan window.scroll).
 */
const scrolled = ref(false)
const sentinel = ref<HTMLElement | null>(null)
let headerObserver: IntersectionObserver | null = null

const route = useRoute()
const isHomePage = computed(() => route.path === '/')

onMounted(() => {
  if (!sentinel.value) return
  headerObserver = new IntersectionObserver(
    ([entry]) => { scrolled.value = !entry.isIntersecting },
    { threshold: 0 },
  )
  headerObserver.observe(sentinel.value)
})
onUnmounted(() => headerObserver?.disconnect())
</script>

<template>
  <div class="flex min-h-screen flex-col">

    <!-- Scroll progress bar -->
    <div
      class="scroll-progress-bar"
      :style="{ width: `${progress * 100}%` }"
      aria-hidden="true"
    />

    <!-- Sentinel untuk IntersectionObserver header -->
    <div
      ref="sentinel"
      class="pointer-events-none absolute top-0 left-0 h-px w-full"
      aria-hidden="true"
    />

    <a
      href="#konten"
      class="focus-ring sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:text-cream-50"
    >
      Lompat ke konten
    </a>

    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <header
      class="sticky top-0 z-20 border-b transition-all duration-400"
      :class="[
        scrolled
          ? 'border-ink-200/70 bg-cream-50/95 shadow-soft backdrop-blur-md dark:border-white/[0.07] dark:bg-ink-950/92 dark:shadow-dark-soft'
          : 'border-transparent bg-transparent backdrop-blur-sm',
      ]"
    >
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">

        <!-- Logo -->
        <NuxtLink
          to="/"
          class="focus-ring group flex items-center gap-2.5 rounded-xl pr-2 transition"
        >
          <LogoMark size="sm" />
          <span
            class="text-base font-semibold tracking-tight transition-colors duration-400 text-brand-800 dark:text-cream-100"
          >Pivot</span>
        </NuxtLink>

        <!-- Nav links desktop -->
        <nav class="hidden items-center gap-0.5 md:flex" aria-label="Navigasi utama">
          <NuxtLink
            v-for="item in navLinks"
            :key="item.to"
            :to="item.to"
            class="focus-ring dark:focus-ring-dark rounded-xl px-3 py-1.5 text-sm transition text-ink-500 hover:bg-cream-200/60 hover:text-brand-700 dark:text-ink-400 dark:hover:bg-white/[0.07] dark:hover:text-cream-200"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <!-- Auth + Theme + CTA -->
        <div class="flex items-center gap-2">
          
          <ClientOnly>
            <button
              @click="toggleTheme"
              class="focus-ring dark:focus-ring-dark flex h-8 w-8 items-center justify-center rounded-xl text-ink-500 transition hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-white/[0.07] md:mr-2"
              aria-label="Toggle Dark Mode"
            >
              <svg v-if="colorMode.value === 'dark'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </button>
          </ClientOnly>

          <ClientOnly>
            <template #fallback>
              <div class="h-8 w-20 animate-pulse rounded-lg bg-ink-200/40" />
            </template>

            <!-- Authenticated state -->
            <div v-if="status === 'authenticated'" class="flex items-center gap-3">
              <div class="hidden items-center gap-2 md:flex">
                <img
                  v-if="data?.user?.image"
                  :src="data.user.image"
                  class="h-8 w-8 rounded-full border border-ink-200"
                  alt="Avatar"
                />
                <span
                  class="max-w-[100px] truncate text-sm font-medium transition-colors text-ink-700 dark:text-cream-200"
                  :title="data?.user?.name || ''"
                >
                  {{ data?.user?.name || 'User' }}
                </span>
              </div>
              <button
                class="focus-ring rounded-lg px-3 py-1.5 text-sm font-medium text-red-500 transition hover:bg-red-500/10"
                @click="signOut()"
              >
                Keluar
              </button>
            </div>

            <!-- Login button -->
            <button
              v-else
              class="hidden md:inline-flex focus-ring dark:focus-ring-dark items-center gap-2 rounded-xl border px-4 py-1.5 text-sm font-medium transition border-ink-200 bg-white text-ink-700 shadow-sm hover:bg-ink-50 dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-cream-300 dark:hover:bg-white/[0.10] dark:hover:text-cream-100"
              @click="signIn('google')"
            >
              <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Masuk
            </button>
          </ClientOnly>

          <!-- Mulai CTA (selalu tampil) -->
          <BaseButton to="/audit" size="sm">Mulai</BaseButton>
        </div>
      </div>
    </header>

    <!-- ── Main content ───────────────────────────────────────────────── -->
    <main id="konten" class="flex-1">
      <slot />
    </main>

    <!-- ── Footer ─────────────────────────────────────────────────────── -->
    <footer class="relative overflow-hidden border-t border-ink-200/60 bg-ink-950">

      <!-- Ambient glow dekorasi -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute -top-32 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full blur-[80px] opacity-[0.12]"
        style="background: radial-gradient(circle, rgb(169 14 2 / 0.8) 0%, transparent 70%)"
      />

      <div class="relative mx-auto max-w-5xl px-4 pt-14 pb-8 sm:px-6">

        <!-- Grid utama: 3 kolom -->
        <div class="grid gap-10 sm:grid-cols-[1.8fr_1fr_1.4fr] lg:gap-14">

          <!-- Kolom 1: Brand + tagline -->
          <div>
            <div class="flex items-center gap-2.5">
              <LogoMark size="sm" />
              <span class="text-sm font-semibold text-cream-100">Pivot</span>
            </div>

            <div class="mt-4 flex items-start gap-3">
              <MascotFigure pose="hati" size="xs" class="shrink-0 mt-0.5" />
              <p class="text-sm leading-relaxed text-ink-400">
                Ruang untuk memulai, dan memulai lagi.
              </p>
            </div>

            <p class="mt-4 text-xs leading-relaxed text-ink-600">
              Pivot bukan lembaga keuangan dan tidak memberikan pinjaman.
              Semua data diproses di perangkatmu sendiri.
            </p>

            <!-- Privacy badge -->
            <div class="mt-5 inline-flex items-center gap-2 rounded-xl border border-sage-700/30 bg-sage-900/30 px-3 py-1.5">
              <svg class="h-3.5 w-3.5 shrink-0 text-sage-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="M10 1.5 3.5 4v5.2c0 4 2.7 7.7 6.5 9.3 3.8-1.6 6.5-5.3 6.5-9.3V4L10 1.5Zm3.1 6.6-3.6 3.6a.75.75 0 0 1-1.06 0L6.9 10.1a.75.75 0 1 1 1.06-1.06l1 1 3.08-3.07a.75.75 0 1 1 1.06 1.06Z"
                  clip-rule="evenodd"
                />
              </svg>
              <span class="text-[11px] font-medium text-sage-400">Data tidak meninggalkan perangkat</span>
            </div>
          </div>

          <!-- Kolom 2: Tautan -->
          <div>
            <p class="text-[11px] font-semibold tracking-[0.14em] text-ink-600 uppercase">
              Tautan
            </p>
            <ul class="mt-4 space-y-3">
              <li v-for="link in footerLinks" :key="link.label">
                <NuxtLink
                  :to="link.to"
                  class="focus-ring text-sm text-ink-400 transition hover:text-cream-200"
                >
                  {{ link.label }}
                </NuxtLink>
              </li>
              <!-- Login -->
              <li>
                <ClientOnly>
                  <button
                    v-if="status !== 'authenticated'"
                    class="focus-ring text-sm text-ink-400 transition hover:text-cream-200"
                    @click="signIn('google')"
                  >
                    Masuk dengan Google
                  </button>
                  <button
                    v-else
                    class="focus-ring text-sm text-red-500 transition hover:text-red-400"
                    @click="signOut()"
                  >
                    Keluar
                  </button>
                </ClientOnly>
              </li>
            </ul>
          </div>

          <!-- Kolom 3: Bantuan darurat -->
          <div>
            <p class="text-[11px] font-semibold tracking-[0.14em] text-ink-600 uppercase">
              Butuh bantuan sekarang?
            </p>
            <ul class="mt-4 space-y-3">
              <li
                v-for="line in helplines"
                :key="line.value"
                class="rounded-xl border border-sage-800/50 bg-sage-950/60 px-4 py-3"
              >
                <p class="text-xs leading-relaxed text-sage-500">{{ line.label }}</p>
                <p class="mt-0.5 text-base font-bold tabular-nums text-sage-300">
                  {{ line.value }}
                </p>
              </li>
            </ul>
          </div>
        </div>

        <!-- Bottom bar: copyright -->
        <div
          class="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-ink-600"
        >
          <p>Dibuat dengan niat baik untuk yang sedang berjuang.</p>
          <p>2025 Pivot. Semua hak dilindungi.</p>
        </div>
      </div>
    </footer>

    <!-- Chatbot AI Widget -->
    <AiChatWidget />
  </div>
</template>
