/**
 * Tipe data untuk modul Financial Recovery Audit (Tahap 1).
 *
 * CATATAN PRIVASI: seluruh tipe di file ini merepresentasikan data sensitif
 * (nominal utang, bunga, cicilan). Data ini HANYA boleh hidup di memori browser
 * (Pinia store) dan tidak boleh dikirim ke endpoint server manapun.
 */

/** Periode acuan bunga yang diinput user. Pinjol umumnya menyebut bunga harian/bulanan. */
export type RatePeriod = 'daily' | 'monthly' | 'yearly'

/** Strategi urutan pelunasan utang. */
export type PayoffStrategy = 'snowball' | 'avalanche'

export interface Debt {
  id: string
  /** Nama utang, mis. "Pinjol A", "Kartu Kredit BNI". */
  name: string
  /** Sisa pokok utang saat ini (Rupiah). */
  principal: number
  /** Angka bunga apa adanya sesuai yang tertulis di aplikasi/kontrak, mis. 0.4 untuk 0,4%. */
  interestRate: number
  /** Acuan periode dari `interestRate`. */
  ratePeriod: RatePeriod
  /** Cicilan minimal yang wajib dibayar tiap bulan (Rupiah). */
  minPayment: number
  /**
   * Tanggal jatuh tempo pembayaran berikutnya, format `YYYY-MM-DD`.
   * String kosong berarti user belum/tidak mengisi — bukan error.
   */
  dueDate: string

  calcMode?: 'simplified' | 'detailed'
  totalAmount?: number
  tenorMonths?: number
}

/** Tingkat kedekatan jatuh tempo, dipakai untuk urutan dan penekanan visual. */
export type DueStatus = 'none' | 'overdue' | 'today' | 'soon' | 'upcoming'

export interface DueInfo {
  status: DueStatus
  /** Selisih hari dari hari ini. Negatif berarti sudah lewat. `null` bila tanggal kosong. */
  days: number | null
  date: Date | null
  /** Teks siap tampil, mis. "3 hari lagi" atau "Lewat 2 hari". */
  label: string
}

/** Pasangan utang dengan status jatuh temponya, hasil `sortByDueDate()`. */
export interface DebtWithDue {
  debt: Debt
  due: DueInfo
}

/** Input lengkap untuk simulasi pelunasan. */
export interface SimulationInput {
  debts: Debt[]
  /** Dana ekstra per bulan di luar total cicilan minimal (Rupiah). */
  extraPayment: number
  strategy: PayoffStrategy
  /** Batas aman iterasi agar tidak infinite loop. Default 600 bulan (50 tahun). */
  maxMonths?: number
}

/** Kondisi satu utang pada akhir bulan tertentu. */
export interface DebtMonthState {
  debtId: string
  name: string
  /** Sisa utang di akhir bulan. */
  remaining: number
  /** Total dibayarkan ke utang ini pada bulan tersebut. */
  paid: number
  /** Bunga yang muncul pada bulan tersebut. */
  interest: number
}

/** Potret kondisi keuangan pada satu bulan simulasi. */
export interface MonthSnapshot {
  /** Bulan ke-1 adalah bulan pertama pembayaran. */
  month: number
  totalRemaining: number
  totalPaid: number
  totalInterest: number
  /** Akumulasi sejak bulan ke-1. */
  cumulativePaid: number
  cumulativeInterest: number
  /** Utang yang lunas tepat pada bulan ini. */
  clearedThisMonth: string[]
  debts: DebtMonthState[]
}

export interface PayoffMilestone {
  debtId: string
  name: string
  month: number
}

export interface SimulationResult {
  /**
   * `false` bila total dana bulanan tidak cukup menutup bunga sehingga utang
   * tidak akan pernah lunas. UI harus menampilkan jalan keluar, bukan menyalahkan.
   */
  feasible: boolean
  /** Jumlah bulan sampai seluruh utang lunas. 0 bila tidak ada utang. */
  months: number
  /** Estimasi tanggal bebas utang. `null` bila tidak feasible. */
  debtFreeDate: Date | null
  totalPaid: number
  totalInterest: number
  /** Dana bulanan yang dipakai simulasi (total cicilan minimal + dana ekstra). */
  monthlyBudget: number
  timeline: MonthSnapshot[]
  payoffOrder: PayoffMilestone[]
  /** Terisi bila `feasible` false — untuk menyusun saran, bukan peringatan. */
  shortfall?: {
    /** Bunga total per bulan saat ini. */
    monthlyInterest: number
    /** Kekurangan dana bulanan agar utang mulai menyusut. */
    minimumViableBudget: number
  }
}

/** Hasil ringkas audit yang aman untuk ditampilkan/dibagikan. */
export interface AuditSummary {
  livingCost: number
  totalMinPayment: number
  targetIncome: number
  totalDebt: number
}
