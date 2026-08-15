<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFinancialStore } from '~/stores/financial'
import type { MonthSnapshot, PayoffMilestone } from '~/types/financial'

/**
 * Kurva sisa utang dari bulan ke bulan.
 *
 * Satu seri data saja (total sisa utang), jadi tidak perlu kotak legenda —
 * judul kartu sudah menyebut apa yang diplot. Titik sage adalah anotasi
 * milestone "satu utang lunas", bukan seri kedua.
 *
 * Path digambar di SVG (skala bebas), sedangkan seluruh teks dan titik
 * dirender sebagai HTML absolut supaya tetap tajam dan bulat di layar sempit.
 */
const props = defineProps<{
  timeline: MonthSnapshot[]
  /** Total utang sebelum pembayaran pertama — jadi titik bulan ke-0. */
  startTotal: number
  milestones: PayoffMilestone[]
}>()

interface Point {
  month: number
  remaining: number
  cumulativeInterest: number
  paid: number
  cleared: string[]
  /** Persen posisi di area plot. */
  x: number
  y: number
}

const financial = useFinancialStore() // 2. Inisialisasi store

/** 3. Tambahkan pengecekan tipe utang */
const hasOnlySimplifiedDebts = computed(() =>
  financial.validDebts.length > 0 &&
  financial.validDebts.every((d) => d.calcMode === 'simplified')
)

const hasSimplifiedDebts = computed(() =>
  financial.validDebts.some((d) => d.calcMode === 'simplified')
)

/** Jumlah sela antar garis bantu horizontal. */
const Y_INTERVALS = 4

/**
 * Tentukan batas atas sumbu Y lewat *jarak antar garis*, bukan lewat nilai
 * maksimumnya. Tangga 1 / 2 / 2,5 / 5 / 10 dipilih karena kelipatannya selalu
 * jatuh di angka bulat — jadi label seperti "3,75 jt" (yang akan dibulatkan
 * jadi "3,8 jt" dan menyesatkan) tidak akan pernah muncul.
 */
function niceMax(value: number): number {
  if (value <= 0) return 1

  const rawStep = value / Y_INTERVALS
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const step = ([1, 2, 2.5, 5, 10].find((s) => normalized <= s) ?? 10) * magnitude

  return step * Y_INTERVALS
}

const maxY = computed(() => niceMax(props.startTotal))

const points = computed<Point[]>(() => {
  const rows = [
    {
      month: 0,
      remaining: props.startTotal,
      cumulativeInterest: 0,
      paid: 0,
      cleared: [] as string[],
    },
    ...props.timeline.map((snapshot) => ({
      month: snapshot.month,
      remaining: snapshot.totalRemaining,
      cumulativeInterest: snapshot.cumulativeInterest,
      paid: snapshot.totalPaid,
      cleared: snapshot.clearedThisMonth,
    })),
  ]

  const lastIndex = Math.max(1, rows.length - 1)
  return rows.map((row, index) => ({
    ...row,
    x: (index / lastIndex) * 100,
    y: (1 - row.remaining / maxY.value) * 100,
  }))
})

const linePath = computed(() =>
  points.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' '),
)

const areaPath = computed(() => {
  const pts = points.value
  if (pts.length < 2) return ''
  return `${linePath.value} L${pts[pts.length - 1]!.x.toFixed(3)},100 L${pts[0]!.x.toFixed(3)},100 Z`
})

/** Garis bantu horizontal, termasuk garis dasar. */
const yTicks = computed(() =>
  Array.from({ length: Y_INTERVALS + 1 }, (_, i) => {
    const fraction = i / Y_INTERVALS
    return { value: maxY.value * fraction, y: (1 - fraction) * 100 }
  }),
)

/** Label sumbu X dipilih jarang supaya tidak bertabrakan. */
const xTicks = computed(() => {
  const pts = points.value
  const target = Math.min(6, pts.length)
  if (target < 2) return []

  const stride = (pts.length - 1) / (target - 1)
  const seen = new Set<number>()
  return Array.from({ length: target }, (_, i) => pts[Math.round(i * stride)]!)
    .filter((p) => (seen.has(p.month) ? false : seen.add(p.month)))
    .map((p) => ({ month: p.month, x: p.x }))
})

/** Beberapa utang bisa lunas di bulan yang sama — digabung jadi satu titik. */
const milestonePoints = computed(() => {
  const byMonth = new Map<number, string[]>()
  for (const milestone of props.milestones) {
    const names = byMonth.get(milestone.month) ?? []
    names.push(milestone.name || 'Utang tanpa nama')
    byMonth.set(milestone.month, names)
  }

  return Array.from(byMonth.entries())
    .map(([month, names]) => {
      const point = points.value.find((p) => p.month === month)
      return point ? { month, names, x: point.x, y: point.y } : null
    })
    .filter((item): item is { month: number; names: string[]; x: number; y: number } => item !== null)
})

/* ── Interaksi ──────────────────────────────────────────────────────────── */

const activeIndex = ref<number | null>(null)
const plotRef = ref<HTMLElement | null>(null)

const activePoint = computed(() =>
  activeIndex.value === null ? null : (points.value[activeIndex.value] ?? null),
)

function indexFromClientX(clientX: number): number {
  const rect = plotRef.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return 0
  const ratio = (clientX - rect.left) / rect.width
  const index = Math.round(ratio * (points.value.length - 1))
  return Math.min(points.value.length - 1, Math.max(0, index))
}

function onPointerMove(event: PointerEvent) {
  activeIndex.value = indexFromClientX(event.clientX)
}

function onKeydown(event: KeyboardEvent) {
  const last = points.value.length - 1
  const current = activeIndex.value ?? 0

  const next = {
    ArrowLeft: current - 1,
    ArrowRight: current + 1,
    Home: 0,
    End: last,
  }[event.key]

  if (next === undefined) return
  event.preventDefault()
  activeIndex.value = Math.min(last, Math.max(0, next))
}

/** Geser tooltip agar tidak keluar dari kartu di kedua ujung. */
const tooltipTransform = computed(() => {
  const x = activePoint.value?.x ?? 50
  if (x < 20) return 'translateX(0)'
  if (x > 80) return 'translateX(-100%)'
  return 'translateX(-50%)'
})

const showTable = ref(false)

const summaryLabel = computed(
  () =>
    `Grafik sisa utang dari ${formatIDR(props.startTotal)} pada bulan ke-0 hingga lunas pada bulan ke-${points.value.at(-1)?.month ?? 0}.`,
)
</script>

<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p class="flex items-center gap-4 text-xs text-ink-600 dark:text-ink-500">
        <span class="flex items-center gap-1.5">
          <span class="h-0.5 w-4 rounded-full bg-brand-600" />
          Sisa utang
        </span>
        <span class="flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-full bg-sage-600 ring-2 ring-white dark:ring-ink-900" />
          Satu utang lunas
        </span>
      </p>

      <button
        type="button"
        class="focus-ring dark:focus-ring-dark rounded-lg px-2 py-1 text-xs font-medium text-ink-600 dark:text-ink-400 transition hover:bg-white dark:hover:bg-white/[0.05] hover:text-ink-900 dark:hover:text-ink-300"
        :aria-pressed="showTable"
        @click="showTable = !showTable"
      >
        {{ showTable ? 'Lihat grafik' : 'Lihat sebagai tabel' }}
      </button>
    </div>

    <!-- ── Grafik ──────────────────────────────────────────────────────── -->
    <div v-show="!showTable">
      <div class="relative pr-2 pb-6 pl-16">
        <!-- Label sumbu Y -->
        <div class="pointer-events-none absolute top-0 bottom-6 left-0 w-14">
          <span
            v-for="tick in yTicks"
            :key="tick.value"
            class="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-ink-500 dark:text-ink-400"
            :style="{ top: `${tick.y}%` }"
          >
            {{ formatCompactIDR(tick.value) }}
          </span>
        </div>

        <div
          ref="plotRef"
          class="focus-ring dark:focus-ring-dark relative h-56 w-full touch-pan-y rounded-lg sm:h-64"
          tabindex="0"
          role="img"
          :aria-label="summaryLabel"
          @pointermove="onPointerMove"
          @pointerdown="onPointerMove"
          @pointerleave="activeIndex = null"
          @blur="activeIndex = null"
          @keydown="onKeydown"
        >
          <svg
            class="absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="payoff-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--color-brand-600)" stop-opacity="0.16" />
                <stop offset="100%" stop-color="var(--color-brand-600)" stop-opacity="0.01" />
              </linearGradient>
            </defs>

            <!-- Garis bantu: hairline solid, satu tingkat dari warna latar -->
            <line
              v-for="tick in yTicks"
              :key="tick.value"
              x1="0"
              :y1="tick.y"
              x2="100"
              :y2="tick.y"
              stroke="currentColor"
              class="text-ink-200/50 dark:text-white/[0.08]"
              stroke-width="1"
              vector-effect="non-scaling-stroke"
            />

            <path :d="areaPath" fill="url(#payoff-fill)" />

            <path
              :d="linePath"
              fill="none"
              stroke="var(--color-brand-600)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
            />

            <line
              v-if="activePoint"
              :x1="activePoint.x"
              y1="0"
              :x2="activePoint.x"
              y2="100"
              stroke="currentColor"
              class="text-ink-300/80 dark:text-white/[0.4]"
              stroke-width="1"
              vector-effect="non-scaling-stroke"
            />
          </svg>

          <!-- Titik milestone: HTML supaya tetap bulat saat plot melebar -->
          <span
            v-for="milestone in milestonePoints"
            :key="milestone.month"
            class="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sage-500 ring-2 ring-white dark:ring-ink-900"
            :style="{ left: `${milestone.x}%`, top: `${milestone.y}%` }"
            :title="`Bulan ke-${milestone.month}: ${milestone.names.join(', ')} lunas`"
          />

          <!-- Titik hover -->
          <span
            v-if="activePoint"
            class="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-ink-900"
            :style="{ left: `${activePoint.x}%`, top: `${activePoint.y}%` }"
          />

          <!-- Tooltip -->
          <div
            v-if="activePoint"
            class="pointer-events-none absolute z-10 w-max max-w-56 rounded-xl border border-ink-200/50 dark:border-white/[0.08] bg-white/95 dark:bg-ink-800 px-3 py-2 shadow-lift backdrop-blur-sm"
            :style="{
              left: `${activePoint.x}%`,
              top: `${Math.min(activePoint.y, 70)}%`,
              transform: `${tooltipTransform} translateY(-115%)`,
            }"
          >
            <p class="text-[11px] font-medium text-ink-600 dark:text-ink-400">
              {{ activePoint.month === 0 ? 'Sebelum mulai' : `Bulan ke-${activePoint.month}` }}
            </p>
            <p class="mt-0.5 text-sm font-semibold tabular-nums text-ink-900 dark:text-cream-50">
              {{ formatIDR(activePoint.remaining) }}
            </p>
            
            <!-- PENYESUAIAN BUNGA TOOLTIP -->
            <div v-if="activePoint.month > 0" class="mt-1 text-[11px] tabular-nums text-ink-600 dark:text-ink-400">
              <template v-if="hasOnlySimplifiedDebts">
                Bunga: Sudah All-in
              </template>
              <template v-else>
                Bunga terkumpul {{ formatIDR(activePoint.cumulativeInterest) }}
                <span v-if="hasSimplifiedDebts" class="block text-[9px] leading-tight text-ink-500 mt-0.5">
                  *di luar paylater
                </span>
              </template>
            </div>
            
            <p v-if="activePoint.cleared.length" class="mt-1 text-[11px] font-medium text-sage-600 dark:text-sage-300">
              {{ activePoint.cleared.join(', ') }} lunas
            </p>
          </div>
        </div>

        <!-- Label sumbu X -->
        <div class="pointer-events-none absolute inset-x-0 bottom-0 h-6 pr-2 pl-16">
          <span
            v-for="tick in xTicks"
            :key="tick.month"
            class="absolute top-1 -translate-x-1/2 text-[10px] tabular-nums text-ink-500 dark:text-ink-400"
            :style="{ left: `${tick.x}%` }"
          >
            {{ tick.month }}
          </span>
        </div>
      </div>

      <p class="mt-1 text-center text-[11px] text-ink-500 dark:text-ink-400">Bulan ke-</p>
    </div>

    <!-- ── Tabel: kembaran grafik yang bisa dibaca tanpa warna ──────────── -->
    <div v-show="showTable" class="max-h-72 overflow-y-auto rounded-xl border border-ink-200/50 dark:border-white/[0.08]">
      <table class="w-full text-left text-sm">
        <thead class="sticky top-0 bg-ink-50 dark:bg-ink-800 text-xs text-ink-600 dark:text-ink-400">
          <tr>
            <th scope="col" class="px-3 py-2 font-medium">Bulan</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">Sisa utang</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">Dibayar</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">Bunga</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100 dark:divide-white/[0.08]">
          <tr v-for="point in points" :key="point.month" class="even:bg-white/50 dark:even:bg-white/[0.02]">
            <th scope="row" class="px-3 py-1.5 text-xs font-medium text-ink-600 dark:text-ink-400">
              {{ point.month === 0 ? 'Awal' : point.month }}
              <span v-if="point.cleared.length" class="ml-1 font-normal text-sage-600 dark:text-sage-400">
                · {{ point.cleared.join(', ') }} lunas
              </span>
            </th>
            <td class="px-3 py-1.5 text-right text-xs tabular-nums text-ink-900 dark:text-cream-50">
              {{ formatIDR(point.remaining) }}
            </td>
            <td class="px-3 py-1.5 text-right text-xs tabular-nums text-ink-600 dark:text-ink-400">
              {{ point.month === 0 ? '—' : formatIDR(point.paid) }}
            </td>
            <td class="px-3 py-1.5 text-right text-xs tabular-nums text-ink-600 dark:text-ink-400">
              <template v-if="point.month === 0">
                -
              </template>
              <template v-else-if="hasOnlySimplifiedDebts">
                All-in
              </template>
              <template v-else>
                {{ formatIDR(point.cumulativeInterest) }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
