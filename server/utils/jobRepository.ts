import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
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

    if (jobs.length > 0) {
      /**
       * Dulu tiap lowongan diupsert satu-satu (2 perjalanan bolak-balik ke
       * TiDB Cloud Singapura per lowongan). Untuk pencarian "seluruh
       * Indonesia" itu bisa puluhan lowongan × 2 round-trip berurutan —
       * gampang menembus batas 60 detik function Vercel di tengah transaksi.
       * Begitu Vercel mematikan function-nya, koneksi transaksi ikut putus
       * dan permintaan berikutnya jatuh dengan "Transaction not found" di
       * Prisma. Menaikkan timeout transaksi saja tidak menolong karena batas
       * 60 detik itu di level function, bukan di level transaksi.
       *
       * Solusinya: satu query INSERT ber-banyak-baris dengan
       * ON DUPLICATE KEY UPDATE, jumlah round-trip-nya tidak lagi tergantung
       * jumlah lowongan.
       */
      const now = new Date()
      const jobRows = jobs.map((job) =>
        Prisma.sql`(${job.externalId}, ${job.title}, ${job.company}, ${job.location}, ${job.isRemote}, ${job.employmentType}, ${job.salaryMin}, ${job.salaryMax}, ${job.salaryStated}, ${job.seniority}, ${job.description}, ${job.applyUrl}, ${job.source}, ${job.postedLabel}, ${identity.roleId}, ${job.qualityScore}, ${JSON.stringify(job.redFlags)}, ${job.isValid}, ${now}, ${now})`,
      )

      await tx.$executeRaw`
        INSERT INTO jobs (
          external_id, title, company, location, is_remote, employment_type,
          salary_min, salary_max, salary_stated, seniority, description, apply_url,
          source, posted_label, role_id, quality_score, red_flags, is_valid,
          first_seen_at, last_seen_at
        ) VALUES ${Prisma.join(jobRows)}
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          company = VALUES(company),
          location = VALUES(location),
          is_remote = VALUES(is_remote),
          employment_type = VALUES(employment_type),
          salary_min = VALUES(salary_min),
          salary_max = VALUES(salary_max),
          salary_stated = VALUES(salary_stated),
          seniority = VALUES(seniority),
          description = VALUES(description),
          apply_url = VALUES(apply_url),
          source = VALUES(source),
          posted_label = VALUES(posted_label),
          role_id = IF(VALUES(role_id) IS NOT NULL, VALUES(role_id), role_id),
          quality_score = VALUES(quality_score),
          red_flags = VALUES(red_flags),
          is_valid = VALUES(is_valid),
          last_seen_at = VALUES(last_seen_at)
      `

      // Satu SELECT untuk memetakan external_id -> id (bigint auto-increment
      // hanya ketahuan setelah baris benar-benar ada).
      const insertedJobs = await tx.job.findMany({
        where: { externalId: { in: jobs.map((job) => job.externalId) } },
        select: { id: true, externalId: true },
      })
      const idByExternalId = new Map(insertedJobs.map((row) => [row.externalId, row.id]))

      const resultRows: ReturnType<typeof Prisma.sql>[] = []
      for (const [position, job] of jobs.entries()) {
        const jobId = idByExternalId.get(job.externalId)
        if (jobId === undefined) continue // seharusnya tidak terjadi — dijaga demi keamanan tipe

        resultRows.push(Prisma.sql`(${searchId}, ${jobId}, ${position})`)
        jobIds.push(jobId)
        for (const skillId of job.skills) {
          skillLinks.push({ jobId, skillId })
        }
      }

      if (resultRows.length > 0) {
        await tx.$executeRaw`
          INSERT INTO job_search_results (search_id, job_id, position)
          VALUES ${Prisma.join(resultRows)}
          ON DUPLICATE KEY UPDATE position = VALUES(position)
        `
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
     * Batas bawaan Prisma 5 detik pas-pasan untuk TiDB Cloud di Singapura.
     * Sejak upsert lowongan dibundel jadi query ber-banyak-baris, transaksi
     * ini seharusnya beres dalam hitungan detik berapa pun jumlah
     * lowongannya — angka ini cuma jaring pengaman.
     */
    timeout: 30_000,
    maxWait: 10_000,
  })
}
