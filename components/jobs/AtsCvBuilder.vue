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

const props = defineProps<{ 
  roleId: string
  query?: string 
}>()

const career = useCareerStore()
const catalog = useCatalogStore()

const fullName = ref('')
const city = ref('')
const contact = ref('')
const jobTitle = ref(props.query || '')

import { watch } from 'vue'
watch(() => props.query, (newQuery) => {
  if (newQuery && !jobTitle.value) {
    jobTitle.value = newQuery
  }
})

// File Upload State
const attachedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

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

function triggerFileSelect() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    attachedFile.value = target.files[0]
  }
}

function clearFile() {
  attachedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0]
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      attachedFile.value = file
    }
  }
}

async function generate() {
  if (!canGenerate.value) return

  generating.value = true
  errorMessage.value = ''

  try {
    const dataPayload = {
      fullName: fullName.value.trim(),
      city: city.value.trim(),
      contact: contact.value.trim(),
      roleId: props.roleId || undefined,
      jobTitle: jobTitle.value.trim(),
      skillIds: career.ownedSkills,
      experienceYears: career.experienceYears,
      background: career.background,
    }

    let response
    
    if (attachedFile.value) {
      const formData = new FormData()
      formData.append('data', JSON.stringify(dataPayload))
      formData.append('file', attachedFile.value)

      response = await $fetch<{ cv: AtsCv }>('/api/cv/ats', {
        method: 'POST',
        body: formData,
      })
    } else {
      response = await $fetch<{ cv: AtsCv }>('/api/cv/ats', {
        method: 'POST',
        body: { data: dataPayload },
      })
    }
    
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
  } catch {
    // Clipboard ditolak browser — teksnya tetap terlihat dan bisa diblok manual.
    errorMessage.value = 'Browser menolak akses papan klip. Sorot teksnya lalu salin manual.'
  }
}

function printPdf() {
  window.print()
}
</script>

<template>
  <BaseCard
    title="Susun CV format ATS"
    subtitle="Mesin penyaring ATS butuh teks polos tanpa ikon. Buat otomatis dari nol, atau unggah CV lamamu agar di-review dan diperbaiki oleh AI."
  >
    <template #icon>
      <Icon name="lucide:file-text" class="h-5 w-5" />
    </template>

    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label="Nama lengkap" field-id="cv-name" hint="Boleh dikosongkan.">
        <input id="cv-name" v-model="fullName" type="text" class="field-input" placeholder="Nama di CV" />
      </FormField>

      <FormField label="Kota domisili" field-id="cv-city" hint="Mis. Bandung.">
        <input id="cv-city" v-model="city" type="text" class="field-input" placeholder="Kota" />
      </FormField>

      <FormField label="Kontak" field-id="cv-contact" hint="Email atau nomor yang mau dicantumkan.">
        <input
          id="cv-contact"
          v-model="contact"
          type="text"
          class="field-input"
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
          class="field-input"
          :placeholder="targetRole?.title || 'Mis. Admin Media Sosial'"
        />
      </FormField>
    </div>
    
    <!-- Area Upload CV Lama -->
    <div class="mt-6 border-t border-ink-200/50 dark:border-white/[0.05] pt-5">
      <h3 class="mb-3 text-sm font-semibold text-ink-900 dark:text-cream-50">Review & Perbaiki CV Lama (Opsional)</h3>
      <p class="mb-4 text-xs text-ink-600 dark:text-ink-400">Punya CV lama? Unggah file PDF/Gambarnya ke sini. AI akan meninjau pengalaman di dalamnya, menyempurnakan bahasanya, dan menuliskannya ulang ke dalam standar ATS.</p>
      
      <div 
        class="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-200 cursor-pointer"
        :class="[
          isDragging ? 'border-brand-500 bg-brand-50/50 dark:border-brand-400 dark:bg-brand-900/20' : 'border-ink-200 dark:border-white/[0.12] hover:border-brand-400 dark:hover:border-brand-500 hover:bg-ink-50 dark:hover:bg-white/[0.02]',
        ]"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        @click="triggerFileSelect"
      >
        <input 
          ref="fileInput"
          type="file" 
          accept=".pdf,image/png,image/jpeg,image/webp" 
          class="hidden" 
          @change="handleFileSelect" 
        />
        
        <template v-if="attachedFile">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400">
              <Icon :name="attachedFile.type === 'application/pdf' ? 'lucide:file-text' : 'lucide:image'" class="h-5 w-5" />
            </div>
            <div class="text-left">
              <p class="text-sm font-medium text-ink-900 dark:text-cream-50">{{ attachedFile.name }}</p>
              <p class="text-xs text-ink-500 dark:text-ink-400">Siap direview oleh AI</p>
            </div>
            <button 
              type="button" 
              class="ml-2 rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-500 dark:hover:bg-white/[0.05] dark:hover:text-cream-100 relative z-10" 
              title="Hapus file"
              @click.stop="clearFile"
            >
              <Icon name="lucide:trash-2" class="h-4 w-4" />
            </button>
          </div>
        </template>
        <template v-else>
          <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 dark:bg-white/[0.05] text-ink-500 dark:text-ink-400">
            <Icon name="lucide:upload-cloud" class="h-5 w-5" />
          </div>
          <p class="text-sm text-ink-900 dark:text-cream-50 font-medium">Drag & drop file CV lamamu di sini</p>
          <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">Mendukung PDF, JPG, PNG (Maks. 5MB)</p>
          <button 
            type="button" 
            class="mt-3 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 relative z-10" 
            @click.stop="triggerFileSelect"
          >
            Pilih File Manual
          </button>
        </template>
      </div>
    </div>

    <PrivacyNote compact class="mt-4">
      Isian di atas dikirim sekali ke server untuk disusun, lalu
      <strong class="font-semibold">tidak disimpan ke database</strong> dan tidak di-cache.
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
          <Icon name="lucide:loader-circle" v-if="generating" class="h-4 w-4 animate-spin" aria-hidden="true" />
          {{ generating ? 'Sedang mereview & menyusun…' : cv ? 'Susun ulang' : (attachedFile ? 'Review & Susun ATS CV' : 'Susun CV dari nol') }}
        </BaseButton>
        <p v-if="!targetLabel" class="text-xs text-ink-600 dark:text-ink-400">
          Pilih peran di pencarian lowongan atau isi posisi yang dilamar dulu.
        </p>
      </div>
    </template>
  </BaseCard>

  <!-- ── Hasil ──────────────────────────────────────────────────────────── -->
  <div v-if="cv" class="mt-4 space-y-4">
    
    <BaseCard
      tone="soft"
      title="Template ATS Siap Cetak"
      subtitle="Dokumen ini sudah dioptimalkan untuk mesin pembaca (ATS). Tekan tombol di bawah untuk menyimpannya langsung sebagai PDF."
    >
      <div 
        class="cv-print-area mx-auto mt-4 w-full max-w-[700px] overflow-hidden bg-white p-8 text-black shadow-sm outline outline-1 outline-ink-200/50 dark:outline-white/20 print:shadow-none print:outline-none"
      >
        <div class="mb-4 text-center">
          <h1 class="text-2xl font-bold uppercase tracking-wide">{{ fullName || '[Nama Lengkap]' }}</h1>
          <p class="mt-1 text-sm text-gray-700">
            {{ [city, contact].filter(Boolean).join(' | ') }}
          </p>
        </div>

        <div class="mb-4" v-if="cv.summary">
          <h2 class="mb-1.5 border-b border-black pb-1 text-sm font-bold uppercase tracking-wider">Ringkasan</h2>
          <p class="text-[13px] leading-relaxed text-black">{{ cv.summary }}</p>
        </div>

        <div class="mb-4" v-if="cv.skillGroups.length">
          <h2 class="mb-1.5 border-b border-black pb-1 text-sm font-bold uppercase tracking-wider">Keterampilan</h2>
          <div v-for="group in cv.skillGroups" :key="group.label" class="mb-1 text-[13px] text-black">
            <span class="font-bold">{{ group.label }}:</span>
            <span> {{ group.items.join(', ') }}</span>
          </div>
        </div>

        <div class="mb-4" v-if="cv.experienceBullets.length">
          <h2 class="mb-1.5 border-b border-black pb-1 text-sm font-bold uppercase tracking-wider">Pengalaman Kerja</h2>
          <ul class="list-disc pl-5 text-[13px] leading-relaxed text-black">
            <li v-for="bullet in cv.experienceBullets" :key="bullet" class="mb-1">{{ bullet }}</li>
          </ul>
        </div>

        <div class="mb-4" v-if="cv.projectSuggestions.length">
          <h2 class="mb-1.5 border-b border-black pb-1 text-sm font-bold uppercase tracking-wider">Proyek & Portofolio</h2>
          <div v-for="project in cv.projectSuggestions" :key="project.title" class="mb-2">
            <h3 class="text-[13px] font-bold">{{ project.title }}</h3>
            <ul class="list-disc pl-5 text-[13px] leading-relaxed text-black">
              <li v-for="bullet in project.bullets" :key="bullet" class="mb-1">{{ bullet }}</li>
            </ul>
          </div>
        </div>

        <div class="mb-4">
          <h2 class="mb-1.5 border-b border-black pb-1 text-sm font-bold uppercase tracking-wider">Pendidikan</h2>
          <p class="text-[13px] text-black">[Nama Institusi] — [Jurusan], [Tahun]</p>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-wrap items-center gap-3">
          <BaseButton size="sm" @click="printPdf">
            <Icon name="lucide:printer" class="h-4 w-4 mr-1.5" /> Download PDF (ATS)
          </BaseButton>
          <BaseButton size="sm" variant="secondary" @click="copyPlainText">
            {{ copied ? 'Tersalin' : 'Salin Teks Polos' }}
          </BaseButton>
        </div>
      </template>
    </BaseCard>

    <BaseCard :title="cv.headline" subtitle="Review AI atas CV ini">
      <div class="space-y-5">
        <div v-if="cv.projectSuggestions.length">
          <p class="text-[10px] font-semibold tracking-[0.14em] text-ink-600 dark:text-ink-500 uppercase">
            Saran Proyek
          </p>
          <p class="mt-1 text-sm text-ink-600 dark:text-ink-400">
            Berikut proyek yang dapat menutupi celah jika pengalaman formalmu dirasa kurang:
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
          <p class="text-sm font-semibold text-ink-900 dark:text-cream-50">Saran AI Sebelum dikirim</p>
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
  </div>
</template>
