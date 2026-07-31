<script setup lang="ts">
import { computed } from 'vue'
import { useFinancialStore } from '~/stores/financial'

const financial = useFinancialStore()

const items = computed(() => financial.withDueDate)
const overdueCount = computed(() => financial.overdueDebts.length)
</script>

<template>
  <BaseCard
    v-if="items.length"
    title="Jatuh tempo terdekat"
    subtitle="Diurutkan dari yang paling mendesak, supaya kamu tahu apa yang perlu disiapkan lebih dulu."
  >
    <template #icon>
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M6 2a.75.75 0 0 1 .75.75V4h6.5V2.75a.75.75 0 0 1 1.5 0V4h.25A2.25 2.25 0 0 1 17.25 6.25v9A2.25 2.25 0 0 1 15 17.5H5a2.25 2.25 0 0 1-2.25-2.25v-9A2.25 2.25 0 0 1 5 4h.25V2.75A.75.75 0 0 1 6 2ZM4.25 8v7.25c0 .414.336.75.75.75h10a.75.75 0 0 0 .75-.75V8H4.25Z"
          clip-rule="evenodd"
        />
      </svg>
    </template>

    <ul class="divide-y divide-ink-100 dark:divide-white/[0.08]">
      <li
        v-for="item in items"
        :key="item.debt.id"
        class="flex items-center justify-between gap-3 py-3 first:pt-0"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-ink-900 dark:text-cream-50">
            {{ item.debt.name || 'Utang tanpa nama' }}
          </p>
          <p class="mt-0.5 text-xs text-ink-600 dark:text-ink-400">
            {{ formatFullDate(item.due.date) }}
          </p>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1.5">
          <DueBadge :due="item.due" />
          <span v-if="item.debt.minPayment > 0" class="text-xs tabular-nums text-ink-600 dark:text-ink-400">
            {{ formatIDR(item.debt.minPayment) }}
          </span>
        </div>
      </li>
    </ul>

    <template #footer>
      <div class="space-y-2">
        <div v-if="financial.dueThisWeek > 0" class="flex items-baseline justify-between gap-3">
          <span class="text-sm text-ink-600 dark:text-ink-400">Perlu disiapkan dalam 7 hari</span>
          <span class="text-sm font-semibold tabular-nums text-brand-600 dark:text-brand-400">
            {{ formatIDR(financial.dueThisWeek) }}
          </span>
        </div>

        <p v-if="overdueCount > 0" class="attention-note text-xs leading-relaxed text-amber-700 dark:text-amber-200/90 border-amber-200/40 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/40">
          Ada {{ overdueCount }} pembayaran yang sudah lewat tanggal. Kalau penagihan sudah
          mengganggu, kamu bisa mengadu ke OJK di 157 — jangan tanggung sendirian.
        </p>
      </div>
    </template>
  </BaseCard>
</template>
