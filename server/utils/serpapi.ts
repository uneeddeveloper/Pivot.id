/**
 * Pencarian lowongan lewat engine `google_jobs` milik SerpApi.
 *
 * KENAPA SERPAPI, BUKAN SCRAPING GOOGLE SENDIRI
 *   Menarik halaman hasil Google secara langsung melanggar ToS-nya, mudah
 *   diblokir, dan strukturnya berubah tanpa pemberitahuan. SerpApi adalah
 *   perantara resmi yang mengembalikan data Google Jobs sudah terstruktur —
 *   lowongannya asli, berasal dari papan lowongan yang sungguh ada
 *   (JobStreet, Glints, Kalibrr, LinkedIn, dan lainnya).
 *
 * Custom Search JSON API milik Google sendiri tidak dipakai karena sudah
 * ditutup untuk pendaftar baru sejak 2025 dan dimatikan 1 Januari 2027.
 */

const ENDPOINT = 'https://serpapi.com/search.json'

/** Bentuk mentah satu lowongan sebagaimana dikembalikan SerpApi. */
export interface RawGoogleJob {
  title?: string
  company_name?: string
  location?: string
  /** Mis. "via Glints" — papan lowongan tempat iklan ini dimuat. */
  via?: string
  description?: string
  job_id?: string
  share_link?: string
  apply_options?: { title?: string; link?: string }[]
  extensions?: string[]
  detected_extensions?: {
    posted_at?: string
    schedule_type?: string
    work_from_home?: boolean
    salary?: string
    qualifications?: string
  }
  job_highlights?: { title?: string; items?: string[] }[]
}

interface SerpApiResponse {
  jobs_results?: RawGoogleJob[]
  error?: string
  search_metadata?: { status?: string }
}

/**
 * Sama seperti LlmUnavailableError: `message` untuk log server, `userMessage`
 * untuk ditampilkan. Balasan error SerpApi bisa memuat kembali kunci API yang
 * dikirim di query string, jadi jangan pernah meneruskan `message` ke browser.
 */
export class JobSearchUnavailableError extends Error {
  readonly userMessage: string

  constructor(
    message: string,
    readonly reason: 'no_api_key' | 'quota' | 'http_error' | 'timeout',
    userMessage?: string,
  ) {
    super(message)
    this.name = 'JobSearchUnavailableError'
    this.userMessage =
      userMessage ??
      {
        no_api_key: 'SERPAPI_KEY belum diisi di file .env.',
        quota: 'Kuota pencarian lowongan bulan ini sudah habis.',
        http_error: 'Layanan pencarian lowongan sedang tidak bisa dihubungi.',
        timeout: 'Layanan pencarian lowongan tidak menjawab tepat waktu.',
      }[reason]
  }
}

export function isJobSearchConfigured(): boolean {
  return Boolean(useRuntimeConfig().serpapi.apiKey)
}

export interface GoogleJobsQuery {
  /** Kata kunci, mis. "admin media sosial". */
  query: string
  /** Mis. "Jakarta, Indonesia". Kosong berarti pakai bawaan dari .env. */
  location?: string
  /** Hanya lowongan yang bisa dikerjakan dari rumah. */
  remoteOnly?: boolean
}

/**
 * Ambil lowongan dari Google Jobs.
 *
 * Satu panggilan = satu kuota SerpApi. Pemanggil wajib memeriksa cache di
 * `job_searches` lebih dulu — di paket gratis jatahnya cuma 250 per bulan.
 */
export async function fetchGoogleJobs(input: GoogleJobsQuery): Promise<RawGoogleJob[]> {
  const config = useRuntimeConfig().serpapi

  if (!config.apiKey) {
    throw new JobSearchUnavailableError('SERPAPI_KEY belum diisi di file .env', 'no_api_key')
  }

  const params = new URLSearchParams({
    engine: 'google_jobs',
    q: input.query,
    location: input.location || config.location,
    hl: config.hl,
    gl: config.gl,
    api_key: config.apiKey,
  })

  // `ltype=1` adalah filter "work from home" milik Google Jobs.
  if (input.remoteOnly) params.set('ltype', '1')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)

  let response: Response
  try {
    response = await fetch(`${ENDPOINT}?${params.toString()}`, { signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new JobSearchUnavailableError('SerpApi tidak menjawab dalam 30 detik', 'timeout')
    }
    throw new JobSearchUnavailableError(
      `Gagal menghubungi SerpApi: ${error instanceof Error ? error.message : String(error)}`,
      'http_error',
    )
  } finally {
    clearTimeout(timer)
  }

  if (response.status === 429) {
    throw new JobSearchUnavailableError(
      'Kuota pencarian SerpApi bulan ini sudah habis',
      'quota',
    )
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')

    const userMessage =
      response.status === 401
        ? 'SERPAPI_KEY ditolak. Periksa lagi kuncinya di file .env.'
        : `Layanan pencarian lowongan menolak permintaan (HTTP ${response.status}).`

    const error = new JobSearchUnavailableError(
      `SerpApi HTTP ${response.status}: ${body.slice(0, 200)}`,
      'http_error',
      userMessage,
    )
    console.error('[jobs:serpapi]', error.message)
    throw error
  }

  const payload = (await response.json()) as SerpApiResponse

  if (payload.error) {
    // SerpApi menyampaikan habisnya kuota lewat body, bukan status code.
    const quotaHit = /run out|exceeded|plan limit/i.test(payload.error)
    const error = new JobSearchUnavailableError(
      `SerpApi: ${payload.error}`,
      quotaHit ? 'quota' : 'http_error',
      quotaHit
        ? 'Kuota pencarian lowongan bulan ini sudah habis.'
        : 'Layanan pencarian lowongan mengembalikan error.',
    )
    console.error('[jobs:serpapi]', error.message)
    throw error
  }

  // Tidak ada hasil bukan error — kata kuncinya saja yang terlalu sempit.
  return payload.jobs_results ?? []
}

/** Ambil tautan lamaran terbaik: yang pertama biasanya papan aslinya. */
export function pickApplyUrl(job: RawGoogleJob): string {
  const direct = job.apply_options?.find((option) => option.link)?.link
  return direct || job.share_link || ''
}

/** "via Glints" → "Glints". */
export function cleanSource(via: string | undefined): string {
  return (via ?? '').replace(/^via\s+/i, '').trim()
}
