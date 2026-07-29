<script setup lang="ts">
import { computed } from 'vue'
import { useCatalogStore } from '~/stores/catalog'
import type { GigMatch } from '~/types/gigs'

/**
 * Satu micro-gig.
 *
 * Susunan blok di kartu ini disengaja: peringatan (`caution`) selalu berada di
 * ATAS langkah pertama dan kanal pencarian. Sama seperti JobCard menaruh tanda
 * bahaya di atas angka gaji — user harus membaca risikonya sebelum tergerak
 * mengejar uangnya.
 *
 * Warna peringatannya memakai `attention-note` (krem tua) dan bukan merah
 * brand: risiko di sini bersifat "hati-hati soal ini", bukan "ini penipuan".
 * Merah brand disimpan untuk blok anti-penipuan di halaman, yang memang
 * setingkat lebih keras.
 */
const props = defineProps<{
  match: GigMatch
  /** Jam kerja per minggu yang user nyatakan tersedia. 0 = belum diisi. */
  hoursAvailable: number
}>()

const catalog = useCatalogStore()

const gig = computed(() => props.match.gig)

const earnLabel = computed(() =>
  gig.value.earnMin === gig.value.earnMax
    ? formatIDR(gig.value.earnMin)
    : `${formatIDR(gig.value.earnMin)} – ${formatIDR(gig.value.earnMax)}`,
)

const payLabel = computed(() => {
  const days = gig.value.daysToFirstPay
  if (days <= 1) return 'Uang bisa masuk hari yang sama'
  if (days <= 7) return `Uang masuk ± ${days} hari`
  if (days <= 30) return `Uang masuk ± ${Math.round(days / 7)} minggu`
  return 'Uang masuk ± 1 bulan'
})

/** Modal nol adalah pembeda paling penting bagi user yang sedang terjerat utang. */
const capitalLabel = computed(() =>
  gig.value.startupCost === 0 ? 'Tanpa modal' : `Modal ± ${formatIDR(gig.value.startupCost)}`,
)

const ownedSkills = computed(() => catalog.resolveSkills(props.match.owned))
const missingSkills = computed(() => catalog.resolveSkills(props.match.missing))
const coveragePercent = computed(() => Math.round(props.match.coverage * 100))

/** Jam kerja ditulis "1,5 jam", bukan "1.5 jam". */
function hours(value: number): string {
  return `${formatNumber(Math.round(value * 10) / 10)} jam`
}

const channelIcons: Record<string, string> = {
  // Jendela aplikasi
  platform: 'M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5v-9Zm1.5 0v2h11v-2h-11Z',
  // Dua orang
  komunitas: 'M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2 16a5 5 0 0 1 10 0v.5H2V16Zm11.2.5H18V16a3.5 3.5 0 0 0-5.2-3.05c.6.86.95 1.9.95 3.05v.5Z',
  // Pintu / ketuk langsung
  langsung: 'M6 3.5A1.5 1.5 0 0 1 7.5 2h5A1.5 1.5 0 0 1 14 3.5v13a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 6 16.5v-13Zm5.5 6.5a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z',
}

/**
 * Kanal disimpan sebagai kata kunci, bukan URL — alasannya sama dengan sumber
 * belajar di roadmap: tautan platform berpindah, kata kunci tidak. UI-nya yang
 * mengubah kata kunci itu jadi pencarian yang hidup.
 */
function searchLink(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
</script>

<template>
  <article class="surface-card flex flex-col rounded-2xl border border-ink-200/80 p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="font-semibold text-ink-900">{{ gig.title }}</h3>
        <p class="mt-1 text-xs text-ink-400">{{ gig.category }}</p>
      </div>

      <span
        v-if="gig.startupCost === 0"
        class="flex shrink-0 items-center gap-1.5 rounded-full border border-sage-300 bg-sage-50 px-2.5 py-1 text-xs font-medium text-sage-800"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
            clip-rule="evenodd"
          />
        </svg>
        Tanpa modal
      </span>
      <span
        v-else
        class="shrink-0 rounded-full border border-cream-400 bg-cream-200 px-2.5 py-1 text-xs font-medium text-ink-700"
      >
        {{ capitalLabel }}
      </span>
    </div>

    <!-- Bayaran -->
    <div class="mt-4">
      <p class="text-lg font-semibold tabular-nums text-ink-900">
        {{ earnLabel }}
        <span class="text-xs font-normal text-ink-400">{{ gig.unit }}</span>
      </p>
      <p class="mt-1 text-xs text-ink-500">
        ± {{ hours(gig.hoursPerUnit) }} kerja · setara
        <strong class="font-semibold text-ink-700 tabular-nums">
          {{ formatIDR(Math.round(match.perHour)) }}
        </strong>
        per jam
      </p>
    </div>

    <p class="mt-3 text-sm leading-relaxed text-ink-600">{{ gig.description }}</p>

    <!-- Perkiraan hasil dengan waktu yang benar-benar dimiliki user -->
    <div
      v-if="hoursAvailable > 0 && match.potentialMin > 0"
      class="mt-4 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2.5"
    >
      <p class="text-xs text-sage-700">
        Dengan {{ hours(hoursAvailable) }} seminggu, kira-kira
      </p>
      <p class="mt-0.5 text-sm font-semibold tabular-nums text-sage-800">
        {{ formatIDR(match.potentialMin) }} – {{ formatIDR(match.potentialMax) }}
        <span class="font-normal text-sage-700">/ minggu</span>
      </p>
      <!--
        Yang membatasi micro-gig biasanya permintaan, bukan waktu luang.
        Menyebut jatah mingguannya menjaga angka di atas tetap terbaca sebagai
        perkiraan yang wajar, bukan hasil bagi jam kerja belaka.
      -->
      <p class="mt-1 text-[11px] leading-relaxed text-sage-700/90">
        Realistis untuk pemula: sekitar {{ gig.maxUnitsPerWeek }}× {{ gig.unit }} per minggu.
      </p>
    </div>

    <!-- Cakupan keterampilan — bentuknya sengaja sama dengan JobCard -->
    <div v-if="gig.skills.length" class="mt-4">
      <div class="flex items-baseline justify-between gap-3">
        <p class="text-xs text-ink-500">
          Keterampilan terpenuhi
          <span class="tabular-nums">{{ match.owned.length }}/{{ gig.skills.length }}</span>
        </p>
        <p class="text-xs font-semibold tabular-nums text-ink-700">{{ coveragePercent }}%</p>
      </div>
      <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-sage-100">
        <div
          class="h-full rounded-full bg-sage-500 transition-all duration-500 ease-out"
          :style="{ width: `${coveragePercent}%` }"
        />
      </div>

      <div class="mt-3 space-y-2">
        <div v-if="ownedSkills.length" class="flex flex-wrap items-center gap-1.5">
          <span class="mr-0.5 text-xs text-ink-400">Sudah ada:</span>
          <span
            v-for="skill in ownedSkills"
            :key="skill.id"
            class="rounded-full border border-sage-200 bg-sage-50 px-2 py-0.5 text-[11px] text-sage-800"
          >
            {{ skill.label }}
          </span>
        </div>
        <div v-if="missingSkills.length" class="flex flex-wrap items-center gap-1.5">
          <span class="mr-0.5 text-xs text-ink-400">Perlu dipelajari:</span>
          <span
            v-for="skill in missingSkills"
            :key="skill.id"
            class="rounded-full border border-dashed border-ink-300 px-2 py-0.5 text-[11px] text-ink-600"
          >
            {{ skill.label }}
          </span>
        </div>
      </div>
    </div>

    <!-- Peringatan selalu di atas ajakan bertindak. -->
    <p class="attention-note mt-4 text-xs leading-relaxed">{{ gig.caution }}</p>

    <details class="group/detail mt-3">
      <summary
        class="focus-ring flex cursor-pointer list-none items-center gap-1.5 rounded-lg text-sm font-medium text-brand-700 transition hover:text-brand-800"
      >
        <svg
          class="h-4 w-4 transition-transform duration-200 group-open/detail:rotate-90"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M7 4l6 6-6 6" />
        </svg>
        Cara mulai & tempat mencarinya
      </summary>

      <div class="mt-3 space-y-3 border-l-2 border-cream-300 pl-3.5">
        <div>
          <p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">Langkah pertama</p>
          <p class="mt-1 text-sm leading-relaxed text-ink-600">{{ gig.howToStart }}</p>
        </div>

        <div v-if="gig.channels.length">
          <p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">Cari di sini</p>
          <ul class="mt-1.5 space-y-1.5">
            <li v-for="channel in gig.channels" :key="channel.name">
              <a
                :href="searchLink(channel.searchQuery)"
                target="_blank"
                rel="noopener noreferrer nofollow"
                class="focus-ring group/link inline-flex items-center gap-2 rounded-lg text-sm text-ink-600 transition hover:text-brand-700"
              >
                <svg
                  class="h-4 w-4 shrink-0 text-ink-300 transition group-hover/link:text-brand-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path :d="channelIcons[channel.kind] ?? channelIcons.platform" />
                </svg>
                {{ channel.name }}
                <span class="text-[11px] text-ink-300 group-hover/link:text-brand-400">
                  cari →
                </span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </details>

    <div
      class="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 text-[11px] text-ink-600"
    >
      <span class="rounded-lg bg-cream-100 px-2 py-0.5">{{ payLabel }}</span>
      <span v-if="gig.remoteFriendly" class="rounded-lg bg-cream-100 px-2 py-0.5">
        Bisa dari rumah
      </span>
      <span v-else class="rounded-lg bg-cream-100 px-2 py-0.5">Perlu keluar rumah</span>
    </div>
  </article>
</template>
