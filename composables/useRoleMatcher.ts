import type { Role, RoleMatch, Skill } from '~/types/career'

/**
 * Logika pencocokan peran kerja dengan kondisi user.
 *
 * PERUBAHAN PENTING
 * -----------------
 * Katalog SKILLS dan ROLES yang dulu ditulis sebagai konstanta di file ini
 * sekarang tinggal di MySQL. Sumbernya `stores/catalog.ts`, yang mengambilnya
 * lewat /api/catalog. File ini kembali ke tugas aslinya: perhitungan murni.
 *
 * ATURAN NON-NEGOTIABLE
 * ---------------------
 * Fungsi di sini tetap JavaScript murni tanpa satu pun panggilan jaringan.
 * Keterampilan yang dimiliki user tidak pernah keluar dari perangkat lewat
 * jalur ini. Jangan menambahkan `$fetch`, logging, atau analytics.
 *
 * Angka gaji di katalog adalah perkiraan gaji BERSIH bulanan pasar Indonesia
 * untuk level pemula–menengah. Dipakai sebagai ancar-ancar, bukan janji.
 */

/**
 * Cocokkan seluruh peran dengan Target Income dan keterampilan user.
 *
 * Peran yang belum menutup Target Income TIDAK dibuang — ditandai saja, supaya
 * user bisa melihatnya sebagai batu loncatan jangka pendek.
 */
export function matchRoles(
  roles: Role[],
  skills: Skill[],
  targetIncome: number,
  ownedSkillIds: string[],
): RoleMatch[] {
  const owned = new Set(ownedSkillIds)
  const byId = new Map(skills.map((skill) => [skill.id, skill]))

  return roles
    .map((role) => {
      const required = role.skills
        .map((id) => byId.get(id))
        .filter((skill): skill is Skill => skill !== undefined)

      const ownedSkills = required.filter((skill) => owned.has(skill.id))
      const missing = required.filter((skill) => !owned.has(skill.id))

      return {
        role,
        owned: ownedSkills,
        missing,
        coverage: required.length === 0 ? 0 : ownedSkills.length / required.length,
        meetsTarget: targetIncome <= 0 || role.salaryTypical >= targetIncome,
        gapToTarget: role.salaryTypical - targetIncome,
      }
    })
    .sort((a, b) => {
      if (a.meetsTarget !== b.meetsTarget) return a.meetsTarget ? -1 : 1
      if (b.coverage !== a.coverage) return b.coverage - a.coverage
      return b.role.salaryTypical - a.role.salaryTypical
    })
}

/**
 * Keterampilan yang paling sering muncul di peran-peran yang menutup Target
 * Income tapi belum dikuasai user — jadi bahan roadmap di Tahap 3.
 */
export function topSkillGaps(matches: RoleMatch[], limit = 6): { skill: Skill; roles: number }[] {
  const tally = new Map<string, { skill: Skill; roles: number }>()

  for (const match of matches) {
    if (!match.meetsTarget) continue
    for (const skill of match.missing) {
      const entry = tally.get(skill.id) ?? { skill, roles: 0 }
      entry.roles += 1
      tally.set(skill.id, entry)
    }
  }

  return Array.from(tally.values())
    .sort((a, b) => b.roles - a.roles)
    .slice(0, limit)
}

export function useRoleMatcher() {
  return { matchRoles, topSkillGaps }
}
