import { prisma } from '../db/prisma'
import type { Role, RoleField, Skill, SkillCategory } from '../../types/career'
import type { GigCategory, GigChannel, MicroGig } from '../../types/gigs'

/**
 * Pembacaan katalog keterampilan, peran kerja, & micro-gig dari database
 * lewat Prisma Client.
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
  return holder[CACHE_KEY]!
}

export async function loadSkills(): Promise<Skill[]> {
  const store = cache()
  if (store.skills && store.skills.expires > Date.now()) return store.skills.value

  const rows = await prisma.skill.findMany({
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    include: {
      aliases: {
        select: { alias: true },
      },
    },
  })

  const skills: Skill[] = rows.map((row) => ({
    id: row.id,
    label: row.label,
    category: row.category as SkillCategory,
    aliases: row.aliases.map((a) => a.alias),
  }))

  store.skills = { value: skills, expires: Date.now() + CACHE_TTL_MS }
  return skills
}

export async function loadRoles(): Promise<RoleWithQuery[]> {
  const store = cache()
  if (store.roles && store.roles.expires > Date.now()) return store.roles.value

  const rows = await prisma.role.findMany({
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    include: {
      skills: {
        orderBy: { sortOrder: 'asc' },
        select: { skillId: true },
      },
    },
  })

  const roles: RoleWithQuery[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    field: row.field as RoleField,
    salaryMin: Number(row.salaryMin),
    salaryTypical: Number(row.salaryTypical),
    entryFriendly: row.entryFriendly,
    remoteFriendly: row.remoteFriendly,
    timeToEntry: row.timeToEntry,
    description: row.description,
    skills: row.skills.map((s) => s.skillId),
    searchQuery: row.searchQuery,
  }))

  store.roles = { value: roles, expires: Date.now() + CACHE_TTL_MS }
  return roles
}

export async function loadGigs(): Promise<MicroGig[]> {
  const store = cache()
  if (store.gigs && store.gigs.expires > Date.now()) return store.gigs.value

  const rows = await prisma.gig.findMany({
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    include: {
      skills: {
        orderBy: { sortOrder: 'asc' },
        select: { skillId: true },
      },
      channels: {
        orderBy: { sortOrder: 'asc' },
        select: { name: true, searchQuery: true, kind: true },
      },
    },
  })

  const gigs: MicroGig[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category as GigCategory,
    earnMin: Number(row.earnMin),
    earnMax: Number(row.earnMax),
    unit: row.unit,
    hoursPerUnit: Number(row.hoursPerUnit),
    maxUnitsPerWeek: row.maxUnitsPerWeek,
    daysToFirstPay: row.daysToFirstPay,
    startupCost: Number(row.startupCost),
    remoteFriendly: row.remoteFriendly,
    description: row.description,
    howToStart: row.howToStart,
    caution: row.caution,
    skills: row.skills.map((s) => s.skillId),
    channels: row.channels.map(
      (c): GigChannel => ({
        name: c.name,
        searchQuery: c.searchQuery,
        kind: c.kind,
      }),
    ),
  }))

  store.gigs = { value: gigs, expires: Date.now() + CACHE_TTL_MS }
  return gigs
}

/**
 * Ubah kegagalan pembacaan katalog jadi error 503 yang bisa ditindaklanjuti.
 */
export function catalogUnavailableError(error: unknown, what = 'Katalog') {
  const message = error instanceof Error ? error.message : String(error)

  return createError({
    statusCode: 503,
    statusMessage: `${what} tidak bisa dibaca`,
    data: {
      message: message.includes('ECONNREFUSED') || message.includes("Can't reach database")
        ? 'Database tidak bisa dihubungi. Pastikan DATABASE_URL sudah diset dengan benar lalu jalankan `npm run db:setup`.'
        : message.includes("doesn't exist") || message.includes('does not exist')
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
