<script setup lang="ts">
const steps = [
  { to: '/audit', label: 'Audit Finansial', short: 'Audit', step: 1 },
  { to: '/skill-gap', label: 'Skill & Peran', short: 'Skill', step: 2 },
  { to: '/roadmap', label: 'Roadmap Belajar', short: 'Roadmap', step: 3 },
  { to: '/jobs', label: 'Lowongan & CV', short: 'Lowongan', step: 4 },
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

        <nav class="hidden items-center gap-0.5 md:flex">
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

        <BaseButton to="/audit" size="sm" class="md:hidden">Mulai</BaseButton>
      </div>

      <!-- Navigasi langkah versi mobile: bisa digeser, tetap terlihat urutannya. -->
      <nav
        class="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-ink-200/60 px-4 py-2 md:hidden"
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
