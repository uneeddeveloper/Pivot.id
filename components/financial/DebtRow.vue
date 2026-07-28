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
</script>

<template>
  <div
    class="rounded-xl border border-ink-100 bg-linear-to-br from-ink-50/70 to-cream-50/40 p-4 transition hover:border-ink-200"
  >
    <div class="mb-3 flex items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="flex h-6 w-6 items-center justify-center rounded-lg bg-ink-100 text-[11px] font-semibold text-ink-500"
        >
          {{ index + 1 }}
        </span>
        <span class="text-xs font-medium tracking-wide text-ink-400 uppercase">
          {{ debt.name || 'Utang tanpa nama' }}
        </span>
        <DueBadge :due="due" />
      </div>
      <button
        v-if="removable"
        type="button"
        class="focus-ring rounded-lg p-1.5 text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
        :aria-label="`Hapus utang ${index + 1}`"
        @click="emit('remove')"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 6h12M8.5 6V4.5h3V6M6.5 6l.6 9h5.8l.6-9" />
        </svg>
      </button>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Nama pinjaman"
        hint="Bebas, hanya kamu yang melihatnya."
        :field-id="`${debt.id}-name`"
        class="sm:col-span-2"
      >
        <input
          :id="`${debt.id}-name`"
          :value="debt.name"
          type="text"
          placeholder="Misal: Pinjol A, Kartu Kredit, Utang keluarga"
          class="field-input"
          @input="emit('update', { name: ($event.target as HTMLInputElement).value })"
        />
      </FormField>

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

      <FormField
        label="Bunga"
        hint="Tulis apa adanya sesuai yang tertera, lalu pilih satuannya."
        :field-id="`${debt.id}-rate`"
      >
        <div class="flex gap-2">
          <div class="relative w-28 shrink-0">
            <input
              :id="`${debt.id}-rate`"
              :value="debt.interestRate || ''"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              class="field-input pr-7 text-right tabular-nums"
              @input="
                emit('update', {
                  interestRate: Number(($event.target as HTMLInputElement).value) || 0,
                })
              "
            />
            <span
              class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-400"
            >
              %
            </span>
          </div>
          <select
            :value="debt.ratePeriod"
            class="field-input flex-1"
            aria-label="Satuan bunga"
            @change="
              emit('update', {
                ratePeriod: ($event.target as HTMLSelectElement).value as RatePeriod,
              })
            "
          >
            <option v-for="period in periods" :key="period.value" :value="period.value">
              {{ period.label }}
            </option>
          </select>
        </div>
      </FormField>

      <FormField
        label="Jatuh tempo berikutnya"
        hint="Tanggal pembayaran terdekat yang harus kamu penuhi. Boleh dikosongkan."
        :field-id="`${debt.id}-due`"
      >
        <div class="flex items-center gap-2">
          <input
            :id="`${debt.id}-due`"
            :value="debt.dueDate"
            type="date"
            class="field-input"
            @input="emit('update', { dueDate: ($event.target as HTMLInputElement).value })"
          />
          <button
            v-if="debt.dueDate"
            type="button"
            class="focus-ring shrink-0 rounded-lg px-2 py-1 text-xs text-ink-400 transition hover:bg-ink-100 hover:text-ink-600"
            @click="emit('update', { dueDate: '' })"
          >
            Kosongkan
          </button>
        </div>
      </FormField>
    </div>

    <p v-if="monthlyInterest > 0" class="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
      <svg class="h-3.5 w-3.5 shrink-0 text-ink-400" viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.25 9a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-1.5 0V9Z"
          clip-rule="evenodd"
        />
      </svg>
      Bunga berjalan sekitar
      <strong class="font-semibold tabular-nums text-ink-700">
        {{ formatIDR(monthlyInterest) }}
      </strong>
      per bulan.
    </p>

    <p v-if="minPaymentBelowInterest" class="attention-note mt-2 text-xs leading-relaxed">
      Cicilan minimalnya masih di bawah bunga bulanan, jadi pokok utang ini belum akan turun.
      Wajar terjadi — kita akan cari selisihnya bersama di langkah berikutnya.
    </p>

    <p v-if="due.status === 'overdue'" class="attention-note mt-2 text-xs leading-relaxed">
      Pembayaran ini sudah lewat tanggal. Tetap catat apa adanya — mengetahui posisi yang
      sebenarnya adalah bagian dari jalan keluar.
    </p>
  </div>
</template>
