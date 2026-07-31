<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    /**
     * `solid`  → kartu isian utama (dark)
     * `soft`   → konten pendukung (dark-softer)
     * `brand`  → sorotan #A90E02 dengan teks krem
     */
    tone?: 'solid' | 'soft' | 'brand'
    interactive?: boolean
  }>(),
  { tone: 'solid', interactive: false },
)

const shell = computed(
  () =>
    ({
      solid: 'bg-white border-ink-200 shadow-soft dark:bg-ink-900/90 dark:backdrop-blur-xl dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
      soft:  'bg-ink-50/50 border-ink-200/60 backdrop-blur-md dark:surface-dark-card',
      brand: 'surface-brand border-brand-700/60 text-cream-100',
    })[props.tone],
)

const divider = computed(() => (props.tone === 'brand' ? 'border-cream-100/20' : 'border-ink-200 dark:border-white/[0.07]'))
</script>

<template>
  <section
    class="relative overflow-hidden rounded-[1.25rem] border p-6 sm:p-7 transition-all duration-400"
    :class="[shell, interactive ? 'lift-dark' : '']"
  >
    <header v-if="title || $slots.header" class="mb-4">
      <slot name="header">
        <div class="flex items-start gap-3">
          <span
            v-if="$slots.icon"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            :class="tone === 'brand' ? 'bg-cream-100/15 text-cream-100' : 'bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400'"
          >
            <slot name="icon" />
          </span>
          <div class="min-w-0">
            <h2
              class="text-base font-semibold"
              :class="tone === 'brand' ? 'text-cream-50' : 'text-ink-900 dark:text-cream-100'"
            >
              {{ title }}
            </h2>
            <p
              v-if="subtitle"
              class="mt-1 text-sm leading-relaxed"
              :class="tone === 'brand' ? 'text-cream-100/80' : 'text-ink-500 dark:text-ink-400'"
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
