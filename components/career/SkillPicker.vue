<script setup lang="ts">
import { computed } from 'vue'
import { useCareerStore } from '~/stores/career'
import { useCatalogStore } from '~/stores/catalog'

const career = useCareerStore()
const catalog = useCatalogStore()

/** Kelompok chip mengikuti urutan kategori di database, bukan daftar hardcoded. */
const groups = computed(() => catalog.byCategory)
</script>

<template>
  <BaseCard
    title="Keterampilan yang sudah kamu punya"
    subtitle="Centang apa adanya. Yang dipelajari otodidak, dari kerja sampingan, atau dari mengurus usaha keluarga tetap dihitung."
  >
    <template #icon>
      <svg
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M10 2.5 12.4 7l5 .7-3.6 3.5.9 5-4.7-2.5-4.7 2.5.9-5L2.6 7.7l5-.7L10 2.5Z" />
      </svg>
    </template>

    <div class="space-y-5">
      <div v-for="group in groups" :key="group.category">
        <p class="text-[10px] font-semibold tracking-[0.14em] text-ink-600 dark:text-ink-500 uppercase">
          {{ group.category }}
        </p>
        <div class="mt-2.5 flex flex-wrap gap-2">
          <button
            v-for="skill in group.skills"
            :key="skill.id"
            type="button"
            :aria-pressed="career.ownedSkills.includes(skill.id)"
            class="focus-ring dark:focus-ring-dark flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition"
            :class="
              career.ownedSkills.includes(skill.id)
                ? 'border-sage-300 dark:border-sage-500/40 bg-sage-50 dark:bg-sage-900/60 font-medium text-sage-700 dark:text-sage-300'
                : 'border-ink-200/50 dark:border-white/[0.1] bg-white/50 dark:bg-ink-800 text-ink-600 dark:text-ink-400 hover:-translate-y-0.5 hover:border-sage-300 dark:hover:border-sage-500/30 hover:bg-sage-50 dark:hover:bg-sage-900/40 hover:text-sage-700 dark:hover:text-sage-300'
            "
            @click="career.toggleSkill(skill.id)"
          >
            <svg
              v-if="career.ownedSkills.includes(skill.id)"
              class="h-3 w-3 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                clip-rule="evenodd"
              />
            </svg>
            {{ skill.label }}
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-ink-600 dark:text-ink-400">
          <strong class="font-semibold text-sage-600 dark:text-sage-400">{{ career.ownedSkills.length }}</strong>
          keterampilan tercatat
        </p>
        <BaseButton
          v-if="career.hasSkills"
          variant="quiet"
          size="sm"
          @click="career.ownedSkills = []"
        >
          Kosongkan pilihan
        </BaseButton>
      </div>
    </template>
  </BaseCard>
</template>
