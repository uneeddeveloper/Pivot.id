<script setup lang="ts">
import { computed } from 'vue'

/**
 * Penanda posisi di alur 5 langkah. Tujuannya menenangkan: user bisa melihat
 * bahwa yang tersisa sedikit, dan langkah sebelumnya sudah benar-benar selesai.
 *
 * Label di sini sengaja lebih pendek daripada di navigasi header: lima kolom
 * harus muat berdampingan di layar 640px tanpa saling menabrak.
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
      <p class="text-xs font-semibold tracking-widest text-brand-600 uppercase">
        Langkah {{ current }} dari {{ steps.length }}
      </p>
      <p class="text-xs text-ink-400">{{ steps[current - 1]?.label }}</p>
    </div>

    <!-- Rel progres -->
    <div class="relative mt-3">
      <div class="h-1 rounded-full bg-ink-200/70" />
      <div
        class="absolute top-0 left-0 h-1 rounded-full bg-linear-to-r from-brand-500 to-brand-700 transition-all duration-500 ease-out"
        :style="{ width: `${percent}%` }"
      />

      <ol class="mt-3 flex justify-between">
        <li
          v-for="(step, index) in steps"
          :key="step.to"
          class="flex flex-col items-center gap-1.5 text-center"
          :class="index === 0 ? 'items-start' : index === steps.length - 1 ? 'items-end' : ''"
        >
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold transition"
            :class="
              index + 1 < current
                ? 'border-sage-300 bg-sage-100 text-sage-700'
                : index + 1 === current
                  ? 'border-brand-600 bg-brand-600 text-cream-50 shadow-brand'
                  : 'border-ink-200 bg-cream-50 text-ink-400'
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
          <span
            class="hidden text-[11px] leading-tight sm:block"
            :class="index + 1 === current ? 'font-medium text-brand-700' : 'text-ink-400'"
          >
            {{ step.label }}
          </span>
        </li>
      </ol>
    </div>
  </div>
</template>
