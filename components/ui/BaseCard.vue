<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    /**
     * `solid` kartu isian utama, `soft` konten pendukung,
     * `brand` sorotan #A90E02 dengan teks krem untuk angka kunci.
     */
    tone?: 'solid' | 'soft' | 'brand'
    /** Angkat kartu saat hover — hanya untuk kartu yang bisa diklik. */
    interactive?: boolean
  }>(),
  { tone: 'solid', interactive: false },
)

const shell = computed(
  () =>
    ({
      solid: 'surface-card border-ink-200/80',
      soft: 'border-cream-300 bg-linear-to-br from-cream-50 to-cream-100/60',
      brand: 'surface-brand border-brand-700/60 text-cream-100',
    })[props.tone],
)

const divider = computed(() => (props.tone === 'brand' ? 'border-cream-100/25' : 'border-ink-100'))
</script>

<template>
  <section
    class="relative overflow-hidden rounded-2xl border p-5 sm:p-6"
    :class="[shell, interactive ? 'lift' : '']"
  >
    <header v-if="title || $slots.header" class="mb-4">
      <slot name="header">
        <div class="flex items-start gap-3">
          <span
            v-if="$slots.icon"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            :class="tone === 'brand' ? 'bg-cream-100/15 text-cream-100' : 'bg-brand-50 text-brand-600'"
          >
            <slot name="icon" />
          </span>
          <div class="min-w-0">
            <h2 class="text-lg font-semibold" :class="tone === 'brand' ? '' : 'text-ink-900'">
              {{ title }}
            </h2>
            <p
              v-if="subtitle"
              class="mt-1 text-sm leading-relaxed"
              :class="tone === 'brand' ? 'text-cream-100/85' : 'text-ink-500'"
            >
              {{ subtitle }}
            </p>
          </div>
        </div>
      </slot>
    </header>

    <slot />

    <footer v-if="$slots.footer" class="mt-5 border-t pt-4" :class="divider">
      <slot name="footer" />
    </footer>
  </section>
</template>
