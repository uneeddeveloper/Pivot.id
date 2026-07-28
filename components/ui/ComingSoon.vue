<script setup lang="ts">
defineProps<{
  /** Posisi langkah ini di alur 4 tahap. */
  current: number
  title: string
  description: string
  /** Ringkasan isi sprint berikutnya, ditampilkan sebagai daftar. */
  items: string[]
}>()
</script>

<template>
  <div class="relative mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72">
      <div class="aurora-blob -top-24 right-0 h-72 w-72 animate-float bg-cream-300/40" />
      <div class="aurora-blob -top-16 -left-12 h-56 w-56 bg-brand-100/50" />
    </div>

    <div class="animate-rise">
      <StepProgress :current="current" class="max-w-md" />

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <h1 class="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{{ title }}</h1>
        <span
          class="inline-flex items-center gap-1.5 rounded-full border border-cream-400 bg-cream-200 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-ink-700 uppercase"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-cream-600" />
          Sedang dibangun
        </span>
      </div>

      <p class="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base">{{ description }}</p>
    </div>

    <BaseCard tone="soft" class="animate-rise mt-8 [animation-delay:120ms]">
      <p class="text-sm font-semibold text-brand-900">Yang sedang disiapkan di halaman ini</p>
      <ul class="mt-4 space-y-3">
        <li v-for="item in items" :key="item" class="flex gap-3">
          <span
            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-brand-50"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-brand-500" />
          </span>
          <span class="text-sm leading-relaxed text-ink-700">{{ item }}</span>
        </li>
      </ul>
    </BaseCard>

    <div class="mt-8 flex flex-wrap items-center gap-3">
      <BaseButton to="/audit" variant="ghost">← Kembali ke audit finansial</BaseButton>
      <p class="text-xs leading-relaxed text-ink-400">
        Target Income-mu tetap tersimpan selama tab ini terbuka.
      </p>
    </div>
  </div>
</template>
