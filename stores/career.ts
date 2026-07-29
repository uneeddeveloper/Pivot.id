import { defineStore } from 'pinia'
import type { RoleField } from '~/types/career'

/**
 * Store Skill Gap & Role Matching.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ PRIVASI — BACA SEBELUM MENGUBAH                                     │
 * │                                                                      │
 * │ Store ini SENGAJA tidak di-persist: tidak ada localStorage, tidak    │
 * │ ada plugin persist, dan tidak ada sinkronisasi ke database. Isinya    │
 * │ hilang begitu tab ditutup. Jangan menambahkan persistensi.           │
 * │                                                                      │
 * │ `background` adalah ringkasan latar belakang hasil percakapan dengan │
 * │ AI di langkah 2. Prompt-nya melarang menyertakan nama, alamat, atau   │
 * │ kontak — tapi jangan pernah menganggap larangan itu pasti dipatuhi.   │
 * │ Perlakukan isinya sebagai data pribadi.                              │
 * │                                                                      │
 * │ Cerita user sendiri dikirim ke POST /api/career/interview untuk       │
 * │ dibaca, lalu dilupakan: tidak ditulis ke MySQL, tidak di-cache, dan   │
 * │ tidak masuk log. Riwayat percakapannya hidup di komponen SkillChat    │
 * │ saja, bukan di store ini.                                            │
 * │                                                                      │
 * │ `ownedSkills` boleh dikirim ke server (roadmap, CV ATS, pencocokan    │
 * │ lowongan) — isinya id katalog publik, bukan identitas.               │
 * └──────────────────────────────────────────────────────────────────────┘
 */

interface CareerState {
  /** ID keterampilan yang diakui user. */
  ownedSkills: string[]
  /** Perkiraan lama pengalaman kerja (tahun), hasil percakapan di langkah 2. */
  experienceYears: number
  /** Ringkasan latar belakang tanpa identitas — bahan untuk CV ATS. */
  background: string
  /** Peran yang sedang dituju user; jadi konteks roadmap dan CV. */
  targetRoleId: string | null
  /** Filter bidang; `null` berarti semua bidang. */
  fieldFilter: RoleField | null
  /** Sembunyikan peran yang gajinya belum menutup Target Income. */
  onlyMeetingTarget: boolean
}

export const useCareerStore = defineStore('career', {
  state: (): CareerState => ({
    ownedSkills: [],
    experienceYears: 0,
    background: '',
    targetRoleId: null,
    fieldFilter: null,
    onlyMeetingTarget: false,
  }),

  getters: {
    hasSkills: (state): boolean => state.ownedSkills.length > 0,
  },

  actions: {
    toggleSkill(id: string) {
      const index = this.ownedSkills.indexOf(id)
      if (index === -1) this.ownedSkills.push(id)
      else this.ownedSkills.splice(index, 1)
    },

    /** Tambahkan hasil bacaan AI tanpa menghapus pilihan manual user. */
    addSkills(ids: string[]) {
      for (const id of ids) {
        if (!this.ownedSkills.includes(id)) this.ownedSkills.push(id)
      }
    },

    setFieldFilter(field: RoleField | null) {
      this.fieldFilter = field
    },

    setTargetRole(roleId: string | null) {
      this.targetRoleId = roleId
    },

    reset() {
      this.$reset()
    },
  },
})
