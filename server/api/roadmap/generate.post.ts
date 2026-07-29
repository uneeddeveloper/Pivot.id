import { z } from 'zod'
import { chatJson, isLlmConfigured, LlmUnavailableError } from '../../utils/llm'

/**
 * POST /api/roadmap/generate
 *
 * Menyusun kurikulum belajar mandiri dari daftar skill gap user.
 *
 * PRIVASI: yang dikirim ke sini hanya id keterampilan dan id peran target —
 * keduanya berasal dari katalog publik, bukan data pribadi. Karena itu hasilnya
 * boleh di-cache: kombinasi skill yang sama akan menghasilkan roadmap yang sama
 * dan tidak perlu dibayar dua kali.
 */

const BodySchema = z.object({
  /** ID keterampilan yang mau dikejar, urut dari yang paling penting. */
  skillIds: z.array(z.string().max(64)).min(1).max(12),
  /** Peran yang dituju — memberi konteks supaya materinya tidak melebar. */
  roleId: z.string().max(64).optional(),
  /** Berapa hari waktu yang user punya. */
  days: z.number().int().min(7).max(90).default(21),
  /** Jam belajar realistis per hari. */
  hoursPerDay: z.number().min(0.5).max(12).default(2),
})

const ResourceSchema = z.object({
  title: z.string().max(200),
  /** 'youtube' | 'artikel' | 'kursus' | 'dokumentasi' | 'latihan' */
  type: z.string().max(32),
  /** Kata kunci pencarian, BUKAN URL — lihat catatan di prompt. */
  searchQuery: z.string().max(200),
  language: z.string().max(24).default('Indonesia'),
})

const TaskSchema = z.object({
  day: z.number().int().min(1),
  title: z.string().max(200),
  detail: z.string().max(600),
  estimatedHours: z.number().min(0.25).max(12),
  skillId: z.string().max(64).default(''),
})

const RoadmapSchema = z.object({
  title: z.string().max(200),
  intro: z.string().max(600),
  weeks: z
    .array(
      z.object({
        week: z.number().int().min(1),
        focus: z.string().max(200),
        outcome: z.string().max(300),
        tasks: z.array(TaskSchema).max(14),
      }),
    )
    .max(13),
  resources: z.array(ResourceSchema).max(20).default([]),
  /** Proyek kecil yang bisa jadi isi portofolio. */
  portfolioProjects: z
    .array(z.object({ title: z.string().max(200), description: z.string().max(500) }))
    .max(5)
    .default([]),
})

export type Roadmap = z.infer<typeof RoadmapSchema>

const SYSTEM_PROMPT = `Kamu menyusun kurikulum belajar mandiri untuk orang Indonesia yang sedang
mengejar pekerjaan baru secepat mungkin — banyak di antaranya sedang menanggung utang,
jadi waktu dan uang mereka terbatas.

Aturan yang mengikat:
- SELURUH sumber belajar harus GRATIS. Jangan pernah menyarankan kursus berbayar,
  bootcamp, atau apa pun yang butuh langganan.
- JANGAN menulis URL. Model bahasa sering mengarang tautan yang tidak ada.
  Isi "searchQuery" dengan kata kunci yang tinggal ditempel user ke YouTube/Google.
- Materi harus praktis dan langsung bisa dipakai melamar kerja, bukan teori panjang.
- Utamakan sumber berbahasa Indonesia; sumber bahasa Inggris boleh kalau memang
  jauh lebih baik — tandai di field "language".
- Bagi dalam minggu. Setiap minggu punya satu fokus dan satu hasil nyata (outcome)
  yang bisa ditunjukkan ke pemberi kerja.
- Total jam tugas per hari tidak boleh melebihi jam belajar yang tersedia.
- Nada tulisan: tenang dan menyemangati. Tanpa menghakimi, tanpa "kamu harusnya...".

Balas HANYA JSON sesuai skema yang diminta.`

export default defineEventHandler(async (event) => {
  const body = BodySchema.parse(await readBody(event))

  if (!isLlmConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Roadmap belum bisa disusun',
      data: {
        message:
          'SUMOPOD_API_KEY belum diisi di file .env. Roadmap disusun oleh LLM, jadi fitur ini butuh token tersebut.',
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

  const targetSkills = body.skillIds
    .map((id) => byId.get(id))
    .filter((skill): skill is NonNullable<typeof skill> => skill !== undefined)

  if (targetSkills.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tidak ada keterampilan yang dikenali dari daftar yang dikirim',
    })
  }

  const role = body.roleId ? roles.find((item) => item.id === body.roleId) : undefined
  const weeks = Math.max(1, Math.ceil(body.days / 7))

  const prompt = [
    role ? `PERAN YANG DITUJU: ${role.title} — ${role.description}` : 'PERAN YANG DITUJU: belum dipilih',
    `KETERAMPILAN YANG PERLU DIKEJAR (urut prioritas):`,
    ...targetSkills.map((skill, index) => `${index + 1}. ${skill.id} — ${skill.label} (${skill.category})`),
    '',
    `WAKTU TERSEDIA: ${body.days} hari (${weeks} minggu), ${body.hoursPerDay} jam per hari.`,
    '',
    'Susun roadmapnya. Field "skillId" pada setiap tugas harus memakai id dari daftar di atas.',
  ].join('\n')

  try {
    const roadmap = await chatJson(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      RoadmapSchema,
      {
        purpose: 'roadmap',
        // Tugas panjang dan terstruktur — pakai model yang lebih pintar bila ada.
        smart: true,
        temperature: 0.4,
        maxTokens: 4000,
        // Aman: masukannya hanya id katalog publik, tanpa jejak pribadi.
        cacheable: true,
      },
    )

    return { roadmap, meta: { days: body.days, hoursPerDay: body.hoursPerDay, roleTitle: role?.title ?? '' } }
  } catch (error) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Roadmap gagal disusun',
      data: {
        message:
          error instanceof LlmUnavailableError
            ? error.userMessage
            : 'Layanan AI sedang tidak bisa dipakai. Coba lagi sebentar lagi.',
      },
    })
  }
})
