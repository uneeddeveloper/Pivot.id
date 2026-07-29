import type { RowDataPacket } from 'mysql2/promise'
import type { Role, RoleField, Skill, SkillCategory } from '../../types/career'
import type { GigCategory, GigChannel, MicroGig } from '../../types/gigs'

/**
 * Pembacaan katalog keterampilan, peran kerja, & micro-gig dari MySQL.
 *
 * Katalog jarang berubah tapi dibaca hampir di setiap permintaan, jadi hasilnya
 * ditahan sebentar di memori proses. TTL-nya pendek supaya perubahan yang kamu
 * lakukan langsung di database terlihat tanpa perlu me-restart server.
 */

const CACHE_TTL_MS = 60_000

interface CatalogCache {
  skills?: { value: Skill[]; expires: number }
  roles?: { value: RoleWithQuery[]; expires: number }
  gigs?: { value: MicroGig[]; expires: number }
}

export interface RoleWithQuery extends Role {
  /** Kata kunci yang dikirim ke Google Jobs untuk peran ini. */
  searchQuery: string
}

const CACHE_KEY = Symbol.for('rintisulang.catalog.cache')

function cache(): CatalogCache {
  const holder = globalThis as unknown as { [CACHE_KEY]?: CatalogCache }
  holder[CACHE_KEY] ??= {}
  return holder[CACHE_KEY]
}

interface SkillRow extends RowDataPacket {
  id: string
  label: string
  category: string
  aliases: string | null
}

export async function loadSkills(): Promise<Skill[]> {
  const store = cache()
  if (store.skills && store.skills.expires > Date.now()) return store.skills.value

  // Alias digabung di sisi MySQL supaya tidak ada N+1 query per keterampilan.
  const rows = await query<SkillRow>(
    `SELECT s.id, s.label, s.category,
            GROUP_CONCAT(a.alias SEPARATOR '\\n') AS aliases
       FROM skills s
       LEFT JOIN skill_aliases a ON a.skill_id = s.id
      GROUP BY s.id, s.label, s.category, s.sort_order
      ORDER BY s.sort_order, s.label`,
  )

  const skills: Skill[] = rows.map((row) => ({
    id: row.id,
    label: row.label,
    category: row.category as SkillCategory,
    aliases: row.aliases ? row.aliases.split('\n').filter(Boolean) : [],
  }))

  store.skills = { value: skills, expires: Date.now() + CACHE_TTL_MS }
  return skills
}

interface RoleRow extends RowDataPacket {
  id: string
  title: string
  field: string
  salary_min: number
  salary_typical: number
  entry_friendly: number
  remote_friendly: number
  time_to_entry: string
  description: string
  search_query: string
  skills: string | null
}

export async function loadRoles(): Promise<RoleWithQuery[]> {
  const store = cache()
  if (store.roles && store.roles.expires > Date.now()) return store.roles.value

  const rows = await query<RoleRow>(
    `SELECT r.id, r.title, r.field, r.salary_min, r.salary_typical,
            r.entry_friendly, r.remote_friendly, r.time_to_entry,
            r.description, r.search_query,
            GROUP_CONCAT(rs.skill_id ORDER BY rs.sort_order SEPARATOR ',') AS skills
       FROM roles r
       LEFT JOIN role_skills rs ON rs.role_id = r.id
      GROUP BY r.id, r.title, r.field, r.salary_min, r.salary_typical,
               r.entry_friendly, r.remote_friendly, r.time_to_entry,
               r.description, r.search_query, r.sort_order
      ORDER BY r.sort_order, r.title`,
  )

  const roles: RoleWithQuery[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    field: row.field as RoleField,
    salaryMin: Number(row.salary_min),
    salaryTypical: Number(row.salary_typical),
    entryFriendly: row.entry_friendly === 1,
    remoteFriendly: row.remote_friendly === 1,
    timeToEntry: row.time_to_entry,
    description: row.description,
    skills: row.skills ? row.skills.split(',').filter(Boolean) : [],
    searchQuery: row.search_query,
  }))

  store.roles = { value: roles, expires: Date.now() + CACHE_TTL_MS }
  return roles
}

interface GigRow extends RowDataPacket {
  id: string
  title: string
  category: string
  earn_min: number
  earn_max: number
  unit: string
  hours_per_unit: string | number
  max_units_per_week: number
  days_to_first_pay: number
  startup_cost: number
  remote_friendly: number
  description: string
  how_to_start: string
  caution: string
  skills: string | null
  /** Array JSON dari MySQL. Lihat catatan di loadGigs(). */
  channels: unknown
}

/**
 * Katalog micro-gig beserta keterampilan dan kanal pencarian kerjanya.
 *
 * Tiga tabel digabung di satu query supaya menampilkan halaman /gigs tidak
 * berubah jadi satu query per gig.
 *
 * Kanal diambil sebagai JSON lewat JSON_ARRAYAGG, bukan GROUP_CONCAT dengan
 * pemisah karakter: nama kanal dan kata kunci pencarian ditulis manusia dan
 * boleh memuat tanda baca apa pun, termasuk karakter yang akan dipakai sebagai
 * pemisah. JSON tidak punya masalah itu.
 */
export async function loadGigs(): Promise<MicroGig[]> {
  const store = cache()
  if (store.gigs && store.gigs.expires > Date.now()) return store.gigs.value

  const rows = await query<GigRow>(
    `SELECT g.id, g.title, g.category, g.earn_min, g.earn_max, g.unit,
            g.hours_per_unit, g.max_units_per_week,
            g.days_to_first_pay, g.startup_cost,
            g.remote_friendly, g.description, g.how_to_start, g.caution,
            (SELECT GROUP_CONCAT(gs.skill_id ORDER BY gs.sort_order SEPARATOR ',')
               FROM gig_skills gs WHERE gs.gig_id = g.id) AS skills,
            (SELECT JSON_ARRAYAGG(
                      JSON_OBJECT('name', gc.name,
                                  'searchQuery', gc.search_query,
                                  'kind', gc.kind,
                                  'order', gc.sort_order))
               FROM gig_channels gc WHERE gc.gig_id = g.id) AS channels
       FROM gigs g
      ORDER BY g.sort_order, g.title`,
  )

  const gigs: MicroGig[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category as GigCategory,
    earnMin: Number(row.earn_min),
    earnMax: Number(row.earn_max),
    unit: row.unit,
    // DECIMAL dikembalikan mysql2 sebagai string supaya presisinya tidak hilang.
    hoursPerUnit: Number(row.hours_per_unit),
    maxUnitsPerWeek: Number(row.max_units_per_week),
    daysToFirstPay: Number(row.days_to_first_pay),
    startupCost: Number(row.startup_cost),
    remoteFriendly: row.remote_friendly === 1,
    description: row.description,
    howToStart: row.how_to_start,
    caution: row.caution,
    skills: row.skills ? row.skills.split(',').filter(Boolean) : [],
    channels: parseChannels(row.channels),
  }))

  store.gigs = { value: gigs, expires: Date.now() + CACHE_TTL_MS }
  return gigs
}

/**
 * `JSON_ARRAYAGG` tidak menjamin urutan, jadi urutannya dibawa di field `order`
 * dan dipulihkan di sini. mysql2 mem-parse kolom JSON sendiri, tapi sebagian
 * versi driver menyerahkannya sebagai string — keduanya ditangani, sama seperti
 * `red_flags` di jobRepository.
 */
function parseChannels(raw: unknown): GigChannel[] {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []

  return value
    .filter(
      (item): item is { name: string; searchQuery: string; kind?: string; order?: number } =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { name?: unknown }).name === 'string' &&
        typeof (item as { searchQuery?: unknown }).searchQuery === 'string',
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item) => ({
      name: item.name,
      searchQuery: item.searchQuery,
      kind: item.kind || 'platform',
    }))
}

/**
 * Ubah kegagalan pembacaan katalog jadi error 503 yang bisa ditindaklanjuti.
 *
 * KENAPA INI ADA
 *   Route LLM (`career/interview`, `cv/ats`, `roadmap/generate`) membaca katalog
 *   di luar blok `try` mereka. Saat MySQL tidak bisa dihubungi — mis. deployment
 *   yang variabel `MYSQL_*`-nya belum diisi sehingga jatuh ke `127.0.0.1` —
 *   error mentahnya lolos sebagai **500 tanpa penjelasan**, dan user cuma
 *   melihat "Internal Server Error" di tengah percakapan.
 *
 *   Seluruh route wajib melewatkan kegagalan katalog lewat fungsi ini supaya
 *   yang sampai ke user adalah kalimat yang menyebut penyebabnya, seperti
 *   kegagalan LLM dan SerpApi yang sudah lebih dulu ditangani begitu.
 */
export function catalogUnavailableError(error: unknown, what = 'Katalog') {
  const message = error instanceof Error ? error.message : String(error)

  return createError({
    statusCode: 503,
    statusMessage: `${what} tidak bisa dibaca`,
    data: {
      message: message.includes('ECONNREFUSED')
        ? 'Database tidak bisa dihubungi. Pastikan MySQL berjalan lalu jalankan `npm run db:setup`. Kalau ini versi yang sudah di-deploy, periksa variabel MYSQL_* di pengaturan hosting-nya.'
        : message.includes("doesn't exist")
          ? 'Tabel katalog belum dibuat. Jalankan `npm run db:setup`.'
          : `Gagal membaca katalog: ${message}`,
    },
  })
}

/** Kosongkan cache — dipakai setelah katalog diubah lewat skrip seed. */
export function invalidateCatalogCache() {
  const store = cache()
  delete store.skills
  delete store.roles
  delete store.gigs
}
