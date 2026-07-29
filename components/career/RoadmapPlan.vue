<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCatalogStore } from '~/stores/catalog'
import type { Roadmap } from '~/types/career'

/**
 * Tampilan roadmap belajar beserta pelacak kemajuannya.
 *
 * Centang kemajuan disimpan di memori komponen saja — sama seperti data lain
 * di aplikasi ini, tidak ada yang dikirim atau disimpan ke database. Konsekuensi
 * jujurnya: kemajuan hilang saat tab ditutup, dan itu disebutkan ke user, bukan
 * disembunyikan.
 */

const props = defineProps<{ roadmap: Roadmap }>()

const catalog = useCatalogStore()

/** Kunci tugas: nomor minggu + hari + judul, cukup unik tanpa id dari server. */
const done = ref<Set<string>>(new Set())

function taskKey(week: number, day: number, title: string) {
  return `${week}-${day}-${title}`
}

function toggle(key: string) {
  const next = new Set(done.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  done.value = next
}

const totalTasks = computed(() =>
  props.roadmap.weeks.reduce((sum, week) => sum + week.tasks.length, 0),
)

const completedCount = computed(() => done.value.size)

const progressPercent = computed(() =>
  totalTasks.value === 0 ? 0 : Math.round((completedCount.value / totalTasks.value) * 100),
)

const totalHours = computed(() =>
  props.roadmap.weeks.reduce(
    (sum, week) => sum + week.tasks.reduce((weekSum, task) => weekSum + task.estimatedHours, 0),
    0,
  ),
)

function skillLabel(skillId: string): string {
  return skillId ? (catalog.skillMap.get(skillId)?.label ?? '') : ''
}

/** Tautan pencarian, bukan URL karangan model. */
function searchLink(resource: { type: string; searchQuery: string }): string {
  const encoded = encodeURIComponent(resource.searchQuery)
  return resource.type.toLowerCase() === 'youtube'
    ? `https://www.youtube.com/results?search_query=${encoded}`
    : `https://www.google.com/search?q=${encoded}`
}
</script>

<template>
  <div class="space-y-6">
    <!-- ── Ringkasan & kemajuan ───────────────────────────────────────────── -->
    <BaseCard :title="roadmap.title" :subtitle="roadmap.intro">
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
          <path d="M3 5h14M3 10h14M3 15h9" />
        </svg>
      </template>

      <div class="flex items-baseline justify-between gap-3">
        <p class="text-sm text-ink-600">
          <strong class="font-semibold text-ink-900 tabular-nums">{{ completedCount }}</strong>
          dari {{ totalTasks }} tugas selesai
        </p>
        <p class="text-sm font-semibold tabular-nums text-brand-700">{{ progressPercent }}%</p>
      </div>
      <div class="mt-2 h-2 overflow-hidden rounded-full bg-sage-100">
        <div
          class="h-full rounded-full bg-sage-500 transition-all duration-500 ease-out"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>

      <p class="mt-3 text-xs leading-relaxed text-ink-400">
        Total sekitar {{ Math.round(totalHours) }} jam belajar. Centangnya hidup selama tab ini
        terbuka saja — tidak ada yang dikirim ke server, jadi juga tidak ada yang tersimpan.
      </p>
    </BaseCard>

    <!-- ── Minggu demi minggu ─────────────────────────────────────────────── -->
    <BaseCard
      v-for="week in roadmap.weeks"
      :key="week.week"
      :title="`Minggu ${week.week} — ${week.focus}`"
    >
      <div class="rounded-xl border border-sage-200 bg-sage-50 px-4 py-3">
        <p class="text-xs font-semibold tracking-widest text-sage-700 uppercase">
          Hasil akhir minggu ini
        </p>
        <p class="mt-1 text-sm leading-relaxed text-sage-800">{{ week.outcome }}</p>
      </div>

      <ol class="mt-4 space-y-2.5">
        <li
          v-for="task in week.tasks"
          :key="taskKey(week.week, task.day, task.title)"
          class="rounded-xl border border-ink-200/70 bg-white/60 px-3 py-2.5 transition"
          :class="done.has(taskKey(week.week, task.day, task.title)) ? 'opacity-60' : ''"
        >
          <label class="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              class="focus-ring mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 accent-sage-600"
              :checked="done.has(taskKey(week.week, task.day, task.title))"
              @change="toggle(taskKey(week.week, task.day, task.title))"
            />
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-baseline gap-x-2">
                <span
                  class="text-sm font-medium text-ink-800"
                  :class="done.has(taskKey(week.week, task.day, task.title)) ? 'line-through' : ''"
                >
                  {{ task.title }}
                </span>
                <span class="text-[11px] text-ink-400">Hari {{ task.day }}</span>
                <span class="text-[11px] tabular-nums text-ink-400">
                  ± {{ task.estimatedHours }} jam
                </span>
                <span
                  v-if="skillLabel(task.skillId)"
                  class="rounded-full bg-cream-100 px-2 py-0.5 text-[10px] text-ink-600"
                >
                  {{ skillLabel(task.skillId) }}
                </span>
              </span>
              <span class="mt-1 block text-sm leading-relaxed text-ink-500">{{ task.detail }}</span>
            </span>
          </label>
        </li>
      </ol>
    </BaseCard>

    <!-- ── Sumber belajar ─────────────────────────────────────────────────── -->
    <BaseCard
      v-if="roadmap.resources.length"
      title="Sumber belajar gratis"
      subtitle="Semuanya tautan pencarian, bukan tautan langsung — supaya kamu mendarat di materi yang masih hidup, bukan halaman mati."
    >
      <ul class="space-y-2">
        <li
          v-for="resource in roadmap.resources"
          :key="resource.title"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-ink-200/70 bg-white/60 px-3 py-2.5"
        >
          <span class="min-w-0 flex-1">
            <span class="text-sm font-medium text-ink-800">{{ resource.title }}</span>
            <span class="ml-2 text-[11px] text-ink-400">{{ resource.type }}</span>
            <span
              v-if="resource.language && resource.language.toLowerCase() !== 'indonesia'"
              class="ml-1.5 rounded-full bg-cream-100 px-2 py-0.5 text-[10px] text-ink-600"
            >
              {{ resource.language }}
            </span>
          </span>
          <a
            :href="searchLink(resource)"
            target="_blank"
            rel="noopener noreferrer"
            class="focus-ring shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
          >
            Cari materinya →
          </a>
        </li>
      </ul>
    </BaseCard>

    <!-- ── Portofolio ─────────────────────────────────────────────────────── -->
    <BaseCard
      v-if="roadmap.portfolioProjects.length"
      title="Proyek untuk portofoliomu"
      subtitle="Belum punya pengalaman kerja formal? Proyek yang kamu kerjakan sendiri bisa menggantikannya di CV."
    >
      <div class="space-y-3">
        <div
          v-for="project in roadmap.portfolioProjects"
          :key="project.title"
          class="rounded-xl border border-ink-200/70 bg-white/60 px-4 py-3"
        >
          <p class="text-sm font-medium text-ink-800">{{ project.title }}</p>
          <p class="mt-1 text-sm leading-relaxed text-ink-600">{{ project.description }}</p>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm leading-relaxed text-ink-600">
            Sudah punya bahan? Susun jadi CV format ATS di langkah berikutnya.
          </p>
          <BaseButton to="/jobs" variant="secondary" size="sm" class="shrink-0">
            Ke lowongan & CV
          </BaseButton>
        </div>
      </template>
    </BaseCard>
  </div>
</template>
