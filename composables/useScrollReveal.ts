/**
 * useScrollReveal — Intersection Observer composable untuk scrollyteller.
 *
 * Cara pakai:
 *   const el = ref<HTMLElement | null>(null)
 *   const { isVisible } = useScrollReveal(el)
 *
 *   // Atau batch untuk banyak elemen dengan stagger:
 *   const { observe } = useScrollReveal()
 *   onMounted(() => observe(container.value?.querySelectorAll('.scroll-reveal')))
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue'

interface ScrollRevealOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
  staggerMs?: number
}

/** Single element — kembalikan isVisible sebagai ref reaktif. */
export function useScrollReveal(
  target?: Ref<HTMLElement | null>,
  options: ScrollRevealOptions = {},
) {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -60px 0px',
    once = true,
    staggerMs = 0,
  } = options

  const isVisible = ref(false)
  let observer: IntersectionObserver | null = null

  const createObserver = () => {
    if (typeof window === 'undefined') return

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible.value = true
            if (once && observer) {
              observer.unobserve(entry.target)
            }
          } else if (!once) {
            isVisible.value = false
          }
        })
      },
      { threshold, rootMargin },
    )

    if (target?.value) {
      observer.observe(target.value)
    }
  }

  /**
   * Batch observe: tambahkan class `visible` ke semua elemen dengan
   * optional stagger delay. Berguna untuk list kartu yang ingin muncul
   * satu per satu.
   */
  const observe = (
    elements: NodeListOf<Element> | Element[] | null | undefined,
    opts: { staggerMs?: number; threshold?: number } = {},
  ) => {
    if (!elements || typeof window === 'undefined') return

    const batchObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const idx = Number(el.dataset.revealIndex ?? 0)
            const delay = (opts.staggerMs ?? staggerMs) * idx

            setTimeout(() => {
              el.classList.add('visible')
            }, delay)

            batchObserver.unobserve(el)
          }
        })
      },
      {
        threshold: opts.threshold ?? threshold,
        rootMargin,
      },
    )

    Array.from(elements).forEach((el, idx) => {
      ;(el as HTMLElement).dataset.revealIndex = String(idx)
      batchObserver.observe(el)
    })
  }

  onMounted(() => {
    createObserver()
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  return { isVisible, observe }
}

/** Scroll progress — 0..1 sesuai posisi scroll halaman. */
export function useScrollProgress() {
  const progress = ref(0)

  const onScroll = () => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    progress.value = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0
  }

  onMounted(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
  })

  return { progress }
}
