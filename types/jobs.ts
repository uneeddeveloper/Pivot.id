/**
 * Tipe data untuk modul Lowongan (Tahap 4).
 *
 * Berbeda dari `types/financial.ts` dan `types/career.ts`, data di file ini
 * BUKAN data pribadi user — isinya lowongan publik hasil pencarian Google Jobs
 * yang disimpan di MySQL. Yang tetap tidak boleh dikirim ke server adalah
 * angka utang dan teks CV; Target Income yang dipakai sebagai filter gaji
 * dikirim sebagai satu angka teragregasi, tanpa rinciannya.
 */

/** Satu lowongan yang sudah dinormalisasi dan lolos validasi. */
export interface JobListing {
  id: number
  title: string
  company: string
  location: string
  isRemote: boolean
  /** 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance' | '' */
  employmentType: string
  /**
   * Rentang gaji BULANAN dalam Rupiah. 0 berarti lowongan tidak menyebut gaji —
   * UI harus menulis "gaji tidak disebutkan", bukan "Rp0".
   */
  salaryMin: number
  salaryMax: number
  /** true bila angka gaji memang tertulis di lowongan, bukan taksiran. */
  salaryStated: boolean
  /** 'entry' | 'junior' | 'mid' | 'senior' | '' */
  seniority: string
  description: string
  applyUrl: string
  /** Papan lowongan asal, mis. 'Glints', 'JobStreet'. */
  source: string
  /** `YYYY-MM-DD`, atau null bila tanggalnya tidak bisa dipastikan. */
  postedAt: string | null
  /** Teks apa adanya dari Google, mis. "3 hari lalu". */
  postedLabel: string
  roleId: string | null
  /** 0..100 — seberapa lengkap dan meyakinkan lowongan ini. */
  qualityScore: number
  /** Alasan lowongan patut diwaspadai. Kosong berarti bersih. */
  redFlags: string[]
  /** ID keterampilan dari katalog yang diminta lowongan ini. */
  skills: string[]
}

/** Lowongan plus hitungan yang bergantung pada kondisi user. */
export interface JobMatch {
  job: JobListing
  /** Gaji lowongan menutup Target Income user. */
  meetsTarget: boolean
  /** ID keterampilan yang diminta lowongan dan sudah dimiliki user. */
  owned: string[]
  /** Yang masih perlu dikejar. */
  missing: string[]
  /** 0..1 porsi keterampilan lowongan yang sudah terpenuhi. */
  coverage: number
}

export interface JobSearchMeta {
  query: string
  location: string
  /** true bila hasil diambil dari MySQL tanpa memanggil SerpApi. */
  cached: boolean
  /** Kapan data ini terakhir diambil dari Google Jobs. */
  fetchedAt: string
  provider: string
  /** Jumlah lowongan mentah sebelum penyaringan. */
  totalFound: number
  /** Disembunyikan karena gajinya di bawah Target Income. */
  hiddenBySalary: number
  /** Disembunyikan karena terindikasi tidak sah. */
  hiddenByValidation: number
  /** false bila normalisasi jatuh ke mode heuristik tanpa LLM. */
  llmUsed: boolean
  /** Pesan yang perlu ditampilkan apa adanya ke user, mis. kuota habis. */
  warnings: string[]
}

export interface JobSearchResponse {
  matches: JobMatch[]
  meta: JobSearchMeta
}
