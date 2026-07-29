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
            class="focus-ring rounded-xl border px-3 py-2 text-left transition"
            :class="
              hoursAvailable === option.value
                ? 'border-brand-300 bg-brand-50 text-brand-800'
                : 'border-ink-200 bg-white/70 text-ink-600 hover:border-ink-300'
            "
            :aria-pressed="hoursAvailable === option.value"
            @click="emit('update:hoursAvailable', option.value)"
          >
            <span class="block text-sm font-medium">{{ option.label }}</span>
            <span class="mt-0.5 block text-[11px] leading-tight text-ink-400">
              {{ option.hint }}
            </span>
          </button>
        </div>
      </FormField>
    </div>

    <div v-if="presets.length" class="mt-5 border-t border-ink-100 pt-4">
      <p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">
        Ambil dari hitunganmu di langkah 1
      </p>
      <div class="mt-2.5 flex flex-wrap gap-2">
        <button
          v-for="preset in presets"
          :key="preset.label"
          type="button"
          class="focus-ring rounded-xl border px-3 py-2 text-left transition"
          :class="
            activePreset === preset.label
              ? 'border-sage-300 bg-sage-50 text-sage-800'
              : 'border-ink-200 bg-white/70 text-ink-600 hover:border-sage-300 hover:bg-sage-50/60'
          "
          :aria-pressed="activePreset === preset.label"
          @click="emit('update:need', preset.value)"
        >
          <span class="block text-xs text-ink-400">{{ preset.label }}</span>
          <span class="mt-0.5 block text-sm font-semibold tabular-nums">
            {{ formatIDR(preset.value) }}
          </span>
          <span class="mt-0.5 block text-[11px] leading-tight text-ink-400">{{ preset.hint }}</span>
        </button>
      </div>
    </div>
  </BaseCard>
</template>
