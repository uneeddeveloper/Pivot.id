/**
 * Pose maskot Pivot (anak burung feniks — lahir kembali dari abu, dengan
 * lambang daur ulang di dadanya). Nama pose sengaja memakai bahasa Indonesia
 * supaya cocok dengan nama berkasnya di `assets/img/`.
 *
 * Tiap pose punya makna tetap. Jangan dipakai bergantian sesuai selera —
 * konsistensinya yang membuat maskot terbaca sebagai satu karakter, bukan
 * sekadar tempelan gambar lucu.
 *
 * | Pose     | Dipakai untuk                                              |
 * | -------- | ---------------------------------------------------------- |
 * | `hai`    | Sapaan pertama — hero landing                              |
 * | `papan`  | Menghitung & melaporkan angka — langkah 1 (audit)          |
 * | `tanya`  | Bertanya / memetakan yang belum diketahui — langkah 2      |
 * | `laptop` | Belajar & mengerjakan — langkah 3 (roadmap)                |
 * | `cape`   | Siap maju melamar — langkah 4 (lowongan & CV)              |
 * | `sip`    | Konfirmasi positif — "ini sudah bisa kamu ambil sekarang"  |
 * | `happy`  | Perayaan hasil — bebas utang, rencana gig menutup target   |
 * | `hati`   | Dukungan saat kondisinya berat — bukan perayaan            |
 * | `lari`   | Bergerak sekarang — CTA penutup & langkah 5 (penghasilan)  |
 * | `tidur`  | Keadaan kosong: belum ada data yang bisa ditampilkan       |
 *
 * `introduce.png` sengaja tidak didaftarkan: papannya memuat teks nama lain
 * yang menyatu di gambar, jadi tidak bisa dipakai di produk ini.
 */
export type MascotPose =
  | 'hai'
  | 'papan'
  | 'tanya'
  | 'laptop'
  | 'cape'
  | 'sip'
  | 'happy'
  | 'hati'
  | 'lari'
  | 'tidur'

export type MascotSize = 'xs' | 'sm' | 'md' | 'lg'
