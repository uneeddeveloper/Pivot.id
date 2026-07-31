<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCareerStore } from '~/stores/career'
import { useCatalogStore } from '~/stores/catalog'

/**
 * Penyusun kerangka CV format ATS lewat LLM Sumopod.
 *
 * PRIVASI: nama, kota, dan kontak di formulir ini diketik user sendiri dan
 * dikirim ke /api/cv/ats hanya saat tombol ditekan. Endpoint itu tidak
 * menyimpannya ke MySQL dan tidak men-cache-nya. Seluruh isian boleh
 * dikosongkan — hasilnya tetap keluar dengan placeholder.
 */

const props = defineProps<{ roleId: string }>()

const career = useCareerStore()
const catalog = useCatalogStore()
const { toastSuccess, toastError } = useAlert()

const fullName = ref('')
const city = ref('')
const contact = ref('')
const jobTitle = ref('')

const generating = ref(false)
const errorMessage = ref('')

interface AtsCv {
  headline: string
  summary: string
  skillGroups: { label: string; items: string[] }[]
  experienceBullets: string[]
  projectSuggestions: { title: string; bullets: string[] }[]
  atsKeywords: string[]
  tips: string[]
}

const cv = ref<AtsCv | null>(null)

const targetRole = computed(() =>
  props.roleId ? catalog.roleMap.get(props.roleId) : undefined,
)

const targetLabel = computed(() => jobTitle.value.trim() || targetRole.value?.title || '')

const canGenerate = computed(() => Boolean(targetLabel.value) && !generating.value)

async function generate() {
  if (!canGenerate.value) return

  generating.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ cv: AtsCv }>('/api/cv/ats', {
      method: 'POST',
      body: {
        fullName: fullName.value.trim(),
        city: city.value.trim(),
        contact: contact.value.trim(),
        roleId: props.roleId || undefined,
        jobTitle: jobTitle.value.trim(),
        skillIds: career.ownedSkills,
        experienceYears: career.experienceYears,
        background: career.background,
      },
    })
    cv.value = response.cv
  } catch (error) {
    const payload =
      typeof error === 'object' && error !== null && 'data' in error
        ? (error as { data?: { data?: { message?: string }; statusMessage?: string } }).data
        : undefined

    errorMessage.value =
      payload?.data?.message ||
      payload?.statusMessage ||
      'CV gagal disusun. Coba lagi sebentar lagi.'
  } finally {
    generating.value = false
  }
}

/** Susun CV jadi teks polos — bentuk yang paling ramah mesin penyaring ATS. */
const plainText = computed(() => {
  if (!cv.value) return ''

  const lines: string[] = []
  lines.push(fullName.value.trim() || '[Nama Lengkap]')

  const contactLine = [city.value.trim(), contact.value.trim()].filter(Boolean).join(' | ')
  if (contactLine) lines.push(contactLine)

  lines.push('', cv.value.headline, '', 'RINGKASAN', cv.value.summary)

  if (cv.value.skillGroups.length) {
    lines.push('', 'KETERAMPILAN')
    for (const group of cv.value.skillGroups) {
      lines.push(`${group.label}: ${group.items.join(', ')}`)
    }
  }

  if (cv.value.experienceBullets.length) {
    lines.push('', 'PENGALAMAN')
    for (const bullet of cv.value.experienceBullets) lines.push(`- ${bullet}`)
  }

  if (cv.value.projectSuggestions.length) {
    lines.push('', 'PROYEK')
    for (const project of cv.value.projectSuggestions) {
      lines.push(project.title)
      for (const bullet of project.bullets) lines.push(`- ${bullet}`)
    }
  }

  lines.push('', 'PENDIDIKAN', '[Nama institusi] — [Jurusan], [Tahun]')

  return lines.join('\n')
})

const copied = ref(false)

async function copyPlainText() {
  try {
    await navigator.clipboard.writeText(plainText.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2500)
    toastSuccess('Teks CV tersalin ke papan klip.')
  } catch {
    // Clipboard ditolak browser — teksnya tetap terlihat dan bisa diblok manual.
    // Toast dipakai di sini karena kotak error formulir ada jauh di kartu atas,
    // di luar pandangan saat user menekan tombol salin.
    toastError('Browser menolak akses papan klip. Sorot teksnya lalu salin manual.')
  }
}
</script>

<template>
  <BaseCard
    title="Susun CV format ATS"
    subtitle="Banyak lamaran gugur sebelum dibaca manusia karena formatnya tidak terbaca mesin penyaring. Yang ini teks polos — dibuat supaya lolos tahap itu."
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
        <path d="M12 2.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V6L12 2.5Zm0 0V6h3.5M7.5 10.5h5M7.5 13.5h3" />
      </svg>
    </template>

    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label="Nama lengkap" field-id="cv-name" hint="Boleh dikosongkan.">
        <input id="cv-name" v-model="fullName" type="text" class="field-input-dark" placeholder="Nama di CV" />
      </FormField>

      <FormField label="Kota domisili" field-id="cv-city" hint="Mis. Bandung.">
        <input id="cv-city" v-model="city" type="text" class="field-input-dark" placeholder="Kota" />
      </FormField>

      <FormField label="Kontak" field-id="cv-contact" hint="Email atau nomor yang mau dicantumkan.">
        <input
          id="cv-contact"
          v-model="contact"
          type="text"
          class="field-input-dark"
          placeholder="email@contoh.com"
        />
      </FormField>

      <FormField
        label="Posisi yang dilamar"
        field-id="cv-title"
        :hint="targetRole ? `Kosongkan untuk memakai: ${targetRole.title}` : 'Wajib diisi.'"
      >
        <input
          id="cv-title"
          v-model="jobTitle"
          type="text"
          class="field-input-dark"
          :placeholder="targetRole?.title || 'Mis. Admin Media Sosial'"
        />
      </FormField>
    </div>

    <PrivacyNote compact class="mt-4">
      Isian di atas dikirim sekali ke server untuk disusun, lalu
      <strong class="font-semibold">tidak disimpan ke database</strong> dan tidak di-cache. Semua
      kolom boleh dikosongkan — CV-nya tetap keluar dengan penanda yang bisa kamu isi sendiri.
    </PrivacyNote>

    <p v-if="!career.hasSkills" class="mt-4 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
      Kamu belum menandai keterampilan apa pun. CV-nya tetap bisa dibuat, tapi hasilnya jauh lebih
      tajam kalau langkah 2 diisi dulu.
    </p>

    <p
      v-if="errorMessage"
      class="mt-4 rounded-xl border border-amber-200/50 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/40 px-3 py-2.5 text-sm leading-relaxed text-amber-700 dark:text-amber-200/90"
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
          {{ generating ? 'Sedang disusun…' : cv ? 'Susun ulang' : 'Susun CV saya' }}
        </BaseButton>
        <p v-if="!targetLabel" class="text-xs text-ink-600 dark:text-ink-400">
          Pilih peran di pencarian lowongan atau isi posisi yang dilamar dulu.
        </p>
      </div>
    </template>
  </BaseCard>

  <!-- ── Hasil ──────────────────────────────────────────────────────────── -->
  <div v-if="cv" class="mt-4 space-y-4">
    <BaseCard :title="cv.headline" subtitle="Kerangka CV-mu. Periksa dan sesuaikan sebelum dikirim.">
      <div class="space-y-5">
        <div>
          <p class="text-[10px] font-semibold tracking-[0.14em] text-ink-600 dark:text-ink-500 uppercase">Ringkasan</p>
          <p class="mt-1.5 text-sm leading-relaxed text-ink-900 dark:text-cream-100">{{ cv.summary }}</p>
        </div>

        <div v-if="cv.skillGroups.length">
          <p class="text-[10px] font-semibold tracking-[0.14em] text-ink-600 dark:text-ink-500 uppercase">Keterampilan</p>
          <div class="mt-2 space-y-2">
            <div v-for="group in cv.skillGroups" :key="group.label">
              <p class="text-sm font-medium text-ink-900 dark:text-cream-50">{{ group.label }}</p>
              <p class="text-sm leading-relaxed text-ink-600 dark:text-ink-400">{{ group.items.join(', ') }}</p>
            </div>
          </div>
        </div>

        <div v-if="cv.experienceBullets.length">
          <p class="text-[10px] font-semibold tracking-[0.14em] text-ink-600 dark:text-ink-500 uppercase">Pengalaman</p>
          <ul class="mt-2 space-y-1.5">
            <li
              v-for="bullet in cv.experienceBullets"
              :key="bullet"
              class="flex gap-2 text-sm leading-relaxed text-ink-900 dark:text-cream-100"
            >
              <span class="text-ink-300 dark:text-ink-600">•</span>{{ bullet }}
            </li>
          </ul>
        </div>

        <div v-if="cv.projectSuggestions.length">
          <p class="text-[10px] font-semibold tracking-[0.14em] text-ink-600 dark:text-ink-500 uppercase">
            Proyek yang bisa kamu kerjakan
          </p>
          <div class="mt-2 space-y-3">
            <div
              v-for="project in cv.projectSuggestions"
              :key="project.title"
              class="rounded-xl border border-ink-200/50 dark:border-white/[0.07] bg-white/50 dark:bg-white/[0.02] px-3 py-2.5"
            >
              <p class="text-sm font-medium text-ink-900 dark:text-cream-50">{{ project.title }}</p>
              <ul class="mt-1 space-y-1">
                <li
                  v-for="bullet in project.bullets"
                  :key="bullet"
                  class="flex gap-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400"
                >
                  <span class="text-ink-300 dark:text-ink-600">•</span>{{ bullet }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div v-if="cv.atsKeywords.length">
          <p class="text-[10px] font-semibold tracking-[0.14em] text-ink-600 dark:text-ink-500 uppercase">
            Kata kunci yang sebaiknya muncul apa adanya
          </p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="keyword in cv.atsKeywords"
              :key="keyword"
              class="rounded-full border border-sage-300 dark:border-sage-600/40 bg-sage-50 dark:bg-sage-900/60 px-2.5 py-1 text-xs text-sage-700 dark:text-sage-300"
            >
              {{ keyword }}
            </span>
          </div>
        </div>

        <div v-if="cv.tips.length" class="rounded-xl border border-ink-200/50 dark:border-white/[0.07] bg-white/50 dark:bg-white/[0.02] px-4 py-3">
          <p class="text-sm font-semibold text-ink-900 dark:text-cream-50">Sebelum dikirim</p>
          <ul class="mt-2 space-y-1.5">
            <li
              v-for="tip in cv.tips"
              :key="tip"
              class="flex gap-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400"
            >
              <span class="text-ink-300 dark:text-ink-600">•</span>{{ tip }}
            </li>
          </ul>
        </div>
      </div>
    </BaseCard>

    <BaseCard
      tone="soft"
      title="Versi teks polos"
      subtitle="Salin ini ke dokumen kosong, lalu ekspor jadi PDF tanpa tabel atau kolom."
    >
      <pre
        class="max-h-96 overflow-auto rounded-xl border border-ink-200/50 dark:border-white/[0.07] bg-white dark:bg-ink-900 p-4 text-xs leading-relaxed whitespace-pre-wrap text-ink-600 dark:text-ink-300"
        >{{ plainText }}</pre
      >

      <template #footer>
        <BaseButton size="sm" variant="secondary" @click="copyPlainText">
          {{ copied ? 'Tersalin' : 'Salin teks CV' }}
        </BaseButton>
      </template>
    </BaseCard>
  </div>
</template>
