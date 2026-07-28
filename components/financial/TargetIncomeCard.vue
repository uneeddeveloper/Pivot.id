<script setup lang="ts">
import { computed } from 'vue'
import { useFinancialStore } from '~/stores/financial'

const financial = useFinancialStore()

const summary = computed(() => financial.summary)
const simulation = computed(() => financial.simulation)

const hasDebt = computed(() => financial.hasDebt)

const breakdown = computed(() => [
  { label: 'Biaya hidup minimal', value: summary.value.livingCost },
  { label: 'Total cicilan minimal', value: summary.value.totalMinPayment },
])

/** Porsi cicilan terhadap Target Income — dipakai sebagai bar proporsi. */
const debtShare = computed(() => {
  const target = summary.value.targetIncome
  if (target <= 0) return 0
  return Math.min(100, (summary.value.totalMinPayment / target) * 100)
})
</script>

<template>
  <BaseCard tone="brand" class="animate-rise">
    <!-- Lingkaran dekoratif tipis — memberi kedalaman tanpa mengganggu keterbacaan. -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full border border-cream-100/10"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none absolute -right-8 -bottom-20 h-40 w-40 rounded-full bg-cream-100/5 blur-2xl"
    />

    <template #header>
      <p class="flex items-center gap-2 text-xs font-medium tracking-wide text-cream-100/75 uppercase">
        <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3a.75.75 0 0 1 .75.75v.6a2.5 2.5 0 0 1 .35 4.8l-1.85.62a1 1 0 0 0 .32 1.95h.18c.4 0 .77-.24.92-.6a.75.75 0 0 1 1.38.58 2.5 2.5 0 0 1-2.05 1.5v.55a.75.75 0 0 1-1.5 0v-.6a2.5 2.5 0 0 1-.35-4.8l1.85-.62a1 1 0 0 0-.32-1.95h-.18c-.4 0-.77.24-.92.6a.75.75 0 1 1-1.38-.58A2.5 2.5 0 0 1 9.25 5.6v-.85A.75.75 0 0 1 10 5Z"
            clip-rule="evenodd"
          />
        </svg>
        Target Income Bulanan
      </p>
      <p class="animate-count-in mt-2 text-4xl font-bold tracking-tight tabular-nums text-cream-50 sm:text-[2.75rem]">
        {{ formatIDR(summary.targetIncome) }}
      </p>
      <p class="mt-2.5 text-sm leading-relaxed text-cream-100/85">
        {{
          hasDebt
            ? 'Ini penghasilan bersih per bulan yang membuatmu bertahan tanpa menambah utang baru. Bukan angka impian — ini garis aman yang akan kita kejar bersama.'
            : 'Ini penghasilan bersih per bulan yang membuatmu berdiri stabil. Jadikan angka ini batas bawah saat menimbang tawaran kerja — bukan angka impian, tapi garis amanmu.'
        }}
      </p>
    </template>

    <template v-if="hasDebt">
      <!-- Bar proporsi: seberapa besar bagian cicilan dari total target. -->
      <div
        v-if="summary.targetIncome > 0"
        class="mb-4 flex h-2 overflow-hidden rounded-full bg-cream-100/15"
        role="img"
        :aria-label="`Cicilan mengambil sekitar ${Math.round(debtShare)} persen dari Target Income`"
      >
        <div
          class="h-full bg-cream-200 transition-all duration-500 ease-out"
          :style="{ width: `${100 - debtShare}%` }"
        />
        <div
          class="h-full bg-cream-100/35 transition-all duration-500 ease-out"
          :style="{ width: `${debtShare}%` }"
        />
      </div>

      <dl class="space-y-2 text-sm">
        <div v-for="item in breakdown" :key="item.label" class="flex justify-between gap-4">
          <dt class="text-cream-100/70">{{ item.label }}</dt>
          <dd class="font-medium tabular-nums text-cream-50">{{ formatIDR(item.value) }}</dd>
        </div>
        <div class="flex justify-between gap-4 border-t border-cream-100/20 pt-2">
          <dt class="font-medium text-cream-50">Target Income</dt>
          <dd class="font-semibold tabular-nums text-cream-50">
            {{ formatIDR(summary.targetIncome) }}
          </dd>
        </div>
      </dl>
    </template>

    <p v-else class="text-sm leading-relaxed text-cream-100/85">
      Belum ada utang yang tercatat, jadi Target Income-mu murni dari biaya hidup. Begitu ada
      cicilan yang masuk, angka ini ikut menyesuaikan.
    </p>

    <div v-if="hasDebt" class="mt-5 grid gap-3 sm:grid-cols-2">
      <div class="rounded-xl border border-cream-100/10 bg-brand-900/30 px-4 py-3 backdrop-blur-sm">
        <p class="text-xs text-cream-100/70">Total sisa utang</p>
        <p class="mt-1 font-semibold tabular-nums text-cream-50">
          {{ formatIDR(summary.totalDebt) }}
        </p>
      </div>
      <div class="rounded-xl border border-cream-100/10 bg-brand-900/30 px-4 py-3 backdrop-blur-sm">
        <p class="text-xs text-cream-100/70">Bunga berjalan / bulan</p>
        <p class="mt-1 font-semibold tabular-nums text-cream-50">
          {{ formatIDR(financial.monthlyInterest) }}
        </p>
      </div>
    </div>

    <template #footer>
      <div v-if="simulation.feasible && simulation.months > 0" class="space-y-2">
        <div class="flex items-center gap-2 text-cream-50">
          <svg class="h-4 w-4 shrink-0 text-cream-200" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.58 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
              clip-rule="evenodd"
            />
          </svg>
          <p class="text-sm leading-relaxed">
            Dengan dana
            <strong class="font-semibold">{{ formatIDR(simulation.monthlyBudget) }}</strong> per
            bulan, utangmu diperkirakan lunas dalam
            <strong class="font-semibold">{{ formatDuration(simulation.months) }}</strong> — sekitar
            <strong class="font-semibold">{{ formatMonthYear(simulation.debtFreeDate) }}</strong
            >.
          </p>
        </div>
        <p class="text-xs text-cream-100/65">
          Total bunga yang terbayar sepanjang jalan: {{ formatIDR(simulation.totalInterest) }}.
        </p>
      </div>

      <div
        v-else-if="simulation.shortfall"
        class="space-y-2 rounded-xl border-l-4 border-cream-300 bg-brand-900/35 px-3.5 py-3"
      >
        <p class="text-sm leading-relaxed text-cream-50">
          Dengan dana bulanan saat ini, bunga masih tumbuh lebih cepat daripada pembayaran. Ini
          bukan salahmu — bunga pinjaman ilegal memang dirancang seperti itu.
        </p>
        <p class="text-sm leading-relaxed text-cream-50">
          Titik balik terjadi saat dana bulanan mencapai sekitar
          <strong class="font-semibold text-cream-200">{{
            formatIDR(simulation.shortfall.minimumViableBudget)
          }}</strong
          >. Selisihnya yang akan kita kejar lewat langkah karir berikutnya.
        </p>
      </div>

      <p v-else-if="!hasDebt" class="text-sm leading-relaxed text-cream-50">
        Kamu berangkat tanpa beban cicilan — posisi yang bagus. Langkah berikutnya: cari peran kerja
        yang gaji bersihnya berada di atas angka ini.
      </p>

      <p v-else class="text-sm text-cream-100/80">
        Lengkapi sisa pokok dan cicilan minimal untuk melihat estimasi waktu bebas utang.
      </p>
    </template>
  </BaseCard>
</template>
