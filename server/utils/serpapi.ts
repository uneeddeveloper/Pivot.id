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
  serpapi_pagination?: { next_page_token?: string }
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

/** SerpApi menandai "tidak ada hasil" lewat `error`, bukan lewat array kosong. */
const NO_RESULTS_PATTERN = /hasn't returned any results|no results/i

/**
 * Maksimum halaman yang disusuri untuk SATU titik lokasi. Google Jobs jarang
 * punya kedalaman lebih dari beberapa halaman untuk satu kueri, dan tiap
 * halaman = 1 kuota SerpApi (paket gratis 250/bulan) — angka ini sengaja
 * dibatasi supaya satu pencarian yang hasilnya banyak tidak diam-diam
 * menghabiskan jatah sebulan.
 */
const MAX_PAGES_PER_LOCATION = 3

interface GoogleJobsPage {
  jobs: RawGoogleJob[]
  nextPageToken: string | null
}

/** Ambil SATU halaman hasil. Dipakai internal oleh `fetchGoogleJobs`. */
async function fetchGoogleJobsPage(
  input: GoogleJobsQuery,
  nextPageToken?: string,
): Promise<GoogleJobsPage> {
  const config = useRuntimeConfig().serpapi

  if (!config.apiKey) {
    throw new JobSearchUnavailableError('SERPAPI_KEY belum diisi di file .env', 'no_api_key')
  }

  // `location` WAJIB diisi — dites langsung ke SerpApi: menghapus parameter
  // ini sama sekali membuat Google Jobs mengembalikan nol hasil ("Google
  // hasn't returned any results for this query"), bukan hasil yang lebih
  // luas. Engine ini tidak punya mode "cari di seluruh negara"; ia butuh titik
  // lokasi untuk mulai mencari sama sekali — lihat `fetchGoogleJobsNationwide`
  // untuk cara mendekati cakupan nasional yang sungguhan.
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
  if (nextPageToken) params.set('next_page_token', nextPageToken)

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
    // "Tidak ada hasil" BUKAN kegagalan layanan — kata kunci atau lokasinya
    // saja yang sempit. Membedakan ini penting terutama untuk pencarian
    // nasional: satu dari beberapa kota fan-out yang kebetulan nihil untuk
    // peran tertentu tidak boleh menggagalkan seluruh pencarian.
    if (NO_RESULTS_PATTERN.test(payload.error)) {
      return { jobs: [], nextPageToken: null }
    }

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

  return {
    jobs: payload.jobs_results ?? [],
    nextPageToken: payload.serpapi_pagination?.next_page_token ?? null,
  }
}

/**
 * Ambil lowongan dari Google Jobs untuk SATU titik lokasi, menyusuri sampai
 * `maxPages` halaman selama Google masih menyediakan halaman berikutnya.
 * Sebelumnya berhenti di halaman pertama apa pun jumlah hasilnya — sekarang
 * kalau hasilnya lebih banyak dari satu halaman, semuanya diambil sampai
 * batas amannya.
 *
 * Tiap halaman = 1 kuota SerpApi. Paket gratis jatahnya 250/bulan.
 */
export async function fetchGoogleJobs(
  input: GoogleJobsQuery,
  options: { maxPages?: number } = {},
): Promise<RawGoogleJob[]> {
  const maxPages = options.maxPages ?? MAX_PAGES_PER_LOCATION
  const jobs: RawGoogleJob[] = []
  let token: string | undefined

  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchGoogleJobsPage(input, token)
    jobs.push(...result.jobs)
    if (!result.nextPageToken) break
    token = result.nextPageToken
  }

  return jobs
}

/** ID kasar untuk dedup lintas kota — sejalan dengan `stableId` di jobNormalizer. */
function rawJobKey(job: RawGoogleJob): string {
  return job.job_id || `${job.title ?? ''}|${job.company_name ?? ''}|${job.location ?? ''}`
}

/**
 * Kota-kota besar dipakai sebagai titik fan-out saat user mengosongkan
 * lokasi ("cari se-Indonesia"). Google Jobs tidak punya mode "seluruh
 * negara" — location level-negara ("Indonesia") hanya mencocokkan lowongan
 * yang KEBETULAN ditandai persis begitu (segelintir), bukan seluruh lowongan
 * yang sungguh ada di negara ini. Mencari langsung ke kota-kota dengan
 * volume lowongan formal terbesar lalu menggabungkan hasilnya adalah
 * satu-satunya cara mendekati cakupan nasional yang sungguhan.
 *
 * Daftar ini sengaja pendek dan hanya mengambil SATU halaman per kota
 * (lihat pemanggilannya di `fetchGoogleJobsNationwide`) — tiap kota adalah
 * kuota SerpApi tambahan, dan paket gratisnya cuma 250/bulan.
 *
 * PENTING: nama kota polos saja, JANGAN ditambah ", Jawa Timur, Indonesia"
 * dsb. SerpApi memvalidasi `location` terhadap basis data lokasi kanonik
 * Google — string gabungan seperti itu dites langsung dan ditolak HTTP 400
 * ("Unsupported location") untuk semua kota di sini kecuali Jakarta, padahal
 * nama kota polos ("Surabaya", "Medan", dst.) valid dan masing-masing
 * mengembalikan hasil. `fetchGoogleJobsNationwide` diam-diam mengabaikan
 * kota yang gagal (lewat `Promise.allSettled`), jadi kesalahan format di
 * sini tidak error di UI — cuma bikin fan-out-nya diam-diam cuma jalan ke
 * satu kota. Kalau mau menambah kota baru, tes dulu string lokasinya
 * langsung ke SerpApi sebelum menaruhnya di sini.
 */
const NATIONWIDE_HUB_LOCATIONS = ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar']

export interface NationwideJobsResult {
  jobs: RawGoogleJob[]
  /** Kota yang gagal diambil (bukan yang nihil hasil — itu normal, bukan kegagalan). */
  failedLocations: string[]
}

/**
 * Pencarian "seluruh Indonesia": jalankan query yang sama di beberapa kota
 * besar sekaligus, gabungkan, dan buang duplikat (lowongan remote/nasional
 * sering muncul di lebih dari satu kota).
 *
 * Biaya kuota tetap: persis `NATIONWIDE_HUB_LOCATIONS.length` panggilan
 * SerpApi (satu halaman per kota), berapa pun jumlah hasilnya.
 */
export async function fetchGoogleJobsNationwide(
  input: Omit<GoogleJobsQuery, 'location'>,
): Promise<NationwideJobsResult> {
  const results = await Promise.allSettled(
    NATIONWIDE_HUB_LOCATIONS.map((location) =>
      fetchGoogleJobs({ ...input, location }, { maxPages: 1 }),
    ),
  )

  const seen = new Set<string>()
  const merged: RawGoogleJob[] = []
  const failedLocations: string[] = []

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') {
      // Dicatat, BUKAN dibuang diam-diam — kalau format lokasi salah lagi di
      // masa depan (lihat catatan di `NATIONWIDE_HUB_LOCATIONS`), ini yang
      // membuatnya kelihatan di UI, bukan cuma diam-diam mengecilkan cakupan.
      failedLocations.push(NATIONWIDE_HUB_LOCATIONS[index]!)
      return
    }
    for (const job of result.value) {
      const key = rawJobKey(job)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(job)
    }
  })

  // Satu-dua kota gagal (mis. timeout sesaat) tidak boleh menjatuhkan seluruh
  // pencarian nasional — hasil dari kota lain tetap dipakai. Hanya kalau
  // SEMUANYA gagal (mis. kuota SerpApi benar-benar habis) ini dianggap gagal.
  if (failedLocations.length === NATIONWIDE_HUB_LOCATIONS.length) {
    const firstRejection = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )
    const reason = firstRejection?.reason
    if (reason instanceof JobSearchUnavailableError) throw reason
    throw new JobSearchUnavailableError(
      `Pencarian nasional gagal total: ${String(reason)}`,
      'http_error',
    )
  }

  return { jobs: merged, failedLocations }
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
