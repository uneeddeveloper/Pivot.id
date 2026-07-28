<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
</script>

<template>
  <div
    class="flex items-start gap-3 rounded-xl border border-sage-200 bg-linear-to-br from-sage-50 to-sage-100/60 px-4 py-3 text-sage-800"
    :class="compact ? 'text-xs' : 'text-sm'"
  >
    <span
      class="flex shrink-0 items-center justify-center rounded-lg bg-sage-200/70 text-sage-700"
      :class="compact ? 'h-6 w-6' : 'h-8 w-8'"
    >
      <svg
        :class="compact ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M10 1.5 3.5 4v5.2c0 4 2.7 7.7 6.5 9.3 3.8-1.6 6.5-5.3 6.5-9.3V4L10 1.5Zm3.1 6.6-3.6 3.6a.75.75 0 0 1-1.06 0L6.9 10.1a.75.75 0 1 1 1.06-1.06l1 1 3.08-3.07a.75.75 0 1 1 1.06 1.06Z"
          clip-rule="evenodd"
        />
      </svg>
    </span>
    <p class="leading-relaxed">
      <slot>
        Angka utangmu diproses <strong class="font-semibold">sepenuhnya di perangkat ini</strong>.
        Tidak ada nominal, bunga, atau nama pinjaman yang dikirim ke server kami.
      </slot>
    </p>
  </div>
</template>
