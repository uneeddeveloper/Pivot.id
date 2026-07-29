<script setup lang="ts">
import { useFinancialStore } from '~/stores/financial'

const financial = useFinancialStore()
</script>

<template>
  <BaseCard
    title="Utang yang sedang berjalan"
    subtitle="Belum punya utang? Lewati bagian ini. Kalau ada yang belum kamu ingat angkanya, isi perkiraan dulu nanti mudah diubah."
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
        <path d="M3 6.5h14v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9Zm0 0 1.6-3h10.8l1.6 3M10 10v3.5" />
      </svg>
    </template>

    <div class="space-y-4">
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        leave-active-class="transition duration-200 ease-in absolute"
        leave-to-class="opacity-0 scale-95"
      >
        <DebtRow
          v-for="(debt, index) in financial.debts"
          :key="debt.id"
          :debt="debt"
          :index="index"
          :removable="financial.debts.length > 1"
          @update="financial.updateDebt(debt.id, $event)"
          @remove="financial.removeDebt(debt.id)"
        />
      </TransitionGroup>
    </div>

    <BaseButton variant="ghost" block class="mt-4" @click="financial.addDebt()">
      <svg
        class="h-4 w-4"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <path d="M10 5v10M5 10h10" />
      </svg>
      Tambah utang lain
    </BaseButton>

    <template #footer>
      <PrivacyNote compact />
    </template>
  </BaseCard>
</template>
