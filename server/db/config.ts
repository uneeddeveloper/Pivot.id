/**
 * Konfigurasi MySQL yang dibaca dari environment.
 *
 * File ini sengaja polos: tanpa impor Nuxt/Nitro sama sekali. Alasannya, modul
 * yang sama dipakai oleh dua dunia yang berbeda —
 *
 *   1. route di `server/api/**` yang jalan di dalam Nitro, dan
 *   2. skrip CLI `db:migrate` / `db:seed` yang jalan lewat `node --import tsx`,
 *      jauh di luar konteks Nuxt sehingga `useRuntimeConfig()` tidak ada.
 *
 * Kalau file ini mengimpor sesuatu dari Nuxt, skrip CLI-nya langsung mati.
 */

export interface MysqlConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  connectionLimit: number
}

export function mysqlConfigFromEnv(env: NodeJS.ProcessEnv = process.env): MysqlConfig {
  return {
    host: env.MYSQL_HOST || '127.0.0.1',
    port: Number(env.MYSQL_PORT || 3306),
    user: env.MYSQL_USER || 'root',
    password: env.MYSQL_PASSWORD || '',
    database: env.MYSQL_DATABASE || 'rintisulang',
    connectionLimit: Number(env.MYSQL_CONNECTION_LIMIT || 10),
  }
}
