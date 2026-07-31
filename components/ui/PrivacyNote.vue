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
      <Icon name="lucide:shield-check" :class="compact ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'" aria-hidden="true" />
    </span>
    <p class="leading-relaxed">
      <slot>
        Angka utangmu diproses <strong class="font-semibold">sepenuhnya di perangkat ini</strong>.
        Tidak ada nominal, bunga, atau nama pinjaman yang dikirim ke server kami.
      </slot>
    </p>
  </div>
</template>
