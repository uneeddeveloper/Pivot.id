<script setup lang="ts">
defineProps<{
  label: string
  hint?: string
  fieldId?: string
}>()
</script>

<template>
  <div>
    <label :for="fieldId" class="block text-sm font-medium text-ink-700 dark:text-ink-400">
      {{ label }}
    </label>
    <p v-if="hint" class="mt-0.5 mb-1.5 text-xs leading-relaxed text-ink-500">{{ hint }}</p>
    <div :class="hint ? '' : 'mt-1.5'">
      <slot />
    </div>
  </div>
</template>
