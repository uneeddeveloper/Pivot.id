import { z } from 'zod'
import type { Skill } from '../../types/career'
import { extractSkillIdsFromText, keepKnownSkillIds } from '../../shared/skills'
import { cleanSource, pickApplyUrl, type RawGoogleJob } from './serpapi'
import { chatJson, isLlmConfigured, LlmUnavailableError } from './llm'

/**
 * Mengubah lowongan mentah Google Jobs jadi baris yang siap masuk MySQL.
 *
 * Dua pekerjaan sekaligus:
 *   1. NORMALISASI — menyeragamkan gaji ke Rupiah per bulan, menentukan
 *      remote/onsite, jenis kontrak, dan memetakan syaratnya ke katalog skill.
 *   2. VALIDASI — menandai lowongan yang patut dicurigai. Ini penting untuk
 *      audiens aplikasi ini: orang yang sedang terjepit utang adalah sasaran
 *      empuk lowongan palsu yang meminta "biaya administrasi" di muka.
 *
 * Kalau LLM tidak tersedia (token belum diisi, kuota habis, endpoint mati),
 * seluruh proses jatuh ke mode heuristik. Hasilnya lebih kasar tapi aplikasi
 * tetap jalan — tidak ada halaman kosong hanya karena satu API sedang mati.
 */

export interface NormalizedJob {
  externalId: string
  title: string
  company: string
  location: string
  isRemote: boolean
  employmentType: string
  salaryMin: number
  salaryMax: number
  salaryStated: boolean
  seniority: string
  description: string
  applyUrl: string
  source: string
  postedLabel: string
  qualityScore: number
  redFlags: string[]
  isValid: boolean
  skills: string[]
}

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'internship', 'freelance', ''] as const
const SENIORITY = ['entry', 'junior', 'mid', 'senior', ''] as const

const LlmJobSchema = z.object({
  index: z.number().int().min(0),
  salaryMin: z.number().min(0),
  salaryMax: z.number().min(0),
  salaryStated: z.boolean(),
  isRemote: z.boolean(),
  employmentType: z.enum(EMPLOYMENT_TYPES).catch(''),
  seniority: z.enum(SENIORITY).catch(''),
  skills: z.array(z.string()).max(20).default([]),
  qualityScore: z.number().min(0).max(100),
  redFlags: z.array(z.string()).max(6).default([]),
  isValid: z.boolean(),
})

const LlmBatchSchema = z.object({ jobs: z.array(LlmJobSchema) })

/** Deskripsi lowongan bisa sangat panjang; dipotong agar biaya token terkendali. */
const DESCRIPTION_LIMIT = 1200

/** Berapa lowongan dikirim per panggilan LLM. */
const BATCH_SIZE = 8

// ── Heuristik: dipakai sebagai jaring pengaman, dan sebagai nilai awal ───────

const MONTHLY_HINTS = /per\s*(bulan|month|mo\b)|\/\s*(bulan|month|mo\b)|monthly|bulanan/i
const YEARLY_HINTS = /per\s*(tahun|year|yr\b)|\/\s*(tahun|year|yr\b)|annually|tahunan|\bp\.?a\.?\b/i
const REMOTE_HINTS = /\b(remote|wfh|work from home|kerja dari rumah|jarak jauh)\b/i

/**
 * Tarik angka gaji dari teks bahasa Indonesia/Inggris.
 *
 * Menangani bentuk yang benar-benar muncul di lowongan lokal:
 *   "Rp5.000.000 - Rp7.000.000", "IDR 5,000,000", "5jt-7jt", "Rp 4 juta"
 *
 * Mengembalikan nominal BULANAN. Angka yang jelas tahunan dibagi 12.
 */
export function parseSalary(text: string): { min: number; max: number; stated: boolean } {
  if (!text) return { min: 0, max: 0, stated: false }

  const numbers: number[] = []

  // Bentuk singkat lebih dulu: "5jt", "7,5 juta", "3 jt"
  const shortForm = /(\d+(?:[.,]\d+)?)\s*(jt|juta)\b/gi
  for (const match of text.matchAll(shortForm)) {
    const value = Number(match[1]!.replace(',', '.'))
    if (Number.isFinite(value)) numbers.push(value * 1_000_000)
  }

  // Bentuk penuh: "Rp5.000.000", "IDR 5,000,000", "5000000"
  if (numbers.length === 0) {
    const longForm = /(?:rp|idr)?\s*(\d{1,3}(?:[.,]\d{3}){1,3}|\d{6,10})/gi
    for (const match of text.matchAll(longForm)) {
      const value = Number(match[1]!.replace(/[.,]/g, ''))
      // Di bawah 500 ribu hampir pasti bukan gaji bulanan (bisa nomor telepon,
      // kode pos, atau tahun); di atas 1 miliar juga bukan.
      if (Number.isFinite(value) && value >= 500_000 && value <= 1_000_000_000) {
        numbers.push(value)
      }
    }
  }

  if (numbers.length === 0) return { min: 0, max: 0, stated: false }

  let min = Math.min(...numbers)
  let max = Math.max(...numbers)

  // Kalau disebut tahunan (dan tidak ada penanda bulanan), turunkan ke bulanan.
  if (YEARLY_HINTS.test(text) && !MONTHLY_HINTS.test(text)) {
    min = Math.round(min / 12)
    max = Math.round(max / 12)
  }

  return { min, max, stated: true }
}

/** Kata kunci yang sering muncul di lowongan bodong. */
const SCAM_PATTERNS: { pattern: RegExp; flag: string }[] = [
  { pattern: /biaya (administrasi|pendaftaran|seleksi)|uang jaminan|deposit/i, flag: 'Meminta biaya di muka' },
  { pattern: /transfer.{0,20}(sebelum|dahulu)|bayar dulu/i, flag: 'Meminta transfer sebelum bekerja' },
  { pattern: /penghasilan.{0,20}(puluhan juta|ratusan juta)|gaji fantastis|cepat kaya/i, flag: 'Janji penghasilan tidak masuk akal' },
  { pattern: /\btanpa (modal|skill|pengalaman) langsung (gaji|cair)\b/i, flag: 'Klaim terlalu mudah' },
  { pattern: /\b(mlm|multi level|jaringan downline|rekrut anggota)\b/i, flag: 'Pola MLM / rekrut anggota' },
  { pattern: /hubungi.{0,15}(wa|whatsapp).{0,30}\d{8,}/i, flag: 'Melamar hanya lewat WhatsApp pribadi' },
]

function heuristicFlags(text: string): string[] {
  return SCAM_PATTERNS.filter((entry) => entry.pattern.test(text)).map((entry) => entry.flag)
}

/** Skor kelengkapan sederhana untuk mode tanpa LLM. */
function heuristicQuality(job: RawGoogleJob, salaryStated: boolean, flags: string[]): number {
  let score = 40
  if (job.company_name) score += 15
  if ((job.description?.length ?? 0) > 400) score += 15
  if (job.location) score += 10
  if (salaryStated) score += 10
  if (job.apply_options?.length) score += 10
  return Math.max(0, Math.min(100, score - flags.length * 25))
}

function mapEmploymentType(raw: string | undefined): string {
  const value = (raw ?? '').toLowerCase()
  if (/full[-\s]?time|penuh waktu/.test(value)) return 'full_time'
  if (/part[-\s]?time|paruh waktu/.test(value)) return 'part_time'
  if (/contract|kontrak/.test(value)) return 'contract'
  if (/intern|magang/.test(value)) return 'internship'
  if (/freelance|lepas/.test(value)) return 'freelance'
  return ''
}

/** ID stabil supaya lowongan yang sama tidak tersimpan dua kali antar pencarian. */
function stableId(job: RawGoogleJob): string {
  if (job.job_id) return job.job_id.slice(0, 191)
  const basis = `${job.title ?? ''}|${job.company_name ?? ''}|${job.location ?? ''}`
  // Hash sederhana; cukup untuk membedakan, tidak perlu kriptografis.
  let hash = 0
  for (let i = 0; i < basis.length; i += 1) {
    hash = (hash << 5) - hash + basis.charCodeAt(i)
    hash |= 0
  }
  return `fallback-${Math.abs(hash).toString(36)}`
}

/** Gabungan teks yang dipakai semua pemeriksaan berbasis kata kunci. */
function searchableText(job: RawGoogleJob): string {
  const highlights = (job.job_highlights ?? [])
    .flatMap((section) => section.items ?? [])
    .join(' ')
  return [
    job.title,
    job.description,
    highlights,
    job.detected_extensions?.salary,
    (job.extensions ?? []).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
}

/** Bentuk dasar tanpa LLM — juga jadi titik awal untuk hasil dengan LLM. */
function baseline(job: RawGoogleJob, skills: Skill[]): NormalizedJob {
  const text = searchableText(job)
  const salaryText = [job.detected_extensions?.salary, text].filter(Boolean).join(' ')
  const salary = parseSalary(salaryText)
  const flags = heuristicFlags(text)

  return {
    externalId: stableId(job),
    title: (job.title ?? '').slice(0, 255),
    company: (job.company_name ?? '').slice(0, 255),
    location: (job.location ?? '').slice(0, 191),
    isRemote: Boolean(job.detected_extensions?.work_from_home) || REMOTE_HINTS.test(text),
    employmentType: mapEmploymentType(job.detected_extensions?.schedule_type),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryStated: salary.stated,
    seniority: '',
    description: (job.description ?? '').slice(0, 20_000),
    applyUrl: pickApplyUrl(job),
    source: cleanSource(job.via),
    postedLabel: job.detected_extensions?.posted_at ?? '',
    qualityScore: heuristicQuality(job, salary.stated, flags),
    redFlags: flags,
    // Tanpa LLM, hanya lowongan yang benar-benar kena pola penipuan yang
    // dibuang. Menyaring terlalu ketat di mode heuristik justru menghapus
    // lowongan sah yang deskripsinya pendek.
    isValid: flags.length === 0,
    skills: extractSkillIdsFromText(text, skills),
  }
}

const SYSTEM_PROMPT = `Kamu adalah asisten yang merapikan data lowongan kerja Indonesia.

Tugasmu untuk SETIAP lowongan:
1. GAJI — ubah ke rentang RUPIAH PER BULAN sebagai bilangan bulat.
   - Angka tahunan dibagi 12. "5jt" berarti 5000000.
   - Kalau lowongan TIDAK menyebut gaji: salaryMin=0, salaryMax=0, salaryStated=false.
   - JANGAN mengarang angka. salaryStated hanya true bila nominalnya benar-benar tertulis.
2. isRemote — true hanya bila bisa dikerjakan penuh dari rumah.
3. employmentType — salah satu: full_time, part_time, contract, internship, freelance, atau "" bila tidak jelas.
4. seniority — salah satu: entry, junior, mid, senior, atau "" bila tidak jelas.
5. skills — pilih HANYA dari daftar id keterampilan yang diberikan. Jangan membuat id baru. Boleh kosong.
6. qualityScore 0-100 — seberapa lengkap dan meyakinkan iklan ini (nama perusahaan jelas, tugas rinci, cara melamar wajar).
7. redFlags — daftar singkat berbahasa Indonesia bila ada indikasi lowongan tidak sah:
   meminta biaya/deposit di muka, janji penghasilan tidak masuk akal, pola MLM,
   perusahaan tidak disebut, melamar hanya lewat nomor WhatsApp pribadi.
   Kosongkan bila bersih.
8. isValid — false bila lowongan ini kemungkinan besar penipuan atau tidak layak ditampilkan
   kepada orang yang sedang butuh pekerjaan. Kalau ragu, isi true — lebih baik ditampilkan
   dengan catatan daripada disembunyikan tanpa alasan.

Balas HANYA JSON: {"jobs":[{"index":0,...}]}
Sertakan satu entri untuk setiap index yang diberikan, dengan urutan yang sama.`

function buildUserPrompt(jobs: RawGoogleJob[], skills: Skill[]): string {
  const catalog = skills.map((skill) => `${skill.id} = ${skill.label}`).join('\n')

  const payload = jobs.map((job, index) => ({
    index,
    title: job.title ?? '',
    company: job.company_name ?? '',
    location: job.location ?? '',
    via: job.via ?? '',
    extensions: job.extensions ?? [],
    detected: job.detected_extensions ?? {},
    description: (job.description ?? '').slice(0, DESCRIPTION_LIMIT),
    highlights: (job.job_highlights ?? [])
      .map((section) => `${section.title ?? ''}: ${(section.items ?? []).slice(0, 6).join('; ')}`)
      .slice(0, 3),
  }))

  return `ID KETERAMPILAN YANG BOLEH DIPAKAI:\n${catalog}\n\nLOWONGAN:\n${JSON.stringify(payload)}`
}

/**
 * Normalisasi sekumpulan lowongan.
 *
 * Selalu mengembalikan satu hasil per lowongan masukan. Kegagalan LLM di satu
 * batch tidak menjatuhkan batch lain — batch itu saja yang turun ke heuristik.
 */
export async function normalizeJobs(
  rawJobs: RawGoogleJob[],
  skills: Skill[],
): Promise<{ jobs: NormalizedJob[]; llmUsed: boolean; warnings: string[] }> {
  const results = rawJobs.map((job) => baseline(job, skills))
  const warnings: string[] = []

  if (rawJobs.length === 0) return { jobs: results, llmUsed: false, warnings }

  if (!isLlmConfigured()) {
    warnings.push(
      'SUMOPOD_API_KEY belum diisi — gaji dan penyaringan lowongan memakai pembacaan kata kunci sederhana.',
    )
    return { jobs: results, llmUsed: false, warnings }
  }

  const knownSkillIds = new Set(skills.map((skill) => skill.id))
  let llmUsed = false

  for (let start = 0; start < rawJobs.length; start += BATCH_SIZE) {
    const batch = rawJobs.slice(start, start + BATCH_SIZE)

    try {
      const parsed = await chatJson(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(batch, skills) },
        ],
        LlmBatchSchema,
        {
          purpose: 'job_normalize',
          temperature: 0,
          maxTokens: 2500,
          // Aman di-cache: isinya iklan lowongan publik, bukan data user.
          cacheable: true,
        },
      )

      llmUsed = true

      for (const item of parsed.jobs) {
        const target = results[start + item.index]
        if (!target) continue

        // Gaji taksiran tanpa dasar tidak dipakai — kalau model bilang angkanya
        // tidak tertulis, kolomnya tetap 0 supaya UI menulis "tidak disebutkan".
        const salaryMin = item.salaryStated ? Math.round(item.salaryMin) : 0
        const salaryMax = item.salaryStated ? Math.round(item.salaryMax) : 0

        target.salaryMin = Math.min(salaryMin, salaryMax || salaryMin)
        target.salaryMax = Math.max(salaryMin, salaryMax)
        target.salaryStated = item.salaryStated && salaryMax > 0
        target.isRemote = item.isRemote
        target.employmentType = item.employmentType || target.employmentType
        target.seniority = item.seniority
        target.qualityScore = Math.round(item.qualityScore)
        // Pola heuristik dan temuan LLM digabung: keduanya menangkap hal yang
        // berbeda, dan untuk urusan lowongan bodong lebih baik kelebihan
        // peringatan daripada kelewatan.
        target.redFlags = [...new Set([...target.redFlags, ...item.redFlags])]
        target.isValid = item.isValid && target.redFlags.length < 3
        target.skills = keepKnownSkillIds(item.skills, knownSkillIds)

        // Kalau LLM tidak menemukan satu pun skill, pakai hasil kata kunci —
        // lebih baik ada penanda kasar daripada kartu lowongan kosong.
        if (target.skills.length === 0) {
          target.skills = extractSkillIdsFromText(searchableText(batch[item.index]!), skills)
        }
      }
    } catch (error) {
      // `userMessage` supaya balasan mentah penyedia (yang bisa memuat potongan
      // API key) tidak ikut tampil di halaman.
      const message =
        error instanceof LlmUnavailableError ? error.userMessage : 'Layanan AI sedang bermasalah.'

      // Batch ini tetap memakai hasil heuristik yang sudah ada di `results`.
      warnings.push(`Sebagian lowongan dirapikan tanpa AI. ${message}`)
    }
  }

  return { jobs: results, llmUsed, warnings: [...new Set(warnings)] }
}
