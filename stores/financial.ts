import { defineStore } from 'pinia'
import type {
  AuditSummary,
  Debt,
  DebtWithDue,
  PayoffStrategy,
  RatePeriod,
  SimulationResult,
} from '~/types/financial'

/**
 * Store Financial Recovery Audit.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ PRIVASI — JANGAN DILANGGAR                                          │
 * │ State di sini berisi nominal utang, bunga, dan cicilan user.         │
 * │ Store ini SENGAJA tidak di-persist dan tidak pernah dikirim ke       │
 * │ server. Dilarang menambahkan plugin persist, `$fetch`, atau sinkron  │
 * │ ke database pada store ini. Data hidup selama sesi tab saja.         │
 * │ Jika suatu saat butuh histori, yang boleh dikirim HANYA angka        │
 * │ teragregasi (Target Income) dan hanya setelah consent eksplisit.     │
 * └──────────────────────────────────────────────────────────────────────┘
 */

let counter = 0
function nextId(): string {
  counter += 1
  return `debt-${Date.now().toString(36)}-${counter}`
}

export function createEmptyDebt(partial: Partial<Debt> = {}): Debt {
  return {
    id: nextId(),
    name: '',
    principal: 0,
    interestRate: 0,
    ratePeriod: 'monthly' as RatePeriod,
    minPayment: 0,
    dueDate: '',
    // Tambahan default properti baru:
    calcMode: 'simplified', // Jadikan mode Paylater sebagai default
    totalAmount: 0,
    tenorMonths: 0,
    ...partial,
  }
}

interface FinancialState {
  debts: Debt[]
  /** Biaya hidup minimal per bulan (kos, makan, transport, listrik). */
  livingCost: number
  /** Dana ekstra per bulan di luar cicilan minimal, kalau ada. */
  extraPayment: number
  strategy: PayoffStrategy
  /** Ditandai true setelah user menekan "Hitung Target Income". */
  hasAudited: boolean
}

export const useFinancialStore = defineStore('financial', {
  state: (): FinancialState => ({
    debts: [createEmptyDebt({ name: '' })],
    livingCost: 0,
    extraPayment: 0,
    strategy: 'snowball',
    hasAudited: false,
  }),

  getters: {
    /** Utang yang sudah cukup terisi untuk ikut dihitung. */
    validDebts: (state): Debt[] => state.debts.filter((debt) => debt.principal > 0),

    totalDebt(): number {
      return totalDebtOf(this.validDebts)
    },

    totalMinPayment(): number {
      return totalMinPaymentOf(this.validDebts)
    },

    /** Formula inti: biaya hidup + total cicilan minimal. */
    targetIncome(state): number {
      return calculateTargetIncome(state.livingCost, this.validDebts)
    },

    monthlyInterest(): number {
      return monthlyInterestOf(this.validDebts)
    },

    summary(state): AuditSummary {
      return buildAuditSummary(state.livingCost, this.validDebts)
    },

    /** Dana bulanan yang dipakai simulasi. */
    monthlyBudget(state): number {
      return this.totalMinPayment + Math.max(0, state.extraPayment)
    },

    /** Simulasi memakai strategi yang sedang dipilih user. */
    simulation(state): SimulationResult {
      return simulatePayoff({
        debts: this.validDebts,
        extraPayment: state.extraPayment,
        strategy: state.strategy,
      })
    },

    /** Untuk komponen pembanding snowball vs avalanche. */
    strategyComparison(state): Record<PayoffStrategy, SimulationResult> {
      return compareStrategies({
        debts: this.validDebts,
        extraPayment: state.extraPayment,
      })
    },

    /** Utang terurut dari jatuh tempo paling mendesak; tanpa tanggal ditaruh di akhir. */
    byDueDate(): DebtWithDue[] {
      return sortByDueDate(this.validDebts)
    },

    /** Utang yang tanggal jatuh temponya sudah diisi. */
    withDueDate(): DebtWithDue[] {
      return this.byDueDate.filter((item) => item.due.status !== 'none')
    },

    /** Sudah lewat jatuh tempo — ditampilkan lebih dulu, tanpa nada menghakimi. */
    overdueDebts(): DebtWithDue[] {
      return this.withDueDate.filter((item) => item.due.status === 'overdue')
    },

    /** Total cicilan yang harus disiapkan dalam 7 hari ke depan. */
    dueThisWeek(): number {
      return paymentDueWithin(this.validDebts)
    },

    hasDebt(): boolean {
      return this.validDebts.length > 0
    },

    /**
     * Cukup biaya hidup untuk bisa lanjut. User tanpa utang — mis. fresh graduate —
     * tetap dapat Target Income yang sah, yaitu biaya hidupnya sendiri.
     */
    isReady(state): boolean {
      return state.livingCost > 0
    },
  },

  actions: {
    addDebt(partial: Partial<Debt> = {}) {
      const newDebt = createEmptyDebt(partial)
      
      // Mencegah kebocoran data jika user menambah utang dengan template
      if (newDebt.calcMode === 'simplified') {
        newDebt.interestRate = 0
      }
      
      this.debts.push(newDebt)
    },

    removeDebt(id: string) {
      this.debts = this.debts.filter((debt) => debt.id !== id)
      if (this.debts.length === 0) this.addDebt()
    },

    updateDebt(id: string, patch: Partial<Debt>) {
      const debt = this.debts.find((item) => item.id === id)
      if (debt) {
        // 1. Terapkan perubahan dari form terlebih dahulu
        Object.assign(debt, patch)
        
        // 2. RESET PAKSA: Jika mode Sederhana/Paylater, bunga wajib 0.
        // Ini akan otomatis membersihkan sisa angka 1% yang tertinggal
        // ketika user berpindah dari mode Detail ke Sederhana.
        if (debt.calcMode === 'simplified') {
          debt.interestRate = 0
          
          // (Opsional) Jika engine simulasi Anda membaca 'principal' dan 'minPayment',
          // Anda bisa menyinkronkannya di sini agar perhitungannya otomatis jalan:
          // debt.principal = debt.totalAmount
          // debt.minPayment = debt.tenorMonths > 0 ? debt.totalAmount / debt.tenorMonths : 0
        }
      }
    },

    setStrategy(strategy: PayoffStrategy) {
      this.strategy = strategy
    },

    markAudited() {
      this.hasAudited = true
    },

    /** Hapus seluruh data sensitif dari memori. Dipakai tombol "Hapus data saya". */
    reset() {
      this.$reset()
    },
  },
})
