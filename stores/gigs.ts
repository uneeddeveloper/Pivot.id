import { defineStore } from 'pinia'
import type { GigCategory, MicroGig } from '~/types/gigs'

/**
 * Katalog micro-gig yang dibaca dari MySQL lewat /api/gigs.
 *
 * Sama seperti `stores/catalog`, isinya BUKAN data pribadi — katalog ini sama
 * untuk semua orang. Yang bersifat pribadi (kebutuhan rupiah dan jam yang
 * tersedia) tidak pernah masuk ke store ini dan tidak pernah dikirim ke server;
 * lihat `composables/useGigPlanner.ts`.
 */

interface GigState {
  gigs: MicroGig[]
  loading: boolean
  loaded: boolean
  /** Pesan siap tampil bila katalog gagal dibaca, mis. MySQL belum jalan. */
  error: string
}

export const useGigStore = defineStore('gigs', {
  state: (): GigState => ({
    gigs: [],
    loading: false,
    loaded: false,
    error: '',
  }),

  getters: {
    /**
     * Kategori mengikuti urutan kemunculan pertamanya di data — yang berarti
     * mengikuti `sort_order` di database. Tidak ada daftar kategori hardcoded
     * di klien, jadi menambah kategori cukup lewat MySQL.
     */
    categories: (state): GigCategory[] => [...new Set(state.gigs.map((gig) => gig.category))],

    isEmpty: (state): boolean => state.loaded && state.gigs.length === 0,
  },

  actions: {
    async load(force = false) {
      if (this.loading) return
      if (this.loaded && !force) return

      this.loading = true
      this.error = ''

      try {
        const data = await $fetch<{ gigs: MicroGig[] }>('/api/gigs')
        this.gigs = data.gigs
        this.loaded = true
      } catch (error) {
        const detail =
          typeof error === 'object' && error !== null && 'data' in error
            ? ((error as { data?: { data?: { message?: string } } }).data?.data?.message ?? '')
            : ''

        this.error =
          detail ||
          'Katalog micro-gig tidak bisa dibaca. Pastikan MySQL berjalan dan `npm run db:setup` sudah dijalankan.'
      } finally {
        this.loading = false
      }
    },
  },
})
