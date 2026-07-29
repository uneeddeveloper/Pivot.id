/**
 * Membuat database beserta seluruh tabelnya.
 *
 *   npm run db:migrate
 *
 * Aman dijalankan berkali-kali: seluruh DDL memakai `IF NOT EXISTS`, jadi
 * menjalankan ulang tidak menghapus data yang sudah ada.
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { mysqlConfigFromEnv } from './config'

const here = dirname(fileURLToPath(import.meta.url))

async function main() {
  const config = mysqlConfigFromEnv()
  const schema = await readFile(join(here, 'schema.sql'), 'utf8')

  // Tahap 1 — sambung tanpa memilih database, supaya databasenya sendiri bisa
  // dibuat kalau memang belum ada.
  const root = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true,
  })

  await root.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.database}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  )
  console.log(`✓ database \`${config.database}\` siap`)
  await root.end()

  // Tahap 2 — jalankan DDL di dalam database tersebut.
  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    multipleStatements: true,
  })

  await conn.query(schema)
  const [tables] = await conn.query<mysql.RowDataPacket[]>('SHOW TABLES')
  await conn.end()

  console.log(`✓ ${tables.length} tabel siap dipakai`)
  console.log('\nLangkah berikutnya:  npm run db:seed')
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error('\n✗ Migrasi gagal:', message)

  if (message.includes('ECONNREFUSED')) {
    console.error(
      '\n  MySQL tidak menjawab di alamat yang dikonfigurasi.\n' +
        '  Pastikan servernya jalan (XAMPP/Laragon/MySQL service) dan\n' +
        '  MYSQL_HOST serta MYSQL_PORT di file .env sudah benar.',
    )
  } else if (message.includes('Access denied')) {
    console.error('\n  Kredensial ditolak. Periksa MYSQL_USER dan MYSQL_PASSWORD di .env.')
  }

  process.exit(1)
})
