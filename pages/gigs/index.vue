<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCareerStore } from '~/stores/career'
import { useCatalogStore } from '~/stores/catalog'
import { useFinancialStore } from '~/stores/financial'
import { useGigStore } from '~/stores/gigs'

/**
 * Langkah 5 — Penghasilan Cepat.
 *
 * KENAPA LANGKAH INI ADA
 *   Lamaran kerja tetap butuh dua sampai enam minggu sampai dijawab. Cicilan
 *   tidak menunggu selama itu. Langkah 4 menjawab "kerja apa yang menutup
 *   kebutuhan bulananku"; halaman ini menjawab pertanyaan yang jauh lebih
 *   mendesak: "apa yang bisa menghasilkan uang minggu ini, dengan yang sudah
 *   kupunya sekarang".
 *
 * PRIVASI — INI HALAMAN PALING KETAT DI SELURUH APLIKASI
 *   Satu-satunya permintaan jaringan di sini adalah GET /api/gigs dan
 *   GET /api/catalog, keduanya hanya membaca katalog publik. Kebutuhan rupiah
 *   dan jam yang tersedia — yang berasal dari data utang user — tidak pernah
 *   dikirim ke mana pun. Seluruh pencocokan dan penyusunan rencana berjalan di
 *   browser lewat `composables/useGigPlanner.ts`. Jangan menambahkan endpoint
 *   yang menerima `need` atau `hoursAvailable`.
 */

useHead({ title: 'Penghasilan Cepat — Pivot' })

const financial = useFinancialStore()
const career = useCareerStore()
const catalog = useCatalogStore()
const gigStore = useGigStore()

// Katalog skill dibutuhkan untuk menampilkan label keterampilan di tiap kartu.
await useAsyncData('catalog', () => catalog.load())
await useAsyncData('gigs', () => gigStore.load())

// ── Masukan user ────────────────────────────────────────────────────────────

/** Dimulai dari cicilan terdekat kalau memang ada — bukan dari angka kosong. */
const need = ref(financial.dueThisWeek)
const hoursAvailable = ref(14)

/**
 * Pintasan dari hasil langkah 1. Yang bernilai 0 dibuang: tombol yang mengisi
 * nol hanya membuat user mengira ia salah menekan.
 */
const presets = computed(() => {
  const items: { label: string; value: number; hint: string }[] = []

  if (financial.dueThisWeek > 0) {
    items.push({
      label: 'Cicilan 7 hari ke depan',
      value: financial.dueThisWeek,
      hint: 'Yang paling mendesak',
    })
  }

  if (financial.livingCost > 0) {
    items.push({
      label: 'Biaya hidup 1 minggu',
      value: Math.round(financial.livingCost / 4),
      hint: 'Supaya minggu ini aman',
    })
  }

  if (financial.summary.targetIncome > 0) {
    items.push({
      label: 'Target Income 1 bulan',
      value: financial.summary.targetIncome,
      hint: 'Kalau ingin ditutup dari gig saja',
    })
  }

  return items
})

// ── Batasan ─────────────────────────────────────────────────────────────────

const category = ref<string>('')
const noCapitalOnly = ref(false)
const remoteOnly = ref(false)

const allMatches = computed(() =>
  matchGigs(gigStore.gigs, career.ownedSkills, need.value, hoursAvailable.value),
)

/**
 * Batasan berlaku untuk rencana DAN daftar. "Tanpa modal" dan "dari rumah"
 * bukan preferensi tampilan — keduanya menentukan apa yang benar-benar bisa
 * dikerjakan user, jadi rencana yang mengabaikannya tidak ada gunanya.
 */
const matches = computed(() =>
  allMatches.value.filter((match) => {
    if (category.value && match.gig.category !== category.value) return false
    if (noCapitalOnly.value && match.gig.startupCost > 0) return false
    if (remoteOnly.value && !match.gig.remoteFriendly) return false
    return true
  }),
)

const plan = computed(() => buildGigPlan(matches.value, need.value, hoursAvailable.value))

/** Berapa yang benar-benar bisa dimulai hari ini juga: tanpa modal, skill sudah ada. */
const readyNowCount = computed(
  () =>
    matches.value.filter((match) => match.gig.startupCost === 0 && match.coverage >= 0.5).length,
)

const hasSkills = computed(() => career.ownedSkills.length > 0)

function resetFilters() {
  category.value = ''
  noCapitalOnly.value = false
  remoteOnly.value = false
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
        <StepProgress :current="5" class="max-w-md" />
        <h1 class="mt-6 text-3xl font-bold tracking-tight text-ink-900 dark:text-cream-50 sm:text-4xl">
          Penghasilan cepat sambil menunggu
        </h1>
        <p class="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-400 sm:text-base">
          Lamaran kerja biasanya baru dijawab dua sampai enam minggu. Cicilan tidak menunggu selama
          itu. Di sini kita cari yang bisa menghasilkan uang minggu ini — dengan keterampilan yang
          sudah kamu punya sekarang, bukan yang harus dipelajari dulu.
        </p>
      </div>

      <!-- `lari`: bergerak sekarang. Pose yang sama dipakai di ajakan penutup landing. -->
      <MascotFigure pose="lari" size="md" float eager class="hidden self-center lg:block" />
    </header>

    <!-- ── Kesiapan data ────────────────────────────────────────────────── -->
    <BaseCard v-reveal v-if="gigStore.error" tone="soft" class="relative z-10 mt-8">
      <p class="text-sm leading-relaxed text-ink-600 dark:text-ink-400">{{ gigStore.error }}</p>
    </BaseCard>

    <template v-else>
      <div v-reveal class="relative z-10 mt-8">
        <PrivacyNote>
          Halaman ini <strong class="font-semibold text-ink-900 dark:text-cream-50">tidak mengirim apa pun</strong> ke server selain
          permintaan membaca katalog. Angka kebutuhan dan jam kerjamu dihitung sepenuhnya di
          perangkat ini.
        </PrivacyNote>
      </div>

      <!-- ── Kebutuhan & waktu ──────────────────────────────────────────── -->
      <div v-reveal class="mt-6">
        <GigNeedForm
          v-model:need="need"
          v-model:hours-available="hoursAvailable"
          :presets="presets"
        />
      </div>

      <BaseCard v-reveal v-if="!hasSkills" tone="soft" class="relative z-10 mt-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="min-w-0">
            <p class="font-semibold text-ink-900 dark:text-cream-50">Keterampilanmu belum terdata</p>
            <p class="mt-1 max-w-lg text-sm leading-relaxed text-ink-600 dark:text-ink-400">
              Daftarnya tetap bisa dibaca. Tapi begitu langkah 2 selesai, gig yang keterampilannya
              sudah kamu punya akan naik ke urutan atas — dan itu yang paling cepat menghasilkan.
            </p>
          </div>
          <BaseButton to="/skill-gap" variant="ghost" class="shrink-0">
            Isi di langkah 2
          </BaseButton>
        </div>
      </BaseCard>

      <!-- ── Batasan ────────────────────────────────────────────────────── -->
      <section v-reveal class="relative z-10 mt-6" aria-label="Batasi pilihan gig">
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="focus-ring dark:focus-ring-dark rounded-full border px-3 py-1.5 text-xs font-medium transition"
            :class="
              category === ''
                ? 'border-brand-300 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300'
                : 'border-ink-200/50 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.02] text-ink-600 dark:text-ink-400 hover:border-ink-300 dark:hover:border-white/[0.15] hover:bg-white dark:hover:bg-white/[0.05]'
            "
            :aria-pressed="category === ''"
            @click="category = ''"
          >
            Semua jenis
          </button>
          <button
            v-for="item in gigStore.categories"
            :key="item"
            type="button"
            class="focus-ring dark:focus-ring-dark rounded-full border px-3 py-1.5 text-xs font-medium transition"
            :class="
              category === item
                ? 'border-brand-300 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300'
                : 'border-ink-200/50 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.02] text-ink-600 dark:text-ink-400 hover:border-ink-300 dark:hover:border-white/[0.15] hover:bg-white dark:hover:bg-white/[0.05]'
            "
            :aria-pressed="category === item"
            @click="category = item"
          >
            {{ item }}
          </button>

          <span class="mx-1 hidden h-5 w-px bg-ink-200/50 dark:bg-white/[0.08] sm:block" />

          <label
            class="flex cursor-pointer items-center gap-2 rounded-full border border-ink-200/50 dark:border-white/[0.08] bg-white/80 dark:bg-ink-800/80 px-3 py-1.5 text-xs text-ink-600 dark:text-ink-400 hover:border-ink-300 dark:hover:border-white/[0.15] transition"
          >
            <input
              v-model="noCapitalOnly"
              type="checkbox"
              class="focus-ring dark:focus-ring-dark h-3.5 w-3.5 rounded border-ink-300 dark:border-ink-600 bg-white dark:bg-ink-900 accent-brand-600"
            />
            Tanpa modal saja
          </label>
          <label
            class="flex cursor-pointer items-center gap-2 rounded-full border border-ink-200/50 dark:border-white/[0.08] bg-white/80 dark:bg-ink-800/80 px-3 py-1.5 text-xs text-ink-600 dark:text-ink-400 hover:border-ink-300 dark:hover:border-white/[0.15] transition"
          >
            <input
              v-model="remoteOnly"
              type="checkbox"
              class="focus-ring dark:focus-ring-dark h-3.5 w-3.5 rounded border-ink-300 dark:border-ink-600 bg-white dark:bg-ink-900 accent-brand-600"
            />
            Bisa dari rumah saja
          </label>
        </div>
      </section>

      <!-- ── Rencana ────────────────────────────────────────────────────── -->
      <section v-reveal v-if="need > 0" class="relative z-10 mt-6">
        <GigPlanSummary :plan="plan" />
      </section>

      <BaseCard v-reveal v-else tone="soft" class="relative z-10 mt-6">
        <div class="flex items-center gap-4">
          <MascotFigure pose="tidur" size="sm" class="hidden sm:block" />
          <p class="text-sm leading-relaxed text-ink-600 dark:text-ink-400">
            Isi dulu <strong class="font-semibold text-ink-900 dark:text-cream-50">berapa yang harus terkumpul</strong> di atas.
            Dari angka itu kami susun kombinasi gig yang menutupinya, lengkap dengan berapa jam
            kerjanya. Daftar lengkapnya tetap bisa kamu baca di bawah.
          </p>
        </div>
      </BaseCard>

      <!-- ── Peringatan penipuan ────────────────────────────────────────── -->
      <div
        v-reveal
        class="relative z-10 mt-6 rounded-2xl border border-amber-200/50 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/40 px-5 py-4 text-sm leading-relaxed text-amber-700 dark:text-amber-200/90"
      >
        <p class="flex items-center gap-2 font-semibold">
          <Icon name="lucide:triangle-alert" class="h-4 w-4 shrink-0" aria-hidden="true" />
          Satu aturan yang tidak ada pengecualiannya
        </p>
        <p class="mt-1.5 text-amber-600 dark:text-amber-200/70">
          Pekerjaan yang sah <strong class="font-semibold text-amber-700 dark:text-amber-100">tidak pernah meminta uang</strong> dari
          orang yang mau bekerja. Biaya pendaftaran, biaya seragam, deposit, "biaya administrasi",
          atau paket modal awal yang harus dibeli dulu — semuanya penipuan, sebesar apa pun
          bayaran yang dijanjikan. Orang yang sedang butuh uang justru yang paling sering
          disasar dengan cara ini.
        </p>
      </div>

      <!-- ── Daftar gig ─────────────────────────────────────────────────── -->
      <section v-reveal class="relative z-10 mt-10">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-ink-900 dark:text-cream-50">
              {{ matches.length }} pekerjaan lepas
            </h2>
            <p class="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-600 dark:text-ink-400">
              Diurutkan dari yang paling bisa kamu mulai hari ini: tanpa modal lebih dulu, lalu
              yang keterampilannya sudah kamu punya, baru bayarannya.
            </p>
          </div>

          <BaseButton
            v-if="category || noCapitalOnly || remoteOnly"
            variant="ghost"
            size="sm"
            @click="resetFilters"
          >
            Tampilkan semua lagi
          </BaseButton>
        </div>

        <div
          v-if="readyNowCount > 0"
          class="mt-5 flex items-center gap-3 rounded-2xl border border-sage-200 dark:border-sage-900/60 bg-sage-50/50 dark:bg-sage-950/40 px-4 py-3"
        >
          <MascotFigure pose="sip" size="xs" class="hidden shrink-0 sm:block" />
          <p class="text-sm leading-relaxed text-sage-800 dark:text-sage-300">
            <strong class="font-semibold text-sage-700 dark:text-sage-200">{{ readyNowCount }} di antaranya</strong>
            bisa kamu mulai hari ini juga — tanpa modal, dan sebagian besar keterampilannya sudah
            kamu punya.
          </p>
        </div>

        <div v-if="matches.length" class="mt-5 grid gap-4 lg:grid-cols-2">
          <GigCard
            v-for="(match, i) in matches"
            :key="match.gig.id"
            class="stagger-item"
            :style="{ animationDelay: `${i * 0.1}s` }"
            :match="match"
            :hours-available="hoursAvailable"
          />
        </div>

        <BaseCard v-else tone="soft" class="mt-5 border border-ink-200/50 dark:border-white/[0.08] border-dashed">
          <div class="flex items-center gap-4">
            <MascotFigure pose="tidur" size="sm" class="hidden sm:block" />
            <p class="text-sm leading-relaxed text-ink-600 dark:text-ink-400">
              Tidak ada gig yang cocok dengan batasan yang kamu pilih. Coba longgarkan salah
              satunya — mengizinkan pekerjaan di luar rumah biasanya membuka paling banyak pilihan.
            </p>
          </div>
        </BaseCard>
      </section>

      <p v-reveal class="relative z-10 mt-8 max-w-3xl text-xs leading-relaxed text-ink-600 dark:text-ink-500">
        Rentang bayaran di halaman ini adalah tarif pasar untuk pemula dan bisa berbeda di kotamu.
        Pakai sebagai ancar-ancar saat menentukan harga, bukan sebagai janji. Micro-gig menutup
        lubang jangka pendek — yang membuatmu benar-benar berdiri tetap pekerjaan dengan
        penghasilan tetap di langkah 4.
      </p>
    </template>

    <div class="relative z-10 mt-10 flex flex-wrap gap-3">
      <BaseButton to="/jobs" variant="ghost">← Kembali ke lowongan & CV</BaseButton>
      <BaseButton to="/audit" variant="quiet">Perbarui angka di langkah 1</BaseButton>
    </div>
  </div>
  </div>
</template>
