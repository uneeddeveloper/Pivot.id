<script setup lang="ts">
import { ref, nextTick } from 'vue'

const isOpen = ref(false)

function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value && turns.value.length === 1) {
    // Only has initial message
    nextTick(() => scrollToBottom())
  }
}

interface Turn {
  role: 'user' | 'assistant'
  content: string
}

const turns = ref<Turn[]>([
  { role: 'assistant', content: 'Halo! Saya asisten AI dari Pivot. Ada yang bisa saya bantu hari ini?' }
])
const draft = ref('')
const sending = ref(false)
const errorMessage = ref('')

const scroller = ref<HTMLElement | null>(null)
const attachedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

async function scrollToBottom() {
  await nextTick()
  if (scroller.value) {
    scroller.value.scrollTop = scroller.value.scrollHeight
  }
}

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
    let result: { reply: string }

    if (fileToSend) {
      const formData = new FormData()
      formData.append('messages', JSON.stringify(turns.value.slice(1)))
      formData.append('file', fileToSend)

      result = await $fetch<{ reply: string }>('/api/chat', {
        method: 'POST',
        body: formData,
      })
    } else {
      result = await $fetch<{ reply: string }>('/api/chat', {
        method: 'POST',
        body: { messages: turns.value.slice(1) },
      })
    }

    turns.value.push({ role: 'assistant', content: result.reply })
  } catch (error) {
    const payload =
      typeof error === 'object' && error !== null && 'data' in error
        ? (error as { data?: { data?: { message?: string }; statusMessage?: string } }).data
        : undefined

    errorMessage.value =
      payload?.data?.message ||
      payload?.statusMessage ||
      'Balasan gagal dimuat. Coba kirim ulang sebentar lagi.'

    const lastUser = turns.value.pop()
    if (lastUser?.role === 'user') draft.value = lastUser.content
  } finally {
    sending.value = false
    await scrollToBottom()
  }
}
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end">
    <!-- Chat Window Panel -->
    <Transition
      enter-active-class="transition duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
      enter-from-class="transform translate-y-8 opacity-0 scale-95"
      enter-to-class="transform translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="transform translate-y-0 opacity-100 scale-100"
      leave-to-class="transform translate-y-8 opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="mb-4 flex h-[500px] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-[1.25rem] border border-ink-200/50 bg-white/80 shadow-lift backdrop-blur-xl dark:border-white/[0.08] dark:bg-ink-950/80 dark:shadow-dark-lift"
      >
        <!-- Header -->
        <header class="flex items-center justify-between border-b border-ink-200/50 bg-white/50 px-4 py-3.5 dark:border-white/[0.05] dark:bg-ink-950/50">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 border border-brand-500/20 dark:text-brand-400">
              <Icon name="lucide:sparkles" class="h-4 w-4" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-ink-900 dark:text-cream-50">Pivot AI</h3>
              <p class="text-[11px] text-ink-500 dark:text-ink-400">Selalu siap membantu</p>
            </div>
          </div>
          <button
            @click="toggleChat"
            class="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 dark:text-ink-500 dark:hover:bg-white/[0.05]"
            aria-label="Tutup Chat"
          >
            <Icon name="lucide:x" class="h-4 w-4" />
          </button>
        </header>

        <!-- Chat Area -->
        <div ref="scroller" class="flex-1 overflow-y-auto p-4 text-sm no-scrollbar space-y-3">
          <div
            v-for="(turn, index) in turns"
            :key="index"
            class="flex flex-col gap-1"
            :class="turn.role === 'user' ? 'items-end' : 'items-start'"
          >
            <div 
              class="max-w-[85%] rounded-[1rem] px-4 py-2.5 whitespace-pre-line"
              :class="
                turn.role === 'user'
                  ? 'rounded-tr-sm bg-linear-to-b from-brand-500 to-brand-700 text-cream-50 shadow-sm'
                  : 'rounded-tl-sm border border-ink-200/50 bg-ink-50 text-ink-800 dark:border-white/[0.04] dark:bg-ink-900/50 dark:text-cream-100 shadow-sm'
              "
            >
              <p class="leading-relaxed">{{ turn.content }}</p>
            </div>
          </div>

          <div v-if="sending" class="flex justify-start">
            <div class="flex items-center gap-2 rounded-[1rem] rounded-tl-sm border border-ink-200/50 bg-ink-50 px-4 py-2.5 text-ink-500 dark:border-white/[0.04] dark:bg-ink-900/50 dark:text-ink-400 shadow-sm">
              <Icon name="lucide:loader-circle" class="h-4 w-4 animate-spin" />
              <span class="text-xs">Mengetik...</span>
            </div>
          </div>
          
          <div v-if="errorMessage" class="flex justify-center mt-2">
            <p class="text-xs text-amber-600 dark:text-amber-400">{{ errorMessage }}</p>
          </div>
        </div>

        <!-- Input Area -->
        <div class="border-t border-ink-200/50 bg-white/50 p-3 dark:border-white/[0.05] dark:bg-ink-950/50 relative">
          
          <!-- File Preview Pill -->
          <div v-if="attachedFile" class="mb-2 flex items-center">
            <div class="inline-flex items-center gap-2 rounded-lg bg-ink-100 dark:bg-white/[0.08] border border-ink-200 dark:border-white/[0.1] px-3 py-1.5 max-w-full">
              <Icon :name="attachedFile.type === 'application/pdf' ? 'lucide:file-text' : 'lucide:image'" class="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
              <span class="truncate text-[11px] font-medium text-ink-700 dark:text-cream-300">{{ attachedFile.name }}</span>
              <button 
                type="button" 
                class="ml-1 rounded-md text-ink-400 hover:text-ink-700 dark:text-ink-500 dark:hover:text-cream-300 focus-ring dark:focus-ring-dark" 
                @click="clearFile"
              >
                <Icon name="lucide:x" class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div 
            class="relative rounded-xl border bg-white dark:bg-ink-900 transition-colors duration-200"
            :class="[
              isDragging ? 'border-brand-500 bg-brand-50/50 dark:border-brand-400 dark:bg-brand-900/20' : 'border-ink-200 dark:border-white/[0.12]',
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
            
            <div class="flex items-end">
              <textarea
                v-model="draft"
                rows="1"
                :disabled="sending"
                placeholder="Tanya AI atau drop file di sini..."
                class="w-full resize-y min-h-[44px] max-h-[120px] bg-transparent py-3 pl-3 pr-2 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 focus:outline-none dark:text-cream-50 dark:placeholder:text-ink-500 disabled:opacity-50 no-scrollbar"
                @keydown.enter.exact.prevent="send"
              />
              
              <div class="flex items-center gap-1 p-1.5 pb-2">
                <button 
                  type="button" 
                  class="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 dark:text-ink-500 dark:hover:bg-white/[0.07] dark:hover:text-cream-300 disabled:opacity-50"
                  :disabled="sending"
                  title="Lampirkan File (PDF/Gambar)"
                  @click="triggerFileSelect"
                >
                  <Icon name="lucide:paperclip" class="h-4 w-4" />
                </button>
                
                <button
                  @click="send"
                  :disabled="(!draft.trim() && !attachedFile) || sending"
                  class="flex h-7 w-7 items-center justify-center rounded-lg transition disabled:opacity-50"
                  :class="draft.trim() || attachedFile ? 'bg-brand-500 text-cream-50 hover:bg-brand-600' : 'bg-ink-100 text-ink-400 dark:bg-white/[0.05] dark:text-ink-600'"
                >
                  <Icon name="lucide:send" class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- FAB Button -->
    <button
      @click="toggleChat"
      class="focus-ring group relative flex h-14 items-center justify-center gap-2.5 rounded-full bg-brand-600 text-cream-50 shadow-brand transition-all duration-400 ease-out hover:scale-105 hover:bg-brand-500 hover:shadow-[0_12px_40px_-12px_rgba(169,14,2,0.6)]"
      :class="isOpen ? 'w-14' : 'px-5'"
      aria-label="Buka Chat AI"
    >
      <span v-if="!isOpen" class="absolute inset-0 -z-10 animate-pulse rounded-full bg-brand-600/50 blur-md"></span>

      <Transition name="fade" mode="out-in">
        <Icon name="lucide:message-circle" v-if="!isOpen" class="h-6 w-6 shrink-0" />
        <Icon name="lucide:x" v-else class="h-6 w-6 shrink-0" />
      </Transition>
      
      <span v-if="!isOpen" class="pr-1 text-sm font-semibold tracking-wide whitespace-nowrap">Tanya AI</span>
    </button>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}
</style>
