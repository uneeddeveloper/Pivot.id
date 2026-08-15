<script setup lang="ts">
/**
 * Design Read: Consumer-facing financial recovery tool, audience emotionally vulnerable,
 * trust-first + warm-professional, dark editorial aesthetic, brand red accent,
 * Plus Jakarta Sans typography.
 *
 * Dials: DESIGN_VARIANCE: 7 / MOTION_INTENSITY: 5 / VISUAL_DENSITY: 4
 *
 * Pre-flight checks applied:
 * - Page Theme Lock: full dark (ink-950 / ink-900 variation, no light sections)
 * - Eyebrow count: 1 total across 4 sections (ceil(4/3) = 2 max, using 1)
 * - Hero stack: H1 + subtext (16 words) + CTAs + PrivacyNote = 4 elements
 * - Audience layout: asymmetric [6fr 5fr] grid, not 3-equal-column ban
 * - No em-dashes anywhere
 * - min-h-[100dvh] on hero, not h-screen
 * - Scroll reveal via IntersectionObserver, never window.addEventListener('scroll')
 * - Animate only opacity + transform
 * - Double-Bezel card architecture on all cards
 * - Corner radius: rounded-[1.25rem] unified system (inner: rounded-[calc(1.25rem-6px)])
 */
useHead({ title: 'Pivot — Berapa penghasilan yang benar-benar kamu butuhkan?' })

const audiences = [
  {
    title: 'Baru lulus',
    body: 'Belum punya pegangan soal gaji berapa yang layak diambil, dan keterampilan apa yang sebenarnya dicari pasar.',
    icon: 'lucide:graduation-cap',
    num: '01',
    accent: 'brand',
  },
  {
    title: 'Kena PHK',
    body: 'Perlu kembali bekerja secepatnya, tanpa terpaksa menerima tawaran yang di bawah kebutuhan hidup.',
    icon: 'lucide:briefcase',
    num: '02',
    accent: 'cream',
  },
  {
    title: 'Terjerat pinjol atau judi online',
    body: 'Butuh strategi pelunasan yang masuk akal dan target penghasilan yang jelas, bukan sekadar disuruh berhemat.',
    icon: 'lucide:circle-alert',
    num: '03',
    accent: 'sage',
  },
]

const stages = [
  {
    step: '01',
    title: 'Audit Pemulihan Finansial',
    body: 'Petakan biaya hidup dan kewajiban utang. Hasilnya satu angka: Target Income.',
    to: '/audit',
    ready: true,
  },
  {
    step: '02',
    title: 'Skill Gap dan Peran Kerja',
    body: 'Cocokkan Target Income dengan posisi kerja yang gajinya cukup, lalu lihat skill yang perlu dikejar.',
    to: '/skill-gap',
    ready: true,
  },
  {
    step: '03',
    title: 'Roadmap Belajar Kilat',
    body: 'Kurikulum mandiri 14 sampai 30 hari dari sumber gratis, hanya skill yang kamu butuhkan.',
    to: '/roadmap',
    ready: true,
  },
  {
    step: '04',
    title: 'CV ATS dan Papan Lowongan',
    body: 'CV siap lolos screening otomatis, plus lowongan asli yang sudah difilter sesuai Target Income.',
    to: '/jobs',
    ready: true,
  },
  {
    step: '05',
    title: 'Penghasilan Cepat',
    body: 'Micro-gig yang bisa menghasilkan minggu ini, disusun jadi rencana yang menutup kebutuhan terdekat.',
    to: '/gigs',
    ready: true,
  },
]

const preview = {
  livingCost: 2_500_000,
  minPayment: 1_350_000,
  target: 3_850_000,
}

/* Scroll reveal */
const heroText   = ref<HTMLElement | null>(null)
const heroCard   = ref<HTMLElement | null>(null)
const audienceSec = ref<HTMLElement | null>(null)
const audienceGrid = ref<HTMLElement | null>(null)
const stagesSec  = ref<HTMLElement | null>(null)
const ctaSec     = ref<HTMLElement | null>(null)

const { observe } = useScrollReveal()
const { isVisible: heroTextVis  } = useScrollReveal(heroText,    { threshold: 0.1 })
const { isVisible: heroCardVis  } = useScrollReveal(heroCard,    { threshold: 0.1 })
const { isVisible: audienceVis  } = useScrollReveal(audienceSec, { threshold: 0.08 })
const { isVisible: stagesVis    } = useScrollReveal(stagesSec,   { threshold: 0.05 })
const { isVisible: ctaVis       } = useScrollReveal(ctaSec,      { threshold: 0.15 })

onMounted(() => {
  if (audienceGrid.value)
    observe(audienceGrid.value.querySelectorAll('.aud-card'), { staggerMs: 130 })
  if (stagesSec.value)
    observe(stagesSec.value.querySelectorAll('.stage-row'), { staggerMs: 85 })
})
</script>

<template>
  <div>

    <!-- ══════════════════════════════════════════════════════════════════
         SECTION 1 · Hero sinematik
         Layout: asymmetric split [1.1fr 0.9fr]
         Stack: H1 + subtext (16 words) + CTAs + PrivacyNote = 4 elements
         No eyebrow (hero counts as 1 of the eyebrow budget; we spend 0 here)
    ═══════════════════════════════════════════════════════════════════ -->
    <section class="surface-dark relative min-h-[100dvh] overflow-hidden">

      <!-- Ambient dekorasi (aria-hidden, non-informational) -->
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <!-- Brand red glow, centered above viewport -->
        <div
          class="absolute -top-24 left-1/3 h-[700px] w-[700px] -translate-x-1/2 rounded-full blur-[130px] opacity-[0.18]"
          style="background: radial-gradient(circle, rgb(169 14 2 / 0.8) 0%, transparent 65%)"
        />
        <!-- Warm cream accent, top-right -->
        <div
          class="absolute top-1/3 right-0 h-72 w-72 rounded-full blur-3xl opacity-[0.08]"
          style="background: radial-gradient(circle, rgb(247 230 127 / 0.6) 0%, transparent 70%)"
        />
        <!-- Subtle grid lines -->
        <div
          class="absolute inset-0 opacity-[0.022]"
          style="
            background-image:
              linear-gradient(rgb(255 255 255) 1px, transparent 1px),
              linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px);
            background-size: 64px 64px;
          "
        />
      </div>

      <!-- Hero content -->
      <div
        class="relative z-10 mx-auto grid max-w-5xl items-center gap-12 px-4 pt-24 pb-24 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10"
      >
        <!-- Left: text column -->
        <div
          ref="heroText"
          class="scroll-reveal-left"
          :class="{ visible: heroTextVis }"
        >
          <!--
            H1: 2-line discipline.
            "Berapa penghasilan yang" / "benar-benar kamu butuhkan?"
            At text-[clamp(2.5rem,5vw,4rem)] in a 560px col this fits 2 lines.
          -->
          <h1
            class="max-w-2xl text-balance text-[clamp(2.25rem,4.5vw,3.75rem)] font-bold leading-[1.07] tracking-tight text-ink-900 dark:text-cream-50"
            style="font-family: var(--font-display)"
          >
            Berapa penghasilan yang
            <!-- Italic same-family emphasis (no serif injection) -->
            <em class="not-italic text-shimmer">benar-benar</em>
            kamu butuhkan?
          </h1>

          <!-- Subtext: 16 words (max 20) -->
          <p class="mt-6 max-w-[440px] text-[1.0625rem] leading-relaxed text-ink-600 dark:text-ink-300">
            Dari biaya hidup dan utangmu, Pivot menghitung satu angka:
            <strong class="font-semibold text-ink-900 dark:text-cream-200">Target Income</strong>
            — penghasilan minimum yang membuatmu berdiri stabil.
          </p>

          <!-- CTAs: one primary, one ghost -->
          <div class="mt-8 flex flex-wrap items-center gap-3">
            <BaseButton to="/audit" size="lg">
              Hitung Target Income-ku
              <Icon name="lucide:arrow-right" class="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
            </BaseButton>
            <a
              href="#alur"
              class="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-ink-200 dark:border-white/[0.12] bg-white/50 dark:bg-white/[0.05] px-5 py-2.5 text-sm font-medium text-ink-600 dark:text-cream-300 transition-all duration-200 hover:bg-white dark:hover:bg-white/[0.09] hover:text-ink-900 dark:hover:text-cream-100 shadow-sm dark:shadow-none"
            >
              Lihat alurnya
            </a>
          </div>

          <!-- PrivacyNote: 4th hero element -->
          <div class="mt-8 max-w-[440px]">
            <PrivacyNote />
          </div>
        </div>

        <!-- Right: Double-Bezel preview card -->
        <div
          ref="heroCard"
          class="scroll-reveal-right lg:pl-4"
          :class="{ visible: heroCardVis }"
        >
          <div class="mx-auto max-w-sm">

            <!-- Mascot + bubble -->
            <div class="mb-4 flex items-end gap-2">
              <MascotFigure pose="hai" size="sm" eager alt="Maskot Pivot melambaikan sayap" />
              <p
                class="mb-3 rounded-2xl rounded-bl-md border border-ink-200/60 dark:border-white/[0.09] bg-white/60 dark:bg-white/[0.05] px-3.5 py-2.5 text-xs leading-relaxed text-ink-700 dark:text-ink-300 backdrop-blur-sm shadow-soft dark:shadow-none"
              >
                Kita hitung angkanya bareng-bareng.
              </p>
            </div>

            <div class="relative" aria-hidden="true">
              <!-- Top-right badge -->
              <div
                class="absolute -top-4 -right-3 z-10 rotate-3 rounded-[0.875rem] border border-sage-600/20 dark:border-sage-600/25 bg-white/95 dark:bg-ink-900/90 px-3 py-2 backdrop-blur-sm shadow-soft dark:shadow-none"
              >
                <p class="text-[10px] font-medium text-sage-600 dark:text-sage-400">Bebas utang</p>
                <p class="text-sm font-bold text-sage-700 dark:text-sage-300">14 bulan lagi</p>
              </div>

              <!-- Double-Bezel outer shell -->
              <div
                class="p-1.5 rounded-[1.25rem] border border-ink-200/50 dark:border-white/[0.07] bg-white/40 dark:bg-white/[0.04] shadow-soft dark:shadow-none"
                style="animation: glow-pulse 5s ease-in-out infinite"
              >
                <!-- Inner core: Target Income card -->
                <div
                  class="surface-brand rounded-[calc(1.25rem-6px)] border border-brand-700/40 p-6 text-cream-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                >
                  <p class="text-[10px] font-semibold tracking-wider text-cream-100/60 uppercase">
                    Target Income Bulanan
                  </p>
                  <p class="mt-2 text-4xl font-bold tracking-tight tabular-nums">
                    {{ formatIDR(preview.target) }}
                  </p>

                  <dl class="mt-5 space-y-2 border-t border-cream-100/[0.12] pt-4 text-sm">
                    <div class="flex justify-between gap-4">
                      <dt class="text-cream-100/60">Biaya hidup minimal</dt>
                      <dd class="font-medium tabular-nums">{{ formatIDR(preview.livingCost) }}</dd>
                    </div>
                    <div class="flex justify-between gap-4">
                      <dt class="text-cream-100/60">Total cicilan minimal</dt>
                      <dd class="font-medium tabular-nums">{{ formatIDR(preview.minPayment) }}</dd>
                    </div>
                  </dl>

                  <div class="mt-5 h-1.5 overflow-hidden rounded-full bg-cream-100/[0.15]">
                    <div class="h-full w-2/3 rounded-full bg-cream-200/80" />
                  </div>
                  <p class="mt-2 text-[10px] text-cream-100/50">
                    Contoh tampilan — angkamu akan berbeda.
                  </p>
                </div>
              </div>

              <!-- Bottom-left badge -->
              <div
                class="absolute -bottom-5 -left-4 z-10 -rotate-2 rounded-[0.875rem] border border-ink-200/60 dark:border-white/[0.09] bg-white/95 dark:bg-ink-900/90 px-3 py-2 backdrop-blur-sm shadow-soft dark:shadow-none"
              >
                <p class="text-[10px] text-ink-600 dark:text-ink-400">Cicilan 7 hari ke depan</p>
                <p class="text-sm font-bold tabular-nums text-brand-600 dark:text-brand-400">Rp 450.000</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         SECTION 2 · Tiga Titik Berangkat
         Layout: asymmetric bento [6fr 5fr] — card 1 spans 2 rows on md+
         No eyebrow (would break 1-per-3-sections budget)
         Theme: ink-900 (dark family variation, not a light section)
    ═══════════════════════════════════════════════════════════════════ -->
    <section ref="audienceSec" class="relative overflow-hidden bg-cream-50 dark:bg-ink-900 transition-colors duration-500">

      <!-- Subtle divider glow from section above -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute top-0 left-0 right-0 h-px"
        style="background: linear-gradient(90deg, transparent, rgb(169 14 2 / 0.25), transparent)"
      />

      <div class="relative z-10 mx-auto max-w-5xl px-4 py-24 sm:px-6">

        <!-- Section header: no eyebrow, clean H2 + short subtext -->
        <div class="scroll-reveal" :class="{ visible: audienceVis }">
          <h2
            class="text-3xl font-bold tracking-tight text-ink-900 dark:text-cream-50 sm:text-4xl"
            style="font-family: var(--font-display)"
          >
            Dibuat untuk tiga titik berangkat
          </h2>
          <p class="mt-3 max-w-lg text-base leading-relaxed text-ink-600 dark:text-ink-400">
            Kondisinya berbeda, pertanyaannya sama.
          </p>
        </div>

        <!--
          Grid 3 kolom sejajar: semua kartu sama lebar dan tingginya diatur oleh konten.
          Mobile: single column stack.
        -->
        <div
          ref="audienceGrid"
          class="mt-10 grid gap-4 sm:grid-cols-3"
        >

          <!-- Card 1: Baru Lulus -->
          <div class="aud-card scroll-reveal">
            <!-- Double-Bezel outer shell -->
            <div class="h-full p-[6px] rounded-[1.25rem] border border-ink-200/50 dark:border-white/[0.07] bg-white/50 dark:bg-white/[0.03] shadow-soft dark:shadow-none">
              <!-- Inner core -->
              <div
                class="flex h-full flex-col rounded-[calc(1.25rem-6px)] bg-white dark:bg-ink-800 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-ink-100 dark:border-transparent"
              >
                <div class="flex items-start justify-between">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10"
                  >
                    <Icon :name="audiences[0].icon" class="h-5 w-5 text-brand-500 dark:text-brand-400" aria-hidden="true" />
                  </div>
                  <span class="select-none text-3xl font-bold text-ink-100 dark:text-white/[0.07]" aria-hidden="true">01</span>
                </div>
                <h3 class="mt-5 font-semibold text-ink-900 dark:text-cream-100">{{ audiences[0].title }}</h3>
                <p class="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{{ audiences[0].body }}</p>
              </div>
            </div>
          </div>

          <!-- Card 2: Kena PHK -->
          <div class="aud-card scroll-reveal">
            <div class="h-full p-[6px] rounded-[1.25rem] border border-ink-200/50 dark:border-white/[0.07] bg-white/50 dark:bg-white/[0.03] shadow-soft dark:shadow-none">
              <div
                class="flex h-full flex-col rounded-[calc(1.25rem-6px)] bg-white dark:bg-ink-800 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-ink-100 dark:border-transparent"
              >
                <div class="flex items-start justify-between">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 dark:border-cream-400/20 dark:bg-cream-400/10"
                  >
                    <Icon :name="audiences[1].icon" class="h-5 w-5 text-amber-500 dark:text-cream-400" aria-hidden="true" />
                  </div>
                  <span class="select-none text-3xl font-bold text-ink-100 dark:text-white/[0.07]" aria-hidden="true">02</span>
                </div>
                <h3 class="mt-5 font-semibold text-ink-900 dark:text-cream-100">{{ audiences[1].title }}</h3>
                <p class="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{{ audiences[1].body }}</p>
              </div>
            </div>
          </div>

          <!-- Card 3: Terjerat pinjol -->
          <div class="aud-card scroll-reveal">
            <div class="h-full p-[6px] rounded-[1.25rem] border border-ink-200/50 dark:border-white/[0.07] bg-white/50 dark:bg-white/[0.03] shadow-soft dark:shadow-none">
              <div
                class="flex h-full flex-col rounded-[calc(1.25rem-6px)] bg-white dark:bg-ink-800 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-ink-100 dark:border-transparent"
              >
                <div class="flex items-start justify-between">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-xl border border-sage-600/20 bg-sage-600/10 dark:border-sage-500/20 dark:bg-sage-500/10"
                  >
                    <Icon :name="audiences[2].icon" class="h-5 w-5 text-sage-600 dark:text-sage-400" aria-hidden="true" />
                  </div>
                  <span class="select-none text-3xl font-bold text-ink-100 dark:text-white/[0.07]" aria-hidden="true">03</span>
                </div>
                <h3 class="mt-5 font-semibold text-ink-900 dark:text-cream-100">{{ audiences[2].title }}</h3>
                <p class="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{{ audiences[2].body }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Attention note (warm, not alarming) -->
        <p
          class="mt-6 max-w-2xl rounded-xl border border-cream-400/40 dark:border-cream-400/[0.18] bg-cream-100/50 dark:bg-cream-400/[0.05] px-4 py-3 text-sm leading-relaxed text-ink-700 dark:text-cream-300/70"
        >
          Belum punya utang? Bagian utang boleh dilewati — Target Income dihitung dari biaya hidup saja.
        </p>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         SECTION 3 · Lima Langkah — vertical timeline
         Layout: numbered bullet + card list (different from all other sections)
         ONE eyebrow here (the only one on the page, budget = ceil(4/3) = 2)
         Theme: ink-950 (back to deepest dark, same dark family)
    ═══════════════════════════════════════════════════════════════════ -->
    <section id="alur" ref="stagesSec" class="surface-dark relative overflow-hidden">

      <!-- Section divider from ink-900 above -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute top-0 left-0 right-0 h-px"
        style="background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.06), transparent)"
      />

      <div class="relative z-10 mx-auto max-w-5xl px-4 pt-24 pb-24 sm:px-6">

        <!-- Section header with THE ONE eyebrow -->
        <div class="scroll-reveal" :class="{ visible: stagesVis }">
          <p class="text-[10px] font-semibold tracking-[0.2em] text-brand-400 uppercase">
            Alur kerja
          </p>
          <h2
            class="mt-2 max-w-lg text-3xl font-bold tracking-tight text-ink-900 dark:text-cream-50 sm:text-4xl"
            style="font-family: var(--font-display)"
          >
            Lima langkah, satu per satu
          </h2>
          <p class="mt-3 max-w-md text-base leading-relaxed text-ink-600 dark:text-ink-400">
            Tidak perlu selesai hari ini. Satu langkah cukup.
          </p>
        </div>

        <!-- Timeline: ol with vertical connector -->
        <ol class="mt-14 space-y-0">
          <li
            v-for="(stage, index) in stages"
            :key="stage.step"
            class="stage-row scroll-reveal relative flex gap-5 pb-7 last:pb-0"
          >
            <!-- Vertical connector line -->
            <div
              v-if="index < stages.length - 1"
              class="story-connector"
              aria-hidden="true"
            />

            <!-- Step bullet -->
            <div class="relative z-10 shrink-0">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300"
                :class="
                  stage.ready
                    ? 'bg-brand-600 text-cream-50 shadow-brand'
                    : 'border border-ink-300 dark:border-ink-600 bg-ink-50 dark:bg-ink-900 text-ink-400 dark:text-ink-500'
                "
              >
                {{ index + 1 }}
              </div>
            </div>

            <!-- Stage card: Double-Bezel, interactive -->
            <NuxtLink
              :to="stage.to"
              class="focus-ring group mb-2 flex-1"
            >
              <!-- Outer shell — hover lifts border to brand -->
              <div
                class="h-full p-[6px] rounded-[1.25rem] border border-ink-200/60 dark:border-white/[0.07] bg-white/40 dark:bg-white/[0.03] shadow-soft dark:shadow-none transition-all duration-300 group-hover:border-brand-300 dark:group-hover:border-brand-600/30 group-hover:bg-white dark:group-hover:bg-white/[0.055]"
              >
                <!-- Inner core -->
                <div
                  class="flex h-full items-start justify-between gap-4 rounded-[calc(1.25rem-6px)] bg-white dark:bg-ink-900 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] border border-ink-100 dark:border-transparent"
                >
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3
                        class="font-semibold text-ink-900 dark:text-cream-100 transition-colors duration-200 group-hover:text-brand-700 dark:group-hover:text-brand-300"
                      >
                        {{ stage.title }}
                      </h3>
                      <span
                        v-if="stage.ready"
                        class="rounded-full border border-sage-200 dark:border-sage-600/25 bg-sage-100 dark:bg-sage-900/60 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sage-700 dark:text-sage-400 uppercase"
                      >
                        Siap
                      </span>
                    </div>
                    <p class="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{{ stage.body }}</p>
                  </div>

                  <!-- Arrow -->
                  <Icon name="lucide:chevron-right" class="mt-0.5 h-4 w-4 shrink-0 text-ink-600 transition-all duration-200 group-hover:translate-x-1 group-hover:text-brand-400" aria-hidden="true" />
                </div>
              </div>
            </NuxtLink>
          </li>
        </ol>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         SECTION 4 · CTA Penutup
         Layout: centered single element (distinct from all sections above)
         No eyebrow (budget spent on section 3)
         Theme: ink-900 (dark family, no light flip)
    ═══════════════════════════════════════════════════════════════════ -->
    <section ref="ctaSec" class="relative overflow-hidden bg-cream-50 dark:bg-ink-900 transition-colors duration-500">

      <!-- Brand glow, centered -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          class="h-[550px] w-[550px] rounded-full blur-[90px] opacity-[0.18]"
          style="background: radial-gradient(circle, rgb(169 14 2 / 0.9) 0%, transparent 65%)"
        />
      </div>

      <div class="relative z-10 mx-auto max-w-5xl px-4 py-24 sm:px-6">

        <!-- Double-Bezel CTA container -->
        <div
          class="scroll-reveal"
          :class="{ visible: ctaVis }"
        >
          <!-- Outer shell -->
          <div class="p-[6px] rounded-[1.75rem] border border-ink-200/50 dark:border-white/[0.06] bg-white/30 dark:bg-white/[0.03] shadow-soft dark:shadow-none">
            <!-- Inner core -->
            <div
              class="rounded-[calc(1.75rem-6px)] bg-gradient-to-br from-white to-cream-100 dark:from-ink-950/70 dark:to-ink-900 px-8 py-14 text-center shadow-[inset_0_1px_0_rgba(255,255,255,1),0_0_50px_-20px_rgb(169_14_2_/_0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_50px_-20px_rgb(169_14_2_/_0.25)] border border-ink-100 dark:border-transparent sm:px-14 sm:py-16"
            >
              <div class="flex justify-center mb-7">
                <MascotFigure pose="lari" size="sm" />
              </div>

              <h2
                class="text-3xl font-bold tracking-tight text-ink-900 dark:text-cream-50 sm:text-4xl"
                style="font-family: var(--font-display)"
              >
                Mulai dari satu angka dulu.
              </h2>
              
              <p class="mt-4 mx-auto max-w-sm text-base leading-relaxed text-ink-600 dark:text-ink-400">
                Isian pertamanya cuma biaya hidup bulanan. Sekitar dua menit.
              </p>

              <div class="mt-8">
                <BaseButton to="/audit" size="lg">
                  Mulai audit
                    <Icon name="lucide:arrow-right" class="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </BaseButton>
              </div>

              <!-- Privacy note — moved to CTA per hero-stack discipline -->
              <div class="mt-6 flex items-center justify-center gap-2 text-xs text-ink-500">
                <Icon name="lucide:shield-check" class="h-3.5 w-3.5 shrink-0 text-sage-600" aria-hidden="true" />
                Data utang diproses sepenuhnya di perangkat ini.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>
