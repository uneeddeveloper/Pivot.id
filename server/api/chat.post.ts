import { z } from 'zod'
import { chat, isLlmConfigured, LlmUnavailableError } from '../utils/llm'
import * as _pdf from 'pdf-parse'
const pdf = (_pdf as any).default || _pdf
import type { ChatMessage } from '../utils/llm'

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1).max(10000),
      }),
    )
    .min(1)
    .max(50),
})

const SYSTEM_PROMPT = `Kamu adalah Pivot AI, asisten virtual cerdas untuk platform Pivot.id.
Pivot.id adalah platform untuk membantu para pencari kerja (fresh graduate, korban PHK, dll) menemukan keterampilan mereka dan mencocokkannya dengan pekerjaan yang tepat.

TUGASMU
Bantu pengguna dengan pertanyaan umum seputar karir, platform Pivot, atau dokumen (CV) yang mereka unggah.

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
    
    parsedMessages = JSON.parse(messagesField.data.toString())
    
    const fileField = formData.find(f => f.name === 'file')
    if (fileField) {
      fileBuffer = fileField.data
      fileType = fileField.type
    }
  } else {
    const rawBody = await readBody(event)
    parsedMessages = rawBody.messages
  }

  const body = BodySchema.parse({ messages: parsedMessages })
  let finalMessages: ChatMessage[] = body.messages as ChatMessage[]

  if (fileBuffer && fileType && finalMessages.length > 0) {
    const lastUserMessage = finalMessages[finalMessages.length - 1]
    
    if (fileType === 'application/pdf') {
      try {
        const data = await pdf(fileBuffer)
        lastUserMessage.content = `${lastUserMessage.content}\n\n[Isi Lampiran Dokumen/CV]:\n${data.text}`
      } catch (err) {
        throw createError({ statusCode: 400, message: 'Gagal membaca PDF. Pastikan file valid.' })
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
