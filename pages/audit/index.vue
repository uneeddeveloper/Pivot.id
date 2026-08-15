<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useFinancialStore } from '~/stores/financial'

useHead({ title: 'Audit Pemulihan Finansial — Pivot' })

const financial = useFinancialStore()
const { confirmAction, toastSuccess } = useAlert()

const canCalculate = computed(() => financial.isReady)

async function submitAudit() {
  financial.markAudited()
  await nextTick()
  document.getElementById('simulasi')?.scrollIntoView({ block: 'start' })
}

/**
 * Menghapus seluruh isian audit. Tidak bisa dibatalkan — datanya memang tidak
 * pernah dikirim ke server, jadi tidak ada salinan yang bisa dipulihkan.
 */
async function resetAll() {
  const confirmed = await confirmAction({
    title: 'Hapus semua data audit?',
    text: 'Biaya hidup dan daftar utang yang sudah kamu isi akan dikosongkan. Data ini hanya ada di perangkatmu, jadi tidak bisa dikembalikan lagi.',
    confirmText: 'Ya, hapus',
    cancelText: 'Batal',
    destructive: true,
  })
  if (!confirmed) return

  financial.reset()
  toastSuccess('Data audit sudah dihapus dari perangkat ini.')
}
</script>

<template>
  <div class="surface-dark min-h-screen">
    <!-- Halaman alur: mengikuti dark theme yang sama dengan homepage. -->
    <div class="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">

      <!-- Ambient glow dekorasi -->
      <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 -z-0 overflow-hidden">
        <div
          class="absolute -top-20 right-0 h-64 w-64 rounded-full opacity-[0.15] blur-3xl"
          style="background: radial-gradient(circle, rgb(169 14 2 / 0.7) 0%, transparent 70%)"
        />
        <div
          class="absolute top-1/3 -left-16 h-48 w-48 rounded-full opacity-[0.08] blur-3xl"
          style="background: radial-gradient(circle, rgb(247 230 127 / 0.5) 0%, transparent 70%)"
        />
      </div>

      <!-- Header halaman -->
      <header v-reveal class="relative z-10 flex items-start justify-between gap-6">
        <div class="max-w-2xl">
          <StepProgress :current="1" class="max-w-md" />
          <h1 class="mt-6 text-3xl font-bold tracking-tight text-ink-900 dark:text-cream-50 sm:text-4xl">
            Audit Pemulihan Finansial
          </h1>
          <p class="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-400 sm:text-base">
            Tujuannya menemukan satu angka yang bisa kamu kejar. Mulai dari biaya hidup; bagian utang
            diisi hanya kalau kamu memang punya. Isi pelan-pelan, tidak ada yang menilai.
          </p>
        </div>
        <MascotFigure pose="papan" size="md" float eager class="hidden self-center lg:block" />
      </header>

      <!-- Form -->
      <form
        v-reveal
        class="relative z-10 mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
        @submit.prevent="submitAudit"
      >
        <div class="space-y-6">
          <LivingCostForm />
          <DebtInputForm />

          <!-- Action bar -->
          <div
            class="flex flex-wrap items-center gap-3 rounded-[1.25rem] border border-ink-200/50 dark:border-white/[0.07] bg-white/40 dark:bg-white/[0.03] p-4 shadow-soft dark:shadow-none"
          >
            <BaseButton type="submit" size="lg" :disabled="!canCalculate">
              Hitung Target Income
            </BaseButton>
            <BaseButton type="button" variant="quiet" @click="resetAll">
              <Icon name="lucide:trash-2" class="h-4 w-4" />
              Hapus data saya
            </BaseButton>
            <p v-if="!canCalculate" class="w-full text-xs text-ink-600 dark:text-ink-400">
              Isi biaya hidup bulanan dulu untuk melanjutkan.
            </p>
          </div>
        </div>

        <!-- Sidebar -->
        <aside class="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <TargetIncomeCard />
          <DueDateOverview />

          <div v-if="financial.hasAudited && financial.simulation.feasible">
            <BaseButton to="/skill-gap" variant="secondary" block>
              Lanjut cari peran kerja yang cocok
              <Icon name="lucide:arrow-right" class="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
            </BaseButton>
          </div>

          <p class="flex items-start gap-2 px-1 text-xs leading-relaxed text-ink-600 dark:text-ink-400">
            <Icon name="lucide:info" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500 dark:text-ink-400" aria-hidden="true" />
            Angka di kartu ini ikut berubah otomatis setiap kali kamu mengubah isian di sebelah kiri.
          </p>
        </aside>
      </form>

      <div id="simulasi" class="scroll-mt-24" v-reveal>
        <SnowballSimulator v-if="financial.hasAudited" />
      </div>
    </div>
  </div>
</template>
