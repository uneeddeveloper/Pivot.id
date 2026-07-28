<script setup lang="ts">
useHead({ title: 'Skill Gap & Peran Kerja — RintisUlang' })
</script>

<template>
  <ComingSoon
    :current="2"
    title="Skill Gap & Role Matching"
    description="Target Income dari langkah 1 akan dipakai untuk menyaring peran kerja yang gajinya benar-benar menutup kebutuhanmu."
    :items="[
      'Daftar posisi kerja dengan gaji bersih di atas Target Income',
      'Unggah atau tempel CV untuk mengekstrak keterampilan yang sudah kamu punya',
      'Perbandingan keterampilanmu dengan syarat posisi target — hasilnya jadi daftar skill gap',
    ]"
  />
</template>
