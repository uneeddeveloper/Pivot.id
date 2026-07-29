import { defineStore } from 'pinia'
import type { Role, RoleField, Skill, SkillCategory } from '~/types/career'

/**
 * Katalog keterampilan & peran kerja yang dibaca dari MySQL lewat /api/catalog.
 *
 * Berbeda dari `stores/financial` dan `stores/career`, isi store ini BUKAN data
 * pribadi — ini katalog publik yang sama untuk semua orang. Karena itu boleh
 * diambil dari server, boleh di-cache, dan boleh ikut render di sisi server.
 */

interface CatalogState {
  skills: Skill[]
  roles: Role[]
  loading: boolean
  loaded: boolean
  /** Pesan siap tampil bila katalog gagal dibaca, mis. MySQL belum jalan. */
  error: string
}

export const useCatalogStore = defineStore('catalog', {
  state: (): CatalogState => ({
    skills: [],
    roles: [],
    loading: false,
    loaded: false,
    error: '',
  }),

  getters: {
    skillMap: (state): Map<string, Skill> =>
      new Map(state.skills.map((skill) => [skill.id, skill])),

    /**
     * Kategori diurutkan sesuai kemunculan pertamanya di data — yang berarti
     * mengikuti `sort_order` di database. Tidak ada daftar kategori hardcoded
     * di klien, jadi menambah kategori baru cukup lewat MySQL.
     */
    categories: (state): SkillCategory[] => [
      ...new Set(state.skills.map((skill) => skill.category)),
    ],

    fields: (state): RoleField[] => [...new Set(state.roles.map((role) => role.field))],

    byCategory(): { category: SkillCategory; skills: Skill[] }[] {
      return this.categories.map((category) => ({
        category,
        skills: this.skills.filter((skill) => skill.category === category),
      }))
    },

    roleMap: (state): Map<string, Role> => new Map(state.roles.map((role) => [role.id, role])),

    isEmpty: (state): boolean => state.loaded && state.skills.length === 0,
  },

  actions: {
    skillById(id: string): Skill | undefined {
      return this.skillMap.get(id)
    },

    /** Ubah daftar id jadi objek Skill, membuang id yang tidak dikenal. */
    resolveSkills(ids: string[]): Skill[] {
      return ids
        .map((id) => this.skillMap.get(id))
        .filter((skill): skill is Skill => skill !== undefined)
    },

    async load(force = false) {
      if (this.loading) return
      if (this.loaded && !force) return

      this.loading = true
      this.error = ''

      try {
        const data = await $fetch<{ skills: Skill[]; roles: Role[] }>('/api/catalog')
        this.skills = data.skills
        this.roles = data.roles
        this.loaded = true
      } catch (error) {
        const detail =
          typeof error === 'object' && error !== null && 'data' in error
            ? ((error as { data?: { data?: { message?: string } } }).data?.data?.message ?? '')
            : ''

        this.error =
          detail ||
          'Katalog tidak bisa dibaca. Pastikan MySQL berjalan dan `npm run db:setup` sudah dijalankan.'
      } finally {
        this.loading = false
      }
    },
  },
})
