<script setup lang="ts">
useHead({ title: 'Pivot — Berapa penghasilan yang benar-benar kamu butuhkan?' })

/**
 * Tiga kondisi awal yang dilayani. Urutannya sengaja dimulai dari fresh graduate
 * supaya halaman tidak terbaca sebagai "aplikasi khusus orang bermasalah".
 */
const audiences = [
  {
    title: 'Baru lulus',
    body: 'Belum punya pegangan soal gaji berapa yang layak diambil, dan keterampilan apa yang sebenarnya dicari pasar.',
    // Topi wisuda
    icon: 'M10 3 2.5 6.8 10 10.6l7.5-3.8L10 3Zm-5 6.4v3.3c0 1.4 2.2 2.6 5 2.6s5-1.2 5-2.6V9.4l-5 2.5-5-2.5Z',
  },
  {
    title: 'Kena PHK',
    body: 'Perlu kembali bekerja secepatnya, tanpa terpaksa menerima tawaran yang di bawah kebutuhan hidup.',
    // Tas kerja
    icon: 'M7.5 4.5A1.5 1.5 0 0 1 9 3h2a1.5 1.5 0 0 1 1.5 1.5V5H15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2.5v-.5ZM9 4.5V5h2v-.5H9Z',
  },
  {
    title: 'Terjerat pinjol atau judi online',
    body: 'Butuh strategi pelunasan yang masuk akal dan target penghasilan yang jelas, bukan sekadar disuruh berhemat.',
    // Simpul yang terurai — bukan ikon peringatan, supaya tidak menghakimi
    icon: 'M6.8 3.2a3.8 3.8 0 0 1 5.4 0l1.6 1.6a.9.9 0 1 1-1.3 1.3l-1.6-1.6a2 2 0 0 0-2.8 2.8l1.6 1.6A.9.9 0 0 1 8.4 10.2L6.8 8.6a3.8 3.8 0 0 1 0-5.4Zm4 6.6a.9.9 0 0 1 1.3 0l1.6 1.6a3.8 3.8 0 0 1-5.4 5.4l-1.6-1.6a.9.9 0 0 1 1.3-1.3l1.6 1.6a2 2 0 0 0 2.8-2.8l-1.6-1.6a.9.9 0 0 1 0-1.3Z',
  },
]

const stages = [
  {
    step: '01',
    title: 'Audit Pemulihan Finansial',
    body: 'Petakan biaya hidup dan kewajiban utang — kalau ada. Hasilnya satu angka: Target Income, penghasilan bulanan yang membuatmu berdiri stabil.',
    to: '/audit',
    ready: true,
  },
  {
    step: '02',
    title: 'Skill Gap & Peran Kerja',
    body: 'Cocokkan Target Income dengan posisi kerja yang gajinya benar-benar menutupi kebutuhanmu, lalu lihat keterampilan apa yang masih perlu dikejar.',
    to: '/skill-gap',
    ready: true,
  },
  {
    step: '03',
    title: 'Roadmap Belajar Kilat',
    body: 'Kurikulum mandiri 14–30 hari dari sumber gratis, disusun hanya dari keterampilan yang benar-benar kamu butuhkan.',
    to: '/roadmap',
    ready: true,
  },
  {
    step: '04',
    title: 'CV ATS & Papan Lowongan',
    body: 'CV siap lolos screening otomatis, plus lowongan asli yang sudah difilter dengan ambang Target Income-mu — lengkap dengan tanda untuk yang patut dicurigai.',
    to: '/jobs',
    ready: true,
  },
  {
    step: '05',
    title: 'Penghasilan Cepat',
    body: 'Lamaran baru dijawab dua sampai enam minggu; cicilan tidak menunggu selama itu. Micro-gig yang bisa menghasilkan minggu ini, disusun jadi rencana yang menutup kebutuhan terdekatmu.',
    to: '/gigs',
    ready: true,
  },
]

/** Angka contoh untuk pratinjau kartu di hero — bukan data user. */
const preview = {
  livingCost: 2_500_000,
  minPayment: 1_350_000,
  target: 3_850_000,
}
</script>

<template>
  <div>
    <!-- ── Hero ─────────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden">
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
        <div class="aurora-blob -top-32 -left-24 h-96 w-96 animate-drift bg-brand-200/40" />
        <div class="aurora-blob top-10 right-0 h-80 w-80 animate-float bg-cream-300/50" />
        <div class="aurora-blob -bottom-24 left-1/3 h-72 w-72 bg-sage-200/40" />
      </div>

      <div
        class="mx-auto grid max-w-5xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10"
      >
        <div class="animate-rise">
          <h1
            class="max-w-2xl text-4xl leading-[1.1] font-bold tracking-tight text-ink-900 sm:text-5xl"
          >
            Berapa penghasilan yang
            <span class="text-gradient-brand">benar-benar</span> kamu butuhkan?
          </h1>

          <p class="mt-5 max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg">
            Pivot mengubah biaya hidup dan kewajibanmu menjadi satu angka:
            <strong class="font-semibold text-ink-800">Target Income</strong>. Dari angka itu kami
            bantu menemukan peran kerja yang gajinya benar-benar menutupi, keterampilan yang perlu
            dikejar, dan CV yang lolos screening.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <BaseButton to="/audit" size="lg">
              Hitung Target Income-ku
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
            <BaseButton to="#alur" variant="ghost" size="lg">Lihat alurnya dulu</BaseButton>
          </div>

          <div class="mt-8 max-w-xl">
            <PrivacyNote />
          </div>
        </div>

        <!-- Pratinjau hasil: menunjukkan wujud akhirnya sebelum user mengisi apa pun. -->
        <div class="animate-rise [animation-delay:150ms] lg:pl-4">
          <div class="mx-auto max-w-sm">
            <!-- Sapaan maskot. Teksnya nyata, jadi blok ini TIDAK aria-hidden. -->
            <div class="mb-4 flex items-end gap-2">
              <MascotFigure
                pose="hai"
                size="sm"
                eager
                alt="Maskot Pivot melambaikan sayap"
              />
              <p
                class="mb-3 rounded-2xl rounded-bl-md border border-cream-300 bg-white/85 px-3.5 py-2.5 text-xs leading-relaxed text-ink-600 shadow-soft backdrop-blur-sm"
              >
                Kita hitung angkanya bareng-bareng. Satu langkah dulu, tidak usah buru-buru.
              </p>
            </div>

            <div class="relative" aria-hidden="true">
              <div
                class="absolute -top-4 -right-3 rotate-3 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 shadow-soft"
              >
                <p class="text-[10px] font-medium text-sage-700">Bebas utang</p>
                <p class="text-sm font-semibold text-sage-800">14 bulan lagi</p>
              </div>

              <div class="surface-brand rounded-2xl border border-brand-700/60 p-6 text-cream-100">
                <p class="text-xs font-medium tracking-wide text-cream-100/75 uppercase">
                  Target Income Bulanan
                </p>
                <p class="mt-2 text-4xl font-bold tracking-tight tabular-nums">
                  {{ formatIDR(preview.target) }}
                </p>

                <dl class="mt-5 space-y-2 border-t border-cream-100/20 pt-4 text-sm">
                  <div class="flex justify-between gap-4">
                    <dt class="text-cream-100/70">Biaya hidup minimal</dt>
                    <dd class="font-medium tabular-nums">{{ formatIDR(preview.livingCost) }}</dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-cream-100/70">Total cicilan minimal</dt>
                    <dd class="font-medium tabular-nums">{{ formatIDR(preview.minPayment) }}</dd>
                  </div>
                </dl>

                <div class="mt-5 h-1.5 overflow-hidden rounded-full bg-cream-100/20">
                  <div class="h-full w-2/3 rounded-full bg-cream-200" />
                </div>
                <p class="mt-2 text-xs text-cream-100/70">
                  Contoh tampilan — angkamu akan berbeda.
                </p>
              </div>

              <div
                class="absolute -bottom-5 -left-4 -rotate-2 rounded-xl border border-ink-200 bg-white px-3 py-2 shadow-soft"
              >
                <p class="text-[10px] text-ink-400">Cicilan 7 hari ke depan</p>
                <p class="text-sm font-semibold tabular-nums text-brand-700">Rp 450.000</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Tiga titik berangkat ─────────────────────────────────────────── -->
    <section class="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <h2 class="text-2xl font-bold tracking-tight text-ink-900">Dibuat untuk tiga titik berangkat</h2>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
        Kondisinya berbeda, pertanyaannya sama: berapa yang harus kukejar, dan bagaimana caranya
        sampai ke sana.
      </p>

      <div class="mt-7 grid gap-4 sm:grid-cols-3">
        <div
          v-for="(audience, index) in audiences"
          :key="audience.title"
          class="surface-card animate-rise rounded-2xl border border-cream-300 p-5"
          :style="{ animationDelay: `${index * 90}ms` }"
        >
          <span
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-50 to-cream-200 text-brand-600"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path :d="audience.icon" />
            </svg>
          </span>
          <h3 class="mt-4 font-semibold text-brand-800">{{ audience.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-ink-600">{{ audience.body }}</p>
        </div>
      </div>

      <p
        class="attention-note mt-5 max-w-2xl text-sm leading-relaxed"
      >
        Belum punya utang sama sekali? Tidak masalah — bagian utang boleh dilewati, dan Target
        Income-mu dihitung dari biaya hidup saja.
      </p>
    </section>

    <!-- ── Alur empat langkah ───────────────────────────────────────────── -->
    <section id="alur" class="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
      <h2 class="text-2xl font-bold tracking-tight text-ink-900">Lima langkah, satu per satu</h2>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
        Tidak perlu selesai semuanya hari ini. Selesaikan satu langkah, lalu istirahat.
      </p>

      <ol class="mt-7 space-y-3">
        <li v-for="(stage, index) in stages" :key="stage.step">
          <NuxtLink
            :to="stage.to"
            class="focus-ring group surface-card lift flex gap-4 rounded-2xl border border-ink-200/80 p-5 sm:gap-5"
          >
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition"
              :class="
                stage.ready
                  ? 'border-brand-200 bg-linear-to-br from-brand-500 to-brand-700 text-cream-50 shadow-brand'
                  : 'border-ink-200 bg-cream-100 text-ink-400 group-hover:border-brand-200 group-hover:text-brand-600'
              "
            >
              {{ index + 1 }}
            </span>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-semibold text-ink-900 transition group-hover:text-brand-700">
                  {{ stage.title }}
                </h3>
                <span
                  v-if="stage.ready"
                  class="rounded-full bg-sage-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sage-700 uppercase"
                >
                  Siap dipakai
                </span>
                <span
                  v-else
                  class="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-ink-500 uppercase"
                >
                  Segera
                </span>
              </div>
              <p class="mt-1.5 text-sm leading-relaxed text-ink-500">{{ stage.body }}</p>
            </div>

            <svg
              class="mt-1 h-5 w-5 shrink-0 self-start text-ink-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-brand-600"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M7 4l6 6-6 6" />
            </svg>
          </NuxtLink>
        </li>
      </ol>

      <!-- Ajakan penutup -->
      <div
        class="surface-card mt-10 flex flex-col items-start gap-4 rounded-2xl border border-cream-300 p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-4">
          <MascotFigure pose="lari" size="sm" class="hidden sm:block" />
          <div>
            <p class="font-semibold text-ink-900">Mulai dari satu angka dulu.</p>
            <p class="mt-1 text-sm leading-relaxed text-ink-500">
              Isian pertamanya cuma biaya hidup bulanan. Sekitar dua menit.
            </p>
          </div>
        </div>
        <BaseButton to="/audit" size="lg" class="shrink-0">
          Mulai audit
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
    </section>
  </div>
</template>
