import { createHash } from 'node:crypto'
import { prisma } from '../db/prisma'
import type { JobListing } from '../../types/jobs'
import type { NormalizedJob } from './jobNormalizer'

/**
 * Penyimpanan lowongan di database lewat Prisma Client.
 *
 * Perannya bukan sekadar arsip — tabel `job_searches` adalah rem yang menahan
 * pemanggilan SerpApi. Paket gratisnya hanya 250 pencarian per bulan, jadi
 * pencarian yang sama dalam rentang TTL wajib dilayani dari database.
 */

export interface SearchIdentity {
  query: string
  location: string
  remoteOnly: boolean
  roleId: string | null
}

export function hashSearch(identity: SearchIdentity): string {
  return createHash('sha256')
    .update(
      `${identity.query.trim().toLowerCase()}|${identity.location.trim().toLowerCase()}|${identity.remoteOnly ? 1 : 0}`,
    )
    .digest('hex')
}

/** Pencarian yang masih dalam masa segar, atau null bila perlu ambil ulang. */
export async function findFreshSearch(
  queryHash: string,
): Promise<{ id: bigint; fetchedAt: Date; rawCount: number } | null> {
  return prisma.jobSearch.findFirst({
    where: {
      queryHash,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, fetchedAt: true, rawCount: true },
  })
}

function toListing(
  job: {
    id: bigint
    title: string
    company: string
    location: string
    isRemote: boolean
    employmentType: string
    salaryMin: bigint
    salaryMax: bigint
    salaryStated: boolean
    seniority: string
    description: string | null
    applyUrl: string | null
    source: string
    postedAt: Date | null
    postedLabel: string
    roleId: string | null
    qualityScore: number
    redFlags: unknown
    skills: { skillId: string }[]
  },
): JobListing {
  let redFlags: string[] = []
  if (Array.isArray(job.redFlags)) {
    redFlags = job.redFlags.filter((flag): flag is string => typeof flag === 'string')
  } else if (typeof job.redFlags === 'string' && job.redFlags) {
    try {
      const parsed: unknown = JSON.parse(job.redFlags)
      if (Array.isArray(parsed)) {
        redFlags = parsed.filter((flag): flag is string => typeof flag === 'string')
      }
    } catch {
      redFlags = []
    }
  }

  return {
    id: Number(job.id),
    title: job.title,
    company: job.company,
    location: job.location,
    isRemote: job.isRemote,
    employmentType: job.employmentType,
    salaryMin: Number(job.salaryMin),
    salaryMax: Number(job.salaryMax),
    salaryStated: job.salaryStated,
    seniority: job.seniority,
    description: job.description ?? '',
    applyUrl: job.applyUrl ?? '',
    source: job.source,
    postedAt: job.postedAt ? job.postedAt.toISOString().split('T')[0] : null,
    postedLabel: job.postedLabel,
    roleId: job.roleId,
    qualityScore: job.qualityScore,
    redFlags,
    skills: job.skills.map((s) => s.skillId),
  }
}

const JOB_INCLUDE = {
  skills: { select: { skillId: true } },
} as const

/** Lowongan milik satu pencarian, urut sesuai posisi aslinya di Google. */
export async function loadJobsForSearch(searchId: number): Promise<JobListing[]> {
  const results = await prisma.jobSearchResult.findMany({
    where: { searchId: BigInt(searchId) },
    orderBy: { position: 'asc' },
    include: {
      job: { include: JOB_INCLUDE },
    },
  })
  return results.map((r) => toListing(r.job))
}

/**
 * Lowongan terbaru apa pun kata kuncinya.
 * Dipakai saat SerpApi tidak bisa dipanggil supaya halaman tetap ada isinya.
 */
export async function loadRecentJobs(limit = 40): Promise<JobListing[]> {
  const jobs = await prisma.job.findMany({
    where: { isValid: true },
    orderBy: { lastSeenAt: 'desc' },
    take: limit,
    include: JOB_INCLUDE,
  })
  return jobs.map(toListing)
}

async function upsertJob(job: NormalizedJob, roleId: string | null): Promise<bigint> {
  const result = await prisma.job.upsert({
    where: { externalId: job.externalId },
    create: {
      externalId: job.externalId,
      title: job.title,
      company: job.company,
      location: job.location,
      isRemote: job.isRemote,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryStated: job.salaryStated,
      seniority: job.seniority,
      description: job.description,
      applyUrl: job.applyUrl,
      source: job.source,
      postedLabel: job.postedLabel,
      roleId,
      qualityScore: job.qualityScore,
      redFlags: job.redFlags,
      isValid: job.isValid,
    },
    update: {
      title: job.title,
      company: job.company,
      location: job.location,
      isRemote: job.isRemote,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryStated: job.salaryStated,
      seniority: job.seniority,
      description: job.description,
      applyUrl: job.applyUrl,
      source: job.source,
      postedLabel: job.postedLabel,
      // Hanya isi roleId kalau ada nilainya (COALESCE-like behaviour)
      ...(roleId !== null ? { roleId } : {}),
      qualityScore: job.qualityScore,
      redFlags: job.redFlags,
      isValid: job.isValid,
      lastSeenAt: new Date(),
    },
    select: { id: true },
  })
  return result.id
}

/**
 * Simpan satu putaran pencarian: lowongannya, keterampilannya, dan catatan
 * pencarian itu sendiri. Seluruhnya dalam satu transaksi supaya tidak pernah
 * ada `job_searches` yang mengklaim segar padahal lowongannya gagal tersimpan.
 */
export async function saveSearch(
  identity: SearchIdentity,
  jobs: NormalizedJob[],
  ttlHours: number,
): Promise<number> {
  const queryHash = hashSearch(identity)
  const kept = jobs.filter((job) => job.isValid).length
  const expiresAt = new Date(Date.now() + ttlHours * 3_600_000)

  return prisma.$transaction(async (tx) => {
    // Upsert job_searches
    const search = await tx.jobSearch.upsert({
      where: { queryHash },
      create: {
        queryHash,
        query: identity.query.slice(0, 255),
        location: identity.location.slice(0, 120),
        remoteOnly: identity.remoteOnly,
        roleId: identity.roleId,
        rawCount: jobs.length,
        keptCount: kept,
        expiresAt,
      },
      update: {
        rawCount: jobs.length,
        keptCount: kept,
        roleId: identity.roleId,
        fetchedAt: new Date(),
        expiresAt,
      },
      select: { id: true },
    })

    const searchId = search.id

    // Hasil lama dilepas supaya lowongan yang sudah hilang dari Google tidak
    // ikut terbawa di pencarian berikutnya.
    await tx.jobSearchResult.deleteMany({ where: { searchId } })

    /** Pasangan job↔skill dikumpulkan dulu, ditulis sekali di akhir. */
    const jobIds: bigint[] = []
    const skillLinks: { jobId: bigint; skillId: string }[] = []

    for (const [position, job] of jobs.entries()) {
      const jobId = await tx.job.upsert({
        where: { externalId: job.externalId },
        create: {
          externalId: job.externalId,
          title: job.title,
          company: job.company,
          location: job.location,
          isRemote: job.isRemote,
          employmentType: job.employmentType,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryStated: job.salaryStated,
          seniority: job.seniority,
          description: job.description,
          applyUrl: job.applyUrl,
          source: job.source,
          postedLabel: job.postedLabel,
          roleId: identity.roleId,
          qualityScore: job.qualityScore,
          redFlags: job.redFlags,
          isValid: job.isValid,
        },
        update: {
          title: job.title,
          company: job.company,
          location: job.location,
          isRemote: job.isRemote,
          employmentType: job.employmentType,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryStated: job.salaryStated,
          seniority: job.seniority,
          description: job.description,
          applyUrl: job.applyUrl,
          source: job.source,
          postedLabel: job.postedLabel,
          ...(identity.roleId !== null ? { roleId: identity.roleId } : {}),
          qualityScore: job.qualityScore,
          redFlags: job.redFlags,
          isValid: job.isValid,
          lastSeenAt: new Date(),
        },
        select: { id: true },
      })

      await tx.jobSearchResult.upsert({
        where: { searchId_jobId: { searchId, jobId: jobId.id } },
        create: { searchId, jobId: jobId.id, position },
        update: { position },
      })

      jobIds.push(jobId.id)
      for (const skillId of job.skills) {
        skillLinks.push({ jobId: jobId.id, skillId })
      }
    }

    // Dulu tiap lowongan menghabiskan dua perjalanan sendiri untuk hapus+isi
    // ulang skill-nya. Digabung jadi dua perjalanan untuk seluruh batch.
    if (jobIds.length > 0) {
      await tx.jobSkill.deleteMany({ where: { jobId: { in: jobIds } } })
    }
    if (skillLinks.length > 0) {
      await tx.jobSkill.createMany({ data: skillLinks, skipDuplicates: true })
    }

    return Number(searchId)
  },
  {
    /**
     * Batas bawaan Prisma 5 detik terlalu pendek di sini: databasenya TiDB
     * Cloud di Singapura, dan satu batch bisa berisi puluhan lowongan yang
     * masing-masing masih butuh giliran upsert sendiri. Lewat 5 detik,
     * transaksinya ditutup dan query berikutnya jatuh dengan "Transaction not
     * found" — yang muncul di browser sebagai 500 di /api/jobs/search.
     */
    timeout: 30_000,
    maxWait: 10_000,
  })
}
