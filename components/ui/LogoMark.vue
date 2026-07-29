<script setup lang="ts">
import logo from '~/assets/img/logo.webp'

/**
 * Lambang Pivot: huruf P dengan grafik yang berbelok lalu menanjak di dalamnya.
 * Metaforanya berputar arah — bukan mengulang jalan yang sama.
 *
 * Sumbernya `.webp` turunan dari `logo.png` di folder yang sama: bidang
 * transparan di tepinya dibuang dan sisi terpanjang dipotong ke 256px (cukup
 * untuk layar 3x DPR pada ukuran terbesar). 12 KB, bukan 128 KB — PNG masternya
 * jangan pernah dirujuk langsung dari komponen.
 *
 * Selalu dekoratif: setiap pemakaiannya berdampingan dengan wordmark "Pivot",
 * jadi gambarnya disembunyikan dari pembaca layar supaya nama aplikasi tidak
 * dibacakan dua kali.
 */
withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'md' })
</script>

<template>
  <img
    :src="logo"
    alt=""
    aria-hidden="true"
    decoding="async"
    draggable="false"
    class="w-auto shrink-0 select-none [filter:drop-shadow(0_4px_8px_rgb(113_20_11/0.25))]"
    :class="size === 'sm' ? 'h-7' : 'h-9'"
  />
</template>
