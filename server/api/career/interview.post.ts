import { z } from 'zod'
import { keepKnownSkillIds } from '../../../shared/skills'
import { chatJson, isLlmConfigured, LlmUnavailableError } from '../../utils/llm'

/**
 * POST /api/career/interview
 *
 * Percakapan penggali keterampilan. User bercerita dengan bahasanya sendiri —
 * "dulu jaga toko kelontong keluarga, biasa catat stok di buku" — lalu AI
 * menerjemahkannya jadi id keterampilan di katalog, dan BERTANYA BALIK kalau
 * masih ada yang kurang jelas.
 *
 * Kenapa percakapan, bukan daftar centang:
 *   Banyak calon user tidak tahu bahwa pengalaman mereka punya nama formal di
 *   dunia kerja. Orang yang mengurus stok warung keluarga tidak akan mencentang
 *   "Manajemen stok" karena merasa itu bukan "keterampilan". Percakapan menutup
 *   jarak itu — dan itulah inti masalah yang aplikasi ini coba selesaikan.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ PRIVASI                                                                  │
 * │ Isi percakapan adalah cerita pribadi user tentang riwayat kerjanya.      │
 * │ Aturannya sama ketatnya dengan teks CV:                                  │
 * │   1. Percakapan TIDAK PERNAH ditulis ke MySQL.                          │
 * │   2. Panggilan LLM WAJIB `cacheable: false` — kalau di-cache, cerita     │
 * │      pribadi user akan mengendap di tabel `llm_cache`.                  │
 * │   3. Isi percakapan tidak pernah masuk log, termasuk saat error.        │
 * │   4. Riwayat percakapan hidup di memori browser saja; server tidak      │
 * │      menyimpan sesi apa pun — tiap permintaan membawa riwayatnya        │
 * │      sendiri dan dilupakan begitu balasan dikirim.                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(6000),
      }),
    )
    .min(1)
    .max(24),
})

const InterviewSchema = z.object({
  /** Yang diucapkan AI kembali ke user. Bahasa Indonesia, hangat, ringkas. */
  reply: z.string().min(1).max(900),
  /** Id keterampilan yang sudah bisa disimpulkan sejauh ini. */
  skills: z.array(z.string()).max(40).default([]),
  experienceYears: z.number().min(0).max(60).default(0),
  /** Ringkasan latar belakang tanpa identitas — bahan untuk CV ATS nanti. */
  background: z.string().max(400).default(''),
  /**
   * true bila keterangannya sudah cukup untuk merekomendasikan pekerjaan.
   * Selama false, `reply` harus berisi pertanyaan lanjutan.
   */
  ready: z.boolean(),
  /** Hal yang masih ingin AI ketahui. Kosong saat `ready` true. */
  missingInfo: z.array(z.string().max(120)).max(3).default([]),
})

const SYSTEM_PROMPT = `Kamu pewawancara karir yang hangat, untuk orang Indonesia yang sedang mencari kerja.
Banyak di antaranya fresh graduate, korban PHK, atau sedang terjepit utang. Sebagian merasa
"tidak punya keahlian apa-apa" padahal sebenarnya punya.

TUGASMU
Gali kemampuan user lewat obrolan biasa, lalu petakan ke id keterampilan dari katalog yang diberikan.

CARA BERTANYA
- Maksimal DUA pertanyaan dalam satu balasan. Jangan menginterogasi.
- Pertanyaannya konkret dan mudah dijawab: "Sehari-hari di toko itu kamu ngapain aja?"
  BUKAN "Apa kompetensi inti Anda?"
- Kalau user menyebut pengalaman, gali isinya sebelum pindah topik.
- Bahasa Indonesia sehari-hari. Boleh santai. Jangan kaku dan jangan bertele-tele.

CARA MEMETAKAN
- Pilih HANYA id dari katalog. Jangan mengarang id baru.
- Tangkap yang TERSIRAT, bukan cuma yang disebut persis:
  "jaga warung, catat stok di buku, layani pembeli" => manajemen-stok, layanan-pelanggan, komunikasi
  "bikin feed jualan pakai HP" => canva, social-media
  "sering bantu ketik laporan kating" => admin, excel
- Pengalaman non-formal DIHITUNG: usaha keluarga, kerja sampingan, kegiatan organisasi, otodidak.
- Jangan memasukkan keterampilan yang cuma dia INGIN pelajari.
- Jangan mengarang keterampilan yang tidak ada dasarnya di cerita user.

KAPAN BERHENTI (ready: true)
Isi ready true bila SALAH SATU terpenuhi:
- kamu sudah mengumpulkan minimal 3 keterampilan DAN sudah tahu kira-kira lama pengalamannya, atau
- user menyatakan sudah selesai bercerita / minta langsung dilihatkan pekerjaannya.
Saat ready true, isi "reply" dengan rangkuman singkat kemampuannya dan ajakan melihat hasil —
bukan pertanyaan lagi.
Selama ready false, isi "reply" WAJIB diakhiri pertanyaan.

NADA
Jangan pernah meremehkan pekerjaan apa pun. Jangan menyuruh "harusnya dari dulu...".
Kalau user bilang tidak punya keahlian, jangan setujui — gali kegiatan hariannya.

Balas HANYA JSON sesuai skema.`

export default defineEventHandler(async (event) => {
  const body = BodySchema.parse(await readBody(event))

  if (!isLlmConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Mode percakapan belum bisa dipakai',
      data: {
        message:
          'SUMOPOD_API_KEY belum diisi di file .env. Sementara itu, kamu tetap bisa memilih keterampilan secara manual lewat tombol di bawah.',
      },
    })
  }

  const skills = await loadSkills()
  const knownIds = new Set(skills.map((skill) => skill.id))
  const catalog = skills.map((skill) => `${skill.id} = ${skill.label} (${skill.category})`).join('\n')

  try {
    const result = await chatJson(
      [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\nKATALOG KETERAMPILAN:\n${catalog}` },
        ...body.messages,
      ],
      InterviewSchema,
      {
        purpose: 'career_interview',
        temperature: 0.6,
        maxTokens: 1200,
        // WAJIB false. Percakapan memuat cerita pribadi user.
        cacheable: false,
      },
    )

    return {
      reply: result.reply,
      // Id karangan dibuang di sini, bukan dipercaya mentah-mentah.
      skills: keepKnownSkillIds(result.skills, knownIds),
      experienceYears: result.experienceYears,
      background: result.background,
      ready: result.ready,
      missingInfo: result.missingInfo,
    }
  } catch (error) {
    // `userMessage`, bukan `message`: yang kedua memuat balasan mentah penyedia
    // yang bisa mengandung potongan API key. Isi percakapan tidak pernah ikut.
    throw createError({
      statusCode: 503,
      statusMessage: 'AI sedang tidak bisa menjawab',
      data: {
        message:
          error instanceof LlmUnavailableError
            ? `${error.userMessage.replace(/\.$/, '')}. Kamu tetap bisa memilih keterampilan secara manual.`
            : 'AI sedang tidak bisa dipakai. Kamu tetap bisa memilih keterampilan secara manual.',
      },
    })
  }
})
