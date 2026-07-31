import type { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2'

/**
 * Pembungkus SweetAlert2 untuk seluruh dialog & notifikasi aplikasi.
 *
 * Kenapa dibungkus, bukan panggil Swal langsung di komponen:
 * - Satu tempat untuk gaya visual. Semua popup ikut palet krem/brand lewat
 *   kelas `.pivot-swal*` di assets/css/main.css (`buttonsStyling: false`,
 *   jadi tombolnya murni CSS kita — bukan biru bawaan SweetAlert).
 * - Aman untuk SSR. Modul `sweetalert2` menyentuh `document` saat dimuat,
 *   jadi di-import dinamis dan hanya di sisi klien. Bundelnya pun tidak ikut
 *   entry utama — baru diunduh saat dialog pertama dipanggil.
 *
 * Dark mode tidak perlu diurus di sini: popup-nya turunan dari <html>, jadi
 * selektor `.dark .swal2-popup` di CSS sudah ikut berubah sendiri.
 */

type SwalInstance = typeof import('sweetalert2').default

let swalLoader: Promise<SwalInstance> | null = null

function loadSwal(): Promise<SwalInstance> {
  if (!swalLoader) {
    swalLoader = import('sweetalert2').then((module) => module.default)
  }
  return swalLoader
}

/** Opsi yang dipakai semua popup besar (bukan toast). */
const modalDefaults: SweetAlertOptions = {
  buttonsStyling: false,
  reverseButtons: true,
  // Tanpa ini SweetAlert mengubah tinggi <html> dan halaman ikut melompat.
  heightAuto: false,
  customClass: {
    container: 'pivot-swal-container',
    popup: 'pivot-swal',
    title: 'pivot-swal__title',
    htmlContainer: 'pivot-swal__text',
    actions: 'pivot-swal__actions',
    confirmButton: 'pivot-swal__btn pivot-swal__btn--primary',
    denyButton: 'pivot-swal__btn pivot-swal__btn--quiet',
    cancelButton: 'pivot-swal__btn pivot-swal__btn--quiet',
    icon: 'pivot-swal__icon',
  },
}

export interface ConfirmOptions {
  title: string
  text?: string
  /** Label tombol setuju. Pakai kata kerja, bukan "OK". */
  confirmText?: string
  cancelText?: string
  icon?: SweetAlertIcon
  /**
   * Tandai aksi yang menghapus/menimpa data. Fokus awal pindah ke tombol
   * batal supaya Enter tidak langsung menghapus.
   */
  destructive?: boolean
}

export interface ToastOptions {
  /** Milidetik toast bertahan sebelum menutup sendiri. */
  duration?: number
}

export function useAlert() {
  /**
   * Pengganti `window.confirm`. Mengembalikan `true` hanya kalau user menekan
   * tombol konfirmasi — menutup lewat Esc, klik latar, atau Batal = `false`.
   */
  async function confirmAction(options: ConfirmOptions): Promise<boolean> {
    // Di server tidak ada yang bisa menjawab; anggap dibatalkan.
    if (!import.meta.client) return false

    const swal = await loadSwal()
    const result = await swal.fire({
      ...modalDefaults,
      icon: options.icon ?? (options.destructive ? 'warning' : 'question'),
      title: options.title,
      text: options.text,
      showCancelButton: true,
      confirmButtonText: options.confirmText ?? 'Ya, lanjutkan',
      cancelButtonText: options.cancelText ?? 'Batal',
      focusCancel: options.destructive ?? false,
    })

    return result.isConfirmed
  }

  /** Popup informasi satu tombol. Untuk pesan yang harus benar-benar dibaca. */
  async function alertMessage(
    title: string,
    text?: string,
    icon: SweetAlertIcon = 'info',
  ): Promise<void> {
    if (!import.meta.client) return

    const swal = await loadSwal()
    await swal.fire({
      ...modalDefaults,
      icon,
      title,
      text,
      confirmButtonText: 'Mengerti',
    })
  }

  const alertSuccess = (title: string, text?: string) => alertMessage(title, text, 'success')
  const alertError = (title: string, text?: string) => alertMessage(title, text, 'error')

  /**
   * Notifikasi kecil di pojok kanan atas — untuk umpan balik yang tidak perlu
   * menghentikan pekerjaan user (mis. "tersalin"). Jangan dipakai untuk error
   * validasi formulir; itu tetap ditampilkan inline di dekat kolomnya.
   */
  async function toast(
    message: string,
    icon: SweetAlertIcon = 'success',
    options: ToastOptions = {},
  ): Promise<void> {
    if (!import.meta.client) return

    const swal = await loadSwal()
    await swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title: message,
      showConfirmButton: false,
      timer: options.duration ?? 2600,
      timerProgressBar: true,
      heightAuto: false,
      customClass: {
        container: 'pivot-swal-container',
        popup: 'pivot-swal pivot-toast',
        title: 'pivot-toast__title',
        timerProgressBar: 'pivot-toast__timer',
        icon: 'pivot-swal__icon',
      },
    })
  }

  const toastSuccess = (message: string, options?: ToastOptions) =>
    toast(message, 'success', options)
  const toastError = (message: string, options?: ToastOptions) => toast(message, 'error', options)

  return {
    confirmAction,
    alertMessage,
    alertSuccess,
    alertError,
    toast,
    toastSuccess,
    toastError,
  }
}
