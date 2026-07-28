<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'quiet'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit' | 'reset'
    to?: string
    disabled?: boolean
    block?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button', disabled: false, block: false },
)

const classes = computed(() => [
  'focus-ring group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-medium',
  'transition duration-200 ease-out active:translate-y-0 active:scale-[0.98]',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
  props.block ? 'w-full' : '',
  {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }[props.size],
  {
    // Gradasi + bayangan hangat: tombol utama harus terbaca sebagai satu-satunya
    // aksi paling penting di layarnya.
    primary:
      'bg-linear-to-b from-brand-500 to-brand-700 text-cream-50 shadow-brand hover:-translate-y-0.5 hover:from-brand-500 hover:to-brand-800 hover:shadow-lift',
    secondary:
      'bg-linear-to-b from-cream-200 to-cream-300 text-brand-800 shadow-soft hover:-translate-y-0.5 hover:to-cream-400',
    ghost:
      'border border-ink-200 bg-white/70 text-ink-700 backdrop-blur-sm hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:text-brand-700 hover:shadow-soft',
    quiet: 'text-ink-500 hover:bg-ink-100 hover:text-ink-700',
  }[props.variant],
])

/** Kilau tipis yang menyapu tombol utama saat hover. */
const showSheen = computed(() => props.variant === 'primary' || props.variant === 'secondary')
</script>

<template>
  <component
    :is="to ? resolveComponent('NuxtLink') : 'button'"
    v-bind="to ? { to } : { type, disabled }"
    :class="classes"
  >
    <span
      v-if="showSheen"
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-full"
    />
    <span class="relative flex items-center gap-2"><slot /></span>
  </component>
</template>
