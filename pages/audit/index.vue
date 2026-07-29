<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useFinancialStore } from '~/stores/financial'

useHead({ title: 'Audit Pemulihan Finansial — RintisUlang' })

const financial = useFinancialStore()

const canCalculate = computed(() => financial.isReady)

async function submitAudit() {
  financial.markAudited()

  // Bawa user ke hasilnya — tombolnya baru terasa "menghasilkan sesuatu".
  await nextTick()
  document.getElementById('simulasi')?.scrollIntoView({ block: 'start' })
}

function resetAll() {
  financial.reset()
}
</script>

<template>
  <div class="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72">
      <div class="aurora-blob -top-28 right-4 h-72 w-72 animate-float bg-cream-300/40" />
      <div class="aurora-blob -top-20 -left-16 h-64 w-64 bg-brand-100/50" />
    </div>

    <header class="animate-rise flex items-start justify-between gap-6">
      <div class="max-w-2xl">
        <StepProgress :current="1" class="max-w-md" />
        <h1 class="mt-6 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Audit Pemulihan Finansial
        </h1>
        <p class="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base">
          Tujuannya menemukan satu angka yang bisa kamu kejar. Mulai dari biaya hidup; bagian utang
          diisi hanya kalau kamu memang punya. Isi pelan-pelan, tidak ada yang menilai.
        </p>
      </div>

      <MascotFigure pose="papan" size="md" float eager class="hidden self-center lg:block" />
    </header>

    <form class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" @submit.prevent="submitAudit">
      <div class="space-y-6">
        <LivingCostForm />
        <DebtInputForm />

        <div
          class="surface-card flex flex-wrap items-center gap-3 rounded-2xl border border-ink-200/80 p-4"
        >
          <BaseButton type="submit" size="lg" :disabled="!canCalculate">
            Hitung Target Income
          </BaseButton>
          <BaseButton type="button" variant="quiet" @click="resetAll">
            <svg
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M4 6h12M8.5 6V4.5h3V6M6.5 6l.6 9h5.8l.6-9" />
            </svg>
            Hapus data saya
          </BaseButton>

          <p v-if="!canCalculate" class="w-full text-xs text-ink-400">
            Isi biaya hidup bulanan dulu untuk melanjutkan.
          </p>
        </div>
      </div>

      <aside class="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <TargetIncomeCard />
        <DueDateOverview />

        <div v-if="financial.hasAudited && financial.simulation.feasible">
          <BaseButton to="/skill-gap" variant="secondary" block>
            Lanjut cari peran kerja yang cocok
            <svg
              class="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-1"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M4 10h12m-5-5 5 5-5 5" />
            </svg>
          </BaseButton>
        </div>

        <p class="flex items-start gap-2 px-1 text-xs leading-relaxed text-ink-400">
          <svg
            class="mt-0.5 h-3.5 w-3.5 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.25 9a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-1.5 0V9Z"
              clip-rule="evenodd"
            />
          </svg>
          Angka di kartu ini ikut berubah otomatis setiap kali kamu mengubah isian di sebelah kiri.
        </p>
      </aside>
    </form>

    <div id="simulasi" class="scroll-mt-24">
      <SnowballSimulator v-if="financial.hasAudited" />
    </div>
  </div>
</template>
