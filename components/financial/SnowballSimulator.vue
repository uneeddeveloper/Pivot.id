<script setup lang="ts">
import { computed } from 'vue'
import { useFinancialStore } from '~/stores/financial'
import type { PayoffStrategy } from '~/types/financial'

const financial = useFinancialStore()

const strategies: { value: PayoffStrategy; label: string; tagline: string }[] = [
  { value: 'snowball', label: 'Snowball', tagline: 'Saldo terkecil dulu — kemenangan cepat' },
  { value: 'avalanche', label: 'Avalanche', tagline: 'Bunga tertinggi dulu — total bunga terkecil' },
]

const simulation = computed(() => financial.simulation)
const comparison = computed(() => financial.strategyComparison)

/** Selisih bunga antar strategi — hanya berarti bila keduanya feasible. */
const interestGap = computed(() => {
  const { snowball, avalanche } = comparison.value
  if (!snowball.feasible || !avalanche.feasible) return null

  const gap = Math.abs(snowball.totalInterest - avalanche.totalInterest)
  if (gap < 1000) return null

  return {
    amount: gap,
    cheaper: snowball.totalInterest < avalanche.totalInterest ? 'Snowball' : 'Avalanche',
  }
})

const milestones = computed(() => simulation.value.payoffOrder)

const hasOnlySimplifiedDebts = computed(() =>
  financial.validDebts.length > 0 &&
  financial.validDebts.every((d) => d.calcMode === 'simplified')
)
</script>

<template>
  <section v-if="financial.hasDebt" class="mt-10">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-ink-900 dark:text-cream-50">Simulasi pelunasan</h2>
        <p class="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-600 dark:text-ink-400">
          Berjalan bulan demi bulan dengan dana tetap
          <strong class="font-medium text-ink-900 dark:text-cream-100">{{ formatIDR(simulation.monthlyBudget) }}</strong>
          per bulan. Begitu satu utang lunas, cicilannya otomatis mengalir ke utang berikutnya.
        </p>
      </div>

      <!-- Satu baris kontrol yang menaungi seluruh tampilan di bawahnya. -->
      <div
        role="radiogroup"
        aria-label="Strategi urutan pelunasan"
        class="flex shrink-0 gap-1 rounded-xl border border-ink-200/50 dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.02] p-1"
      >
        <button
          v-for="option in strategies"
          :key="option.value"
          type="button"
          role="radio"
          :aria-checked="financial.strategy === option.value"
          :title="option.tagline"
          class="focus-ring dark:focus-ring-dark rounded-lg px-3.5 py-1.5 text-sm font-medium transition"
          :class="
            financial.strategy === option.value
              ? 'bg-brand-600 text-cream-50 shadow-brand'
              : 'text-ink-500 dark:text-ink-400 hover:bg-white dark:hover:bg-white/[0.05] hover:text-brand-700 dark:hover:text-brand-400'
          "
          @click="financial.setStrategy(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <!-- ── Kondisi bisa lunas ───────────────────────────────────────────── -->
    <template v-if="simulation.feasible && simulation.months > 0">
      <div class="mt-6 grid gap-4 lg:grid-cols-3">
        <div class="lg:col-span-2">
          <DebtFreeCountdown :simulation="simulation" />
        </div>

        <BaseCard tone="soft" class="lg:col-span-1">
          <p class="text-sm font-semibold text-ink-900 dark:text-cream-50">Perbandingan strategi</p>
          <p class="mt-1 text-xs leading-relaxed text-ink-600 dark:text-ink-400">
            Dua-duanya sah. Pilih yang paling bisa kamu jalani.
          </p>

          <ul class="mt-4 space-y-2">
            <li
              v-for="option in strategies"
              :key="option.value"
              class="rounded-xl border px-3 py-2.5 transition"
              :class="
                financial.strategy === option.value
                  ? 'border-brand-500/40 bg-brand-50/50 dark:bg-brand-900/40'
                  : 'border-ink-200/50 dark:border-white/[0.07] bg-white/50 dark:bg-white/[0.02]'
              "
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium text-ink-900 dark:text-cream-50">{{ option.label }}</p>
                <span
                  v-if="financial.strategy === option.value"
                  class="rounded-full bg-brand-100 dark:bg-brand-900/60 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brand-700 dark:text-brand-300 uppercase border border-brand-200 dark:border-brand-500/20"
                >
                  Dipakai
                </span>
              </div>

              <dl class="mt-2 space-y-1 text-xs">
                <div class="flex justify-between gap-2">
                  <dt class="text-ink-600 dark:text-ink-400">Lama</dt>
                  <dd class="tabular-nums text-ink-900 dark:text-cream-100">
                    {{
                      comparison[option.value].feasible
                        ? formatDuration(comparison[option.value].months)
                        : 'Belum tercapai'
                    }}
                  </dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-ink-600 dark:text-ink-400">Total bunga</dt>
                  <dd class="tabular-nums text-ink-900 dark:text-cream-100">
                    <template v-if="!comparison[option.value].feasible">
                      —
                    </template>
                    <template v-else-if="hasOnlySimplifiedDebts">
                      <span class="text-[11px] font-medium text-ink-500">Sudah All-in</span>
                    </template>
                    <template v-else>
                      {{ formatIDR(comparison[option.value].totalInterest) }}
                    </template>
                  </dd>
                </div>
              </dl>
            </li>
          </ul>

          <p v-if="interestGap" class="attention-note mt-3 text-xs leading-relaxed text-amber-700 dark:text-amber-200/90 border-amber-200/40 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/40">
            {{ interestGap.cheaper }} menghemat sekitar
            <strong class="font-semibold text-amber-900 dark:text-amber-100">{{ formatIDR(interestGap.amount) }}</strong> bunga.
            Bedanya kecil? Pilih saja yang paling membuatmu bertahan.
          </p>
        </BaseCard>
      </div>

      <BaseCard
        class="mt-4"
        title="Perjalanan sisa utang"
        subtitle="Garisnya menurun karena dana bulanan dijaga tetap. Arahkan kursor — atau gunakan tombol panah — untuk melihat angka tiap bulan."
      >
        <template #icon>
          <Icon name="lucide:line-chart" class="h-5 w-5" />
        </template>

        <PayoffChart
          :timeline="simulation.timeline"
          :start-total="financial.totalDebt"
          :milestones="milestones"
        />

        <template v-if="milestones.length" #footer>
          <p class="text-sm font-medium text-ink-900 dark:text-cream-50">Urutan lunas</p>
          <ol class="mt-3 grid gap-2 sm:grid-cols-2">
            <li
              v-for="(milestone, index) in milestones"
              :key="milestone.debtId"
              class="flex items-center gap-2.5 rounded-xl border border-sage-200 dark:border-sage-900/60 bg-sage-50/50 dark:bg-sage-950/40 px-3 py-2"
            >
              <span
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-100 dark:bg-sage-900/60 text-[11px] font-semibold text-sage-600 dark:text-sage-300 border border-sage-200 dark:border-sage-800/50"
              >
                {{ index + 1 }}
              </span>
              <span class="min-w-0 flex-1 truncate text-sm text-ink-900 dark:text-cream-100">
                {{ milestone.name || 'Utang tanpa nama' }}
              </span>
              <span class="shrink-0 text-xs tabular-nums text-sage-600 dark:text-sage-400">
                bulan ke-{{ milestone.month }}
              </span>
            </li>
          </ol>
        </template>
      </BaseCard>
    </template>

    <!-- ── Kondisi bunga masih mengalahkan pembayaran ───────────────────── -->
    <BaseCard v-else-if="simulation.shortfall" tone="soft" class="mt-6">
      <div class="flex items-start gap-4">
        <!-- Maskot memeluk hati, bukan ikon peringatan: momen ini butuh dukungan,
             bukan alarm. -->
        <MascotFigure pose="hati" size="sm" class="hidden sm:block" />
        <div class="min-w-0">
          <p class="font-semibold text-ink-900 dark:text-cream-50">Grafiknya belum bisa digambar — dan itu wajar</p>
          <p class="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
            Dengan dana bulanan saat ini, bunga masih tumbuh lebih cepat daripada pembayaran,
            sehingga sisa utang belum menyusut. Ini bukan kegagalanmu — struktur bunga pinjaman
            ilegal memang dirancang seperti itu.
          </p>
          <p class="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
            Titik balik terjadi saat dana bulanan mencapai sekitar
            <strong class="font-semibold text-brand-600 dark:text-brand-400">
              {{ formatIDR(simulation.shortfall.minimumViableBudget) }}
            </strong>
            — naik
            <strong class="font-semibold text-ink-900 dark:text-cream-100">
              {{ formatIDR(Math.max(0, simulation.shortfall.minimumViableBudget - simulation.monthlyBudget)) }}
            </strong>
            dari sekarang. Selisih itulah yang akan kita kejar lewat langkah karir berikutnya.
          </p>

          <div class="mt-4 flex flex-wrap gap-3">
            <BaseButton to="/skill-gap" variant="secondary" size="sm">
              Cari peran kerja yang menutup selisihnya
            </BaseButton>
          </div>

          <p class="attention-note mt-4 text-xs leading-relaxed text-amber-700 dark:text-amber-200/90 border-amber-200/40 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/40">
            Kalau penagihan sudah mengganggu atau pinjamannya tidak berizin, kamu bisa mengadu ke
            OJK di 157. Itu hakmu, bukan tanda menyerah.
          </p>
        </div>
      </div>
    </BaseCard>
  </section>
</template>
