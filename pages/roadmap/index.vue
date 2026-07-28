<script setup lang="ts">
useHead({ title: 'Roadmap Belajar — RintisUlang' })
</script>

<template>
  <ComingSoon
    :current="3"
    title="Accelerated Learning Roadmap"
    description="Kurikulum mandiri 14–30 hari yang disusun hanya dari keterampilan yang benar-benar kamu butuhkan, seluruhnya dari sumber gratis."
    :items="[
      'Checklist harian yang dibangun dari daftar skill gap langkah 2',
      'Sumber belajar gratis: YouTube, artikel, dan kursus terbuka',
      'Progress tracker lokal dan Portfolio Builder untuk mencatat proyek yang selesai',
    ]"
  />
</template>
