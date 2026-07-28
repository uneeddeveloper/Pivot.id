<script setup lang="ts">
import { useFinancialStore } from '~/stores/financial'

const financial = useFinancialStore()

const presets = [
  { label: 'Kos + makan sendiri', value: 2_500_000 },
  { label: 'Tinggal bersama keluarga', value: 1_500_000 },
  { label: 'Berkeluarga, 1 anak', value: 4_500_000 },
]
</script>

<template>
  <BaseCard
    title="Biaya hidup minimal per bulan"
    subtitle="Angka paling kecil yang tetap membuatmu makan, punya tempat tinggal, dan bisa berangkat kerja."
  >
    <template #icon>
      <svg
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1h-3v-5H7v5H4a1 1 0 0 1-1-1V8.5Z" />
      </svg>
    </template>

    <div class="space-y-5">
      <FormField label="Biaya hidup bulanan" field-id="living-cost">
        <CurrencyInput id="living-cost" v-model="financial.livingCost" emphasis />
      </FormField>

      <div>
        <p class="mb-2 text-xs text-ink-400">Belum yakin angkanya? Pakai perkiraan ini dulu:</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in presets"
            :key="preset.label"
            type="button"
            class="focus-ring rounded-full border px-3 py-1.5 text-xs transition"
            :class="
              financial.livingCost === preset.value
                ? 'border-brand-300 bg-brand-50 font-medium text-brand-700'
                : 'border-ink-200 bg-white/60 text-ink-600 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
            "
            @click="financial.livingCost = preset.value"
          >
            {{ preset.label }} ·
            <span class="tabular-nums">{{ formatNumber(preset.value) }}</span>
          </button>
        </div>
      </div>

      <FormField
        label="Dana ekstra per bulan (opsional)"
        hint="Kalau ada sisa penghasilan di luar cicilan minimal. Kosongkan kalau belum ada — tidak apa-apa."
        field-id="extra-payment"
      >
        <CurrencyInput id="extra-payment" v-model="financial.extraPayment" />
      </FormField>
    </div>
  </BaseCard>
</template>
