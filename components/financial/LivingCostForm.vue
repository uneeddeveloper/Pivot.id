<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFinancialStore } from '~/stores/financial'

const financial = useFinancialStore()

const presets = [
  { label: 'Kos + makan sendiri', value: 2_500_000 },
  { label: 'Tinggal bersama keluarga', value: 1_500_000 },
  { label: 'Berkeluarga, 1 anak', value: 4_500_000 },
]

// State untuk mengatur mode tampilan UI
const inputMode = ref<'simple' | 'detailed'>('simple')

// State dinamis untuk rincian biaya, diinisialisasi dengan 2 baris kosong
let nextId = 3
const detailedExpenses = ref([
  { id: 1, name: '', amount: 0 },
  { id: 2, name: '', amount: 0 },
])

// Menghitung total dari array rincian biaya
const totalDetailed = computed(() => {
  return detailedExpenses.value.reduce((sum, item) => sum + (item.amount || 0), 0)
})

// Sinkronkan nilai rincian ke store utama JIKA sedang di mode 'detailed'
watch(totalDetailed, (newTotal) => {
  if (inputMode.value === 'detailed') {
    financial.livingCost = newTotal
  }
})

// Fungsi mengganti tab/mode dengan konfirmasi & reset
function setMode(newMode: 'simple' | 'detailed') {
  // Jika menekan tombol mode yang sedang aktif, abaikan
  if (inputMode.value === newMode) return

  // Cek apakah ada data yang sudah diisi di mode saat ini
  const isSimpleDirty = inputMode.value === 'simple' && financial.livingCost > 0
  const isDetailedDirty = 
    inputMode.value === 'detailed' && 
    detailedExpenses.value.some(e => e.amount > 0 || e.name.trim() !== '')

  // Tampilkan peringatan jika form tidak kosong
  if (isSimpleDirty || isDetailedDirty) {
    const confirmed = window.confirm('Pindah mode input akan menghapus data yang sudah Anda isi. Tetap lanjutkan?')
    if (!confirmed) return // Batalkan perpindahan jika user memilih 'Batal'
  }

  // Jika user setuju (atau form masih kosong), reset semua data ke kondisi awal
  financial.livingCost = 0
  detailedExpenses.value = [
    { id: 1, name: '', amount: 0 },
    { id: 2, name: '', amount: 0 },
  ]
  nextId = 3

  // Terapkan mode baru
  inputMode.value = newMode
}

// Fungsi menambah baris rincian
function addExpense() {
  detailedExpenses.value.push({
    id: nextId++,
    name: '',
    amount: 0,
  })
}

// Fungsi menghapus baris rincian
function removeExpense(id: number) {
  detailedExpenses.value = detailedExpenses.value.filter((item) => item.id !== id)
  
  // Pastikan minimal selalu ada 1 baris tersisa
  if (detailedExpenses.value.length === 0) {
    addExpense()
  }
}
</script>

<template>
  <BaseCard
    title="Biaya hidup minimal per bulan"
    subtitle="Angka paling kecil yang tetap membuatmu makan, punya tempat tinggal, dan bisa berangkat kerja."
  >
    <template #icon>
      <Icon name="lucide:home" class="h-5 w-5" />
    </template>

    <div class="space-y-6">
      
      <!-- Toggle Mode Input -->
      <div
        role="radiogroup"
        aria-label="Metode input biaya hidup"
        class="flex shrink-0 gap-1 rounded-xl border border-ink-200/50 dark:border-white/[0.08] bg-white/40 dark:bg-ink-800 p-1 w-max"
      >
        <button
          type="button"
          role="radio"
          :aria-checked="inputMode === 'simple'"
          class="focus-ring dark:focus-ring-dark rounded-lg px-3.5 py-1.5 text-sm font-medium transition"
          :class="
            inputMode === 'simple'
              ? 'bg-brand-600 text-cream-50 shadow-brand'
              : 'text-ink-500 dark:text-ink-400 hover:bg-white dark:hover:bg-white/[0.07] hover:text-brand-700 dark:hover:text-cream-200'
          "
          @click="setMode('simple')"
        >
          Input Cepat
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="inputMode === 'detailed'"
          class="focus-ring dark:focus-ring-dark rounded-lg px-3.5 py-1.5 text-sm font-medium transition"
          :class="
            inputMode === 'detailed'
              ? 'bg-brand-600 text-cream-50 shadow-brand'
              : 'text-ink-500 dark:text-ink-400 hover:bg-white dark:hover:bg-white/[0.07] hover:text-brand-700 dark:hover:text-cream-200'
          "
          @click="setMode('detailed')"
        >
          Rincikan
        </button>
      </div>

      <!-- ── MODE 1: INPUT CEPAT (SIMPLE) ────────────────────────────── -->
      <div v-if="inputMode === 'simple'" class="space-y-5 animate-in fade-in slide-in-from-bottom-2">
        <FormField label="Biaya hidup bulanan" field-id="living-cost">
          <CurrencyInput id="living-cost" v-model="financial.livingCost" emphasis />
        </FormField>

        <div>
          <p class="mb-2 text-xs text-ink-600 dark:text-ink-500">Belum yakin angkanya? Pakai perkiraan ini dulu:</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in presets"
              :key="preset.label"
              type="button"
              class="focus-ring dark:focus-ring-dark rounded-full border px-3 py-1.5 text-xs transition"
              :class="
                financial.livingCost === preset.value
                  ? 'border-brand-500/40 bg-brand-50/50 dark:bg-brand-500/15 font-medium text-brand-700 dark:text-brand-300'
                  : 'border-ink-200/50 dark:border-white/[0.1] bg-white/50 dark:bg-ink-800 text-ink-600 dark:text-ink-400 hover:-translate-y-0.5 hover:border-brand-300 dark:hover:border-brand-500/30 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-700 dark:hover:text-brand-300'
              "
              @click="financial.livingCost = preset.value"
            >
              {{ preset.label }} ·
              <span class="tabular-nums">{{ formatNumber(preset.value) }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ── MODE 2: RINCIAN (DETAILED) ──────────────────────────────── -->
      <div v-else class="space-y-4 animate-in fade-in slide-in-from-bottom-2">
        <div class="space-y-3">
          
          <!-- Looping baris input dinamis -->
          <div 
            v-for="(expense, index) in detailedExpenses" 
            :key="expense.id"
            class="flex items-start gap-3"
          >
            <!-- Input Keterangan -->
            <div class="flex-1">
              <label
                v-if="index === 0"
                class="mb-1.5 block text-xs font-medium text-ink-600 dark:text-ink-400"
              >
                Keterangan
              </label>
              <input
                v-model="expense.name"
                type="text"
                placeholder="Misal: Kos, Makan, dll"
                class="field-input w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
            
            <div class="flex-1">
              <label
                v-if="index === 0"
                class="mb-1.5 block text-xs font-medium text-ink-600 dark:text-ink-400"
              >
                Nominal
              </label>
              <CurrencyInput 
                :id="`exp-amount-${expense.id}`" 
                v-model="expense.amount" 
              />
            </div>

            <!-- Tombol Hapus -->
            <button
              type="button"
              class="text-ink-400 transition hover:text-red-600 focus:outline-none"
              :class="index === 0 ? 'mt-7' : 'mt-2'"
              @click="removeExpense(expense.id)"
              title="Hapus baris"
              aria-label="Hapus pengeluaran"
            >
              <Icon name="lucide:smartphone" class="h-5 w-5" />
            </button>
          </div>
        </div>

        <!-- Tombol Tambah Baris -->
        <button
          type="button"
          class="focus-ring dark:focus-ring-dark mt-1 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 dark:border-white/[0.08] bg-transparent py-2.5 text-sm font-medium text-ink-600 dark:text-ink-500 transition-colors hover:border-brand-300 dark:hover:border-brand-500/30 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-700 dark:hover:text-brand-300"
          @click="addExpense"
        >
          <Icon name="lucide:plus" class="h-4 w-4" />
          Tambah biaya hidup
        </button>

        <!-- Ringkasan Total -->
        <div class="mt-4 flex items-center justify-between rounded-xl border border-ink-200/50 dark:border-white/[0.08] bg-white/50 dark:bg-ink-800 px-4 py-3">
          <span class="text-sm font-medium text-ink-600 dark:text-ink-400">Total Biaya Hidup</span>
          <span class="text-lg font-bold tabular-nums text-brand-600 dark:text-brand-300">
            {{ formatIDR(totalDetailed) }}
          </span>
        </div>
      </div>

    </div>
  </BaseCard>
</template>