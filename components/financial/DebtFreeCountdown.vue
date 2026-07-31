<script setup lang="ts">
import { computed } from 'vue'
import { useFinancialStore } from '~/stores/financial'
import type { SimulationResult } from '~/types/financial'

/**
 * Hitung mundur menuju bebas utang.
 *
 * Angka besar sengaja memakai figur proporsional (bukan tabular-nums) karena
 * ini figur tunggal berukuran display, bukan kolom angka yang harus sejajar.
 */
const props = defineProps<{ simulation: SimulationResult }>()
const financial = useFinancialStore() // Inisialisasi store

const years = computed(() => Math.floor(props.simulation.months / 12))
const restMonths = computed(() => props.simulation.months % 12)

/** Mengecek tipe utang untuk penyesuaian UI */
const hasOnlySimplifiedDebts = computed(() =>
  financial.validDebts.length > 0 && 
  financial.validDebts.every((d) => d.calcMode === 'simplified')
)
const hasSimplifiedDebts = computed(() =>
  financial.validDebts.some((d) => d.calcMode === 'simplified')
)

/** Porsi bunga terhadap seluruh uang yang akan dibayarkan. */
const interestShare = computed(() => {
  const paid = props.simulation.totalPaid
  if (paid <= 0) return 0
  return Math.min(100, (props.simulation.totalInterest / paid) * 100)
})

const principalPaid = computed(() =>
  Math.max(0, props.simulation.totalPaid - props.simulation.totalInterest),
)
</script>

<template>
  <div
    class="relative overflow-hidden rounded-2xl border border-sage-200 dark:border-sage-900/40 bg-linear-to-br from-sage-50 via-sage-100/40 to-white dark:from-sage-900/30 dark:via-sage-950/40 dark:to-ink-900 p-5 sm:p-6"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full bg-sage-500/10 blur-3xl"
    />

    <!-- Perayaan kecil. Hanya muncul di layar yang cukup lebar supaya tidak
         pernah menabrak angka besarnya. -->
    <MascotFigure pose="happy" size="sm" class="absolute top-2 right-2 hidden sm:block" />

    <div class="relative">
      <!-- Blok atas diberi ruang kanan supaya tidak pernah menabrak maskot. -->
      <div class="sm:pr-28">
        <p class="text-xs font-semibold tracking-widest text-sage-600 dark:text-sage-400 uppercase">
          Bebas utang dalam
        </p>

        <div class="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p class="text-5xl leading-none font-bold text-sage-600 dark:text-sage-300 sm:text-6xl">
            {{ simulation.months }}
          </p>
          <p class="text-lg font-medium text-sage-600 dark:text-sage-400">bulan</p>
          <p v-if="years > 0" class="text-sm text-ink-600 dark:text-ink-400">
            ({{ years }} tahun{{ restMonths > 0 ? ` ${restMonths} bulan` : '' }})
          </p>
        </div>

        <p class="mt-3 flex items-center gap-2 text-sm text-ink-600 dark:text-ink-400">
          <svg class="h-4 w-4 shrink-0 text-sage-500 dark:text-sage-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M6 2a.75.75 0 0 1 .75.75V4h6.5V2.75a.75.75 0 0 1 1.5 0V4h.25A2.25 2.25 0 0 1 17.25 6.25v9A2.25 2.25 0 0 1 15 17.5H5a2.25 2.25 0 0 1-2.25-2.25v-9A2.25 2.25 0 0 1 5 4h.25V2.75A.75.75 0 0 1 6 2ZM4.25 8v7.25c0 .414.336.75.75.75h10a.75.75 0 0 0 .75-.75V8H4.25Z"
              clip-rule="evenodd"
            />
          </svg>
          Perkiraan lunas sekitar
          <strong class="font-semibold text-ink-900 dark:text-cream-50">
            {{ formatMonthYear(simulation.debtFreeDate) }}
          </strong>
        </p>
      </div>

      <!-- Meter satu warna: porsi bunga dari total yang dibayar. -->
      <div class="mt-5">
        <!-- Tampilan Jika 100% Utang Paylater (Sederhana) -->
        <template v-if="hasOnlySimplifiedDebts">
          <div class="flex items-baseline justify-between gap-3">
            <p class="text-xs text-ink-600 dark:text-ink-400">Skema Bunga</p>
            <p class="text-xs font-semibold text-sage-700 dark:text-sage-300 bg-sage-100/50 dark:bg-sage-900/40 px-2 py-0.5 rounded-md border border-sage-200 dark:border-sage-800/50">
              Flat (Sudah masuk cicilan)
            </p>
          </div>
        </template>
        
        <!-- Tampilan Standar (Ada utang berbunga tradisional) -->
        <template v-else>
          <div class="flex items-baseline justify-between gap-3">
            <p class="text-xs text-ink-600 dark:text-ink-400">Porsi bunga dari total pembayaran</p>
            <p class="text-xs font-semibold tabular-nums text-ink-900 dark:text-cream-50">
              {{ Math.round(interestShare) }}%
            </p>
          </div>
          <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-950/50 border border-brand-200/50 dark:border-brand-900/50">
            <div
              class="h-full rounded-full bg-brand-600 transition-all duration-500 ease-out"
              :style="{ width: `${interestShare}%` }"
            />
          </div>
        </template>

        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-xl border border-ink-200/50 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.02] px-3 py-2">
            <dt class="text-xs text-ink-600 dark:text-ink-400">
              {{ hasOnlySimplifiedDebts ? 'Total Tagihan' : 'Menghapus pokok' }}
            </dt>
            <dd class="mt-0.5 font-semibold tabular-nums text-ink-900 dark:text-cream-50">
              {{ formatIDR(principalPaid) }}
            </dd>
          </div>
          <div class="rounded-xl border border-ink-200/50 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.02] px-3 py-2">
            <dt class="text-xs text-ink-600 dark:text-ink-400">Terbayar sebagai bunga</dt>
            <dd class="mt-0.5 font-semibold tabular-nums text-ink-900 dark:text-cream-50">
              <!-- Jika utang paylater semua -->
              <span v-if="hasOnlySimplifiedDebts" class="text-xs font-medium text-ink-600 dark:text-ink-400">
                Sudah All-in
              </span>
              <!-- Jika ada utang biasa / campur -->
              <span v-else>
                {{ formatIDR(simulation.totalInterest) }}
                <span v-if="hasSimplifiedDebts" class="block text-[10px] font-normal text-ink-500 mt-0.5 leading-tight">
                  *di luar bunga paylater
                </span>
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>
