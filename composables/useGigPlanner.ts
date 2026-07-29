import type { GigMatch, GigPlan, GigPlanStep, MicroGig } from '~/types/gigs'

/**
 * Pencocokan micro-gig dengan kondisi user, dan penyusunan rencana yang
 * menutup kebutuhan uang jangka pendek.
 *
 * ATURAN NON-NEGOTIABLE
 * ---------------------
 * Seluruh fungsi di sini JavaScript murni tanpa satu pun panggilan jaringan —
 * sama seperti `useDebtCalculator` dan `useRoleMatcher`. Masukannya memuat
 * `need`, yang di halaman /gigs berasal dari cicilan yang jatuh tempo minggu
 * ini. Angka itu tidak boleh keluar dari perangkat. Jangan menambahkan
 * `$fetch`, logging, atau analytics ke file ini.
 *
 * KENAPA SELALU MEMAKAI TARIF TERENDAH
 * ------------------------------------
 * Rencana disusun dari `earnMin`, bukan rata-rata apalagi `earnMax`. Rencana
 * yang meleset ke atas hanya membuat user senang; rencana yang meleset ke bawah
 * membuat cicilannya telat. Yang menanggung selisih itu orang yang paling tidak
 * mampu menanggungnya, jadi angka yang dijanjikan harus yang paling konservatif
 * dan rentang atasnya ditampilkan terpisah sebagai kemungkinan, bukan janji.
 */

/** Berapa gig berbeda yang boleh masuk satu rencana. */
const MAX_PLAN_STEPS = 3

/**
 * Sumbangan minimal sebuah langkah SUSULAN terhadap kebutuhan.
 *
 * Tanpa ambang ini, sisa jam di ujung rencana terisi pekerjaan recehan —
 * "1× dropship, Rp 20.000" di bawah kebutuhan Rp 900.000. Secara aritmetika
 * benar, sebagai saran tidak berguna, dan membuat rencananya terlihat seperti
 * daftar acak. Langkah pertama tidak dikenai ambang: kalau memang cuma itu yang
 * muat, itu tetap jawaban yang jujur.
 */
const MIN_STEP_SHARE = 0.1

/**
 * Batas jam kerja per minggu yang masih masuk akal untuk disarankan
 * (8 jam × 7 hari). Lewat dari sini, menyuruh user "tambah jam lagi" bukan
 * saran — itu menyalahkan orang atas keadaan yang tidak bisa ia ubah.
 */
const MAX_WEEKLY_HOURS = 56

/**
 * Cocokkan seluruh gig dengan keterampilan user dan waktu yang ia punya.
 *
 * Gig yang keterampilannya belum dimiliki TIDAK dibuang. Berbeda dari lowongan
 * kerja tetap, sebagian besar micro-gig bisa dipelajari sambil jalan dalam
 * hitungan jam — yang dilakukan di sini hanya menaruh yang paling siap dikerjakan
 * di urutan atas.
 */
export function matchGigs(
  gigs: MicroGig[],
  ownedSkillIds: string[],
  need: number,
  hoursAvailable: number,
): GigMatch[] {
  const owned = new Set(ownedSkillIds)

  return gigs
    .map((gig) => {
      const ownedSkills = gig.skills.filter((id) => owned.has(id))
      const missing = gig.skills.filter((id) => !owned.has(id))

      const hoursPerUnit = Math.max(0.25, gig.hoursPerUnit)

      // Dua batas, dan yang paling ketat yang berlaku: jam yang dimiliki user,
      // dan berapa satuan yang realistis DIDAPAT dalam seminggu. Yang kedua
      // sering yang lebih ketat — 40 jam luang tidak berarti 80 pesanan datang.
      const maxUnits = Math.min(
        Math.floor(Math.max(0, hoursAvailable) / hoursPerUnit),
        Math.max(0, gig.maxUnitsPerWeek),
      )
      const unitsForNeed = need > 0 && gig.earnMin > 0 ? Math.ceil(need / gig.earnMin) : 0

      return {
        gig,
        owned: ownedSkills,
        missing,
        coverage: gig.skills.length === 0 ? 1 : ownedSkills.length / gig.skills.length,
        perHour: gig.earnMin / hoursPerUnit,
        potentialMin: maxUnits * gig.earnMin,
        potentialMax: maxUnits * gig.earnMax,
        unitsForNeed,
        hoursForNeed: unitsForNeed * hoursPerUnit,
        fitsAvailableHours: unitsForNeed > 0 && unitsForNeed <= maxUnits,
      }
    })
    .sort(compareMatches)
}

/**
 * Urutan yang dipakai di seluruh modul ini, dan alasan tiap tingkatnya:
 *
 *  1. **Modal nol lebih dulu.** User yang sedang terjerat utang bisa berutang
 *     lagi hanya untuk menutup modal awal. Gig bermodal tidak disembunyikan —
 *     hanya tidak boleh berada di puncak daftar.
 *  2. **Keterampilan yang sudah dimiliki.** Yang bisa dikerjakan hari ini
 *     mengalahkan yang bayarannya lebih besar tapi harus dipelajari dulu.
 *  3. **Bayaran per jam.** Baru di sini soal besar-kecilnya uang.
 *  4. **Kecepatan uang masuk.** Pemutus terakhir, dan yang paling menentukan
 *     saat ada tanggal jatuh tempo minggu ini.
 */
function compareMatches(a: GigMatch, b: GigMatch): number {
  const aFree = a.gig.startupCost === 0
  const bFree = b.gig.startupCost === 0
  if (aFree !== bFree) return aFree ? -1 : 1

  if (b.coverage !== a.coverage) return b.coverage - a.coverage
  if (b.perHour !== a.perHour) return b.perHour - a.perHour
  return a.gig.daysToFirstPay - b.gig.daysToFirstPay
}

/**
 * Urutan KANDIDAT RENCANA — sengaja berbeda dari urutan daftar di atas.
 *
 * Daftar menjawab "apa yang bisa kukerjakan"; rencana menjawab "bagaimana
 * menutup Rp sekian dengan jam yang kupunya". Batasannya jam, jadi yang
 * menentukan adalah **rupiah per jam**, bukan kecocokan keterampilan.
 *
 * Mengurutkan rencana dengan `compareMatches` menghasilkan saran yang buruk:
 * gig dengan kecocokan 100% tapi Rp 12.500/jam akan menghabiskan seluruh jam
 * user dan menutup kurang dari sepertiga kebutuhan, padahal ada gig Rp 50.000
 * per jam yang keterampilannya juga sudah ia punya sebagian.
 *
 * Modal nol tetap menang lebih dulu, dengan alasan yang sama seperti di daftar.
 */
function comparePlanCandidates(a: GigMatch, b: GigMatch): number {
  const aFree = a.gig.startupCost === 0
  const bFree = b.gig.startupCost === 0
  if (aFree !== bFree) return aFree ? -1 : 1

  if (b.perHour !== a.perHour) return b.perHour - a.perHour
  if (b.coverage !== a.coverage) return b.coverage - a.coverage
  return a.gig.daysToFirstPay - b.gig.daysToFirstPay
}

/**
 * Susun rencana yang menutup `need` dengan jam kerja yang tersedia.
 *
 * Kandidatnya dibatasi ke gig yang **setidaknya satu keterampilannya sudah
 * dimiliki** — selama ada. Tanpa batas itu, rencananya bisa menyuruh orang yang
 * cuma bisa Excel membuat landing page karena tarif per jamnya lebih tinggi.
 * Kalau user memang belum mengisi langkah 2, seluruh katalog dipakai; itu
 * keadaan yang berbeda, dan menyembunyikan semuanya justru tidak menolong.
 *
 * Pembagian berhenti begitu kebutuhan tertutup — rencananya sengaja pendek,
 * karena orang yang sedang tertekan tidak akan menjalankan daftar tujuh langkah.
 *
 * Kalau jam yang tersedia habis sebelum kebutuhan tertutup, hasilnya
 * `covered: false` beserta `extraHoursNeeded` — persis seperti simulasi utang
 * yang mengembalikan `feasible: false` beserta target yang bisa dikejar, bukan
 * sekadar vonis "tidak bisa".
 */
export function buildGigPlan(
  matches: GigMatch[],
  need: number,
  hoursAvailable: number,
): GigPlan {
  const familiar = matches.filter((match) => match.coverage > 0)
  const candidates = [...(familiar.length ? familiar : matches)].sort(comparePlanCandidates)

  const steps: GigPlanStep[] = []
  const minContribution = Math.max(0, need) * MIN_STEP_SHARE

  let remainingNeed = Math.max(0, need)
  let remainingHours = Math.max(0, hoursAvailable)

  for (const match of candidates) {
    if (remainingNeed <= 0 || steps.length >= MAX_PLAN_STEPS) break

    const { gig } = match
    const hoursPerUnit = Math.max(0.25, gig.hoursPerUnit)
    if (gig.earnMin <= 0 || hoursPerUnit > remainingHours) continue

    const unitsNeeded = Math.ceil(remainingNeed / gig.earnMin)
    const unitsAffordable = Math.floor(remainingHours / hoursPerUnit)
    // `maxUnitsPerWeek` ikut membatasi: rencananya harus bisa benar-benar
    // dijalankan, bukan sekadar muat di kolom jam.
    const units = Math.min(unitsNeeded, unitsAffordable, Math.max(0, gig.maxUnitsPerWeek))
    if (units <= 0) continue

    const earningsMin = units * gig.earnMin

    // Langkah susulan yang sumbangannya recehan hanya jadi kebisingan.
    if (steps.length > 0 && earningsMin < minContribution && earningsMin < remainingNeed) {
      continue
    }

    const hours = units * hoursPerUnit
    steps.push({
      gig,
      units,
      hours,
      earningsMin,
      earningsMax: units * gig.earnMax,
    })

    remainingNeed -= earningsMin
    remainingHours -= hours
  }

  const estimatedMin = steps.reduce((sum, step) => sum + step.earningsMin, 0)
  const estimatedMax = steps.reduce((sum, step) => sum + step.earningsMax, 0)
  const hoursUsed = steps.reduce((sum, step) => sum + step.hours, 0)
  const shortfall = Math.max(0, need - estimatedMin)
  const extraHoursNeeded = extraHoursFor(shortfall, steps, candidates)

  /**
   * Paling banyak yang bisa dihasilkan dalam seminggu kalau seluruh jatah
   * mingguan kandidat teratas benar-benar terisi — tanpa memandang jam. Kalau
   * kebutuhannya melewati angka ini, menambah jam tidak akan menolong, karena
   * yang membatasi bukan waktunya melainkan pekerjaan yang tersedia.
   */
  const weeklyCeiling = candidates
    .slice(0, MAX_PLAN_STEPS)
    .reduce((sum, match) => sum + Math.max(0, match.gig.maxUnitsPerWeek) * match.gig.earnMin, 0)

  return {
    steps,
    need,
    hoursAvailable,
    hoursUsed,
    estimatedMin,
    estimatedMax,
    covered: need > 0 && estimatedMin >= need,
    shortfall,
    extraHoursNeeded,
    beyondReach:
      shortfall > 0 &&
      (need > weeklyCeiling || hoursAvailable + extraHoursNeeded > MAX_WEEKLY_HOURS),
    fastestPayDays: steps.length
      ? Math.min(...steps.map((step) => step.gig.daysToFirstPay))
      : 0,
  }
}

/**
 * Berapa jam tambahan per minggu yang membuat rencananya menutup kebutuhan.
 *
 * Dihitung dari gig paling efisien yang sudah masuk rencana — kalau rencananya
 * masih kosong (jamnya tidak cukup bahkan untuk satu satuan), dipakai kandidat
 * paling efisien supaya angkanya tetap ada dan tetap jujur.
 */
function extraHoursFor(shortfall: number, steps: GigPlanStep[], candidates: GigMatch[]): number {
  if (shortfall <= 0) return 0

  const pool = steps.length
    ? steps.map((step) => step.gig)
    : candidates.slice(0, MAX_PLAN_STEPS).map((match) => match.gig)

  const best = pool.reduce<number>((rate, gig) => {
    const perHour = gig.earnMin / Math.max(0.25, gig.hoursPerUnit)
    return perHour > rate ? perHour : rate
  }, 0)

  if (best <= 0) return 0
  return Math.ceil(shortfall / best)
}

/**
 * Composable pembungkus, mengikuti pola `useDebtCalculator`. Fungsi di atas
 * juga tersedia lewat auto-import Nuxt.
 */
export function useGigPlanner() {
  return { matchGigs, buildGigPlan }
}
