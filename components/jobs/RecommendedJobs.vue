<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCareerStore } from '~/stores/career'
import type { RoleMatch } from '~/types/career'
import type { JobSearchResponse } from '~/types/jobs'

/**
 * Lowongan asli untuk peran-peran yang direkomendasikan.
 *
 * HEMAT KUOTA
 *   Satu pencarian SerpApi = satu kuota, dan paket gratisnya cuma 250/bulan.
 *   Karena itu hanya peran PERTAMA yang dicari otomatis; peran lain dicari
 *   ketika user mengkliknya sendiri. Hasil tiap peran juga ditahan di memori
 *   komponen, jadi bolak-balik antar-tab tidak memanggil apa-apa lagi.
 */

const props = defineProps<{
  /** Peran hasil pencocokan, urut dari yang paling dekat. */
  roles: RoleMatch[]
  targetIncome: number
}>()

const career = useCareerStore()

/** Maksimal peran yang ditawarkan sebagai tab, supaya pilihan tidak melebar. */
const options = computed(() => props.roles.slice(0, 4))

const activeRoleId = ref('')
const loading = ref(false)
const errorMessage = ref('')

/** Hasil per peran — kunci roleId. Menahan pemanggilan ulang. */
const cache = ref<Record<string, JobSearchResponse>>({})

const current = computed(() => (activeRoleId.value ? cache.value[activeRoleId.value] : undefined))
const matches = computed(() => current.value?.matches ?? [])
const meta = computed(() => current.value?.meta)

async function loadRole(roleId: string) {
  activeRoleId.value = roleId
  errorMessage.value = ''

  if (cache.value[roleId]) return

  loading.value = true
  try {
    cache.value[roleId] = await $fetch<JobSearchResponse>('/api/jobs/search', {
      method: 'POST',
      body: {
        roleId,
        minSalary: props.targetIncome,
        ownedSkills: career.ownedSkills,
      },
    })
  } catch (error) {
    const payload =
      typeof error === 'object' && error !== null && 'data' in error
        ? (error as { data?: { data?: { message?: string }; statusMessage?: string } }).data
        : undefined

    errorMessage.value =
      payload?.data?.message ||
      payload?.statusMessage ||
      'Lowongan gagal dimuat. Coba lagi sebentar lagi.'
  } finally {
    loading.value = false
  }
}

// Begitu daftar peran tersedia, cari lowongan untuk yang paling cocok.
watch(
  options,
  (list) => {
    if (list.length && !activeRoleId.value) void loadRole(list[0]!.role.id)
  },
  { immediate: true },
)

/** Lowongan dengan tautan lamaran yang benar-benar bisa dibuka. */
const applicable = computed(() => matches.value.filter((match) => match.job.applyUrl))
</script>

<template>
  <section>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-ink-900">Lowongan yang bisa kamu lamar</h2>
        <p class="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-500">
          Diambil langsung dari Google Jobs — tautannya menuju iklan aslinya di papan lowongan,
          bukan halaman contoh.
        </p>
      </div>
    </div>

    <!-- Peran mana yang sedang dilihat -->
    <div v-if="options.length > 1" class="mt-5 flex flex-wrap gap-2">
      <button
        v-for="option in options"
        :key="option.role.id"
        type="button"
        :aria-pressed="activeRoleId === option.role.id"
        :disabled="loading"
        class="focus-ring rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-50"
        :class="
          activeRoleId === option.role.id
            ? 'border-brand-300 bg-brand-50 font-medium text-brand-700'
            : 'border-ink-200 bg-white/60 text-ink-600 hover:border-brand-300 hover:text-brand-700'
        "
        @click="loadRole(option.role.id)"
      >
        {{ option.role.title }}
        <span v-if="!cache[option.role.id]" class="ml-1 text-[10px] text-ink-400">· cari</span>
      </button>
    </div>

    <p
      v-if="errorMessage"
      class="mt-4 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-sm leading-relaxed text-brand-800"
    >
      {{ errorMessage }}
    </p>

    <div
      v-for="warning in meta?.warnings ?? []"
      :key="warning"
      class="mt-4 rounded-2xl border border-cream-400 bg-cream-100 px-5 py-3 text-sm leading-relaxed text-ink-700"
    >
      {{ warning }}
    </div>

    <!-- Sedang memuat -->
    <div v-if="loading" class="mt-5 flex items-center gap-3 text-sm text-ink-500">
      <svg
        class="h-4 w-4 animate-spin"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="7" class="opacity-25" />
        <path d="M17 10a7 7 0 0 0-7-7" stroke-linecap="round" />
      </svg>
      Mencari lowongan yang sedang dibuka…
    </div>

    <template v-else-if="current">
      <p v-if="applicable.length" class="mt-5 text-sm text-ink-500">
        <strong class="font-medium text-ink-700">{{ applicable.length }}</strong> lowongan ditemukan
        <span v-if="meta?.cached" class="text-ink-400">· dari data tersimpan</span>
      </p>

      <div v-if="applicable.length" class="mt-4 grid gap-4 lg:grid-cols-2">
        <JobCard
          v-for="match in applicable"
          :key="match.job.id"
          :match="match"
          :target-income="targetIncome"
        />
      </div>

      <BaseCard v-else tone="soft" class="mt-5">
        <p class="text-sm leading-relaxed text-ink-600">
          Belum ada lowongan yang bisa ditampilkan untuk peran ini sekarang. Coba peran lain di atas,
          atau buka <NuxtLink to="/jobs" class="font-medium text-brand-700 underline">halaman lowongan</NuxtLink>
          untuk mencari dengan kata kunci dan lokasi sendiri. Papan lowongan berganti isi hampir tiap
          hari — tidak ketemu hari ini bukan berarti tidak ada.
        </p>
      </BaseCard>

      <div class="mt-6">
        <BaseButton to="/jobs" variant="ghost" size="sm">
          Cari lowongan lain dengan filter lengkap →
        </BaseButton>
      </div>
    </template>
  </section>
</template>
