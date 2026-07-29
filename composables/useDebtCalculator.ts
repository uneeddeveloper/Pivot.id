import type {
  AuditSummary,
  Debt,
  DebtMonthState,
  DebtWithDue,
  DueInfo,
  MonthSnapshot,
  PayoffMilestone,
  PayoffStrategy,
  RatePeriod,
  SimulationInput,
  SimulationResult,
} from '~/types/financial'

/**
 * Jantung RintisUlang: seluruh matematika pemulihan utang.
 *
 * ATURAN NON-NEGOTIABLE
 * ---------------------
 * File ini adalah JavaScript murni tanpa satu pun panggilan jaringan. Semua
 * angka utang diproses di perangkat user. Jangan pernah menambahkan `$fetch`,
 * `useFetch`, logging, atau analytics apa pun di sini.
 */

/** Toleransi pembulatan rupiah — sisa di bawah ini dianggap lunas. */
const EPSILON = 1

const MAX_MONTHS_DEFAULT = 600

/**
 * Konversi bunga ke basis bulanan memakai perhitungan sederhana (bukan majemuk)
 * agar angkanya sama dengan yang user lihat di aplikasi pinjaman:
 * 0,4% per hari = 12% per bulan (0,4 x 30).
 */
export function toMonthlyRate(rate: number, period: RatePeriod): number {
  const r = Number.isFinite(rate) ? rate / 100 : 0
  if (r <= 0) return 0

  switch (period) {
    case 'daily':
      return r * 30
    case 'yearly':
      return r / 12
    case 'monthly':
    default:
      return r
  }
}

/** Bunga yang muncul bulan ini dari seluruh utang, pada kondisi saldo sekarang. */
export function monthlyInterestOf(debts: Debt[]): number {
  return debts.reduce(
    (sum, debt) =>
      sum + Math.max(0, debt.principal) * toMonthlyRate(debt.interestRate, debt.ratePeriod),
    0,
  )
}

export function totalDebtOf(debts: Debt[]): number {
  return debts.reduce((sum, debt) => sum + Math.max(0, debt.principal), 0)
}

export function totalMinPaymentOf(debts: Debt[]): number {
  return debts.reduce((sum, debt) => sum + Math.max(0, debt.minPayment), 0)
}

/**
 * Formula inti Tahap 1.
 *
 *   Target Income Bulanan = Biaya Hidup Minimal + Total Cicilan Utang Minimal
 *
 * Ini adalah angka penghasilan bersih terkecil yang membuat user bertahan
 * tanpa menambah utang baru — dipakai sebagai filter di job board (Tahap 4).
 */
export function calculateTargetIncome(livingCost: number, debts: Debt[]): number {
  return Math.max(0, livingCost) + totalMinPaymentOf(debts)
}

export function buildAuditSummary(livingCost: number, debts: Debt[]): AuditSummary {
  const totalMinPayment = totalMinPaymentOf(debts)
  return {
    livingCost: Math.max(0, livingCost),
    totalMinPayment,
    targetIncome: Math.max(0, livingCost) + totalMinPayment,
    totalDebt: totalDebtOf(debts),
  }
}

interface WorkingDebt {
  id: string
  name: string
  remaining: number
  minPayment: number
  monthlyRate: number
}

/**
 * Urutan prioritas pelunasan.
 * - `snowball`  : saldo terkecil dulu — kemenangan cepat untuk menjaga momentum.
 * - `avalanche` : bunga tertinggi dulu — total bunga yang dibayar paling kecil.
 */
function prioritize(debts: WorkingDebt[], strategy: PayoffStrategy): WorkingDebt[] {
  const active = debts.filter((d) => d.remaining > EPSILON)

  return active.sort((a, b) => {
    if (strategy === 'avalanche') {
      if (b.monthlyRate !== a.monthlyRate) return b.monthlyRate - a.monthlyRate
      return a.remaining - b.remaining
    }
    if (a.remaining !== b.remaining) return a.remaining - b.remaining
    return b.monthlyRate - a.monthlyRate
  })
}

function roundUpTo(value: number, step: number): number {
  return Math.ceil(value / step) * step
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime())
  next.setMonth(next.getMonth() + months)
  return next
}

/**
 * Simulasi pelunasan bulan demi bulan.
 *
 * Efek "snowball" muncul karena dana bulanan (`monthlyBudget`) dijaga konstan:
 * begitu satu utang lunas, cicilan minimalnya otomatis mengalir jadi dana ekstra
 * untuk utang berikutnya.
 */
export function simulatePayoff(input: SimulationInput, startDate: Date = new Date()): SimulationResult {
  const maxMonths = input.maxMonths ?? MAX_MONTHS_DEFAULT

  const working: WorkingDebt[] = input.debts
    .filter((debt) => debt.principal > EPSILON)
    .map((debt) => ({
      id: debt.id,
      name: debt.name,
      remaining: debt.principal,
      minPayment: Math.max(0, debt.minPayment),
      monthlyRate: toMonthlyRate(debt.interestRate, debt.ratePeriod),
    }))

  const monthlyBudget = totalMinPaymentOf(input.debts) + Math.max(0, input.extraPayment)

  const base: SimulationResult = {
    feasible: true,
    months: 0,
    debtFreeDate: null,
    totalPaid: 0,
    totalInterest: 0,
    monthlyBudget,
    timeline: [],
    payoffOrder: [],
  }

  if (working.length === 0) return base

  const timeline: MonthSnapshot[] = []
  const payoffOrder: PayoffMilestone[] = []
  let cumulativePaid = 0
  let cumulativeInterest = 0
  let previousTotal = working.reduce((sum, d) => sum + d.remaining, 0)

  for (let month = 1; month <= maxMonths; month++) {
    // 1. Bunga berjalan lebih dulu, lalu pembayaran.
    let monthInterest = 0
    const perDebt = new Map<string, DebtMonthState>()

    for (const debt of working) {
      if (debt.remaining <= EPSILON) continue
      const interest = debt.remaining * debt.monthlyRate
      debt.remaining += interest
      monthInterest += interest
      perDebt.set(debt.id, {
        debtId: debt.id,
        name: debt.name,
        remaining: debt.remaining,
        paid: 0,
        interest,
      })
    }

    let budget = monthlyBudget
    let monthPaid = 0

    const pay = (debt: WorkingDebt, amount: number) => {
      const value = Math.min(amount, debt.remaining, budget)
      if (value <= 0) return
      debt.remaining -= value
      budget -= value
      monthPaid += value
      const state = perDebt.get(debt.id)
      if (state) {
        state.paid += value
        state.remaining = debt.remaining
      }
    }

    // 2. Bayar cicilan minimal seluruh utang aktif.
    for (const debt of working) {
      if (debt.remaining <= EPSILON) continue
      pay(debt, debt.minPayment)
    }

    // 3. Sisa dana dialirkan ke utang prioritas sampai habis.
    for (const debt of prioritize(working, input.strategy)) {
      if (budget <= 0) break
      pay(debt, debt.remaining)
    }

    // 4. Catat utang yang lunas bulan ini.
    const clearedThisMonth: string[] = []
    for (const debt of working) {
      if (debt.remaining > EPSILON) continue
      if (payoffOrder.some((m) => m.debtId === debt.id)) continue
      debt.remaining = 0
      clearedThisMonth.push(debt.name)
      payoffOrder.push({ debtId: debt.id, name: debt.name, month })
    }

    const totalRemaining = working.reduce((sum, d) => sum + d.remaining, 0)
    cumulativePaid += monthPaid
    cumulativeInterest += monthInterest

    timeline.push({
      month,
      totalRemaining,
      totalPaid: monthPaid,
      totalInterest: monthInterest,
      cumulativePaid,
      cumulativeInterest,
      clearedThisMonth,
      debts: Array.from(perDebt.values()),
    })

    if (totalRemaining <= EPSILON) {
      return {
        ...base,
        months: month,
        debtFreeDate: addMonths(startDate, month),
        totalPaid: cumulativePaid,
        totalInterest: cumulativeInterest,
        timeline,
        payoffOrder,
      }
    }

    // 5. Deteksi kondisi "bunga lebih cepat dari bayaran" — utang tidak akan menyusut.
    if (totalRemaining >= previousTotal - EPSILON) {
      return {
        ...base,
        feasible: false,
        months: 0,
        totalPaid: cumulativePaid,
        totalInterest: cumulativeInterest,
        timeline,
        payoffOrder,
        shortfall: {
          monthlyInterest: monthInterest,
          minimumViableBudget: roundUpTo(monthInterest * 1.1, 50_000),
        },
      }
    }

    previousTotal = totalRemaining
  }

  // Melewati batas iterasi: perlakukan sama seperti tidak feasible agar UI
  // menawarkan opsi (restrukturisasi, tambah penghasilan) alih-alih angka semu.
  const lastInterest = timeline.at(-1)?.totalInterest ?? 0
  return {
    ...base,
    feasible: false,
    months: 0,
    totalPaid: cumulativePaid,
    totalInterest: cumulativeInterest,
    timeline,
    payoffOrder,
    shortfall: {
      monthlyInterest: lastInterest,
      minimumViableBudget: roundUpTo(lastInterest * 1.1, 50_000),
    },
  }
}

/** Bandingkan kedua strategi untuk ditampilkan sebagai pilihan, bukan penilaian. */
export function compareStrategies(
  input: Omit<SimulationInput, 'strategy'>,
  startDate: Date = new Date(),
): Record<PayoffStrategy, SimulationResult> {
  return {
    snowball: simulatePayoff({ ...input, strategy: 'snowball' }, startDate),
    avalanche: simulatePayoff({ ...input, strategy: 'avalanche' }, startDate),
  }
}

const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const idrCompactParts = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

export function formatIDR(value: number): string {
  return idr.format(Math.round(Number.isFinite(value) ? value : 0))
}

export function formatNumber(value: number): string {
  return idrCompactParts.format(Math.round(Number.isFinite(value) ? value : 0))
}

/**
 * Nominal ringkas untuk label sumbu grafik: 12.500.000 -> "12,5 jt".
 * Dipakai hanya di tempat sempit; angka penuh tetap tersedia di tooltip dan tabel.
 */
export function formatCompactIDR(value: number): string {
  const n = Math.round(Number.isFinite(value) ? value : 0)
  if (n === 0) return '0'

  const units: { limit: number; suffix: string }[] = [
    { limit: 1_000_000_000_000, suffix: 't' },
    { limit: 1_000_000_000, suffix: 'm' },
    { limit: 1_000_000, suffix: 'jt' },
    { limit: 1_000, suffix: 'rb' },
  ]

  for (const { limit, suffix } of units) {
    if (n >= limit) {
      const scaled = n / limit
      // Satu desimal hanya bila menambah informasi (12,5 jt), bukan "12,0 jt".
      const text = scaled >= 100 || Number.isInteger(scaled) ? String(Math.round(scaled)) : scaled.toFixed(1)
      return `${text.replace('.', ',')} ${suffix}`
    }
  }

  return formatNumber(n)
}

/** "15 bulan" -> "1 tahun 3 bulan" agar terasa lebih manusiawi. */
export function formatDuration(months: number): string {
  if (months <= 0) return '—'
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (years === 0) return `${rest} bulan`
  if (rest === 0) return `${years} tahun`
  return `${years} tahun ${rest} bulan`
}

export function formatMonthYear(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date)
}

export function formatFullDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/* ------------------------------------------------------------------ *
 * Jatuh tempo
 * ------------------------------------------------------------------ */

const DAY_MS = 86_400_000

/** Ambang "sudah dekat" dalam hari. */
const DUE_SOON_DAYS = 7

function startOfDay(date: Date): Date {
  const copy = new Date(date.getTime())
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Parse `YYYY-MM-DD` sebagai tanggal lokal (bukan UTC, agar tidak geser sehari). */
export function parseDueDate(value: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Terjemahkan tanggal jatuh tempo jadi status yang bisa dipakai UI.
 * Nada label sengaja netral — menyebut fakta, bukan menakut-nakuti.
 */
export function dueInfoOf(dueDate: string, today: Date = new Date()): DueInfo {
  const date = parseDueDate(dueDate)
  if (!date) return { status: 'none', days: null, date: null, label: 'Belum diisi' }

  const days = Math.round((startOfDay(date).getTime() - startOfDay(today).getTime()) / DAY_MS)

  if (days < 0) {
    return { status: 'overdue', days, date, label: `Lewat ${Math.abs(days)} hari` }
  }
  if (days === 0) return { status: 'today', days, date, label: 'Jatuh tempo hari ini' }
  if (days <= DUE_SOON_DAYS) return { status: 'soon', days, date, label: `${days} hari lagi` }
  return { status: 'upcoming', days, date, label: `${days} hari lagi` }
}

/**
 * Urutkan utang dari jatuh tempo paling mendesak. Utang tanpa tanggal
 * diletakkan di akhir, tidak dibuang.
 */
export function sortByDueDate(debts: Debt[], today: Date = new Date()): DebtWithDue[] {
  return debts
    .map((debt) => ({ debt, due: dueInfoOf(debt.dueDate, today) }))
    .sort((a, b) => {
      if (a.due.days === null && b.due.days === null) return 0
      if (a.due.days === null) return 1
      if (b.due.days === null) return -1
      return a.due.days - b.due.days
    })
}

/** Total cicilan minimal yang jatuh tempo dalam `withinDays` ke depan (termasuk yang lewat). */
export function paymentDueWithin(
  debts: Debt[],
  withinDays = DUE_SOON_DAYS,
  today: Date = new Date(),
): number {
  return debts.reduce((sum, debt) => {
    const { days } = dueInfoOf(debt.dueDate, today)
    if (days === null || days > withinDays) return sum
    return sum + Math.max(0, debt.minPayment)
  }, 0)
}

/**
 * Composable pembungkus. Semua fungsi di atas juga tersedia lewat auto-import
 * Nuxt; helper ini berguna saat ingin memanggilnya sebagai satu grup.
 */
export function useDebtCalculator() {
  return {
    toMonthlyRate,
    monthlyInterestOf,
    totalDebtOf,
    totalMinPaymentOf,
    calculateTargetIncome,
    buildAuditSummary,
    simulatePayoff,
    compareStrategies,
    parseDueDate,
    dueInfoOf,
    sortByDueDate,
    paymentDueWithin,
    formatIDR,
    formatNumber,
    formatCompactIDR,
    formatDuration,
    formatMonthYear,
    formatFullDate,
  }
}
