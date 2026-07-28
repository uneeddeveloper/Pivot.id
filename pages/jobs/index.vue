<script setup lang="ts">
useHead({ title: 'Lowongan & Micro-Gigs — RintisUlang' })
</script>

<template>
  <ComingSoon
    :current="4"
    title="Smart Job Board & CV ATS"
    description="Papan lowongan dengan filter utama Minimum Living & Debt Salary yang otomatis terisi dari Target Income-mu."
    :items="[
      'Filter gaji minimum yang langsung ter-set dari Target Income',
      'Direktori micro-gigs untuk pemasukan cepat jangka pendek',
      'Generator CV format ATS yang menyorot keterampilan baru dari roadmap',
    ]"
  />
</template>
