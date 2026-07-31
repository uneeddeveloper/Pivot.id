<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    placeholder?: string
    id?: string
    /** Field utama halaman — dibuat lebih besar supaya jelas mana yang wajib diisi. */
    emphasis?: boolean
  }>(),
  { placeholder: '0', emphasis: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const display = ref(props.modelValue > 0 ? formatNumber(props.modelValue) : '')

watch(
  () => props.modelValue,
  (value) => {
    const parsed = Number(display.value.replace(/\D/g, '')) || 0
    if (parsed !== value) display.value = value > 0 ? formatNumber(value) : ''
  },
)

function onInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value.replace(/\D/g, '')
  const value = raw === '' ? 0 : Number(raw)
  display.value = raw === '' ? '' : formatNumber(value)
  emit('update:modelValue', value)
}

const hint = computed(() => (props.modelValue > 0 ? formatIDR(props.modelValue) : ''))
</script>

<template>
  <div>
    <div class="group/input relative">
      <!-- Prefix "Rp" -->
      <span
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 font-medium text-ink-500 transition group-focus-within/input:text-brand-400"
        :class="emphasis ? 'text-base' : 'text-sm'"
      >
        Rp
      </span>

      <input
        :id="id"
        :value="display"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        :placeholder="placeholder"
        class="w-full rounded-xl border bg-white dark:bg-ink-800 text-right tabular-nums text-ink-900 dark:text-cream-100 transition placeholder:text-ink-400 dark:placeholder:text-ink-600 hover:border-ink-300 dark:hover:border-white/[0.18] focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        :class="[
          emphasis
            ? 'py-3.5 pr-4 pl-12 text-lg font-semibold'
            : 'py-2.5 pr-3 pl-10 text-sm',
          'border-ink-200 dark:border-white/[0.1] focus:border-brand-400 dark:focus:border-brand-500',
        ]"
        @input="onInput"
      />
    </div>

    <!-- Hint formatted IDR -->
    <p v-if="hint" class="mt-1.5 text-right text-xs text-ink-500">{{ hint }}</p>
  </div>
</template>
