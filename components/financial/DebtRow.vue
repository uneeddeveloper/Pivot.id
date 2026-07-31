<script setup lang="ts">
import { computed } from 'vue'
import type { Debt, RatePeriod } from '~/types/financial'

const props = defineProps<{
  debt: Debt
  index: number
  removable: boolean
}>()

const emit = defineEmits<{
  update: [patch: Partial<Debt>]
  remove: []
}>()

const periods: { value: RatePeriod; label: string }[] = [
  { value: 'daily', label: '% per hari' },
  { value: 'monthly', label: '% per bulan' },
  { value: 'yearly', label: '% per tahun' },
]

/** Bunga yang berjalan bulan ini — membantu user melihat beban sebenarnya. */
const monthlyInterest = computed(() =>
  props.debt.principal > 0
    ? props.debt.principal * toMonthlyRate(props.debt.interestRate, props.debt.ratePeriod)
    : 0,
)

/** Cicilan minimal di bawah bunga berarti pokok tidak pernah turun. */
const minPaymentBelowInterest = computed(
  () =>
    props.debt.principal > 0 &&
    props.debt.minPayment > 0 &&
    props.debt.minPayment < monthlyInterest.value,
)

const due = computed(() => dueInfoOf(props.debt.dueDate))

/** Update cicilan bulanan, otomatis kalikan dengan tenor untuk dapat total utang */
const updateSimplifiedMinPayment = (val: number) => {
  // Jika tenor belum diisi, asumsikan 1 bulan dulu agar perkalian tidak 0
  const tenor = props.debt.tenorMonths && props.debt.tenorMonths > 0 ? props.debt.tenorMonths : 1
  emit('update', {
    minPayment: val,
    principal: val * tenor, // Pokok utang = Cicilan x Tenor
    interestRate: 0, // Bunga dianggap 0 karena sudah include di cicilan
  })
}

/** Update tenor, otomatis kalikan dengan cicilan untuk dapat total utang */
const updateSimplifiedTenor = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value) || 0
  emit('update', {
    tenorMonths: val,
    principal: props.debt.minPayment * val, // Pokok utang = Cicilan x Tenor baru
  })
}
</script>
<template>
  <div
    class="rounded-[1.125rem] border border-ink-200/50 dark:border-white/[0.07] bg-white/40 dark:bg-ink-800 p-4 transition hover:border-ink-300 dark:hover:border-white/[0.12]"
  >
    <!-- Header Row -->
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-ink-200/50 dark:bg-white/[0.07] text-[11px] font-semibold text-ink-600 dark:text-ink-400">
          {{ index + 1 }}
        </span>
        <span class="text-xs font-medium tracking-wide text-ink-600 dark:text-ink-400 uppercase">
          {{ debt.name || 'Utang tanpa nama' }}
        </span>
        <DueBadge v-if="debt.calcMode === 'detailed'" :due="due" />
      </div>
      <button
        v-if="removable"
        type="button"
        class="focus-ring dark:focus-ring-dark rounded-lg p-1.5 text-ink-500 transition hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400"
        :aria-label="`Hapus utang ${index + 1}`"
        @click="emit('remove')"
      >
        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 6h12M8.5 6V4.5h3V6M6.5 6l.6 9h5.8l.6-9" />
        </svg>
      </button>
    </div>

    <!-- NAMA PINJAMAN -->
    <div class="mb-4">
      <FormField label="Nama pinjaman" hint="Bebas, hanya kamu yang melihatnya." :field-id="`${debt.id}-name`">
        <input
          :id="`${debt.id}-name`"
          :value="debt.name"
          type="text"
          placeholder="Misal: Paylater A, Kartu Kredit, Utang teman"
          class="field-input-dark"
          @input="emit('update', { name: ($event.target as HTMLInputElement).value })"
        />
      </FormField>
    </div>

    <!-- TOGGLE MODE -->
    <div class="mb-5 flex gap-2 rounded-lg p-1 bg-ink-100/60 dark:bg-ink-700/60 border border-ink-200/50 dark:border-white/[0.06]">
      <label class="flex-1 cursor-pointer">
        <input
          type="radio"
          :name="`mode-${debt.id}`"
          value="simplified"
          :checked="debt.calcMode === 'simplified'"
          class="peer sr-only"
          @change="emit('update', { calcMode: 'simplified' })"
        />
        <div class="rounded-md py-1.5 text-center text-xs font-medium transition peer-checked:bg-white dark:peer-checked:bg-white/[0.1] peer-checked:text-brand-600 dark:peer-checked:text-brand-300 peer-checked:shadow-sm text-ink-500">
          Total + Tenor (Sederhana)
        </div>
      </label>
      <label class="flex-1 cursor-pointer">
        <input
          type="radio"
          :name="`mode-${debt.id}`"
          value="detailed"
          :checked="debt.calcMode === 'detailed'"
          class="peer sr-only"
          @change="emit('update', { calcMode: 'detailed' })"
        />
        <div class="rounded-md py-1.5 text-center text-xs font-medium transition peer-checked:bg-white dark:peer-checked:bg-white/[0.1] peer-checked:text-brand-600 dark:peer-checked:text-brand-300 peer-checked:shadow-sm text-ink-500">
          Rincian Bunga (Detail)
        </div>
      </label>
    </div>

    <!-- ========================================================= -->
    <!-- MODE SEDERHANA (PAYLATER) -->
    <!-- ========================================================= -->
    <div v-if="debt.calcMode === 'simplified'" class="grid gap-4 sm:grid-cols-2">
      <FormField label="Cicilan per bulan" hint="Nominal tagihan rutin tiap bulan." :field-id="`${debt.id}-min-simplified`">
        <CurrencyInput
          :id="`${debt.id}-min-simplified`"
          :model-value="debt.minPayment"
          @update:model-value="updateSimplifiedMinPayment"
        />
      </FormField>

      <FormField label="Sisa Tenor (Bulan)" hint="Berapa bulan lagi lunas?" :field-id="`${debt.id}-tenor`">
        <div class="relative">
          <input
            :id="`${debt.id}-tenor`"
            :value="debt.tenorMonths || ''"
            type="number"
            min="1"
            placeholder="0"
            class="field-input-dark pr-16"
            @input="updateSimplifiedTenor"
          />
          <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-500">
            bulan
          </span>
        </div>
      </FormField>

      <FormField 
        label="Tanggal jatuh tempo" 
        hint="Tanggal berapa biasanya tagihan ini harus dibayar?" 
        :field-id="`${debt.id}-due-simplified`"
        class="sm:col-span-2"
      >
        <div class="flex items-center gap-2">
          <input
            :id="`${debt.id}-due-simplified`"
            :value="debt.dueDate"
            type="date"
            class="field-input-dark"
            @input="emit('update', { dueDate: ($event.target as HTMLInputElement).value })"
          />
          <button
            v-if="debt.dueDate"
            type="button"
            class="focus-ring dark:focus-ring-dark shrink-0 rounded-lg px-2 py-1 text-xs text-ink-500 transition hover:bg-ink-200/50 dark:hover:bg-white/[0.07] hover:text-ink-700 dark:hover:text-cream-200"
            @click="emit('update', { dueDate: '' })"
          >
            Kosongkan
          </button>
        </div>
      </FormField>
    </div>

    <!-- ========================================================= -->
    <!-- MODE DETAIL (TRADISIONAL) -->
    <!-- ========================================================= -->
    <div v-else class="grid gap-4 sm:grid-cols-2">
      <FormField label="Sisa pokok utang" :field-id="`${debt.id}-principal`">
        <CurrencyInput
          :id="`${debt.id}-principal`"
          :model-value="debt.principal"
          @update:model-value="emit('update', { principal: $event })"
        />
      </FormField>

      <FormField label="Cicilan minimal per bulan" :field-id="`${debt.id}-min`">
        <CurrencyInput
          :id="`${debt.id}-min`"
          :model-value="debt.minPayment"
          @update:model-value="emit('update', { minPayment: $event })"
        />
      </FormField>

      <FormField label="Bunga" hint="Tulis apa adanya, lalu pilih satuannya." :field-id="`${debt.id}-rate`">
        <div class="flex gap-2">
          <div class="relative w-28 shrink-0">
            <input
              :id="`${debt.id}-rate`"
              :value="debt.interestRate || ''"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              class="field-input-dark pr-7 text-right tabular-nums"
              @input="emit('update', { interestRate: Number(($event.target as HTMLInputElement).value) || 0 })"
            />
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-500">%</span>
          </div>
          <select
            :value="debt.ratePeriod"
            class="field-input-dark flex-1"
            @change="emit('update', { ratePeriod: ($event.target as HTMLSelectElement).value as RatePeriod })"
          >
            <option v-for="period in periods" :key="period.value" :value="period.value">
              {{ period.label }}
            </option>
          </select>
        </div>
      </FormField>

      <FormField label="Jatuh tempo berikutnya" hint="Tanggal pembayaran terdekat. Boleh dikosongkan." :field-id="`${debt.id}-due`">
        <div class="flex items-center gap-2">
          <input
            :id="`${debt.id}-due`"
            :value="debt.dueDate"
            type="date"
            class="field-input-dark"
            @input="emit('update', { dueDate: ($event.target as HTMLInputElement).value })"
          />
          <button
            v-if="debt.dueDate"
            type="button"
            class="focus-ring dark:focus-ring-dark shrink-0 rounded-lg px-2 py-1 text-xs text-ink-500 transition hover:bg-ink-200/50 dark:hover:bg-white/[0.07] hover:text-ink-700 dark:hover:text-cream-200"
            @click="emit('update', { dueDate: '' })"
          >
            Kosongkan
          </button>
        </div>
      </FormField>
    </div>

    <!-- Peringatan Bunga & Jatuh Tempo (Hanya relevan di Mode Detail) -->
    <template v-if="debt.calcMode === 'detailed'">
      <p v-if="monthlyInterest > 0" class="mt-3 flex items-center gap-1.5 text-xs text-ink-600 dark:text-ink-500">
        <svg class="h-3.5 w-3.5 shrink-0 text-ink-500 dark:text-ink-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.25 9a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-1.5 0V9Z" clip-rule="evenodd" />
        </svg>
        Bunga berjalan sekitar
        <strong class="font-semibold tabular-nums text-ink-900 dark:text-cream-300">
          {{ formatIDR(monthlyInterest) }}
        </strong>
        per bulan.
      </p>

      <p v-if="minPaymentBelowInterest" class="mt-2 rounded-xl border border-amber-200/50 dark:border-amber-700/30 bg-amber-50/50 dark:bg-amber-900/30 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
        Cicilan minimalnya masih di bawah bunga bulanan, jadi pokok utang ini belum akan turun.
      </p>

      <p v-if="due.status === 'overdue'" class="mt-2 rounded-xl border border-brand-200/50 dark:border-brand-700/30 bg-brand-50/50 dark:bg-brand-900/30 px-3 py-2 text-xs leading-relaxed text-brand-700 dark:text-brand-300">
        Pembayaran ini sudah lewat tanggal. Tetap catat apa adanya — mengetahui posisi yang sebenarnya adalah bagian dari jalan keluar.
      </p>
    </template>
  </div>
</template>
