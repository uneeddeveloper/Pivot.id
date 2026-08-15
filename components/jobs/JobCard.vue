<script setup lang="ts">
import { computed } from 'vue'
import { useCatalogStore } from '~/stores/catalog'
import type { JobMatch } from '~/types/jobs'

const props = defineProps<{
  match: JobMatch
  /** 0 berarti user belum menghitung Target Income. */
  targetIncome: number
}>()

const catalog = useCatalogStore()

const job = computed(() => props.match.job)

/** Label gaji. Yang tidak menyebut angka ditulis apa adanya, bukan "Rp0". */
const salaryLabel = computed(() => {
  const { salaryMin, salaryMax, salaryStated } = job.value
  if (!salaryStated || salaryMax <= 0) return ''
  if (salaryMin > 0 && salaryMin !== salaryMax) {
    return `${formatIDR(salaryMin)} – ${formatIDR(salaryMax)}`
  }
  return formatIDR(salaryMax)
})

const employmentLabel = computed(
  () =>
    ({
      full_time: 'Penuh waktu',
      part_time: 'Paruh waktu',
      contract: 'Kontrak',
      internship: 'Magang',
      freelance: 'Lepas',
    })[job.value.employmentType] ?? '',
)

const badges = computed(() => {
  const items: string[] = []
  if (employmentLabel.value) items.push(employmentLabel.value)
  if (job.value.isRemote) items.push('Bisa remote')
  if (job.value.postedLabel) items.push(job.value.postedLabel)
  return items
})

const ownedSkills = computed(() => catalog.resolveSkills(props.match.owned))
const missingSkills = computed(() => catalog.resolveSkills(props.match.missing))

const coveragePercent = computed(() => Math.round(props.match.coverage * 100))

/** Deskripsi dipangkas — kartu ini pengantar, detailnya di halaman aslinya. */
const excerpt = computed(() => {
  const text = job.value.description.replace(/\s+/g, ' ').trim()
  return text.length > 220 ? `${text.slice(0, 220)}…` : text
})
</script>

<template>
  <article class="surface-card lift rounded-2xl border border-ink-200/80 p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="font-semibold text-ink-900">{{ job.title }}</h3>
        <p class="mt-1 text-sm text-ink-600">
          <span v-if="job.company" class="font-medium">{{ job.company }}</span>
          <span v-if="job.company && job.location" class="text-ink-300"> · </span>
          <span v-if="job.location">{{ job.location }}</span>
          <span v-if="match.locationMatch === false" class="text-ink-400">
            · di luar daerah yang kamu cari
          </span>
        </p>
      </div>

      <span
        v-if="targetIncome > 0 && job.salaryStated"
        class="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
        :class="
          match.meetsTarget
            ? 'border-sage-300 bg-sage-50 text-sage-800'
            : 'border-cream-400 bg-cream-200 text-ink-700'
        "
      >
        <svg
          v-if="match.meetsTarget"
          class="h-3.5 w-3.5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
            clip-rule="evenodd"
          />
        </svg>
        <svg v-else class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.25 9a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-1.5 0V9Z"
            clip-rule="evenodd"
          />
        </svg>
        {{ match.meetsTarget ? 'Menutup target' : 'Di bawah target' }}
      </span>
    </div>

    <!-- Peringatan lowongan mencurigakan ditaruh di atas, sebelum user tergoda
         angka gajinya. Audiens aplikasi ini justru yang paling rentan ditipu. -->
    <div
      v-if="job.redFlags.length"
      class="mt-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5"
    >
      <p class="flex items-center gap-1.5 text-xs font-semibold text-brand-800">
        <svg class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M8.5 2.7a1.7 1.7 0 0 1 3 0l6 10.6c.65 1.15-.18 2.6-1.5 2.6H4a1.7 1.7 0 0 1-1.5-2.6l6-10.6ZM10 7a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 10 7Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clip-rule="evenodd"
          />
        </svg>
        Periksa dulu sebelum melamar
      </p>
      <ul class="mt-1.5 space-y-0.5">
        <li v-for="flag in job.redFlags" :key="flag" class="text-xs leading-relaxed text-brand-800">
          • {{ flag }}
        </li>
      </ul>
      <p class="mt-1.5 text-xs leading-relaxed text-brand-700/85">
        Lowongan yang sah tidak pernah meminta uang dari pelamar.
      </p>
    </div>

    <!-- Gaji -->
    <div class="mt-4">
      <p v-if="salaryLabel" class="text-lg font-semibold tabular-nums text-ink-900">
        {{ salaryLabel }}
        <span class="text-xs font-normal text-ink-400">/ bulan</span>
      </p>
      <p v-else class="text-sm text-ink-400">Gaji tidak disebutkan di iklan ini</p>

      <p
        v-if="targetIncome > 0 && job.salaryStated && !match.meetsTarget"
        class="mt-1 text-xs text-ink-500"
      >
        Masih kurang
        <strong class="font-semibold text-ink-700">
          {{ formatIDR(targetIncome - job.salaryMax) }}
        </strong>
        dari Target Income-mu.
      </p>
    </div>

    <p v-if="excerpt" class="mt-3 text-sm leading-relaxed text-ink-500">{{ excerpt }}</p>

    <!-- Cakupan keterampilan -->
    <div v-if="job.skills.length" class="mt-4">
      <div class="flex items-baseline justify-between gap-3">
        <p class="text-xs text-ink-500">
          Keterampilan terpenuhi
          <span class="tabular-nums">{{ match.owned.length }}/{{ job.skills.length }}</span>
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
          <span class="mr-0.5 text-xs text-ink-400">Diminta:</span>
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

    <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
      <span
        v-for="badge in badges"
        :key="badge"
        class="rounded-lg bg-cream-100 px-2 py-0.5 text-[11px] text-ink-600"
      >
        {{ badge }}
      </span>

      <span v-if="job.source" class="text-[11px] text-ink-400">via {{ job.source }}</span>

      <a
        v-if="job.applyUrl"
        :href="job.applyUrl"
        target="_blank"
        rel="noopener noreferrer nofollow"
        class="focus-ring ml-auto inline-flex items-center gap-1.5 rounded-xl bg-linear-to-b from-brand-500 to-brand-700 px-3 py-1.5 text-sm font-medium text-cream-50 shadow-brand transition hover:-translate-y-0.5"
      >
        Lihat lowongan
        <svg
          class="h-3.5 w-3.5"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M7 4h9v9M16 4 4 16" />
        </svg>
      </a>
    </div>
  </article>
</template>
