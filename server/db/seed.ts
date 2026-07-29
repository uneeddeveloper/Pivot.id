/**
 * Mengisi tabel katalog (`skills`, `roles`, dan relasinya) dari `catalog-seed.ts`.
 *
 *   npm run db:seed
 *
 * Memakai upsert, jadi aman dijalankan ulang: baris yang sudah ada diperbarui,
 * bukan diduplikasi. Perubahan yang kamu buat langsung di database akan
 * tertimpa oleh nilai benih untuk id yang sama — itu memang disengaja supaya
 * `catalog-seed.ts` tetap bisa dipakai sebagai titik pulih.
 */

import mysql from 'mysql2/promise'
import { mysqlConfigFromEnv } from './config'
import { ROLE_SEED, SKILL_SEED } from './catalog-seed'

async function main() {
  const config = mysqlConfigFromEnv()
  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  })

  await conn.beginTransaction()

  try {
    // ── Keterampilan ────────────────────────────────────────────────────────
    for (const [index, skill] of SKILL_SEED.entries()) {
      await conn.execute(
        `INSERT INTO skills (id, label, category, sort_order)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           label = VALUES(label),
           category = VALUES(category),
           sort_order = VALUES(sort_order)`,
        [skill.id, skill.label, skill.category, index],
      )

      // Alias ditulis ulang seluruhnya supaya alias yang dihapus dari benih
      // ikut hilang dari database — kalau tidak, kata kunci lama terus
      // memicu deteksi palsu saat membaca CV.
      await conn.execute('DELETE FROM skill_aliases WHERE skill_id = ?', [skill.id])
      for (const alias of skill.aliases) {
        await conn.execute(
          'INSERT IGNORE INTO skill_aliases (skill_id, alias) VALUES (?, ?)',
          [skill.id, alias.toLowerCase()],
        )
      }
    }
    console.log(`✓ ${SKILL_SEED.length} keterampilan`)

    // ── Peran kerja ─────────────────────────────────────────────────────────
    for (const [index, role] of ROLE_SEED.entries()) {
      await conn.execute(
        `INSERT INTO roles (
           id, title, field, salary_min, salary_typical,
           entry_friendly, remote_friendly, time_to_entry,
           description, search_query, sort_order
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           field = VALUES(field),
           salary_min = VALUES(salary_min),
           salary_typical = VALUES(salary_typical),
           entry_friendly = VALUES(entry_friendly),
           remote_friendly = VALUES(remote_friendly),
           time_to_entry = VALUES(time_to_entry),
           description = VALUES(description),
           search_query = VALUES(search_query),
           sort_order = VALUES(sort_order)`,
        [
          role.id,
          role.title,
          role.field,
          role.salaryMin,
          role.salaryTypical,
          role.entryFriendly ? 1 : 0,
          role.remoteFriendly ? 1 : 0,
          role.timeToEntry,
          role.description,
          role.searchQuery,
          index,
        ],
      )

      await conn.execute('DELETE FROM role_skills WHERE role_id = ?', [role.id])
      for (const [order, skillId] of role.skills.entries()) {
        await conn.execute(
          'INSERT IGNORE INTO role_skills (role_id, skill_id, sort_order) VALUES (?, ?, ?)',
          [role.id, skillId, order],
        )
      }
    }
    console.log(`✓ ${ROLE_SEED.length} peran kerja`)

    await conn.commit()
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    await conn.end()
  }

  console.log('\nKatalog siap. Jalankan `npm run dev` lalu buka /skill-gap.')
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error('\n✗ Seed gagal:', message)

  if (message.includes("doesn't exist")) {
    console.error('\n  Tabelnya belum dibuat. Jalankan dulu: npm run db:migrate')
  }

  process.exit(1)
})
