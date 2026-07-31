<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)

function toggleChat() {
  isOpen.value = !isOpen.value
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
        class="mb-4 flex h-[480px] w-[360px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-[1.25rem] border border-ink-200/50 bg-white/80 shadow-lift backdrop-blur-xl dark:border-white/[0.08] dark:bg-ink-950/80 dark:shadow-dark-lift"
      >
        <!-- Header -->
        <header class="flex items-center justify-between border-b border-ink-200/50 bg-white/50 px-4 py-3.5 dark:border-white/[0.05] dark:bg-ink-950/50">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 border border-brand-500/20 dark:text-brand-400">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.792 0-5.484-.2-8.067-.587-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
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
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <!-- Chat Area -->
        <div class="flex-1 overflow-y-auto p-4 text-sm no-scrollbar">
          <!-- Initial message -->
          <div class="flex flex-col gap-2">
            <div class="max-w-[85%] self-start rounded-[1rem] rounded-tl-sm border border-ink-200/50 bg-ink-50 px-4 py-2.5 text-ink-800 dark:border-white/[0.04] dark:bg-ink-900/50 dark:text-cream-100 shadow-sm">
              <p>Halo! Saya asisten AI dari Pivot. Ada yang bisa saya bantu hari ini?</p>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="border-t border-ink-200/50 bg-white/50 p-3 dark:border-white/[0.05] dark:bg-ink-950/50">
          <div class="relative">
            <input
              type="text"
              placeholder="Ketik pesan (belum aktif)..."
              class="field-input w-full rounded-xl pl-4 pr-10 text-sm"
              disabled
            />
            <button
              class="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-cream-50 transition hover:bg-brand-600"
              disabled
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
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
      <!-- Subtle glow pulse behind the button to draw attention -->
      <span v-if="!isOpen" class="absolute inset-0 -z-10 animate-pulse rounded-full bg-brand-600/50 blur-md"></span>

      <Transition name="fade" mode="out-in">
        <svg v-if="!isOpen" class="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
        <svg v-else class="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
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
