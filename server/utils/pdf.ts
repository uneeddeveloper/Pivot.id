/**
 * Ekstraksi teks dari PDF.
 *
 * Ada DUA jebakan di balik modul kecil ini, dan keduanya pernah menjatuhkan
 * produksi:
 *
 * 1. `pdf-parse` v2 adalah tulis ulang total. Tidak ada lagi default export
 *    yang bisa dipanggil sebagai fungsi — yang tersedia hanya kelas
 *    `PDFParse`. Pemakaian gaya v1 (`pdf(buffer)`) SELALU melempar
 *    "not a function", jadi setiap unggahan PDF pasti gagal.
 *
 * 2. `pdf-parse` menarik `pdfjs-dist`, yang saat diimpor mencoba memuat
 *    `@napi-rs/canvas` untuk mem-polyfill DOMMatrix. Kalau paket native itu
 *    tidak ada, impornya melempar `ReferenceError: DOMMatrix is not defined`
 *    — dan karena dulu impornya statis di puncak berkas route, SELURUH route
 *    balas 500 bahkan untuk permintaan yang tidak membawa PDF sama sekali.
 *    Itulah 500 di Vercel yang tidak pernah terlihat di lokal, karena di
 *    lokal `@napi-rs/canvas` memang ada di node_modules.
 *
 * Impor di sini sengaja DINAMIS supaya kegagalan memuat pustaka PDF hanya
 * merugikan permintaan yang benar-benar mengunggah PDF. Supaya paket
 * native-nya ikut terbawa ke bundel serverless, lihat `nitro.externals`
 * di nuxt.config.ts — impor dinamis saja tidak cukup.
 */

/** Batas aman isi PDF sebelum masuk prompt, supaya konteks model tidak jebol. */
export const MAX_PDF_CHARS = 20_000

/** Gagal membaca PDF, dengan kalimat yang aman ditampilkan ke user. */
export class PdfReadError extends Error {
  constructor(readonly userMessage: string, technical: string) {
    super(technical)
    this.name = 'PdfReadError'
  }
}

/**
 * Ambil teks dari PDF dan potong di `MAX_PDF_CHARS`.
 *
 * @throws {PdfReadError} kalau pustaka gagal dimuat, file rusak/terkunci, atau
 *   dokumennya tidak memuat lapisan teks (PDF hasil scan).
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  let PDFParse: typeof import('pdf-parse').PDFParse
  try {
    ({ PDFParse } = await import('pdf-parse'))
  } catch (error) {
    throw new PdfReadError(
      'Pembaca PDF sedang tidak bisa dipakai di server. Coba tempel isi CV-mu sebagai teks biasa.',
      `Gagal memuat pdf-parse: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const parser = new PDFParse({ data: buffer })
  let text: string
  try {
    text = (await parser.getText()).text
  } catch (error) {
    throw new PdfReadError(
      'Gagal membaca PDF. Pastikan filenya valid dan tidak terkunci password.',
      `getText gagal: ${error instanceof Error ? error.message : String(error)}`,
    )
  } finally {
    await parser.destroy().catch(() => {})
  }

  if (!text.trim()) {
    throw new PdfReadError(
      'PDF ini tidak memuat teks yang bisa dibaca — kemungkinan hasil scan. Coba unggah versi gambarnya.',
      'PDF tidak memiliki lapisan teks',
    )
  }

  return text.length > MAX_PDF_CHARS
    ? `${text.slice(0, MAX_PDF_CHARS)}\n\n[dokumen dipotong karena terlalu panjang]`
    : text
}
