<script setup lang="ts">
import { computed } from 'vue'
import type { RoleMatch } from '~/types/career'

const props = defineProps<{
  match: RoleMatch
  /** 0 berarti user belum menghitung Target Income. */
  targetIncome: number
}>()

const coveragePercent = computed(() => Math.round(props.match.coverage * 100))

const requiredCount = computed(() => props.match.owned.length + props.match.missing.length)

const badges = computed(() => {
  const items: string[] = [props.match.role.timeToEntry]
  if (props.match.role.entryFriendly) items.push('Ramah pemula')
  if (props.match.role.remoteFriendly) items.push('Bisa remote')
  return items
})
</script>

<template>
  <article class="surface-card lift rounded-2xl border border-ink-200/80 p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="font-semibold text-ink-900">{{ match.role.title }}</h3>
          <span
            class="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-ink-500 uppercase"
          >
            {{ match.role.field }}
          </span>
        </div>
        <p class="mt-1.5 text-sm leading-relaxed text-ink-500">{{ match.role.description }}</p>
      </div>

      <!-- Status terhadap Target Income: ikon + teks, tidak mengandalkan warna saja. -->
      <span
        v-if="targetIncome > 0"
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
        {{ match.meetsTarget ? 'Menutup target' : 'Batu loncatan' }}
      </span>
    </div>

    <!-- Gaji -->
    <div class="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <p class="text-lg font-semibold tabular-nums text-ink-900">
        {{ formatIDR(match.role.salaryTypical) }}
      </p>
      <p class="text-xs text-ink-400">
        umumnya · mulai dari {{ formatIDR(match.role.salaryMin) }} / bulan
      </p>
    </div>

    <p v-if="targetIncome > 0 && !match.meetsTarget" class="mt-1 text-xs text-ink-500">
      Masih kurang
      <strong class="font-semibold text-ink-700">{{ formatIDR(Math.abs(match.gapToTarget)) }}</strong>
      dari Target Income-mu — bisa jadi pijakan sementara sambil mengejar peran berikutnya.
    </p>
    <p v-else-if="targetIncome > 0" class="mt-1 text-xs text-sage-700">
      Lebih {{ formatIDR(match.gapToTarget) }} di atas Target Income-mu.
    </p>

    <!-- Cakupan keterampilan: meter satu warna -->
    <div class="mt-4">
      <div class="flex items-baseline justify-between gap-3">
        <p class="text-xs text-ink-500">
          Keterampilan terpenuhi
          <span class="tabular-nums">{{ match.owned.length }}/{{ requiredCount }}</span>
        </p>
        <p class="text-xs font-semibold tabular-nums text-ink-700">{{ coveragePercent }}%</p>
      </div>
      <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-sage-100">
        <div
          class="h-full rounded-full bg-sage-500 transition-all duration-500 ease-out"
          :style="{ width: `${coveragePercent}%` }"
        />
      </div>
    </div>

    <!-- Yang sudah dimiliki vs yang masih perlu dikejar -->
    <div class="mt-4 space-y-2.5">
      <div v-if="match.owned.length" class="flex flex-wrap items-center gap-1.5">
        <span class="mr-0.5 text-xs text-ink-400">Sudah ada:</span>
        <span
          v-for="skill in match.owned"
          :key="skill.id"
          class="rounded-full border border-sage-200 bg-sage-50 px-2 py-0.5 text-[11px] text-sage-800"
        >
          {{ skill.label }}
        </span>
      </div>

      <div v-if="match.missing.length" class="flex flex-wrap items-center gap-1.5">
        <span class="mr-0.5 text-xs text-ink-400">Perlu dikejar:</span>
        <span
          v-for="skill in match.missing"
          :key="skill.id"
          class="rounded-full border border-dashed border-ink-300 px-2 py-0.5 text-[11px] text-ink-600"
        >
          {{ skill.label }}
        </span>
      </div>

      <p v-if="!match.missing.length" class="text-xs font-medium text-sage-700">
        Semua keterampilan intinya sudah kamu punya — peran ini bisa langsung kamu lamar.
      </p>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-3">
      <span
        v-for="badge in badges"
        :key="badge"
        class="rounded-lg bg-cream-100 px-2 py-0.5 text-[11px] text-ink-600"
      >
        {{ badge }}
      </span>

      <!-- Langsung ke lowongan asli untuk peran ini; halaman /jobs membaca
           ?role= dan menjalankan pencariannya sendiri. -->
      <NuxtLink
        :to="`/jobs?role=${match.role.id}`"
        class="focus-ring ml-auto shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
      >
        Lihat lowongannya →
      </NuxtLink>
    </div>
  </article>
</template>
