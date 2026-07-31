<script setup lang="ts">
import { computed } from 'vue'
// NuxtLink diimpor dari `#components`, bukan lewat `resolveComponent('NuxtLink')`.
// Nuxt menyuntikkan komponen auto-import saat kompilasi, jadi tidak ada registrasi
// global yang bisa ditemukan `resolveComponent` saat runtime — resolusinya gagal dan
// `<component :is>` jatuh ke elemen mentah yang tidak bisa diklik sama sekali.
import { NuxtLink } from '#components'

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
  'focus-ring dark:focus-ring-dark group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-medium',
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
      'bg-linear-to-b from-brand-500 to-brand-700 text-cream-50 shadow-brand hover:-translate-y-0.5 hover:from-brand-500 hover:to-brand-800 hover:shadow-lift dark:from-brand-600 dark:to-brand-800 dark:shadow-[0_0_15px_rgba(235,53,36,0.3)] dark:hover:from-brand-500 dark:hover:to-brand-700 dark:hover:shadow-[0_0_20px_rgba(235,53,36,0.5)] dark:border dark:border-brand-500/20',
    secondary:
      'bg-linear-to-b from-cream-200 to-cream-300 text-brand-800 shadow-soft hover:-translate-y-0.5 hover:to-cream-400 dark:from-transparent dark:to-transparent dark:bg-white/[0.05] dark:border dark:border-white/[0.1] dark:text-cream-50 dark:hover:bg-white/[0.08] dark:hover:border-white/[0.15]',
    ghost:
      'border border-ink-200 bg-white/70 text-ink-700 backdrop-blur-sm hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:text-brand-700 hover:shadow-soft dark:border-dashed dark:border-white/[0.15] dark:bg-transparent dark:text-ink-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300',
    quiet: 'text-ink-500 hover:bg-ink-100 hover:text-ink-700 dark:text-ink-400 dark:hover:bg-white/[0.05] dark:hover:text-cream-50',
  }[props.variant],
])

/** Kilau tipis yang menyapu tombol utama saat hover. */
const showSheen = computed(() => props.variant === 'primary' || props.variant === 'secondary')
</script>

<template>
  <component
    :is="to ? NuxtLink : 'button'"
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
