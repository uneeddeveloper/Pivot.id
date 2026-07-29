import { z } from 'zod'
import { chatJson, isLlmConfigured, LlmUnavailableError } from '../../utils/llm'

/**
 * POST /api/cv/ats
 *
 * Menyusun kerangka CV format ATS (Applicant Tracking System) — CV teks polos
 * tanpa tabel/kolom/ikon, yang bisa dibaca mesin penyaring lamaran.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ PRIVASI                                                                  │
 * │ Permintaan ini boleh memuat nama dan kontak yang DIISI SENDIRI oleh user  │
 * │ di formulir — bukan hasil menyalin CV lamanya diam-diam. Karena itu:      │
 * │   • `cacheable: false`, tanpa kecuali.                                   │
 * │   • Tidak ada yang ditulis ke MySQL.                                     │
 * │   • Isi permintaan tidak pernah masuk log.                               │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

const BodySchema = z.object({
  /** Nama yang mau ditulis di CV. Boleh dikosongkan — nanti jadi placeholder. */
  fullName: z.string().trim().max(120).default(''),
  /** Kota domisili, mis. "Bandung". */
  city: z.string().trim().max(120).default(''),
  /** Email/nomor yang mau dicantumkan. Boleh kosong. */
  contact: z.string().trim().max(200).default(''),
  /** ID peran yang dilamar. */
  roleId: z.string().max(64).optional(),
  /** Judul lowongan spesifik, kalau melamar ke satu lowongan tertentu. */
  jobTitle: z.string().trim().max(200).default(''),
  skillIds: z.array(z.string().max(64)).max(40).default([]),
  experienceYears: z.number().min(0).max(60).default(0),
  /** Ringkasan latar belakang, mis. hasil percakapan di /api/career/interview. */
  background: z.string().trim().max(1500).default(''),
})

const AtsSchema = z.object({
  headline: z.string().max(160),
  summary: z.string().max(800),
  /** Dikelompokkan supaya mudah dipindai mesin maupun manusia. */
  skillGroups: z
    .array(z.object({ label: z.string().max(80), items: z.array(z.string().max(80)).max(15) }))
    .max(6)
    .default([]),
  /** Poin pengalaman siap tempel; pakai placeholder bila user belum punya. */
  experienceBullets: z.array(z.string().max(300)).max(10).default([]),
  /** Saran proyek/portofolio yang menutupi minimnya pengalaman formal. */
  projectSuggestions: z
    .array(z.object({ title: z.string().max(160), bullets: z.array(z.string().max(300)).max(4) }))
    .max(4)
    .default([]),
  /** Kata kunci yang sebaiknya muncul apa adanya supaya lolos penyaring ATS. */
  atsKeywords: z.array(z.string().max(60)).max(25).default([]),
  /** Catatan singkat cara memakai CV ini. */
  tips: z.array(z.string().max(240)).max(6).default([]),
})

export type AtsCv = z.infer<typeof AtsSchema>

const SYSTEM_PROMPT = `Kamu menyusun CV format ATS untuk pelamar kerja Indonesia.

Yang dimaksud ATS-friendly:
- Teks polos. Tanpa tabel, kolom, grafik, ikon, atau simbol aneh.
- Judul bagian standar: Ringkasan, Keterampilan, Pengalaman, Proyek, Pendidikan.
- Kata kunci dari iklan lowongan ditulis APA ADANYA, bukan disinonimkan.
- Poin pengalaman diawali kata kerja dan sedapat mungkin memuat angka.

Aturan yang mengikat:
- JANGAN mengarang riwayat kerja, gelar, sertifikat, atau angka pencapaian.
  Kalau user belum memberi datanya, tulis poin dengan placeholder bertanda
  kurung siku, mis. "[isi jumlah]" — supaya jelas bagian itu harus dia lengkapi.
- Kalau pengalaman formalnya 0 tahun, jangan menutupinya. Alihkan bobotnya ke
  bagian Proyek: sarankan proyek kecil yang benar-benar bisa dia kerjakan sendiri.
- Bahasa Indonesia, lugas, tanpa kata sifat berlebihan seperti "sangat ahli".
- Nada tenang dan hormat. Pembacanya sedang butuh pekerjaan, bukan sedang iseng.

Balas HANYA JSON sesuai skema.`

export default defineEventHandler(async (event) => {
  const body = BodySchema.parse(await readBody(event))

  if (!isLlmConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Generator CV belum bisa dipakai',
      data: {
        message:
          'SUMOPOD_API_KEY belum diisi di file .env. Penyusunan CV ATS memakai LLM, jadi fitur ini butuh token tersebut.',
      },
    })
  }

  // Kegagalan MySQL harus keluar sebagai 503 yang menyebut penyebabnya, bukan
  // 500 mentah. Lihat `catalogUnavailableError`.
  const [skills, roles] = await Promise.all([loadSkills(), loadRoles()]).catch(
    (error: unknown) => {
      throw catalogUnavailableError(error)
    },
  )

  const byId = new Map(skills.map((skill) => [skill.id, skill]))

  const owned = body.skillIds
    .map((id) => byId.get(id))
    .filter((skill): skill is NonNullable<typeof skill> => skill !== undefined)

  const role = body.roleId ? roles.find((item) => item.id === body.roleId) : undefined
  const target = body.jobTitle || role?.title || ''

  if (!target) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Pilih peran yang dituju atau isi judul lowongannya lebih dulu',
    })
  }

  const prompt = [
    `POSISI YANG DILAMAR: ${target}`,
    role ? `URAIAN PERAN: ${role.description}` : '',
    body.fullName ? `NAMA: ${body.fullName}` : 'NAMA: belum diisi — pakai placeholder [Nama Lengkap]',
    body.city ? `DOMISILI: ${body.city}` : '',
    body.contact ? `KONTAK: ${body.contact}` : '',
    `PENGALAMAN KERJA: ${body.experienceYears} tahun`,
    owned.length
      ? `KETERAMPILAN YANG DIMILIKI:\n${owned.map((skill) => `- ${skill.label} (${skill.category})`).join('\n')}`
      : 'KETERAMPILAN YANG DIMILIKI: belum diisi',
    body.background ? `LATAR BELAKANG: ${body.background}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const cv = await chatJson(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      AtsSchema,
      {
        purpose: 'cv_ats',
        smart: true,
        temperature: 0.3,
        maxTokens: 2500,
        // WAJIB false — bisa memuat nama dan kontak user.
        cacheable: false,
      },
    )

    return { cv, meta: { target, skillCount: owned.length } }
  } catch (error) {
    throw createError({
      statusCode: 503,
      statusMessage: 'CV gagal disusun',
      data: {
        message:
          error instanceof LlmUnavailableError
            ? error.userMessage
            : 'Layanan AI sedang tidak bisa dipakai. Coba lagi sebentar lagi.',
      },
    })
  }
})
