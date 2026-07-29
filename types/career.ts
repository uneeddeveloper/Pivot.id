/**
 * Tipe data untuk modul Skill Gap & Role Matching (Tahap 2).
 *
 * CATATAN PRIVASI: `ownedSkills` dan teks CV yang ditempel user adalah data
 * pribadi. Sama seperti data utang, keduanya HANYA boleh hidup di memori
 * browser dan tidak boleh dikirim ke endpoint manapun.
 */

/** Pengelompokan keterampilan, dipakai untuk menyusun chip di UI. */
export type SkillCategory =
  | 'Dasar Kerja'
  | 'Desain & Konten'
  | 'Digital Marketing'
  | 'Data'
  | 'Teknologi'
  | 'Bisnis & Keuangan'

export interface Skill {
  id: string
  label: string
  category: SkillCategory
  /**
   * Kata kunci alternatif untuk mendeteksi keterampilan ini dari teks CV.
   * Ditulis huruf kecil; pencocokan memakai batas kata agar "R" atau "Go"
   * tidak ikut tertangkap dari kata lain.
   */
  aliases: string[]
}

/** Bidang peran kerja, dipakai sebagai filter. */
export type RoleField = 'Digital & Kreatif' | 'Teknologi' | 'Data' | 'Bisnis & Operasional'

export interface Role {
  id: string
  title: string
  field: RoleField
  /** Gaji bersih bulanan (Rupiah) — batas bawah pasar untuk pemula. */
  salaryMin: number
  /** Gaji bersih bulanan yang umum didapat setelah beberapa bulan. */
  salaryTypical: number
  /** Bisa dimasuki tanpa pengalaman kerja formal atau ijazah bidang terkait. */
  entryFriendly: boolean
  /** Peluang kerja jarak jauh cukup terbuka. */
  remoteFriendly: boolean
  /** Perkiraan waktu belajar dari nol sampai siap melamar. */
  timeToEntry: string
  /** ID keterampilan yang biasanya diminta di lowongan peran ini. */
  skills: string[]
  description: string
}

// ── Roadmap belajar (Tahap 3) ────────────────────────────────────────────────

/**
 * Satu sumber belajar. Sengaja TIDAK memuat URL: model bahasa sering mengarang
 * tautan yang tidak pernah ada. Yang disimpan adalah kata kunci pencarian,
 * supaya user mendarat di hasil yang benar-benar hidup.
 */
export interface LearningResource {
  title: string
  /** 'youtube' | 'artikel' | 'kursus' | 'dokumentasi' | 'latihan' */
  type: string
  searchQuery: string
  language: string
}

export interface RoadmapTask {
  /** Hari ke-berapa sejak roadmap dimulai. */
  day: number
  title: string
  detail: string
  estimatedHours: number
  /** ID keterampilan yang dikejar tugas ini. Kosong bila umum. */
  skillId: string
}

export interface RoadmapWeek {
  week: number
  focus: string
  /** Hasil nyata yang bisa ditunjukkan ke pemberi kerja di akhir minggu ini. */
  outcome: string
  tasks: RoadmapTask[]
}

export interface Roadmap {
  title: string
  intro: string
  weeks: RoadmapWeek[]
  resources: LearningResource[]
  portfolioProjects: { title: string; description: string }[]
}

/** Hasil pencocokan satu peran dengan kondisi user. */
export interface RoleMatch {
  role: Role
  /** Keterampilan yang sudah dimiliki user dan relevan dengan peran ini. */
  owned: Skill[]
  /** Inilah "skill gap" — yang masih perlu dikejar. */
  missing: Skill[]
  /** 0..1, porsi syarat keterampilan yang sudah terpenuhi. */
  coverage: number
  /** `salaryTypical` sudah menutup Target Income user. */
  meetsTarget: boolean
  /**
   * Selisih gaji umum terhadap Target Income. Negatif berarti peran ini belum
   * menutup kebutuhan — tetap ditampilkan sebagai batu loncatan, bukan dibuang.
   */
  gapToTarget: number
}
