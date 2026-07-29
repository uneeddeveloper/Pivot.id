<script setup lang="ts">
const { status, data, signIn, signOut } = useAuth()

const steps = [
  { to: '/audit', label: 'Audit Finansial', short: 'Audit', step: 1 },
  { to: '/skill-gap', label: 'Skill & Peran', short: 'Skill', step: 2 },
  { to: '/roadmap', label: 'Roadmap Belajar', short: 'Roadmap', step: 3 },
  { to: '/jobs', label: 'Lowongan & CV', short: 'Lowongan', step: 4 },
  { to: '/gigs', label: 'Penghasilan Cepat', short: 'Cepat', step: 5 },
]

const helplines = [
  { label: 'Pengaduan pinjaman ilegal — OJK', value: '157' },
  { label: 'Layanan kesehatan jiwa — Kemenkes', value: '119 ext. 8' },
]
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#konten"
      class="focus-ring sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:text-cream-50"
    >
      Lompat ke konten
    </a>

    <header
      class="sticky top-0 z-20 border-b border-ink-200/70 bg-cream-50/80 shadow-soft backdrop-blur-md"
    >
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <NuxtLink
          to="/"
          class="focus-ring group flex items-center gap-2.5 rounded-xl pr-2 transition"
        >
          <LogoMark size="sm" />
          <span class="text-base font-semibold tracking-tight text-brand-800">Pivot</span>
        </NuxtLink>

        <!--
          Ambang pindah ke `lg`, bukan `md`: dengan lima langkah, label
          selengkapnya sudah tidak muat berdampingan di 768px.
        -->
        <nav class="hidden items-center gap-0.5 lg:flex">
          <NuxtLink
            v-for="item in steps"
            :key="item.to"
            :to="item.to"
            class="focus-ring group/nav flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-ink-500 transition hover:bg-cream-200/70 hover:text-brand-700"
            active-class="bg-cream-200 text-brand-700 font-medium shadow-inner"
          >
            <span
              class="flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-[10px] font-semibold text-ink-500 transition group-hover/nav:bg-brand-100 group-hover/nav:text-brand-700"
            >
              {{ item.step }}
            </span>
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-2">
          <!-- Auth logic using Sidebase Nuxt Auth -->
          <ClientOnly>
            <template #fallback>
              <div class="h-8 w-20 animate-pulse rounded-lg bg-ink-200/50"></div>
            </template>
            <div v-if="status === 'authenticated'" class="hidden items-center gap-3 lg:flex">
              <div class="flex items-center gap-2">
                <img v-if="data?.user?.image" :src="data.user.image" class="h-8 w-8 rounded-full border border-ink-200" alt="Avatar" />
                <span class="text-sm font-medium text-ink-700 max-w-[100px] truncate" :title="data?.user?.name || ''">
                  {{ data?.user?.name || 'User' }}
                </span>
              </div>
              <button
                @click="signOut()"
                class="focus-ring rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
              >
                Keluar
              </button>
            </div>
            <button
              v-else
              @click="signIn('google')"
              class="hidden lg:inline-flex focus-ring items-center gap-2 rounded-xl bg-white px-4 py-1.5 text-sm font-medium text-ink-700 shadow-sm border border-ink-200 transition hover:bg-ink-50"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Login
            </button>
          </ClientOnly>

          <BaseButton to="/audit" size="sm" class="lg:hidden">Mulai</BaseButton>
        </div>
      </div>

      <!-- Navigasi langkah versi sempit: bisa digeser, tetap terlihat urutannya. -->
      <nav
        class="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-ink-200/60 px-4 py-2 lg:hidden"
      >
        <NuxtLink
          v-for="item in steps"
          :key="item.to"
          :to="item.to"
          class="focus-ring flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-500 transition"
          active-class="border-brand-200 bg-brand-50 text-brand-700 font-medium"
        >
          <span class="text-[10px] text-ink-400">{{ item.step }}</span>
          {{ item.short }}
        </NuxtLink>
      </nav>
    </header>

    <main id="konten" class="flex-1">
      <slot />
    </main>

    <footer class="relative mt-8 overflow-hidden border-t border-ink-200 bg-cream-50">
      <div
        aria-hidden="true"
        class="aurora-blob -top-24 -right-16 h-56 w-56 bg-brand-200/30"
      />

      <div class="relative mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.3fr]">
          <div>
            <div class="flex items-center gap-2.5">
              <LogoMark size="sm" />
              <span class="text-sm font-semibold text-brand-800">Pivot</span>
            </div>
            <div class="mt-3 flex items-center gap-3">
              <MascotFigure pose="hati" size="xs" />
              <p class="text-sm leading-relaxed text-ink-600">
                Ruang untuk memulai, dan memulai lagi.
              </p>
            </div>
            <p class="mt-3 text-xs leading-relaxed text-ink-400">
              Pivot bukan lembaga keuangan dan tidak memberikan pinjaman.
            </p>
          </div>

          <div>
            <p class="text-xs font-semibold tracking-widest text-ink-500 uppercase">Alur</p>
            <ul class="mt-3 space-y-2">
              <li v-for="item in steps" :key="item.to">
                <NuxtLink
                  :to="item.to"
                  class="focus-ring rounded text-sm text-ink-600 transition hover:text-brand-700"
                >
                  <span class="mr-1.5 text-xs text-ink-300">0{{ item.step }}</span>
                  {{ item.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>

          <div>
            <p class="text-xs font-semibold tracking-widest text-ink-500 uppercase">
              Kalau butuh bantuan sekarang
            </p>
            <ul class="mt-3 space-y-2">
              <li
                v-for="line in helplines"
                :key="line.value"
                class="rounded-xl border border-sage-200 bg-sage-50 px-3 py-2"
              >
                <p class="text-xs leading-relaxed text-sage-700">{{ line.label }}</p>
                <p class="mt-0.5 text-sm font-semibold tabular-nums text-sage-800">
                  {{ line.value }}
                </p>
              </li>
            </ul>
          </div>
        </div>

        <div
          class="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink-200/70 pt-5 text-xs text-ink-400"
        >
          <p class="flex items-center gap-1.5">
            <svg class="h-3.5 w-3.5 text-sage-600" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 1.5 3.5 4v5.2c0 4 2.7 7.7 6.5 9.3 3.8-1.6 6.5-5.3 6.5-9.3V4L10 1.5Zm3.1 6.6-3.6 3.6a.75.75 0 0 1-1.06 0L6.9 10.1a.75.75 0 1 1 1.06-1.06l1 1 3.08-3.07a.75.75 0 1 1 1.06 1.06Z"
                clip-rule="evenodd"
              />
            </svg>
            Data utang diproses sepenuhnya di perangkat ini.
          </p>
          <p class="sm:ml-auto">© {{ new Date().getFullYear() }} Pivot</p>
        </div>
      </div>
    </footer>
  </div>
</template>
