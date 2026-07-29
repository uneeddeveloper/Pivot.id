import type { Role, Skill } from '../../types/career'

/**
 * GET /api/catalog
 *
 * Katalog keterampilan & peran kerja dari MySQL. Ini satu-satunya sumber data
 * untuk halaman /skill-gap; klien tidak lagi menyimpan salinan hardcoded.
 *
 * `searchQuery` sengaja tidak ikut dikirim — itu detail internal untuk
 * memanggil Google Jobs, tidak ada gunanya di browser.
 */
export default defineEventHandler(async (): Promise<{ skills: Skill[]; roles: Role[] }> => {
  try {
    const [skills, roles] = await Promise.all([loadSkills(), loadRoles()])

    return {
      skills,
      roles: roles.map(({ searchQuery: _searchQuery, ...role }) => role),
    }
  } catch (error) {
    throw catalogUnavailableError(error)
  }
})
