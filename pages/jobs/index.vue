<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCareerStore } from '~/stores/career'
import { useCatalogStore } from '~/stores/catalog'
import { useFinancialStore } from '~/stores/financial'
import type { JobSearchResponse } from '~/types/jobs'

/**
 * Papan lowongan. Sumber datanya Google Jobs lewat SerpApi, dirapikan LLM
 * Sumopod, lalu disimpan di MySQL — bukan daftar contoh yang ditulis tangan.
 *
 * PRIVASI: yang dikirim ke /api/jobs/search hanya kata kunci, lokasi, id
 * keterampilan, dan Target Income sebagai satu angka. Rincian utang yang
 * membentuk angka itu tidak ikut, dan tidak ada apa pun yang disimpan per-user.
 */

useHead({ title: 'Lowongan & CV ATS — Pivot' })

const financial = useFinancialStore()
const career = useCareerStore()
const catalog = useCatalogStore()
const route = useRoute()

await useAsyncData('catalog', () => catalog.load())

const targetIncome = computed(() => financial.summary.targetIncome)

// Peran bisa datang dari tautan di halaman skill-gap: /jobs?role=data-analyst
const roleId = ref<string>(
  typeof route.query.role === 'string' ? route.query.role : (career.targetRoleId ?? ''),
)
const freeQuery = ref('')
const location = ref('')
const remoteOnly = ref(false)

const result = ref<JobSearchResponse | null>(null)
const searching = ref(false)
const errorMessage = ref('')

const matches = computed(() => result.value?.matches ?? [])
const meta = computed(() => result.value?.meta ?? null)

/** Lowongan di bawah target hanya disembunyikan kalau user memintanya. */
const hideBelowTarget = ref(false)
const visibleMatches = computed(() =>
  hideBelowTarget.value ? matches.value.filter((match) => match.meetsTarget) : matches.value,
)

const belowTargetCount = computed(() => matches.value.filter((match) => !match.meetsTarget).length)

const canSearch = computed(() => Boolean(roleId.value || freeQuery.value.trim()))

async function search(refresh = false) {
  if (!canSearch.value || searching.value) return

  searching.value = true
  errorMessage.value = ''

  if (roleId.value) career.setTargetRole(roleId.value)

  try {
    result.value = await $fetch<JobSearchResponse>('/api/jobs/search', {
      method: 'POST',
      body: {
        roleId: roleId.value || undefined,
        query: roleId.value ? undefined : freeQuery.value.trim(),
        location: location.value.trim() || undefined,
        minSalary: targetIncome.value,
        remoteOnly: remoteOnly.value,
        ownedSkills: career.ownedSkills,
        refresh,
      },
    })
  } catch (error) {
    const payload =
      typeof error === 'object' && error !== null && 'data' in error
        ? (error as { data?: { data?: { message?: string }; statusMessage?: string } }).data
        : undefined

    errorMessage.value =
      payload?.data?.message || payload?.statusMessage || 'Pencarian gagal. Coba lagi sebentar lagi.'
  } finally {
    searching.value = false
  }
}

/** Kapan data ini diambil, dalam bahasa manusia. */
const fetchedLabel = computed(() => {
  if (!meta.value?.fetchedAt) return ''
  const when = new Date(meta.value.fetchedAt)
  if (Number.isNaN(when.getTime())) return ''
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(when)
})

// Dibuka lewat tautan peran dari halaman skill-gap: langsung cari.
if (roleId.value) await search()
</script>

<template>
  <div class="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72">
      <div class="aurora-blob -top-28 right-4 h-72 w-72 animate-float bg-cream-300/40" />
      <div class="aurora-blob -top-20 -left-16 h-64 w-64 bg-sage-200/40" />
    </div>

    <header class="animate-rise flex items-start justify-between gap-6">
      <div class="max-w-2xl">
        <StepProgress :current="4" class="max-w-md" />
        <h1 class="mt-6 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Lowongan & CV ATS
        </h1>
        <p class="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base">
          Lowongan asli dari Google Jobs, disaring dengan ambang gaji yang sudah kamu hitung
          sendiri. Yang terindikasi menipu kami tandai — bukan kami sembunyikan diam-diam.
        </p>
      </div>

      <MascotFigure pose="cape" size="md" float eager class="hidden self-center lg:block" />
    </header>

    <!-- ── Jangkar Target Income ────────────────────────────────────────── -->
    <div
      v-if="targetIncome > 0"
      class="surface-brand mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-700/60 px-5 py-4 text-cream-100"
    >
      <div>
        <p class="text-xs font-medium tracking-wide text-cream-100/75 uppercase">
          Ambang gaji yang kita pakai
        </p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-cream-50">
          {{ formatIDR(targetIncome) }}
          <span class="text-sm font-normal text-cream-100/70">/ bulan</span>
        </p>
      </div>
      <p class="max-w-xs text-sm leading-relaxed text-cream-100/85">
        Angka ini dihitung di perangkatmu dan dikirim ke pencarian sebagai satu angka saja —
        rincian utangmu tidak ikut.
      </p>
    </div>

    <BaseCard v-else tone="soft" class="mt-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="font-semibold text-ink-900">Target Income-mu belum dihitung</p>
          <p class="mt-1 max-w-lg text-sm leading-relaxed text-ink-600">
            Pencarian tetap jalan tanpa itu. Tapi begitu Target Income terisi, kami bisa menandai
            lowongan mana yang gajinya benar-benar menutup kebutuhanmu.
          </p>
        </div>
        <BaseButton to="/audit" class="shrink-0">Hitung dulu, 2 menit</BaseButton>
      </div>
    </BaseCard>

    <!-- ── Kontrol pencarian ────────────────────────────────────────────── -->
    <BaseCard title="Cari lowongan" class="mt-8">
      <template #icon>
        <svg
          class="h-5 w-5"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13 13 4 4" />
        </svg>
      </template>

      <div class="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Peran yang dicari"
          field-id="job-role"
          hint="Dari katalog peran di langkah 2."
        >
          <select id="job-role" v-model="roleId" class="field-input">
            <option value="">— Ketik kata kunci sendiri —</option>
            <option v-for="role in catalog.roles" :key="role.id" :value="role.id">
              {{ role.title }}
            </option>
          </select>
        </FormField>

        <FormField
          v-if="!roleId"
          label="Kata kunci"
          field-id="job-query"
          hint="Mis. admin gudang, barista, staf produksi."
        >
          <input
            id="job-query"
            v-model="freeQuery"
            type="text"
            class="field-input"
            placeholder="Ketik posisi yang kamu cari"
            @keyup.enter="search()"
          />
        </FormField>

        <FormField
          label="Lokasi"
          field-id="job-location"
          hint="Kosongkan untuk mencari se-Indonesia."
        >
          <input
            id="job-location"
            v-model="location"
            type="text"
            class="field-input"
            placeholder="Jakarta, Bandung, Surabaya…"
            @keyup.enter="search()"
          />
        </FormField>

        <div class="flex items-end">
          <label
            class="flex cursor-pointer items-center gap-2 rounded-xl border border-ink-200 bg-white/60 px-3 py-2.5 text-sm text-ink-600"
          >
            <input
              v-model="remoteOnly"
              type="checkbox"
              class="focus-ring h-4 w-4 rounded border-ink-300 accent-brand-600"
            />
            Hanya yang bisa dikerjakan dari rumah
          </label>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-wrap items-center gap-3">
          <BaseButton :disabled="!canSearch || searching" @click="search()">
            <svg
              v-if="searching"
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
            {{ searching ? 'Mencari…' : 'Cari lowongan' }}
          </BaseButton>

          <BaseButton
            v-if="result"
            variant="ghost"
            size="sm"
            :disabled="searching"
            @click="search(true)"
          >
            Ambil data terbaru
          </BaseButton>

          <p v-if="fetchedLabel" class="text-xs text-ink-400">
            {{ meta?.cached ? 'Tersimpan sejak' : 'Diambil' }} {{ fetchedLabel }}
            <span v-if="meta?.provider"> · {{ meta.provider }}</span>
          </p>
        </div>
      </template>
    </BaseCard>

    <!-- ── Pesan sistem ─────────────────────────────────────────────────── -->
    <div
      v-if="errorMessage"
      class="mt-4 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-sm leading-relaxed text-brand-800"
    >
      {{ errorMessage }}
    </div>

    <div
      v-for="warning in meta?.warnings ?? []"
      :key="warning"
      class="mt-4 rounded-2xl border border-cream-400 bg-cream-100 px-5 py-3 text-sm leading-relaxed text-ink-700"
    >
      {{ warning }}
    </div>

    <!-- ── Hasil ────────────────────────────────────────────────────────── -->
    <section v-if="result" class="mt-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-ink-900">
            {{ matches.length }} lowongan ditemukan
          </h2>
          <p class="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-500">
            Diurutkan dari yang paling dekat dengan kondisimu: menutup Target Income lebih dulu,
            lalu yang keterampilannya paling banyak sudah kamu punya.
          </p>
        </div>

        <label
          v-if="belowTargetCount > 0 && targetIncome > 0"
          class="flex cursor-pointer items-center gap-2 rounded-full border border-ink-200 bg-white/60 px-3 py-1.5 text-xs text-ink-600"
        >
          <input
            v-model="hideBelowTarget"
            type="checkbox"
            class="focus-ring h-3.5 w-3.5 rounded border-ink-300 accent-brand-600"
          />
          Sembunyikan {{ belowTargetCount }} yang di bawah target
        </label>
      </div>

      <p
        v-if="meta && meta.hiddenByValidation > 0"
        class="mt-3 text-xs leading-relaxed text-ink-500"
      >
        {{ meta.hiddenByValidation }} lowongan tidak ditampilkan karena terlalu banyak tanda bahaya
        (meminta biaya di muka, perusahaan tidak jelas, atau pola serupa).
      </p>

      <div v-if="visibleMatches.length" class="mt-5 grid gap-4 lg:grid-cols-2">
        <JobCard
          v-for="match in visibleMatches"
          :key="match.job.id"
          :match="match"
          :target-income="targetIncome"
        />
      </div>

      <BaseCard v-else tone="soft" class="mt-5">
        <p class="text-sm leading-relaxed text-ink-600">
          Tidak ada lowongan yang cocok kali ini. Coba longgarkan lokasinya, matikan filter remote,
          atau pakai kata kunci yang lebih umum. Tidak ketemu hari ini bukan berarti tidak ada —
          papan lowongan berganti isi hampir tiap hari.
        </p>
      </BaseCard>
    </section>

    <BaseCard v-else-if="!searching" tone="soft" class="mt-8">
      <div class="flex items-center gap-4">
        <MascotFigure pose="tidur" size="sm" class="hidden sm:block" />
        <p class="text-sm leading-relaxed text-ink-600">
          Pilih peran atau ketik kata kunci di atas, lalu tekan
          <strong class="font-semibold">Cari lowongan</strong>. Hasilnya diambil dari Google Jobs
          dan disaring dengan Target Income-mu.
        </p>
      </div>
    </BaseCard>

    <!-- ── Generator CV ATS ─────────────────────────────────────────────── -->
    <section class="mt-12">
      <AtsCvBuilder :role-id="roleId" />
    </section>

    <div class="mt-10">
      <BaseButton to="/roadmap" variant="ghost">← Kembali ke roadmap belajar</BaseButton>
    </div>
  </div>
</template>
