<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCareerStore } from '~/stores/career'
import { useCatalogStore } from '~/stores/catalog'
import { useFinancialStore } from '~/stores/financial'

useHead({ title: 'Skill Gap & Peran Kerja — Pivot' })

/**
 * Halaman ini berjalan tiga tahap, dibuka satu per satu:
 *
 *   1. `cerita`   — user bercerita, AI menggali dan bertanya balik.
 *   2. `konfirmasi` — hasil bacaan AI ditampilkan sebagai chip untuk ditinjau.
 *      AI bisa salah tangkap, jadi user selalu punya kata terakhir sebelum
 *      hasilnya dipakai. Di sini juga dia boleh menambah yang terlewat.
 *   3. `hasil`    — peran yang cocok + lowongan asli beserta tautan lamarannya.
 *
 * Kenapa bertahap: menampilkan semuanya sekaligus membuat halaman ini terasa
 * seperti formulir panjang. Yang dibutuhkan user justru satu keputusan kecil
 * dalam satu waktu.
 */
type Stage = 'cerita' | 'konfirmasi' | 'hasil'

const financial = useFinancialStore()
const career = useCareerStore()
const catalog = useCatalogStore()

// Katalog datang dari MySQL. `useAsyncData` memastikan pengambilannya ikut
// render sisi server, jadi daftar peran sudah ada di HTML pertama.
await useAsyncData('catalog', () => catalog.load())

const targetIncome = computed(() => financial.summary.targetIncome)

const matches = computed(() =>
  matchRoles(catalog.roles, catalog.skills, targetIncome.value, career.ownedSkills),
)

const fields = computed(() => catalog.fields)

const visibleMatches = computed(() =>
  matches.value.filter(
    (match) =>
      (career.fieldFilter === null || match.role.field === career.fieldFilter) &&
      (!career.onlyMeetingTarget || match.meetsTarget),
  ),
)

const meetingCount = computed(() => matches.value.filter((match) => match.meetsTarget).length)

/** Peran yang seluruh syarat keterampilannya sudah terpenuhi. */
const readyNow = computed(() =>
  matches.value.filter((match) => match.meetsTarget && match.missing.length === 0),
)

const gaps = computed(() => topSkillGaps(matches.value))

/**
 * User yang kembali ke halaman ini tidak dipaksa mengulang ceritanya — kalau
 * keterampilannya sudah tercatat di store, langsung ke hasil.
 */
const stage = ref<Stage>(career.hasSkills ? 'hasil' : 'cerita')

/**
 * Jalan cadangan tanpa AI. Dipakai kalau SUMOPOD_API_KEY belum diisi, layanan
 * sedang mati, atau user memang lebih nyaman mencentang sendiri. Tanpa ini,
 * satu token yang belum diisi akan mematikan seluruh langkah 2.
 */
const manualMode = ref(false)

/** Peran yang dipakai untuk mencari lowongan: yang paling dekat lebih dulu. */
const recommended = computed(() =>
  matches.value.filter((match) => match.meetsTarget || match.coverage > 0).slice(0, 4),
)

function onChatReady() {
  stage.value = 'konfirmasi'
}

function startManual() {
  manualMode.value = true
  stage.value = 'konfirmasi'
}

function confirmSkills() {
  if (!career.hasSkills) return
  stage.value = 'hasil'
}

function editSkills() {
  stage.value = 'konfirmasi'
}

function restartChat() {
  manualMode.value = false
  stage.value = 'cerita'
}
</script>

<template>
  <div class="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72">
      <div class="aurora-blob -top-28 right-4 h-72 w-72 animate-float bg-cream-300/40" />
      <div class="aurora-blob -top-20 -left-16 h-64 w-64 bg-sage-200/40" />
    </div>

    <header class="animate-rise flex items-start justify-between gap-6">
      <div class="max-w-2xl">
        <StepProgress :current="2" class="max-w-md" />
        <h1 class="mt-6 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Skill Gap & Peran Kerja
        </h1>
        <p class="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base">
          Sekarang kita cari peran kerja yang gajinya benar-benar menutup Target Income-mu — lalu
          lihat keterampilan apa yang masih perlu dikejar untuk sampai ke sana.
        </p>
      </div>

      <MascotFigure pose="tanya" size="md" float eager class="hidden self-center lg:block" />
    </header>

    <!-- Katalog gagal dibaca: sebut penyebab dan perintah perbaikannya, jangan
         biarkan user menatap halaman kosong tanpa keterangan. -->
    <div
      v-if="catalog.error"
      class="mt-8 rounded-2xl border border-cream-400 bg-cream-100 px-5 py-4"
    >
      <p class="text-sm font-semibold text-ink-900">Katalog peran kerja belum bisa dimuat</p>
      <p class="mt-1 text-sm leading-relaxed text-ink-600">{{ catalog.error }}</p>
    </div>

    <!-- ── Jangkar: Target Income dari langkah 1 ────────────────────────── -->
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
        <strong class="font-semibold text-cream-50">{{ meetingCount }}</strong> dari
        {{ matches.length }} peran di daftar ini gaji umumnya sudah menutup angka tersebut.
      </p>
    </div>

    <BaseCard v-else tone="soft" class="mt-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="font-semibold text-ink-900">Target Income-mu belum dihitung</p>
          <p class="mt-1 max-w-lg text-sm leading-relaxed text-ink-600">
            Daftar peran di bawah tetap bisa kamu jelajahi. Tapi begitu Target Income terisi, kami
            bisa menandai mana yang benar-benar menutup kebutuhanmu — dan mana yang cuma batu
            loncatan.
          </p>
        </div>
        <BaseButton to="/audit" class="shrink-0">Hitung dulu, 2 menit</BaseButton>
      </div>
    </BaseCard>

    <!-- ── Tahap 1: cerita ──────────────────────────────────────────────── -->
    <section v-if="stage === 'cerita'" class="mt-10">
      <h2 class="text-2xl font-bold tracking-tight text-ink-900">Mulai dari yang sudah kamu bisa</h2>
      <p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-500">
        Tidak perlu merasa kurang. Ini cuma alat ukur jarak, bukan penilaian atas dirimu.
      </p>

      <div class="mt-6">
        <SkillChat @ready="onChatReady" />
      </div>

      <p class="mt-4 text-sm text-ink-500">
        Lebih nyaman mencentang sendiri?
        <button
          type="button"
          class="focus-ring rounded font-medium text-brand-700 underline underline-offset-2"
          @click="startManual"
        >
          Pilih keterampilan dari daftar
        </button>
      </p>
    </section>

    <!-- ── Tahap 2: konfirmasi ──────────────────────────────────────────── -->
    <section v-else-if="stage === 'konfirmasi'" class="mt-10">
      <h2 class="text-2xl font-bold tracking-tight text-ink-900">
        {{ manualMode ? 'Pilih keterampilan yang kamu punya' : 'Ini yang kami tangkap dari ceritamu' }}
      </h2>
      <p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-500">
        {{
          manualMode
            ? 'Centang apa adanya. Yang dipelajari otodidak, dari kerja sampingan, atau dari mengurus usaha keluarga tetap dihitung.'
            : 'Periksa dulu sebelum kami carikan pekerjaannya. Ada yang keliru atau terlewat? Tinggal klik untuk melepas atau menambah.'
        }}
      </p>

      <div class="mt-6">
        <SkillPicker />
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <BaseButton :disabled="!career.hasSkills" @click="confirmSkills">
          Sudah benar, carikan pekerjaannya
          <svg
            class="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-1"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 10h12m-5-5 5 5-5 5" />
          </svg>
        </BaseButton>

        <BaseButton variant="ghost" size="sm" @click="restartChat">
          {{ manualMode ? 'Cerita ke AI saja' : 'Lanjutkan bercerita' }}
        </BaseButton>

        <p v-if="!career.hasSkills" class="text-xs text-ink-400">
          Tandai minimal satu keterampilan dulu.
        </p>
      </div>
    </section>

    <!-- ── Tahap 3: hasil ───────────────────────────────────────────────── -->
    <section v-else class="mt-10">
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sage-200 bg-sage-50 px-5 py-4">
        <p class="text-sm leading-relaxed text-sage-800">
          <strong class="font-semibold">{{ career.ownedSkills.length }} keterampilan</strong>
          tercatat sebagai bekalmu.
        </p>
        <BaseButton variant="ghost" size="sm" class="shrink-0" @click="editSkills">
          Ubah keterampilan
        </BaseButton>
      </div>
    </section>

    <!-- ── Lowongan asli untuk peran yang direkomendasikan ──────────────── -->
    <section v-if="stage === 'hasil' && recommended.length" class="mt-10">
      <RecommendedJobs :roles="recommended" :target-income="targetIncome" />
    </section>

    <!-- ── Hasil pencocokan ─────────────────────────────────────────────── -->
    <section v-if="stage === 'hasil'" class="mt-10">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-ink-900">Peran yang cocok untukmu</h2>
          <p class="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-500">
            Diurutkan dari yang paling dekat: menutup Target Income lebih dulu, lalu yang
            keterampilannya paling banyak sudah kamu punya.
          </p>
        </div>
      </div>

      <!-- Satu baris filter yang menaungi seluruh hasil di bawahnya -->
      <div class="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="focus-ring rounded-full border px-3 py-1.5 text-xs transition"
          :class="
            career.fieldFilter === null
              ? 'border-brand-300 bg-brand-50 font-medium text-brand-700'
              : 'border-ink-200 bg-white/60 text-ink-600 hover:border-brand-300 hover:text-brand-700'
          "
          @click="career.setFieldFilter(null)"
        >
          Semua bidang
        </button>
        <button
          v-for="field in fields"
          :key="field"
          type="button"
          class="focus-ring rounded-full border px-3 py-1.5 text-xs transition"
          :class="
            career.fieldFilter === field
              ? 'border-brand-300 bg-brand-50 font-medium text-brand-700'
              : 'border-ink-200 bg-white/60 text-ink-600 hover:border-brand-300 hover:text-brand-700'
          "
          @click="career.setFieldFilter(field)"
        >
          {{ field }}
        </button>

        <label
          v-if="targetIncome > 0"
          class="ml-auto flex cursor-pointer items-center gap-2 rounded-full border border-ink-200 bg-white/60 px-3 py-1.5 text-xs text-ink-600"
        >
          <input
            v-model="career.onlyMeetingTarget"
            type="checkbox"
            class="focus-ring h-3.5 w-3.5 rounded border-ink-300 accent-brand-600"
          />
          Hanya yang menutup target
        </label>
      </div>

      <!-- Sudah bisa dilamar sekarang -->
      <div
        v-if="readyNow.length"
        class="mt-5 flex items-center gap-4 rounded-xl border border-sage-200 bg-sage-50 px-4 py-3"
      >
        <MascotFigure pose="sip" size="xs" class="hidden sm:block" />
        <div class="flex min-w-0 items-start gap-3">
          <svg
            class="mt-0.5 h-5 w-5 shrink-0 text-sage-600 sm:hidden"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.58 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
              clip-rule="evenodd"
            />
          </svg>
          <p class="text-sm leading-relaxed text-sage-800">
            <strong class="font-semibold">
              {{ readyNow.length }} peran bisa kamu lamar sekarang juga
            </strong>
            — seluruh keterampilan intinya sudah kamu punya dan gajinya menutup Target Income:
            {{ readyNow.map((match) => match.role.title).join(', ') }}.
          </p>
        </div>
      </div>

      <p class="mt-5 text-sm text-ink-500">
        Menampilkan <strong class="font-medium text-ink-700">{{ visibleMatches.length }}</strong>
        peran.
      </p>

      <div v-if="visibleMatches.length" class="mt-4 grid gap-4 lg:grid-cols-2">
        <RoleMatchCard
          v-for="match in visibleMatches"
          :key="match.role.id"
          :match="match"
          :target-income="targetIncome"
        />
      </div>

      <BaseCard v-else tone="soft" class="mt-4">
        <p class="text-sm leading-relaxed text-ink-600">
          Tidak ada peran yang cocok dengan filter ini. Coba longgarkan filternya — atau matikan
          "hanya yang menutup target" untuk melihat peran batu loncatan yang bisa dikejar lebih
          dulu.
        </p>
      </BaseCard>
    </section>

    <!-- ── Ringkasan skill gap → bahan roadmap ──────────────────────────── -->
    <section v-if="stage === 'hasil' && gaps.length" class="mt-10">
      <BaseCard
        title="Keterampilan yang paling sering diminta"
        subtitle="Dihitung dari peran-peran yang gajinya menutup Target Income-mu tapi syaratnya belum terpenuhi. Inilah daftar yang akan disusun jadi roadmap belajar di langkah berikutnya."
      >
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
            <path d="M3 16V9m4.5 7V4M12 16v-5m4.5 5V7" />
          </svg>
        </template>

        <ol class="space-y-2.5">
          <li
            v-for="(gap, index) in gaps"
            :key="gap.skill.id"
            class="flex items-center gap-3 rounded-xl border border-ink-200/70 bg-white/60 px-3 py-2.5"
          >
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700"
            >
              {{ index + 1 }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="text-sm font-medium text-ink-800">{{ gap.skill.label }}</span>
              <span class="ml-2 text-xs text-ink-400">{{ gap.skill.category }}</span>
            </span>
            <span class="shrink-0 text-xs tabular-nums text-ink-500">
              dibutuhkan {{ gap.roles }} peran
            </span>
          </li>
        </ol>

        <template #footer>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm leading-relaxed text-ink-600">
              Cukup kejar beberapa teratas dulu. Tidak perlu semuanya sekaligus.
            </p>
            <BaseButton to="/roadmap" variant="secondary" class="shrink-0">
              Susun roadmap belajarnya
              <svg
                class="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-1"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 10h12m-5-5 5 5-5 5" />
              </svg>
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </section>

    <div class="mt-10">
      <BaseButton to="/audit" variant="ghost">← Kembali ke audit finansial</BaseButton>
    </div>
  </div>
</template>
