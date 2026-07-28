<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    placeholder?: string
    /** Nol ditampilkan sebagai field kosong agar form tidak terasa "menagih". */
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
      <span
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 font-medium text-ink-400 transition group-focus-within/input:text-brand-600"
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
        class="focus-ring w-full rounded-xl border border-ink-200 bg-white text-right tabular-nums text-ink-900 shadow-inner transition placeholder:text-ink-300 hover:border-ink-300 focus:border-brand-400"
        :class="
          emphasis
            ? 'py-3.5 pr-4 pl-12 text-lg font-semibold'
            : 'py-2.5 pr-3 pl-10 text-sm'
        "
        @input="onInput"
      />
    </div>
    <p v-if="hint" class="mt-1 text-right text-xs text-ink-400">{{ hint }}</p>
  </div>
</template>
