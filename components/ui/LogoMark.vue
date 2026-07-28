<script setup lang="ts">
/**
 * Lambang RintisUlang: tiga anak tangga yang menanjak, diakhiri titik terang.
 * Metaforanya sengaja "naik bertahap", bukan roket — pemulihan itu bertahap.
 */
withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'md' })
</script>

<template>
  <span
    class="relative flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-brand-700 text-cream-50 shadow-brand"
    :class="size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'"
    aria-hidden="true"
  >
    <svg
      :class="size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.9"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 15.5h3.2v-3.2M6.2 12.3h3.2V9.1M9.4 9.1h3.2V5.9" />
      <circle cx="15.6" cy="4.4" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  </span>
</template>
