import type { Skill } from '../types/career'

/**
 * Pencocokan keterampilan berbasis kata kunci.
 *
 * Dipakai di sisi server untuk memetakan deskripsi lowongan ke katalog
 * keterampilan, dan sebagai jaring pengaman saat LLM gagal merapikan lowongan.
 *
 * Ditaruh di `shared/` karena tidak boleh mengimpor apa pun dari Nuxt, Vue,
 * atau Node — JavaScript murni saja, supaya aman dipakai dari sisi mana pun.
 */

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Deteksi keterampilan dari sepotong teks bebas (CV atau deskripsi lowongan).
 *
 * Batas kata dibuat manual (bukan `\b`) karena istilah seperti `node.js` dan
 * `a/b testing` mengandung tanda baca — `\b` akan memotongnya di tempat yang
 * salah dan memicu kecocokan palsu.
 */
export function extractSkillIdsFromText(text: string, skills: Skill[]): string[] {
  if (!text.trim()) return []

  const haystack = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `
  const found = new Set<string>()

  for (const skill of skills) {
    const terms = [skill.label.toLowerCase(), ...skill.aliases]
    for (const term of terms) {
      const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`)
      if (pattern.test(haystack)) {
        found.add(skill.id)
        break
      }
    }
  }

  return Array.from(found)
}

/** Buang id yang tidak ada di katalog — LLM sesekali mengarang id baru. */
export function keepKnownSkillIds(ids: unknown, known: Set<string>): string[] {
  if (!Array.isArray(ids)) return []
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && known.has(id)))]
}
