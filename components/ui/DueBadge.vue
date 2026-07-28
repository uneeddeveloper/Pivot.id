<script setup lang="ts">
import { computed } from 'vue'
import type { DueInfo } from '~/types/financial'

const props = defineProps<{ due: DueInfo }>()

/**
 * Merah brand hanya dipakai untuk yang benar-benar sudah lewat jatuh tempo —
 * di situ urgensinya nyata. Sisanya memakai gradasi krem yang lebih tenang.
 */
const tone = computed(
  () =>
    ({
      overdue: 'border-brand-200 bg-brand-50 text-brand-700',
      today: 'border-cream-500 bg-cream-300 text-ink-800',
      soon: 'border-cream-400 bg-cream-200 text-ink-700',
      upcoming: 'border-ink-200 bg-ink-50 text-ink-500',
      none: 'border-ink-200 bg-ink-50 text-ink-400',
    })[props.due.status],
)
</script>

<template>
  <span
    v-if="due.status !== 'none'"
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
    :class="tone"
    :title="formatFullDate(due.date)"
  >
    <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fill-rule="evenodd"
        d="M6 2a.75.75 0 0 1 .75.75V4h6.5V2.75a.75.75 0 0 1 1.5 0V4h.25A2.25 2.25 0 0 1 17.25 6.25v9A2.25 2.25 0 0 1 15 17.5H5a2.25 2.25 0 0 1-2.25-2.25v-9A2.25 2.25 0 0 1 5 4h.25V2.75A.75.75 0 0 1 6 2ZM4.25 8v7.25c0 .414.336.75.75.75h10a.75.75 0 0 0 .75-.75V8H4.25Z"
        clip-rule="evenodd"
      />
    </svg>
    {{ due.label }}
  </span>
</template>
