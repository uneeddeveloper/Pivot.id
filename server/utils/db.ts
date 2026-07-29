import mysql from 'mysql2/promise'
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { mysqlConfigFromEnv, type MysqlConfig } from '../db/config'

/**
 * Pool koneksi MySQL bersama.
 *
 * Nitro memuat ulang modul saat hot-reload di mode dev. Kalau pool disimpan di
 * variabel modul biasa, tiap reload membuat pool baru sampai MySQL menolak
 * koneksi ("Too many connections"). Karena itu pool ditaruh di `globalThis`.
 */

const POOL_KEY = Symbol.for('rintisulang.mysql.pool')

interface PoolHolder {
  [POOL_KEY]?: Pool
}

export function getPool(config: MysqlConfig = mysqlConfigFromEnv()): Pool {
  const holder = globalThis as unknown as PoolHolder
  if (holder[POOL_KEY]) return holder[POOL_KEY]

  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: config.connectionLimit,
    waitForConnections: true,
    queueLimit: 0,
    charset: 'utf8mb4_unicode_ci',
    // Nominal gaji disimpan BIGINT. Tanpa opsi ini mysql2 mengembalikannya
    // sebagai string dan seluruh perbandingan angka di UI jadi salah.
    supportBigNumbers: true,
    bigNumberStrings: false,
    dateStrings: ['DATE'],
    timezone: 'Z',
  })

  holder[POOL_KEY] = pool
  return pool
}

/** SELECT yang mengembalikan banyak baris. */
export async function query<T extends RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await getPool().query<T[]>(sql, params)
  return rows
}

/** SELECT yang hanya butuh baris pertama. */
export async function queryOne<T extends RowDataPacket>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

/**
 * INSERT / UPDATE / DELETE.
 *
 * `params` di-cast karena tipe `ExecuteValues` bawaan mysql2 tidak menerima
 * `unknown[]`. Nilainya tetap lewat prepared statement, jadi cast ini murni
 * urusan tipe — bukan celah injeksi.
 */
export async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await getPool().execute<ResultSetHeader>(
    sql,
    params as Parameters<Pool['execute']>[1],
  )
  return result
}

/**
 * Jalankan sekumpulan query dalam satu transaksi.
 * Rollback otomatis kalau `fn` melempar error.
 */
export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await getPool().getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

/**
 * Cek apakah database bisa dihubungi. Dipakai `/api/health` supaya pesan error
 * yang sampai ke user menyebut penyebabnya, bukan sekadar "500".
 */
export async function pingDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    await query<RowDataPacket>('SELECT 1 AS ok')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
