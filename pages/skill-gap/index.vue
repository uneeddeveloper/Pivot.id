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
  <div class="surface-dark min-h-screen">
    <!-- Halaman alur: mengikuti dark theme -->
    <div class="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <!-- Ambient glow dekorasi -->
      <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 -z-0 overflow-hidden">
        <div
          class="absolute -top-20 right-0 h-64 w-64 rounded-full opacity-[0.15] blur-3xl"
          style="background: radial-gradient(circle, rgb(247 230 127 / 0.5) 0%, transparent 70%)"
        />
        <div
          class="absolute top-1/3 -left-16 h-48 w-48 rounded-full opacity-[0.08] blur-3xl"
          style="background: radial-gradient(circle, rgb(169 14 2 / 0.7) 0%, transparent 70%)"
        />
      </div>

    <header v-reveal class="relative z-10 flex items-start justify-between gap-6">
      <div class="max-w-2xl">
        <StepProgress :current="2" class="max-w-md" />
        <h1 class="mt-6 text-3xl font-bold tracking-tight text-ink-900 dark:text-cream-50 sm:text-4xl">
          Skill Gap & Peran Kerja
        </h1>
        <p class="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-400 sm:text-base">
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
      class="relative z-10 mt-8 rounded-[1.25rem] border border-amber-200/50 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/40 px-5 py-4"
    >
      <p class="text-sm font-semibold text-amber-700 dark:text-amber-100">Katalog peran kerja belum bisa dimuat</p>
      <p class="mt-1 text-sm leading-relaxed text-amber-600 dark:text-amber-200/70">{{ catalog.error }}</p>
    </div>

    <!-- ── Jangkar: Target Income dari langkah 1 ────────────────────────── -->
    <div
      v-reveal
      v-if="targetIncome > 0"
      class="surface-brand relative z-10 mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-200 dark:border-brand-700/60 px-5 py-4 text-brand-900 dark:text-cream-100"
    >
      <div>
        <p class="text-[10px] font-semibold tracking-[0.14em] text-brand-700 dark:text-cream-100/75 uppercase">
          Ambang gaji yang kita pakai
        </p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-brand-950 dark:text-cream-50">
          {{ formatIDR(targetIncome) }}
          <span class="text-sm font-normal text-brand-700 dark:text-cream-100/70">/ bulan</span>
        </p>
      </div>
      <p class="max-w-xs text-sm leading-relaxed text-brand-800 dark:text-cream-100/85">
        <strong class="font-semibold text-brand-950 dark:text-cream-50">{{ meetingCount }}</strong> dari
        {{ matches.length }} peran di daftar ini gaji umumnya sudah menutup angka tersebut.
      </p>
    </div>

    <BaseCard v-reveal v-else tone="soft" class="relative z-10 mt-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="font-semibold text-ink-900 dark:text-cream-50">Target Income-mu belum dihitung</p>
          <p class="mt-1 max-w-lg text-sm leading-relaxed text-ink-600 dark:text-ink-400">
            Daftar peran di bawah tetap bisa kamu jelajahi. Tapi begitu Target Income terisi, kami
            bisa menandai mana yang benar-benar menutup kebutuhanmu — dan mana yang cuma batu
            loncatan.
          </p>
        </div>
        <BaseButton to="/audit" class="shrink-0">Hitung dulu, 2 menit</BaseButton>
      </div>
    </BaseCard>

    <!-- ── Tahap 1: cerita ──────────────────────────────────────────────── -->
    <section v-reveal v-if="stage === 'cerita'" class="relative z-10 mt-10">
      <h2 class="text-2xl font-bold tracking-tight text-ink-900 dark:text-cream-50">Mulai dari yang sudah kamu bisa</h2>
      <p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600 dark:text-ink-400">
        Tidak perlu merasa kurang. Ini cuma alat ukur jarak, bukan penilaian atas dirimu.
      </p>

      <div class="mt-6">
        <SkillChat @ready="onChatReady" />
      </div>

      <p class="mt-4 text-sm text-ink-600 dark:text-ink-500">
        Lebih nyaman mencentang sendiri?
        <button
          type="button"
          class="focus-ring dark:focus-ring-dark rounded font-medium text-brand-600 dark:text-brand-400 underline underline-offset-4 hover:text-brand-700 dark:hover:text-brand-300"
          @click="startManual"
        >
          Pilih keterampilan dari daftar
        </button>
      </p>
    </section>

    <!-- ── Tahap 2: konfirmasi ──────────────────────────────────────────── -->
    <section v-reveal v-else-if="stage === 'konfirmasi'" class="relative z-10 mt-10">
      <h2 class="text-2xl font-bold tracking-tight text-ink-900 dark:text-cream-50">
        {{ manualMode ? 'Pilih keterampilan yang kamu punya' : 'Ini yang kami tangkap dari ceritamu' }}
      </h2>
      <p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600 dark:text-ink-400">
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

        <p v-if="!career.hasSkills" class="text-xs text-ink-600 dark:text-ink-400">
          Tandai minimal satu keterampilan dulu.
        </p>
      </div>
    </section>

    <!-- ── Tahap 3: hasil ───────────────────────────────────────────────── -->
    <section v-reveal v-else class="relative z-10 mt-10">
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-sage-200 dark:border-sage-900/60 bg-sage-50/50 dark:bg-sage-950/40 px-5 py-4">
        <p class="text-sm leading-relaxed text-sage-700 dark:text-sage-300">
          <strong class="font-semibold text-sage-900 dark:text-sage-100">{{ career.ownedSkills.length }} keterampilan</strong>
          tercatat sebagai bekalmu.
        </p>
        <BaseButton variant="ghost" size="sm" class="shrink-0" @click="editSkills">
          Ubah keterampilan
        </BaseButton>
      </div>
    </section>

    <!-- ── Lowongan asli untuk peran yang direkomendasikan ──────────────── -->
    <section v-reveal v-if="stage === 'hasil' && recommended.length" class="relative z-10 mt-10">
      <RecommendedJobs :roles="recommended" :target-income="targetIncome" />
    </section>

    <!-- ── Hasil pencocokan ─────────────────────────────────────────────── -->
    <section v-reveal v-if="stage === 'hasil'" class="relative z-10 mt-10">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-ink-900 dark:text-cream-50">Peran yang cocok untukmu</h2>
          <p class="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-600 dark:text-ink-400">
            Diurutkan dari yang paling dekat: menutup Target Income lebih dulu, lalu yang
            keterampilannya paling banyak sudah kamu punya.
          </p>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="focus-ring dark:focus-ring-dark rounded-full border px-3 py-1.5 text-xs transition"
          :class="
            career.fieldFilter === null
              ? 'border-brand-500/40 bg-brand-50/50 dark:bg-brand-500/15 font-medium text-brand-700 dark:text-brand-300'
              : 'border-ink-200/50 dark:border-white/[0.1] bg-white/50 dark:bg-ink-800 text-ink-600 dark:text-ink-400 hover:border-brand-300 dark:hover:border-brand-500/30 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-700 dark:hover:text-brand-300'
          "
          @click="career.setFieldFilter(null)"
        >
          Semua bidang
        </button>
        <button
          v-for="field in fields"
          :key="field"
          type="button"
          class="focus-ring dark:focus-ring-dark rounded-full border px-3 py-1.5 text-xs transition"
          :class="
            career.fieldFilter === field
              ? 'border-brand-500/40 bg-brand-50/50 dark:bg-brand-500/15 font-medium text-brand-700 dark:text-brand-300'
              : 'border-ink-200/50 dark:border-white/[0.1] bg-white/50 dark:bg-ink-800 text-ink-600 dark:text-ink-400 hover:border-brand-300 dark:hover:border-brand-500/30 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-700 dark:hover:text-brand-300'
          "
          @click="career.setFieldFilter(field)"
        >
          {{ field }}
        </button>

        <label
          v-if="targetIncome > 0"
          class="ml-auto flex cursor-pointer items-center gap-2 rounded-full border border-ink-200/50 dark:border-white/[0.08] bg-white/40 dark:bg-ink-800/80 px-3 py-1.5 text-xs text-ink-600 dark:text-ink-400 hover:border-ink-300 dark:hover:border-white/[0.15] transition"
        >
          <input
            v-model="career.onlyMeetingTarget"
            type="checkbox"
            class="focus-ring dark:focus-ring-dark h-3.5 w-3.5 rounded border-ink-300 dark:border-ink-600 bg-white dark:bg-ink-900 accent-brand-600"
          />
          Hanya yang menutup target
        </label>
      </div>

      <!-- Sudah bisa dilamar sekarang -->
      <div
        v-if="readyNow.length"
        class="mt-5 flex items-center gap-4 rounded-xl border border-sage-200 dark:border-sage-900/60 bg-sage-50/50 dark:bg-sage-950/40 px-4 py-3"
      >
        <MascotFigure pose="sip" size="xs" class="hidden sm:block" />
        <div class="flex min-w-0 items-start gap-3">
          <svg
            class="mt-0.5 h-5 w-5 shrink-0 text-sage-600 dark:text-sage-500 sm:hidden"
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
          <p class="text-sm leading-relaxed text-sage-700 dark:text-sage-300">
            <strong class="font-semibold text-sage-900 dark:text-sage-100">
              {{ readyNow.length }} peran bisa kamu lamar sekarang juga
            </strong>
            — seluruh keterampilan intinya sudah kamu punya dan gajinya menutup Target Income:
            {{ readyNow.map((match) => match.role.title).join(', ') }}.
          </p>
        </div>
      </div>

      <p class="mt-5 text-sm text-ink-600 dark:text-ink-500">
        Menampilkan <strong class="font-medium text-ink-900 dark:text-cream-100">{{ visibleMatches.length }}</strong>
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

      <BaseCard v-else tone="soft" class="mt-4 border border-ink-200/50 dark:border-white/[0.08] border-dashed">
        <p class="text-sm leading-relaxed text-ink-600 dark:text-ink-400">
          Tidak ada peran yang cocok dengan filter ini. Coba longgarkan filternya — atau matikan
          "hanya yang menutup target" untuk melihat peran batu loncatan yang bisa dikejar lebih
          dulu.
        </p>
      </BaseCard>
    </section>

    <!-- ── Ringkasan skill gap → bahan roadmap ──────────────────────────── -->
    <section v-reveal v-if="stage === 'hasil' && gaps.length" class="relative z-10 mt-10">
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
            class="flex items-center gap-3 rounded-xl border border-ink-200/50 dark:border-white/[0.07] bg-white/40 dark:bg-white/[0.02] px-3 py-2.5 transition hover:bg-white dark:hover:bg-white/[0.04]"
          >
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10 text-[11px] font-semibold text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20"
            >
              {{ index + 1 }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="text-sm font-medium text-ink-900 dark:text-cream-100">{{ gap.skill.label }}</span>
              <span class="ml-2 text-xs text-ink-500 dark:text-ink-500">{{ gap.skill.category }}</span>
            </span>
            <span class="shrink-0 text-xs tabular-nums text-ink-500 dark:text-ink-500">
              dibutuhkan {{ gap.roles }} peran
            </span>
          </li>
        </ol>

        <template #footer>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm leading-relaxed text-ink-600 dark:text-ink-400">
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

    <div class="relative z-10 mt-10">
      <BaseButton to="/audit" variant="ghost">← Kembali ke audit finansial</BaseButton>
    </div>
  </div>
  </div>
</template>
