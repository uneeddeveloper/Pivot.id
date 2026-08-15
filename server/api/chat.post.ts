import { z } from 'zod'
import { chat, isLlmConfigured, LlmUnavailableError } from '../utils/llm'
import { extractPdfText, PdfReadError } from '../utils/pdf'
import type { ChatMessage } from '../utils/llm'

/**
 * Batas per pesan. Cukup longgar untuk seseorang yang menempelkan isi CV-nya
 * langsung ke kolom chat — itu pemakaian yang wajar di platform ini, bukan
 * penyalahgunaan.
 */
const MAX_CONTENT_CHARS = 20_000

/** Berapa giliran terakhir yang ikut dikirim ke model. */
const MAX_HISTORY = 20

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1).max(MAX_CONTENT_CHARS),
      }),
    )
    .min(1),
})

const SYSTEM_PROMPT = `Kamu adalah Pivot AI, asisten virtual cerdas untuk platform Pivot.id.
Pivot.id adalah platform untuk membantu para pencari kerja (fresh graduate, korban PHK, dll) menemukan keterampilan mereka dan mencocokkannya dengan pekerjaan yang tepat.

TUGASMU
Bantu pengguna HANYA dengan topik berikut:
- Karir, dunia kerja, dan pencarian kerja (CV, surat lamaran, wawancara, skill, jenjang karir, dsb).
- Cara pakai fitur-fitur platform Pivot.id.
- Analisis dokumen (CV) atau gambar yang pengguna unggah.

BATASAN
Topik apa pun di luar itu (resep masakan, hiburan, coding umum, kesehatan, dll) BUKAN cakupanmu.
Jika pengguna bertanya di luar topik tersebut, tolak dengan sopan dan singkat, lalu arahkan kembali ke seputar karir/CV/platform Pivot. Jangan tetap menjawab pertanyaannya walau kamu tahu jawabannya.

GAYA BAHASA
- Gunakan bahasa Indonesia yang hangat, profesional namun santai, dan penuh empati.
- Jangan bertele-tele. Jawab dengan ringkas dan langsung ke poinnya.
- Gunakan format Markdown (bold, list) jika membantu keterbacaan, tetapi hindari heading besar.
- Jika pengguna mengunggah dokumen/gambar, analisis dan berikan feedback yang konstruktif.`

export default defineEventHandler(async (event) => {
  const contentType = getHeader(event, 'content-type') || ''
  const isMultipart = contentType.includes('multipart/form-data')

  let parsedMessages: any[]
  let fileBuffer: Buffer | undefined
  let fileType: string | undefined

  if (isMultipart) {
    const formData = await readMultipartFormData(event)
    if (!formData) throw createError({ statusCode: 400, message: 'Invalid form data' })

    const messagesField = formData.find(f => f.name === 'messages')
    if (!messagesField) throw createError({ statusCode: 400, message: 'Missing messages' })

    try {
      parsedMessages = JSON.parse(messagesField.data.toString())
    } catch {
      throw createError({ statusCode: 400, message: 'Field `messages` bukan JSON yang valid' })
    }

    const fileField = formData.find(f => f.name === 'file')
    if (fileField) {
      fileBuffer = fileField.data
      fileType = fileField.type
    }
  } else {
    // Body kosong atau bukan JSON juga harus jadi 400, bukan 500 — `readBody`
    // bisa melempar sendiri, dan `rawBody` bisa saja undefined.
    let rawBody: { messages?: unknown } | undefined
    try {
      rawBody = await readBody(event)
    } catch {
      throw createError({ statusCode: 400, message: 'Body permintaan bukan JSON yang valid' })
    }
    parsedMessages = rawBody?.messages as any[]
  }

  /**
   * Validasi HARUS ditangkap. `BodySchema.parse` melempar ZodError mentah, dan
   * ZodError bukan error h3 — Nitro memperlakukannya sebagai kegagalan tak
   * terduga dan membalas 500 berisi dump skema. Itulah "server error 500" yang
   * muncul di widget chat padahal API key sudah benar: pesan yang kepanjangan
   * (mis. isi CV yang ditempel) tidak pernah sampai ke LLM sama sekali.
   */
  const parsed = BodySchema.safeParse({ messages: parsedMessages })
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some(i => i.code === 'too_big')
    throw createError({
      statusCode: 400,
      statusMessage: 'Pesan tidak bisa diproses',
      data: {
        message: tooLong
          ? `Pesannya terlalu panjang (maksimal ${MAX_CONTENT_CHARS.toLocaleString('id-ID')} karakter). Coba ringkas, atau lampirkan sebagai file PDF.`
          : 'Format pesan tidak dikenali. Muat ulang halaman lalu coba lagi.',
      },
    })
  }

  // Riwayat dipangkas, bukan ditolak. Percakapan panjang tidak boleh tiba-tiba
  // berhenti berfungsi hanya karena melewati batas jumlah pesan.
  let finalMessages: ChatMessage[] = parsed.data.messages.slice(-MAX_HISTORY) as ChatMessage[]

  if (fileBuffer && fileType && finalMessages.length > 0) {
    const lastUserMessage = finalMessages[finalMessages.length - 1]
    
    if (fileType === 'application/pdf') {
      try {
        const extracted = await extractPdfText(fileBuffer)
        lastUserMessage.content = `${lastUserMessage.content}\n\n[Isi Lampiran Dokumen/CV]:\n${extracted}`
      } catch (error) {
        if (!(error instanceof PdfReadError)) throw error
        console.error('[chat:pdf]', error.message)
        throw createError({
          statusCode: 400,
          statusMessage: 'PDF tidak bisa dibaca',
          data: { message: error.userMessage },
        })
      }
    } else if (fileType.startsWith('image/')) {
      const base64Data = fileBuffer.toString('base64')
      const imageUrl = `data:${fileType};base64,${base64Data}`
      
      const textContent = lastUserMessage.content as string
      lastUserMessage.content = [
        { type: 'text', text: `${textContent}\n\n[Berikut adalah lampiran dokumen/gambar]` },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }
  }

  if (!isLlmConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Mode percakapan belum bisa dipakai',
      data: {
        message: 'SUMOPOD_API_KEY belum diisi di file .env. Fitur chat belum dapat digunakan.',
      },
    })
  }

  try {
    const reply = await chat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        ...finalMessages,
      ],
      {
        purpose: 'general_chat',
        temperature: 0.7,
        maxTokens: 1500,
        cacheable: false,
      },
    )

    return { reply }
  } catch (error) {
    throw createError({
      statusCode: 503,
      statusMessage: 'AI sedang tidak bisa menjawab',
      data: {
        message:
          error instanceof LlmUnavailableError
            ? `${error.userMessage.replace(/\.$/, '')}.`
            : 'AI sedang tidak bisa dipakai saat ini.',
      },
    })
  }
})
