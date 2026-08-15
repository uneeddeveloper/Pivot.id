<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useCareerStore } from '~/stores/career'
import { useCatalogStore } from '~/stores/catalog'

/**
 * Percakapan penggali keterampilan.
 *
 * Riwayat percakapan hidup di komponen ini saja dan ikut dikirim tiap giliran —
 * server tidak menyimpan sesi apa pun. Begitu tab ditutup, ceritanya hilang.
 */

const emit = defineEmits<{ ready: [] }>()

const career = useCareerStore()
const catalog = useCatalogStore()

interface Turn {
  role: 'user' | 'assistant'
  content: string
}

const OPENING =
  'Halo. Ceritakan saja apa yang pernah kamu kerjakan — kerja formal, usaha keluarga, kerja sampingan, kegiatan organisasi, atau hal yang kamu pelajari sendiri. Semuanya dihitung.\n\nKalau bingung mulai dari mana: sehari-hari kamu biasanya ngapain?'

const turns = ref<Turn[]>([{ role: 'assistant', content: OPENING }])
const draft = ref('')
const sending = ref(false)
const errorMessage = ref('')
const missingInfo = ref<string[]>([])
const attachedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

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

function handlePaste(event: ClipboardEvent) {
  if (event.clipboardData?.files && event.clipboardData.files.length > 0) {
    const file = event.clipboardData.files[0]
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      attachedFile.value = file
    }
  }
}

/** Keterampilan yang sudah tertangkap AI sejauh percakapan berjalan. */
const detected = ref<string[]>([])
const detectedSkills = computed(() => catalog.resolveSkills(detected.value))

const isReady = ref(false)

const scroller = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

interface InterviewResponse {
  reply: string
  skills: string[]
  experienceYears: number
  background: string
  ready: boolean
  missingInfo: string[]
}

async function send() {
  const text = draft.value.trim()
  if ((!text && !attachedFile.value) || sending.value) return

  const messageText = text || 'Berikut lampiran dokumen saya.'
  turns.value.push({ role: 'user', content: messageText })
  
  const fileToSend = attachedFile.value
  draft.value = ''
  clearFile()
  
  sending.value = true
  errorMessage.value = ''
  await scrollToBottom()

  try {
    let result: InterviewResponse

    if (fileToSend) {
      const formData = new FormData()
      formData.append('messages', JSON.stringify(turns.value.slice(1)))
      formData.append('file', fileToSend)

      result = await $fetch<InterviewResponse>('/api/career/interview', {
        method: 'POST',
        body: formData,
      })
    } else {
      result = await $fetch<InterviewResponse>('/api/career/interview', {
        method: 'POST',
        body: { messages: turns.value.slice(1) },
      })
    }

    turns.value.push({ role: 'assistant', content: result.reply })
    detected.value = result.skills
    missingInfo.value = result.missingInfo
    isReady.value = result.ready

    career.experienceYears = result.experienceYears
    if (result.background) career.background = result.background

    if (result.ready) {
      // Hasil percakapan dipindahkan ke store supaya langkah berikutnya —
      // peninjauan chip dan pencocokan peran — punya bahannya.
      career.addSkills(result.skills)
      emit('ready')
    }
  } catch (error) {
    const payload =
      typeof error === 'object' && error !== null && 'data' in error
        ? (error as { data?: { data?: { message?: string }; statusMessage?: string } }).data
        : undefined

    errorMessage.value =
      payload?.data?.message ||
      payload?.statusMessage ||
      'Balasan gagal dimuat. Coba kirim ulang sebentar lagi.'

    // Pesan user dikembalikan ke kotak isian supaya tidak hilang percuma.
    const lastUser = turns.value.pop()
    if (lastUser?.role === 'user') draft.value = lastUser.content
  } finally {
    sending.value = false
    await scrollToBottom()
  }
}

/** Kalau user sudah merasa cukup bercerita, dia boleh memotong duluan. */
function finishNow() {
  if (detected.value.length === 0) return
  career.addSkills(detected.value)
  isReady.value = true
  emit('ready')
}

const canFinishEarly = computed(() => !isReady.value && detected.value.length >= 2)
</script>

<template>
  <BaseCard
    title="Ceritakan kemampuanmu"
    subtitle="Tidak perlu istilah kerja yang formal. Pakai bahasamu sendiri — nanti kami yang menerjemahkannya jadi keterampilan yang dikenali pemberi kerja."
  >
    <template #icon>
      <Icon name="lucide:message-square" class="h-5 w-5" />
    </template>

    <!-- ── Riwayat percakapan ─────────────────────────────────────────────── -->
    <div
      ref="scroller"
      class="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-ink-200/50 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] p-4"
      role="log"
      aria-live="polite"
      aria-label="Percakapan dengan asisten"
    >
      <div
        v-for="(turn, index) in turns"
        :key="index"
        class="flex"
        :class="turn.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <p
          class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line"
          :class="
            turn.role === 'user'
              ? 'bg-linear-to-b from-brand-500 to-brand-700 text-cream-50'
              : 'border border-ink-200/50 dark:border-white/[0.07] bg-white/50 dark:bg-white/[0.02] text-ink-600 dark:text-ink-400'
          "
        >
          {{ turn.content }}
        </p>
      </div>

      <div v-if="sending" class="flex justify-start">
        <p
          class="flex items-center gap-2 rounded-2xl border border-ink-200/50 dark:border-white/[0.07] bg-white/50 dark:bg-white/[0.02] px-4 py-2.5 text-sm text-ink-600 dark:text-ink-500"
        >
          <Icon name="lucide:loader-circle" class="h-4 w-4 animate-spin" aria-hidden="true" />
          Sedang menyimak…
        </p>
      </div>
    </div>

    <!-- ── Kotak isian ────────────────────────────────────────────────────── -->
    <div 
      class="mt-4 relative rounded-xl border transition-colors duration-200"
      :class="[
        isDragging ? 'border-brand-500 bg-brand-50/50 dark:border-brand-400 dark:bg-brand-900/20' : 'border-ink-200 dark:border-white/[0.12] bg-white dark:bg-ink-900',
        'focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:focus-within:border-brand-400 dark:focus-within:ring-brand-400/20'
      ]"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @paste="handlePaste"
    >
      <input 
        ref="fileInput"
        type="file" 
        accept=".pdf,image/png,image/jpeg,image/webp" 
        class="hidden" 
        @change="handleFileSelect" 
      />
      
      <!-- File Preview Pill -->
      <div v-if="attachedFile" class="px-3 pt-3 flex items-center">
        <div class="inline-flex items-center gap-2 rounded-lg bg-ink-50 dark:bg-white/[0.05] border border-ink-200 dark:border-white/[0.1] px-3 py-1.5 max-w-[80%]">
          <Icon :name="attachedFile.type === 'application/pdf' ? 'lucide:file-text' : 'lucide:image'" class="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
          <span class="truncate text-sm font-medium text-ink-700 dark:text-cream-300">{{ attachedFile.name }}</span>
          <button 
            type="button" 
            class="ml-1 rounded-md text-ink-400 hover:text-ink-700 dark:text-ink-500 dark:hover:text-cream-300 focus-ring dark:focus-ring-dark" 
            @click="clearFile"
            aria-label="Hapus file"
          >
            <Icon name="lucide:x" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div class="flex items-end">
        <label for="skill-chat-input" class="sr-only">Ceritakan kemampuanmu</label>
        <textarea
          id="skill-chat-input"
          v-model="draft"
          rows="3"
          :disabled="sending"
          placeholder="Mis. Saya lulusan SMA. Punya CV? Tempel (paste) atau drag-and-drop di sini."
          class="w-full resize-y bg-transparent p-3 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 focus:outline-none dark:text-cream-50 dark:placeholder:text-ink-500 disabled:opacity-50"
          @keydown.enter.exact.prevent="send"
        />
        
        <!-- Action Buttons inside input -->
        <div class="p-2 pb-3 flex items-center gap-1">
          <button 
            type="button" 
            class="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-700 dark:text-ink-400 dark:hover:bg-white/[0.07] dark:hover:text-cream-300 focus-ring dark:focus-ring-dark disabled:opacity-50"
            :disabled="sending"
            aria-label="Lampirkan File"
            @click="triggerFileSelect"
          >
            <Icon name="lucide:paperclip" class="h-5 w-5" />
          </button>
          
          <button 
            type="button" 
            class="rounded-lg p-2 transition focus-ring dark:focus-ring-dark disabled:opacity-50"
            :class="draft.trim() || attachedFile ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-ink-100 text-ink-400 dark:bg-white/[0.05] dark:text-ink-600'"
            :disabled="(!draft.trim() && !attachedFile) || sending"
            aria-label="Kirim"
            @click="send"
          >
            <Icon name="lucide:send" class="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
    
    <p class="mt-1.5 text-[11px] text-ink-600 dark:text-ink-500 text-center">
      Tekan Enter untuk mengirim, Shift+Enter untuk baris baru. Dukung PDF & Gambar (Max 5MB).
    </p>

    <p
      v-if="errorMessage"
      class="mt-3 rounded-xl border border-amber-200/50 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/40 px-3 py-2.5 text-sm leading-relaxed text-amber-700 dark:text-amber-200/90"
    >
      {{ errorMessage }}
    </p>

    <PrivacyNote compact class="mt-4">
      Ceritamu dikirim ke layanan AI untuk dibaca, lalu
      <strong class="font-semibold">dilupakan</strong> — tidak disimpan ke database, tidak
      di-cache, dan tidak dicatat di log. Riwayat obrolan ini hilang begitu tab ditutup.
    </PrivacyNote>

    <!-- ── Yang sudah tertangkap ──────────────────────────────────────────── -->
    <div v-if="detectedSkills.length" class="mt-5 border-t border-ink-200/50 dark:border-white/[0.08] pt-4">
      <p class="text-[10px] font-semibold tracking-[0.14em] text-ink-600 dark:text-ink-500 uppercase">
        Sejauh ini terbaca
      </p>
      <div class="mt-2 flex flex-wrap gap-2">
        <span
          v-for="skill in detectedSkills"
          :key="skill.id"
          class="rounded-full border border-sage-200 dark:border-sage-600/40 bg-sage-50 dark:bg-sage-900/60 px-2.5 py-1 text-xs font-medium text-sage-700 dark:text-sage-300"
        >
          {{ skill.label }}
        </span>
      </div>

      <p v-if="missingInfo.length && !isReady" class="mt-3 text-xs leading-relaxed text-ink-600 dark:text-ink-500">
        Masih ingin kami tahu: {{ missingInfo.join(', ') }}.
      </p>
    </div>

    <template #footer>
      <div class="flex flex-wrap items-center gap-3">
        <!-- Buttons in footer are removed because they are now inside the input -->

        <BaseButton v-if="canFinishEarly" variant="ghost" size="sm" @click="finishNow">
          Cukup, lihat hasilnya sekarang
        </BaseButton>

        <p v-if="isReady" class="text-xs text-sage-600 dark:text-sage-400">
          Cukup keterangannya — hasilnya sudah muncul di bawah.
        </p>
      </div>
    </template>
  </BaseCard>
</template>
