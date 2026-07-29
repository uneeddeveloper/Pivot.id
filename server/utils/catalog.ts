import type { RowDataPacket } from 'mysql2/promise'
import type { Role, RoleField, Skill, SkillCategory } from '../../types/career'

/**
 * Pembacaan katalog keterampilan & peran kerja dari MySQL.
 *
 * Katalog jarang berubah tapi dibaca hampir di setiap permintaan, jadi hasilnya
 * ditahan sebentar di memori proses. TTL-nya pendek supaya perubahan yang kamu
 * lakukan langsung di database terlihat tanpa perlu me-restart server.
 */

const CACHE_TTL_MS = 60_000

interface CatalogCache {
  skills?: { value: Skill[]; expires: number }
  roles?: { value: RoleWithQuery[]; expires: number }
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

/** Kosongkan cache — dipakai setelah katalog diubah lewat skrip seed. */
export function invalidateCatalogCache() {
  const store = cache()
  delete store.skills
  delete store.roles
}
