export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', {
    mounted(el) {
      el.classList.add('reveal-up')
      
      const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            el.classList.add('is-visible')
            observer.unobserve(el)
          }
        })
      }, {
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
      })
      
      observer.observe(el)
    },
    getSSRProps() {
      return {
        class: 'reveal-up'
      }
    }
  })
})
