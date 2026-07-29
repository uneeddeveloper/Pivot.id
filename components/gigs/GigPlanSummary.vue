<script setup lang="ts">
import { computed } from 'vue'
import type { GigPlan } from '~/types/gigs'

/**
 * Rencana penutup kebutuhan jangka pendek.
 *
 * Kartu ini adalah jawaban halaman /gigs — sisanya (daftar gig) hanya bahan.
 * Karena itu bentuknya `surface-brand`, sama seperti kartu Target Income di
 * langkah 1: satu angka besar yang bisa dibawa pulang.
 *
 * PENANGANAN KONDISI BERAT
 *   Saat rencananya belum menutup kebutuhan, yang tampil adalah maskot `hati`
 *   dan selisih yang masih kurang beserta jam tambahan yang dibutuhkan — bukan
 *   ikon peringatan. Alasannya sama dengan `feasible: false` di simulasi utang:
 *   user yang sedang tertekan tidak butuh alarm, ia butuh angka berikutnya yang
 *   bisa dikejar.
 */
const props = defineProps<{ plan: GigPlan }>()

const plan = computed(() => props.plan)

/** Jam kerja ditulis "7,5 jam", bukan "7.5 jam". */
function hours(value: number): string {
  return `${formatNumber(Math.round(value * 10) / 10)} jam`
}

const payLabel = computed(() => {
  const days = plan.value.fastestPayDays
  if (days <= 1) return 'hari yang sama'
  if (days < 7) return `± ${days} hari`
  if (days < 30) return `± ${Math.round(days / 7)} minggu`
  return '± 1 bulan'
})
</script>

<template>
  <section
    v-if="plan.steps.length"
    class="surface-brand relative overflow-hidden rounded-2xl border border-brand-700/60 p-6 text-cream-100"
  >
    <div class="flex flex-wrap items-start justify-between gap-5">
      <div class="min-w-0">
        <p class="text-xs font-medium tracking-wide text-cream-100/75 uppercase">
          {{ plan.covered ? 'Rencana ini menutup kebutuhanmu' : 'Yang bisa kamu kumpulkan minggu ini' }}
        </p>
        <p class="mt-2 text-3xl font-bold tracking-tight tabular-nums text-cream-50 sm:text-4xl">
          {{ formatIDR(plan.estimatedMin) }}
        </p>
        <p class="mt-1 text-sm text-cream-100/80">
          bisa sampai {{ formatIDR(plan.estimatedMax) }} kalau tarifnya bagus ·
          {{ hours(plan.hoursUsed) }} kerja · uang pertama {{ payLabel }}
        </p>
      </div>

      <!-- Maskot mengikuti keadaan: perayaan hanya kalau memang tertutup. -->
      <MascotFigure
        :pose="plan.covered ? 'happy' : 'hati'"
        size="sm"
        class="hidden shrink-0 self-center sm:block"
      />
    </div>

    <!-- Langkah rencana -->
    <ol class="mt-6 space-y-2.5">
      <li
        v-for="(step, index) in plan.steps"
        :key="step.gig.id"
        class="flex items-start gap-3 rounded-xl border border-cream-100/20 bg-cream-100/10 px-4 py-3"
      >
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream-100/20 text-[11px] font-semibold text-cream-50"
        >
          {{ index + 1 }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-cream-50">
            {{ step.units }}× {{ step.gig.title }}
          </p>
          <p class="mt-0.5 text-xs text-cream-100/70">
            {{ step.gig.unit }} · ± {{ hours(step.hours) }}
          </p>
        </div>
        <p class="shrink-0 text-sm font-semibold tabular-nums text-cream-50">
          {{ formatIDR(step.earningsMin) }}
        </p>
      </li>
    </ol>

    <!-- Belum tertutup: sebut selisihnya, lalu sebut jalan keluarnya. -->
    <div
      v-if="!plan.covered && plan.shortfall > 0"
      class="mt-5 rounded-xl border border-cream-100/25 bg-cream-100/10 px-4 py-3"
    >
      <p class="text-sm leading-relaxed text-cream-50">
        Masih kurang
        <strong class="font-semibold tabular-nums">{{ formatIDR(plan.shortfall) }}</strong>
        dari kebutuhanmu.
      </p>

      <!--
        Di luar jangkauan: menyuruh "tambah jam lagi" di titik ini bukan saran,
        itu menyalahkan orang atas keadaan yang tidak bisa ia ubah. Yang
        ditawarkan jalan lain, bukan target yang mustahil.
      -->
      <p v-if="plan.beyondReach" class="mt-1 text-sm leading-relaxed text-cream-100/85">
        Angka sebesar ini tidak realistis dikejar dari kerja lepas dalam satu minggu — bukan karena
        jammu kurang, tapi karena pekerjaan lepas memang tidak datang sebanyak itu dalam tujuh hari.
        Yang lebih masuk akal: <strong class="font-semibold text-cream-50">pecah targetnya ke
        beberapa minggu</strong>. Kalau angka ini berasal dari cicilan, minta perpanjangan atau
        keringanan ke pemberi pinjaman sebelum tanggalnya lewat — dan untuk pinjaman ilegal,
        laporkan ke OJK di 157; bunga yang tidak sah tidak wajib kamu lunasi.
      </p>
      <p
        v-else-if="plan.extraHoursNeeded > 0"
        class="mt-1 text-sm leading-relaxed text-cream-100/85"
      >
        Dengan tambahan sekitar
        <strong class="font-semibold text-cream-50">{{ hours(plan.extraHoursNeeded) }}</strong>
        seminggu, sisanya tertutup. Kalau jamnya memang tidak ada, hubungi pemberi pinjaman untuk
        meminta perpanjangan sebelum tanggalnya lewat — itu jauh lebih murah daripada denda telat.
      </p>
    </div>

    <p class="mt-5 text-xs leading-relaxed text-cream-100/70">
      Angka besar di atas memakai tarif terendah tiap gig, bukan rata-rata. Rencana yang meleset ke
      bawah lebih mahal akibatnya daripada rencana yang kelewat hati-hati.
    </p>
  </section>

  <!-- Jam yang tersedia tidak cukup untuk satu satuan pekerjaan pun. -->
  <BaseCard v-else-if="plan.need > 0" tone="soft">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
      <MascotFigure pose="hati" size="sm" class="hidden shrink-0 sm:block" />
      <div class="min-w-0">
        <p class="font-semibold text-ink-900">
          Waktu yang tersedia belum cukup untuk satu pekerjaan pun
        </p>
        <p class="mt-1.5 text-sm leading-relaxed text-ink-600">
          Gig tercepat di daftar ini butuh beberapa jam untuk satu satuan pekerjaan. Coba naikkan
          jam yang tersedia — akhir pekan biasanya menyumbang paling banyak — atau turunkan target
          minggu ini dan kejar sisanya minggu depan.
        </p>
      </div>
    </div>
  </BaseCard>
</template>
