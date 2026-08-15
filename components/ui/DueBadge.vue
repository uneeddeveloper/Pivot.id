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
    <Icon name="lucide:calendar" class="h-3.5 w-3.5" aria-hidden="true" />
    {{ due.label }}
  </span>
</template>
