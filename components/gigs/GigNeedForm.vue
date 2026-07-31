<script setup lang="ts">
import { computed } from 'vue'

/**
 * Dua angka yang menentukan seluruh isi halaman /gigs: berapa yang dibutuhkan,
 * dan berapa jam yang benar-benar tersedia.
 *
 * PRIVASI
 *   `need` biasanya berasal dari cicilan yang jatuh tempo minggu ini — data
 *   utang. Komponen ini hanya menyalurkan angkanya ke perhitungan di browser;
 *   tidak ada `$fetch` di sini maupun di `useGigPlanner`. Jangan menambahkannya.
 *
 * PILIHAN CEPAT
 *   Tombol pintasan diisi dari store finansial supaya user tidak perlu
 *   mengetik ulang angka yang sudah ia hitung di langkah 1. Yang bernilai 0
 *   (mis. belum ada utang tercatat) tidak ditampilkan — pintasan ke angka nol
 *   hanya jadi tombol yang menipu.
 */
const props = defineProps<{
  need: number
  hoursAvailable: number
  /** Pintasan siap pakai dari kondisi user, mis. cicilan 7 hari ke depan. */
  presets: { label: string; value: number; hint: string }[]
}>()

const emit = defineEmits<{
  'update:need': [value: number]
  'update:hoursAvailable': [value: number]
}>()

/** Pilihan jam realistis — dari "sisa waktu setelah melamar kerja" ke penuh. */
const hourOptions = [
  { value: 6, label: '± 1 jam/hari', hint: 'Sela-sela melamar kerja' },
  { value: 14, label: '± 2 jam/hari', hint: 'Pagi atau malam' },
  { value: 20, label: '± 3 jam/hari', hint: 'Setengah hari kerja' },
  { value: 40, label: 'Sepanjang hari', hint: 'Belum ada pekerjaan tetap' },
]

const activePreset = computed(() =>
  props.presets.find((preset) => preset.value === props.need)?.label ?? '',
)
</script>

<template>
  <BaseCard
    title="Berapa yang harus terkumpul, dan kapan"
    subtitle="Dua angka ini yang menentukan urutan gig di bawah. Keduanya dihitung di perangkatmu."
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
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 5.5V10l3 2" />
      </svg>
    </template>

    <div class="grid gap-5 sm:grid-cols-2">
      <FormField
        label="Yang perlu terkumpul"
        field-id="gig-need"
        hint="Cicilan terdekat, kebutuhan mendesak, atau target yang kamu tentukan sendiri."
      >
        <CurrencyInput
          id="gig-need"
          :model-value="need"
          emphasis
          placeholder="0"
          @update:model-value="emit('update:need', $event)"
        />
      </FormField>

      <FormField
        label="Waktu yang benar-benar tersedia"
        field-id="gig-hours"
        hint="Per minggu. Isi yang jujur — rencana dari jam yang tidak ada tidak akan jalan."
      >
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="option in hourOptions"
            :key="option.value"
            type="button"
            class="focus-ring dark:focus-ring-dark rounded-xl border px-3 py-2 text-left transition"
            :class="
              hoursAvailable === option.value
                ? 'border-brand-300 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300'
                : 'border-ink-200/50 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.02] text-ink-600 dark:text-ink-400 hover:border-ink-300 dark:hover:border-white/[0.15] hover:bg-white dark:hover:bg-white/[0.05]'
            "
            :aria-pressed="hoursAvailable === option.value"
            @click="emit('update:hoursAvailable', option.value)"
          >
            <span class="block text-sm font-medium" :class="hoursAvailable === option.value ? 'text-brand-800 dark:text-brand-200' : 'text-ink-900 dark:text-cream-50'">{{ option.label }}</span>
            <span class="mt-0.5 block text-[11px] leading-tight text-ink-600 dark:text-ink-500">
              {{ option.hint }}
            </span>
          </button>
        </div>
      </FormField>
    </div>

    <div v-if="presets.length" class="mt-5 border-t border-ink-200/50 dark:border-white/[0.08] pt-4">
      <p class="text-[10px] font-semibold tracking-[0.14em] text-ink-600 dark:text-ink-500 uppercase">
        Ambil dari hitunganmu di langkah 1
      </p>
      <div class="mt-2.5 flex flex-wrap gap-2">
        <button
          v-for="preset in presets"
          :key="preset.label"
          type="button"
          class="focus-ring dark:focus-ring-dark rounded-xl border px-3 py-2 text-left transition"
          :class="
            activePreset === preset.label
              ? 'border-sage-300 dark:border-sage-500/40 bg-sage-50 dark:bg-sage-900/60 text-sage-700 dark:text-sage-300'
              : 'border-ink-200/50 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.02] text-ink-600 dark:text-ink-400 hover:border-sage-300 dark:hover:border-sage-500/30 hover:bg-sage-100 dark:hover:bg-sage-900/40'
          "
          :aria-pressed="activePreset === preset.label"
          @click="emit('update:need', preset.value)"
        >
          <span class="block text-xs" :class="activePreset === preset.label ? 'text-sage-700 dark:text-sage-400' : 'text-ink-600 dark:text-ink-500'">{{ preset.label }}</span>
          <span class="mt-0.5 block text-sm font-semibold tabular-nums" :class="activePreset === preset.label ? 'text-sage-800 dark:text-sage-200' : 'text-ink-900 dark:text-cream-100'">
            {{ formatIDR(preset.value) }}
          </span>
          <span class="mt-0.5 block text-[11px] leading-tight" :class="activePreset === preset.label ? 'text-sage-600 dark:text-sage-500' : 'text-ink-600 dark:text-ink-500'">{{ preset.hint }}</span>
        </button>
      </div>
    </div>
  </BaseCard>
</template>
