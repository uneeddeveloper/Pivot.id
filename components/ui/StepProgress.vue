<script setup lang="ts">
import { computed } from 'vue'

/**
 * Penanda posisi di alur 5 langkah.
 * Tampilan disesuaikan dengan dark theme dari halaman alur.
 */
const props = defineProps<{ current: number }>()

const steps = [
  { label: 'Audit', to: '/audit' },
  { label: 'Skill', to: '/skill-gap' },
  { label: 'Roadmap', to: '/roadmap' },
  { label: 'Lowongan', to: '/jobs' },
  { label: 'Penghasilan', to: '/gigs' },
]

const percent = computed(() => ((props.current - 1) / (steps.length - 1)) * 100)
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-2">
      <p class="text-[10px] font-semibold tracking-[0.18em] text-brand-400 uppercase">
        Langkah {{ current }} dari {{ steps.length }}
      </p>
      <p class="text-[10px] text-ink-500">{{ steps[current - 1]?.label }}</p>
    </div>

    <!-- Progress track -->
    <div class="relative mt-3">
      <!-- Track background -->
      <div class="h-[3px] rounded-full bg-ink-200 dark:bg-white/[0.08]" />
      <!-- Track fill -->
      <div
        class="absolute top-0 left-0 h-[3px] rounded-full transition-all duration-500 ease-out"
        style="background: linear-gradient(90deg, var(--color-brand-500), var(--color-brand-400))"
        :style="{ width: `${percent}%` }"
      />

      <!-- Step dots -->
      <ol class="mt-3.5 flex justify-between">
        <li
          v-for="(step, index) in steps"
          :key="step.to"
          class="flex flex-col items-center gap-1.5 text-center"
          :class="index === 0 ? 'items-start' : index === steps.length - 1 ? 'items-end' : ''"
        >
          <NuxtLink :to="step.to" class="focus-ring dark:focus-ring-dark block rounded-full">
            <span
              class="flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold transition-all duration-300"
              :class="
                index + 1 < current
                  ? 'border-sage-600/40 bg-sage-100/50 text-sage-600 dark:bg-sage-900/60 dark:text-sage-400'
                  : index + 1 === current
                    ? 'border-brand-500 bg-brand-600 text-cream-50 shadow-brand'
                    : 'border-ink-200 bg-white text-ink-400 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-ink-600'
              "
            >
              <svg
                v-if="index + 1 < current"
                class="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                  clip-rule="evenodd"
                />
              </svg>
              <template v-else>{{ index + 1 }}</template>
            </span>
          </NuxtLink>

          <span
            class="hidden text-[11px] leading-tight sm:block"
            :class="index + 1 === current ? 'font-medium text-brand-600 dark:text-brand-400' : 'text-ink-400 dark:text-ink-600'"
          >
            {{ step.label }}
          </span>
        </li>
      </ol>
    </div>
  </div>
</template>
