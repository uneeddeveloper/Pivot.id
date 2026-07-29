import { createHash } from 'node:crypto'
import type { PoolConnection, RowDataPacket } from 'mysql2/promise'
import type { JobListing } from '../../types/jobs'
import type { NormalizedJob } from './jobNormalizer'

/**
 * Penyimpanan lowongan di MySQL.
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

interface SearchRow extends RowDataPacket {
  id: number
  fetched_at: Date
  raw_count: number
}

/** Pencarian yang masih dalam masa segar, atau null bila perlu ambil ulang. */
export async function findFreshSearch(queryHash: string): Promise<SearchRow | null> {
  return queryOne<SearchRow>(
    `SELECT id, fetched_at, raw_count
       FROM job_searches
      WHERE query_hash = ? AND expires_at > NOW()`,
    [queryHash],
  )
}

interface JobRow extends RowDataPacket {
  id: number
  title: string
  company: string
  location: string
  is_remote: number
  employment_type: string
  salary_min: number
  salary_max: number
  salary_stated: number
  seniority: string
  description: string | null
  apply_url: string | null
  source: string
  posted_at: string | null
  posted_label: string
  role_id: string | null
  quality_score: number
  red_flags: unknown
  skills: string | null
}

function toListing(row: JobRow): JobListing {
  // mysql2 mengembalikan kolom JSON sudah ter-parse, tapi versi/driver tertentu
  // memberikannya sebagai string. Tangani keduanya supaya tidak pernah crash.
  let redFlags: string[] = []
  if (Array.isArray(row.red_flags)) {
    redFlags = row.red_flags.filter((flag): flag is string => typeof flag === 'string')
  } else if (typeof row.red_flags === 'string' && row.red_flags) {
    try {
      const parsed: unknown = JSON.parse(row.red_flags)
      if (Array.isArray(parsed)) {
        redFlags = parsed.filter((flag): flag is string => typeof flag === 'string')
      }
    } catch {
      redFlags = []
    }
  }

  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    isRemote: row.is_remote === 1,
    employmentType: row.employment_type,
    salaryMin: Number(row.salary_min),
    salaryMax: Number(row.salary_max),
    salaryStated: row.salary_stated === 1,
    seniority: row.seniority,
    description: row.description ?? '',
    applyUrl: row.apply_url ?? '',
    source: row.source,
    postedAt: row.posted_at,
    postedLabel: row.posted_label,
    roleId: row.role_id,
    qualityScore: row.quality_score,
    redFlags,
    skills: row.skills ? row.skills.split(',').filter(Boolean) : [],
  }
}

const JOB_SELECT = `
  SELECT j.id, j.title, j.company, j.location, j.is_remote, j.employment_type,
         j.salary_min, j.salary_max, j.salary_stated, j.seniority,
         j.description, j.apply_url, j.source, j.posted_at, j.posted_label,
         j.role_id, j.quality_score, j.red_flags,
         GROUP_CONCAT(js.skill_id) AS skills
    FROM jobs j
    LEFT JOIN job_skills js ON js.job_id = j.id`

/** Lowongan milik satu pencarian, urut sesuai posisi aslinya di Google. */
export async function loadJobsForSearch(searchId: number): Promise<JobListing[]> {
  const rows = await query<JobRow>(
    `${JOB_SELECT}
      JOIN job_search_results r ON r.job_id = j.id
     WHERE r.search_id = ?
     GROUP BY j.id, r.position
     ORDER BY r.position`,
    [searchId],
  )
  return rows.map(toListing)
}

/**
 * Lowongan terbaru apa pun kata kuncinya.
 * Dipakai saat SerpApi tidak bisa dipanggil supaya halaman tetap ada isinya.
 */
export async function loadRecentJobs(limit = 40): Promise<JobListing[]> {
  const rows = await query<JobRow>(
    `${JOB_SELECT}
     WHERE j.is_valid = 1
     GROUP BY j.id
     ORDER BY j.last_seen_at DESC
     LIMIT ?`,
    [limit],
  )
  return rows.map(toListing)
}

async function upsertJob(
  conn: PoolConnection,
  job: NormalizedJob,
  roleId: string | null,
): Promise<number> {
  // `id = LAST_INSERT_ID(id)` membuat insertId tetap terisi id lama saat baris
  // sudah ada, sehingga satu query cukup untuk insert maupun update.
  const [result] = await conn.execute<import('mysql2/promise').ResultSetHeader>(
    `INSERT INTO jobs (
       external_id, title, company, location, is_remote, employment_type,
       salary_min, salary_max, salary_stated, seniority, description,
       apply_url, source, posted_label, role_id, quality_score, red_flags, is_valid
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id),
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
       role_id = COALESCE(VALUES(role_id), role_id),
       quality_score = VALUES(quality_score),
       red_flags = VALUES(red_flags),
       is_valid = VALUES(is_valid),
       last_seen_at = NOW()`,
    [
      job.externalId,
      job.title,
      job.company,
      job.location,
      job.isRemote ? 1 : 0,
      job.employmentType,
      job.salaryMin,
      job.salaryMax,
      job.salaryStated ? 1 : 0,
      job.seniority,
      job.description,
      job.applyUrl,
      job.source,
      job.postedLabel,
      roleId,
      job.qualityScore,
      JSON.stringify(job.redFlags),
      job.isValid ? 1 : 0,
    ],
  )

  return result.insertId
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

  return withTransaction(async (conn) => {
    await conn.execute(
      `INSERT INTO job_searches (
         query_hash, query, location, remote_only, role_id, provider,
         raw_count, kept_count, fetched_at, expires_at
       ) VALUES (?, ?, ?, ?, ?, 'serpapi_google_jobs', ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? HOUR))
       ON DUPLICATE KEY UPDATE
         id = LAST_INSERT_ID(id),
         raw_count = VALUES(raw_count),
         kept_count = VALUES(kept_count),
         role_id = VALUES(role_id),
         fetched_at = NOW(),
         expires_at = VALUES(expires_at)`,
      [
        queryHash,
        identity.query.slice(0, 255),
        identity.location.slice(0, 120),
        identity.remoteOnly ? 1 : 0,
        identity.roleId,
        jobs.length,
        kept,
        ttlHours,
      ],
    )

    const [searchRow] = await conn.query<RowDataPacket[]>(
      'SELECT id FROM job_searches WHERE query_hash = ?',
      [queryHash],
    )
    const searchId = Number((searchRow[0] as { id: number } | undefined)?.id)

    // Hasil lama dilepas supaya lowongan yang sudah hilang dari Google tidak
    // ikut terbawa di pencarian berikutnya. Baris `jobs`-nya sendiri tetap ada.
    await conn.execute('DELETE FROM job_search_results WHERE search_id = ?', [searchId])

    for (const [position, job] of jobs.entries()) {
      const jobId = await upsertJob(conn, job, identity.roleId)

      await conn.execute(
        `INSERT INTO job_search_results (search_id, job_id, position)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE position = VALUES(position)`,
        [searchId, jobId, position],
      )

      await conn.execute('DELETE FROM job_skills WHERE job_id = ?', [jobId])
      for (const skillId of job.skills) {
        await conn.execute(
          'INSERT IGNORE INTO job_skills (job_id, skill_id) VALUES (?, ?)',
          [jobId, skillId],
        )
      }
    }

    return searchId
  })
}
