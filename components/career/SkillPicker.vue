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
      <Icon name="lucide:star" class="h-5 w-5" />
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
            <Icon name="lucide:check" v-if="career.ownedSkills.includes(skill.id)" class="h-3 w-3 shrink-0" aria-hidden="true" />
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
