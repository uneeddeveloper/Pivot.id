/**
 * Tipe data untuk modul Penghasilan Cepat / micro-gig (Tahap 5).
 *
 * KENAPA MODUL INI ADA
 *   Lamaran kerja tetap butuh 2–6 minggu sampai dijawab. Cicilan tidak
 *   menunggu selama itu. Langkah 5 menjawab pertanyaan yang berbeda dari
 *   langkah 4: bukan "kerja apa yang menutup kebutuhan bulananku", tapi
 *   "apa yang bisa menghasilkan uang minggu ini dengan yang sudah kupunya".
 *
 * CATATAN PRIVASI
 *   Isi file ini BUKAN data pribadi — katalog micro-gig sama untuk semua orang
 *   dan dibaca dari MySQL lewat GET /api/gigs. Yang bersifat pribadi adalah
 *   `need` dan `hoursAvailable` di `GigPlanInput`: keduanya berasal dari data
 *   utang user. Karena itu seluruh perhitungan di `useGigPlanner` berjalan di
 *   browser dan tidak satu pun angka itu dikirim ke server.
 */

/** Pengelompokan gig, dipakai untuk menyusun filter di UI. */
export type GigCategory =
  | 'Jasa Digital'
  | 'Kreatif & Konten'
  | 'Data & Admin'
  | 'Lapangan'
  | 'Jualan'

/**
 * Tempat mencari pekerjaannya.
 *
 * Sama seperti sumber belajar di roadmap, yang disimpan adalah kata kunci
 * pencarian, BUKAN URL. Tautan platform sering berpindah dan halaman kategori
 * ikut berubah; kata kunci membuat user mendarat di hasil yang masih hidup.
 */
export interface GigChannel {
  name: string
  /** Kata kunci siap tempel ke Google, mis. "fastwork jasa entri data". */
  searchQuery: string
  /** 'platform' | 'komunitas' | 'langsung' — menentukan ikon & urutan di UI. */
  kind: string
}

/** Satu jenis pekerjaan lepas berskala kecil. */
export interface MicroGig {
  id: string
  title: string
  category: GigCategory
  /**
   * Bayaran per satu satuan pekerjaan, dalam Rupiah. Rentang pasar Indonesia
   * untuk pemula — batas bawah dipakai saat menyusun rencana supaya angkanya
   * tidak menjanjikan lebih dari yang wajar.
   */
  earnMin: number
  earnMax: number
  /** Satuan bayarannya, mis. 'per pesanan', 'per hari', 'per artikel'. */
  unit: string
  /** Perkiraan jam kerja untuk menyelesaikan satu satuan. */
  hoursPerUnit: number
  /**
   * Berapa satuan yang realistis DIDAPAT dalam seminggu oleh pemula — bukan
   * berapa yang muat di jam kerjanya.
   *
   * Tanpa batas ini, rencana yang disusun dari jam saja menghasilkan saran
   * seperti "80× dropship minggu ini": benar secara aritmetika, mustahil di
   * dunia nyata, dan membuat seluruh rencananya kehilangan kredibilitas.
   * Yang membatasi micro-gig biasanya permintaan, bukan waktu.
   */
  maxUnitsPerWeek: number
  /** Berapa hari sampai uangnya benar-benar diterima. Ini yang menentukan urgensi. */
  daysToFirstPay: number
  /** Modal awal yang tidak bisa dihindari. 0 = benar-benar bisa mulai tanpa uang. */
  startupCost: number
  /** Bisa dikerjakan dari rumah. */
  remoteFriendly: boolean
  description: string
  /** Langkah konkret pertama — bukan motivasi, tapi yang bisa dilakukan hari ini. */
  howToStart: string
  /**
   * Risiko yang harus diwaspadai. WAJIB terisi untuk setiap gig: audiens
   * aplikasi ini justru sasaran empuk penipuan lowongan lepas.
   */
  caution: string
  /** ID keterampilan dari katalog `skills` yang biasanya diminta. */
  skills: string[]
  channels: GigChannel[]
}

/** Satu gig plus hitungan yang bergantung pada kondisi user. */
export interface GigMatch {
  gig: MicroGig
  /** ID keterampilan yang diminta gig ini dan sudah dimiliki user. */
  owned: string[]
  /** Yang belum dimiliki. Untuk gig, ini jarang jadi penghalang mutlak. */
  missing: string[]
  /** 0..1 porsi keterampilan yang sudah terpenuhi. */
  coverage: number
  /** Bayaran rata-rata per jam kerja — pembanding antar-gig yang paling jujur. */
  perHour: number
  /** Perkiraan hasil bila seluruh jam yang tersedia dipakai untuk gig ini. */
  potentialMin: number
  potentialMax: number
  /** Berapa satuan pekerjaan untuk menutup kebutuhan, memakai tarif terendah. */
  unitsForNeed: number
  /** Jam kerja yang dibutuhkan untuk itu. */
  hoursForNeed: number
  /** Muat dalam jam yang tersedia user. */
  fitsAvailableHours: boolean
}

/** Satu baris rencana: ambil N satuan dari satu gig. */
export interface GigPlanStep {
  gig: MicroGig
  units: number
  hours: number
  earningsMin: number
  earningsMax: number
}

/**
 * Rencana penutup kebutuhan. Disusun dari tarif TERENDAH tiap gig — kalau
 * rencananya disusun dari tarif tertinggi, angka yang terlihat menutup
 * kebutuhan akan meleset di dunia nyata, dan yang menanggung selisihnya
 * adalah orang yang paling tidak mampu menanggungnya.
 */
export interface GigPlan {
  steps: GigPlanStep[]
  /** Kebutuhan yang dikejar (Rupiah). */
  need: number
  /** Jam kerja yang user nyatakan tersedia dalam seminggu. */
  hoursAvailable: number
  hoursUsed: number
  estimatedMin: number
  estimatedMax: number
  /** `estimatedMin` sudah menutup `need`. */
  covered: boolean
  /** Sisa yang belum tertutup. 0 bila `covered`. */
  shortfall: number
  /**
   * Tambahan jam per minggu yang membuat rencananya menutup kebutuhan.
   * Ditampilkan sebagai target yang bisa dikejar, bukan sebagai vonis.
   */
  extraHoursNeeded: number
  /**
   * Kebutuhannya tidak mungkin ditutup dari kerja lepas dalam seminggu — entah
   * karena jam yang diperlukan sudah melewati batas manusiawi, atau karena
   * jatah mingguan gig-nya sendiri yang tidak sampai (menambah jam pun tidak
   * menolong kalau pekerjaannya memang tidak sebanyak itu).
   *
   * UI wajib berhenti menyarankan "tambah jam" di titik ini dan mengarahkan ke
   * jalan lain: pecah target ke beberapa minggu, minta perpanjangan sebelum
   * jatuh tempo, atau laporkan pinjaman ilegal ke OJK.
   */
  beyondReach: boolean
  /** Hari tercepat sampai uang pertama masuk dari rencana ini. */
  fastestPayDays: number
}
