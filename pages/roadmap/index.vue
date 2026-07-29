<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCareerStore } from '~/stores/career'
import { useCatalogStore } from '~/stores/catalog'
import { useFinancialStore } from '~/stores/financial'
import type { Roadmap } from '~/types/career'

/**
 * Roadmap belajar yang disusun LLM Sumopod dari daftar skill gap user.
 *
 * PRIVASI: yang dikirim ke /api/roadmap/generate hanya id keterampilan dan id
 * peran — keduanya dari katalog publik di MySQL. Tidak ada identitas, tidak ada
 * angka utang. Karena masukannya tidak pribadi, hasilnya boleh di-cache di
 * server sehingga kombinasi skill yang sama tidak dibayar dua kali.
 */

useHead({ title: 'Roadmap Belajar — RintisUlang' })

const financial = useFinancialStore()
const career = useCareerStore()
const catalog = useCatalogStore()

await useAsyncData('catalog', () => catalog.load())

const targetIncome = computed(() => financial.summary.targetIncome)

const matches = computed(() =>
  matchRoles(catalog.roles, catalog.skills, targetIncome.value, career.ownedSkills),
)

/** Skill gap dari langkah 2 — inilah bahan mentah roadmapnya. */
const gaps = computed(() => topSkillGaps(matches.value, 8))

/** Keterampilan yang dicentang untuk dikejar. Bawaannya lima teratas. */
const selected = ref<string[]>([])
const selectedIds = computed(() =>
  selected.value.length ? selected.value : gaps.value.slice(0, 5).map((gap) => gap.skill.id),
)

function toggleSkill(id: string) {
  const base = selectedIds.value
  selected.value = base.includes(id) ? base.filter((item) => item !== id) : [...base, id]
}

const roleId = ref<string>(career.targetRoleId ?? '')
const days = ref(21)
const hoursPerDay = ref(2)

const roadmap = ref<Roadmap | null>(null)
const generating = ref(false)
const errorMessage = ref('')

const canGenerate = computed(() => selectedIds.value.length > 0 && !generating.value)

async function generate() {
  if (!canGenerate.value) return

  generating.value = true
  errorMessage.value = ''

  if (roleId.value) career.setTargetRole(roleId.value)

  try {
    const response = await $fetch<{ roadmap: Roadmap }>('/api/roadmap/generate', {
      method: 'POST',
      body: {
        skillIds: selectedIds.value.slice(0, 12),
        roleId: roleId.value || undefined,
        days: days.value,
        hoursPerDay: hoursPerDay.value,
      },
    })
    roadmap.value = response.roadmap
  } catch (error) {
    const payload =
      typeof error === 'object' && error !== null && 'data' in error
        ? (error as { data?: { data?: { message?: string }; statusMessage?: string } }).data
        : undefined

    errorMessage.value =
      payload?.data?.message ||
      payload?.statusMessage ||
      'Roadmap gagal disusun. Coba lagi sebentar lagi.'
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="relative mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72">
      <div class="aurora-blob -top-28 right-4 h-72 w-72 animate-float bg-cream-300/40" />
      <div class="aurora-blob -top-20 -left-16 h-64 w-64 bg-sage-200/40" />
    </div>

    <header class="animate-rise flex items-start justify-between gap-6">
      <div class="max-w-2xl">
        <StepProgress :current="3" class="max-w-md" />
        <h1 class="mt-6 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Roadmap Belajar
        </h1>
        <p class="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base">
          Kurikulum mandiri yang disusun hanya dari keterampilan yang benar-benar kamu butuhkan —
          seluruhnya dari sumber gratis, dan dipas dengan waktu yang memang kamu punya.
        </p>
      </div>

      <MascotFigure pose="laptop" size="md" float eager class="hidden self-center lg:block" />
    </header>

    <div
      v-if="catalog.error"
      class="mt-8 rounded-2xl border border-cream-400 bg-cream-100 px-5 py-4"
    >
      <p class="text-sm font-semibold text-ink-900">Katalog belum bisa dimuat</p>
      <p class="mt-1 text-sm leading-relaxed text-ink-600">{{ catalog.error }}</p>
    </div>

    <!-- Belum ada bahan: arahkan balik ke langkah 2, jangan biarkan buntu. -->
    <BaseCard v-else-if="!gaps.length" tone="soft" class="mt-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex min-w-0 items-center gap-4">
          <MascotFigure pose="tidur" size="sm" class="hidden sm:block" />
          <div class="min-w-0">
            <p class="font-semibold text-ink-900">Belum ada skill gap yang bisa disusun</p>
            <p class="mt-1 max-w-lg text-sm leading-relaxed text-ink-600">
              Roadmap ini dibangun dari selisih antara keterampilan yang sudah kamu punya dan yang
              diminta peran-peran yang menutup Target Income-mu. Isi dulu langkah 2 supaya ada yang
              bisa dihitung.
            </p>
          </div>
        </div>
        <BaseButton to="/skill-gap" class="shrink-0">Ke langkah 2</BaseButton>
      </div>
    </BaseCard>

    <template v-else>
      <!-- ── Pilih apa yang mau dikejar ─────────────────────────────────── -->
      <BaseCard
        title="Pilih yang mau dikejar duluan"
        subtitle="Diambil dari peran-peran yang gajinya menutup Target Income-mu tapi syaratnya belum terpenuhi. Tidak perlu semuanya — beberapa teratas sudah cukup untuk mulai melamar."
        class="mt-8"
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
            <path d="M3 16V9m4.5 7V4M12 16v-5m4.5 5V7" />
          </svg>
        </template>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="gap in gaps"
            :key="gap.skill.id"
            type="button"
            :aria-pressed="selectedIds.includes(gap.skill.id)"
            class="focus-ring flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition"
            :class="
              selectedIds.includes(gap.skill.id)
                ? 'border-sage-300 bg-sage-100 font-medium text-sage-800'
                : 'border-ink-200 bg-white/60 text-ink-600 hover:-translate-y-0.5 hover:border-sage-300 hover:bg-sage-50'
            "
            @click="toggleSkill(gap.skill.id)"
          >
            {{ gap.skill.label }}
            <span class="text-[10px] text-ink-400">{{ gap.roles }} peran</span>
          </button>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          <FormField label="Peran yang dituju" field-id="rm-role" hint="Boleh dikosongkan.">
            <select id="rm-role" v-model="roleId" class="field-input">
              <option value="">— Belum ditentukan —</option>
              <option v-for="role in catalog.roles" :key="role.id" :value="role.id">
                {{ role.title }}
              </option>
            </select>
          </FormField>

          <FormField label="Waktu yang kamu punya" field-id="rm-days" hint="7–90 hari.">
            <select id="rm-days" v-model.number="days" class="field-input">
              <option :value="14">14 hari</option>
              <option :value="21">21 hari</option>
              <option :value="30">30 hari</option>
              <option :value="60">60 hari</option>
            </select>
          </FormField>

          <FormField label="Jam belajar per hari" field-id="rm-hours" hint="Isi yang realistis.">
            <select id="rm-hours" v-model.number="hoursPerDay" class="field-input">
              <option :value="1">1 jam</option>
              <option :value="2">2 jam</option>
              <option :value="3">3 jam</option>
              <option :value="4">4 jam</option>
              <option :value="6">6 jam</option>
            </select>
          </FormField>
        </div>

        <p
          v-if="errorMessage"
          class="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm leading-relaxed text-brand-800"
        >
          {{ errorMessage }}
        </p>

        <template #footer>
          <div class="flex flex-wrap items-center gap-3">
            <BaseButton :disabled="!canGenerate" @click="generate">
              <svg
                v-if="generating"
                class="h-4 w-4 animate-spin"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="7" class="opacity-25" />
                <path d="M17 10a7 7 0 0 0-7-7" stroke-linecap="round" />
              </svg>
              {{ generating ? 'Sedang disusun…' : roadmap ? 'Susun ulang' : 'Susun roadmap saya' }}
            </BaseButton>
            <p class="text-xs text-ink-400">
              {{ selectedIds.length }} keterampilan dipilih · penyusunan butuh beberapa detik
            </p>
          </div>
        </template>
      </BaseCard>

      <!-- ── Hasil ──────────────────────────────────────────────────────── -->
      <section v-if="roadmap" class="mt-8">
        <RoadmapPlan :roadmap="roadmap" />
      </section>
    </template>

    <div class="mt-10 flex flex-wrap gap-3">
      <BaseButton to="/skill-gap" variant="ghost">← Kembali ke skill gap</BaseButton>
      <BaseButton to="/jobs" variant="ghost">Lanjut ke lowongan →</BaseButton>
    </div>
  </div>
</template>
