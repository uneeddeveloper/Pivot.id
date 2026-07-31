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
      <Icon name="lucide:credit-card" class="h-5 w-5" />
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
      <Icon name="lucide:plus" class="h-4 w-4" />
      Tambah utang lain
    </BaseButton>

    <template #footer>
      <PrivacyNote compact />
    </template>
  </BaseCard>
</template>
