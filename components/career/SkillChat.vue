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
  if (!text || sending.value) return

  turns.value.push({ role: 'user', content: text })
  draft.value = ''
  sending.value = true
  errorMessage.value = ''
  await scrollToBottom()

  try {
    const result = await $fetch<InterviewResponse>('/api/career/interview', {
      method: 'POST',
      // Pesan pembuka tidak ikut dikirim: itu teks kami sendiri, bukan bagian
      // percakapan yang perlu dipertimbangkan model.
      body: { messages: turns.value.slice(1) },
    })

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
      <svg
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M17 9.5c0 3.3-3.1 6-7 6-.9 0-1.8-.15-2.6-.4L3 16.5l1.2-3.1A5.6 5.6 0 0 1 3 9.5c0-3.3 3.1-6 7-6s7 2.7 7 6Z" />
      </svg>
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
          <svg
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
          Sedang menyimak…
        </p>
      </div>
    </div>

    <!-- ── Kotak isian ────────────────────────────────────────────────────── -->
    <div class="mt-4">
      <label for="skill-chat-input" class="sr-only">Ceritakan kemampuanmu</label>
      <textarea
        id="skill-chat-input"
        v-model="draft"
        rows="3"
        :disabled="sending"
        placeholder="Mis. Saya lulusan SMA. Dua tahun bantu warung keluarga — catat stok, layani pembeli, kadang bikin promo di Facebook…"
        class="field-input-dark resize-y leading-relaxed"
        @keydown.enter.exact.prevent="send"
      />
      <p class="mt-1.5 text-xs text-ink-600 dark:text-ink-500">
        Tekan Enter untuk mengirim, Shift+Enter untuk baris baru. Punya CV? Boleh langsung
        ditempel di sini.
      </p>
    </div>

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
        <BaseButton :disabled="!draft.trim() || sending" @click="send">
          {{ sending ? 'Mengirim…' : 'Kirim' }}
        </BaseButton>

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
