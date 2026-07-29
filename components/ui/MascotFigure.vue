<script setup lang="ts">
import cape from '~/assets/img/cape.webp'
import hai from '~/assets/img/hai.webp'
import happy from '~/assets/img/happy.webp'
import hati from '~/assets/img/hati.webp'
import laptop from '~/assets/img/laptop.webp'
import lari from '~/assets/img/lari.webp'
import papan from '~/assets/img/papan.webp'
import sip from '~/assets/img/sip.webp'
import tanya from '~/assets/img/tanya.webp'
import tidur from '~/assets/img/tidur.webp'
import type { MascotPose, MascotSize } from '~/types/mascot'

/**
 * Maskot RintisUlang dalam satu pose. Berkasnya diimpor lewat Vite (bukan dari
 * `public/`) supaya ikut di-hash dan di-cache permanen oleh browser.
 *
 * Yang dipakai adalah `.webp` — versi turunan dari PNG master di folder yang
 * sama: sisi terpanjang dipotong ke 768px (cukup untuk layar 3x DPR pada
 * ukuran terbesar `lg`) dan bidang transparan di tepinya dibuang, supaya tinggi
 * CSS benar-benar menjadi tinggi maskot. Seluruh maskot jadi ~600 KB, bukan
 * 28 MB. Banyak calon user membuka ini dari kuota terbatas — PNG masternya
 * jangan pernah dirujuk langsung dari komponen.
 *
 * Bawaannya **dekoratif**: tanpa `alt`, gambar disembunyikan dari pembaca layar.
 * Itu memang yang diinginkan di sebagian besar tempat — maskotnya menemani teks
 * yang sudah menyampaikan maknanya. Isi `alt` hanya bila gambarnya benar-benar
 * membawa informasi yang tidak ada di teks sekitarnya.
 */
const props = withDefaults(
  defineProps<{
    pose: MascotPose
    size?: MascotSize
    /** Kosong = dekoratif (disembunyikan dari pembaca layar). */
    alt?: string
    /** Gerak mengambang halus. Otomatis mati di `prefers-reduced-motion`. */
    float?: boolean
    /** Untuk maskot yang terlihat tanpa scroll — jangan ditunda muatnya. */
    eager?: boolean
  }>(),
  { size: 'md', alt: '', float: false, eager: false },
)

const sources: Record<MascotPose, string> = {
  hai,
  papan,
  tanya,
  laptop,
  cape,
  sip,
  happy,
  hati,
  lari,
  tidur,
}

/**
 * Tinggi, bukan lebar: tiap pose punya rasio berbeda (sayap terbentang jauh
 * lebih lebar daripada pose berdiri), dan yang harus konsisten antar-halaman
 * adalah seberapa "besar" maskotnya terlihat.
 */
const heights: Record<MascotSize, string> = {
  xs: 'h-12 sm:h-14',
  sm: 'h-20 sm:h-24',
  md: 'h-28 sm:h-32',
  lg: 'h-40 sm:h-48',
}
</script>

<template>
  <img
    :src="sources[props.pose]"
    :alt="props.alt"
    :aria-hidden="props.alt ? undefined : 'true'"
    :loading="props.eager ? 'eager' : 'lazy'"
    :fetchpriority="props.eager ? 'high' : undefined"
    decoding="async"
    draggable="false"
    class="pointer-events-none w-auto shrink-0 select-none [filter:drop-shadow(0_10px_18px_rgb(55_50_42/0.18))]"
    :class="[heights[props.size], props.float && 'animate-float']"
  />
</template>
