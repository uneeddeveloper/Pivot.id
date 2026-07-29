import type { MicroGig } from '../../types/gigs'

/**
 * Isi awal tabel `gigs`, `gig_skills`, dan `gig_channels`.
 *
 * Dipisah dari `catalog-seed.ts` karena isinya menjawab pertanyaan yang lain:
 * katalog peran bicara gaji bulanan dan jalur karier, katalog ini bicara uang
 * yang bisa masuk minggu ini.
 *
 * ANGKA DI SINI
 *   Rentang bayaran adalah tarif pasar Indonesia untuk PEMULA — orang yang
 *   belum punya portofolio dan belum punya ulasan di platform mana pun.
 *   Sengaja dipasang di batas bawah pasar: rencana yang meleset ke atas hanya
 *   membuat user senang, rencana yang meleset ke bawah membuat cicilannya
 *   telat. `hoursPerUnit` juga dilebihkan sedikit, karena pemula selalu lebih
 *   lambat daripada tarif yang diiklankan freelancer berpengalaman.
 *
 * ATURAN YANG MENGIKAT SETIAP BARIS
 *   1. `caution` wajib terisi, dan harus menyebut risiko yang NYATA untuk gig
 *      itu — bukan kalimat umum. Audiens aplikasi ini justru sasaran empuk
 *      penipuan kerja lepas.
 *   2. `startupCost` harus jujur. Gig yang butuh modal tidak boleh ditulis
 *      bermodal nol hanya supaya terlihat menarik; user yang sedang terjerat
 *      utang bisa berutang lagi untuk menutup modal itu.
 *   3. `channels` berisi kata kunci pencarian, bukan URL.
 */

export const GIG_SEED: MicroGig[] = [
  // ── Data & Admin ─────────────────────────────────────────────────────────
  {
    id: 'entri-data',
    title: 'Entri & rapikan data',
    category: 'Data & Admin',
    earnMin: 50_000,
    earnMax: 150_000,
    unit: 'per pesanan',
    hoursPerUnit: 2,
    maxUnitsPerWeek: 6,
    daysToFirstPay: 3,
    startupCost: 0,
    remoteFriendly: true,
    description:
      'Memindahkan data dari nota, PDF, atau formulir ke spreadsheet yang rapi. Pintu masuk paling cepat kalau kamu terbiasa dengan Excel dan telaten.',
    howToStart:
      'Buat satu contoh hasil kerja: ambil daftar acak 30 baris, rapikan jadi spreadsheet yang enak dibaca, simpan tangkapan layarnya. Itu portofolio pertamamu.',
    caution:
      'Tolak pemberi kerja yang meminta data pribadi orang lain (KTP, nomor rekening, data nasabah) untuk dientri. Itu bukan pekerjaan entri data biasa dan bisa menyeretmu ke perkara hukum.',
    skills: ['excel', 'data-cleaning', 'manajemen-waktu'],
    channels: [
      { name: 'Fastwork', searchQuery: 'fastwork jasa entri data', kind: 'platform' },
      { name: 'Projects.co.id', searchQuery: 'projects.co.id proyek entri data', kind: 'platform' },
    ],
  },
  {
    id: 'admin-chat-olshop',
    title: 'Admin chat toko online',
    category: 'Data & Admin',
    earnMin: 50_000,
    earnMax: 120_000,
    unit: 'per hari',
    hoursPerUnit: 4,
    maxUnitsPerWeek: 6,
    daysToFirstPay: 7,
    startupCost: 0,
    remoteFriendly: true,
    description:
      'Membalas chat pembeli di Shopee/Tokopedia/WhatsApp, mencatat pesanan, dan memantau stok. Bisa dikerjakan dari HP.',
    howToStart:
      'Tawarkan langsung ke toko kecil yang sering telat membalas chat — cek kolom ulasan yang mengeluh "penjual lama membalas". Itu calon klien yang sedang butuh.',
    caution:
      'Jangan pernah menerima pekerjaan yang memintamu memakai rekening pribadimu untuk menampung pembayaran pembeli. Itu pola pencucian uang, dan rekeningmu yang akan diblokir.',
    skills: ['layanan-pelanggan', 'komunikasi', 'manajemen-stok'],
    channels: [
      { name: 'Grup Facebook UMKM', searchQuery: 'grup facebook lowongan admin olshop', kind: 'komunitas' },
      { name: 'Tawaran langsung ke toko', searchQuery: 'cara menawarkan jasa admin olshop ke penjual', kind: 'langsung' },
    ],
  },
  {
    id: 'riset-data-online',
    title: 'Riset & kumpulkan data online',
    category: 'Data & Admin',
    earnMin: 60_000,
    earnMax: 180_000,
    unit: 'per pesanan',
    hoursPerUnit: 2.5,
    maxUnitsPerWeek: 5,
    daysToFirstPay: 5,
    startupCost: 0,
    remoteFriendly: true,
    description:
      'Mengumpulkan daftar kontak usaha, harga pesaing, atau data pasar dari internet lalu menyusunnya jadi satu tabel siap pakai.',
    howToStart:
      'Pilih satu kota dan satu jenis usaha, kumpulkan 50 data lengkap dengan sumbernya. Kirim 10 baris pertama sebagai contoh saat menawar.',
    caution:
      'Pastikan data yang diminta memang publik. Permintaan mengumpulkan data pribadi dari media sosial orang per orang sebaiknya ditolak.',
    skills: ['riset', 'excel', 'bahasa-inggris'],
    channels: [
      { name: 'Upwork', searchQuery: 'upwork web research data collection entry level', kind: 'platform' },
      { name: 'Sribulancer', searchQuery: 'sribulancer jasa riset data', kind: 'platform' },
    ],
  },
  {
    id: 'bantu-pembukuan',
    title: 'Bantu pembukuan UMKM',
    category: 'Data & Admin',
    earnMin: 150_000,
    earnMax: 400_000,
    unit: 'per pesanan (rekap bulanan)',
    hoursPerUnit: 5,
    maxUnitsPerWeek: 3,
    daysToFirstPay: 7,
    startupCost: 0,
    remoteFriendly: true,
    description:
      'Merapikan catatan penjualan dan pengeluaran warung atau toko kecil jadi laporan bulanan sederhana yang bisa mereka baca.',
    howToStart:
      'Mulai dari usaha yang kamu kenal — warung tetangga, usaha keluarga. Rapikan satu bulan catatan mereka gratis, lalu jadikan itu contoh untuk klien berikutnya.',
    caution:
      'Jelaskan sejak awal bahwa kamu merapikan catatan, bukan mengurus pajak. Salah menyebut diri konsultan pajak bisa berujung tuntutan kalau laporannya bermasalah.',
    skills: ['pembukuan', 'excel', 'akuntansi'],
    channels: [
      { name: 'Grup UMKM daerah', searchQuery: 'grup facebook umkm jasa pembukuan', kind: 'komunitas' },
      { name: 'Fastwork', searchQuery: 'fastwork jasa pembukuan laporan keuangan umkm', kind: 'platform' },
    ],
  },

  // ── Kreatif & Konten ─────────────────────────────────────────────────────
  {
    id: 'desain-feed-umkm',
    title: 'Desain feed Instagram UMKM',
    category: 'Kreatif & Konten',
    earnMin: 75_000,
    earnMax: 250_000,
    unit: 'per pesanan (3 konten)',
    hoursPerUnit: 3,
    maxUnitsPerWeek: 5,
    daysToFirstPay: 3,
    startupCost: 0,
    remoteFriendly: true,
    description:
      'Membuat konten feed dan story untuk usaha kecil memakai Canva. Permintaannya banyak dan tidak menuntut portofolio panjang.',
    howToStart:
      'Buat ulang feed satu usaha kecil yang tampilannya berantakan sebagai latihan, tampilkan versi sebelum–sesudah. Ini bahan menawar yang paling meyakinkan.',
    caution:
      'Jangan memakai foto atau desain milik orang lain sebagai contoh karyamu. Sekali ketahuan, reputasimu di platform habis dan akunmu bisa ditutup.',
    skills: ['canva', 'social-media', 'content-planning'],
    channels: [
      { name: 'Fastwork', searchQuery: 'fastwork jasa desain feed instagram', kind: 'platform' },
      { name: 'Instagram UMKM lokal', searchQuery: 'cara menawarkan jasa desain konten ke umkm', kind: 'langsung' },
    ],
  },
  {
    id: 'edit-video-pendek',
    title: 'Edit video pendek (Reels/TikTok)',
    category: 'Kreatif & Konten',
    earnMin: 100_000,
    earnMax: 350_000,
    unit: 'per video',
    hoursPerUnit: 3,
    maxUnitsPerWeek: 6,
    daysToFirstPay: 3,
    startupCost: 0,
    remoteFriendly: true,
    description:
      'Memotong, menyusun, dan memberi teks pada video pendek untuk penjual atau pembuat konten. Bisa dikerjakan di HP dengan CapCut.',
    howToStart:
      'Edit tiga video pendek dengan gaya berbeda sebagai contoh. Simpan di satu folder Google Drive — itu portofolio yang tinggal kamu kirim linknya.',
    caution:
      'Sepakati jumlah revisi di awal dan tulis di chat. Revisi tanpa batas adalah cara paling umum pekerjaan editing berubah jadi kerja gratis.',
    skills: ['video-editing', 'storytelling', 'social-media'],
    channels: [
      { name: 'Fastwork', searchQuery: 'fastwork jasa edit video reels tiktok', kind: 'platform' },
      { name: 'Grup editor video', searchQuery: 'grup facebook telegram lowongan editor video freelance', kind: 'komunitas' },
    ],
  },
  {
    id: 'tulis-artikel-seo',
    title: 'Tulis artikel SEO',
    category: 'Kreatif & Konten',
    earnMin: 50_000,
    earnMax: 200_000,
    unit: 'per artikel (600–800 kata)',
    hoursPerUnit: 2.5,
    maxUnitsPerWeek: 7,
    daysToFirstPay: 7,
    startupCost: 0,
    remoteFriendly: true,
    description:
      'Menulis artikel blog untuk situs bisnis dengan kata kunci yang sudah ditentukan klien. Permintaan tetap tinggi dan bisa dikerjakan kapan saja.',
    howToStart:
      'Tulis dua artikel contoh di topik yang kamu kuasai, unggah ke blog gratis. Banyak klien hanya minta melihat dua tulisan sebelum memberi pesanan pertama.',
    caution:
      'Tarif di bawah Rp 20.000 per artikel biasanya tidak sepadan dengan waktunya — itu jebakan volume. Hitung dulu berapa jam yang benar-benar kamu habiskan.',
    skills: ['copywriting', 'seo', 'riset'],
    channels: [
      { name: 'Sribulancer', searchQuery: 'sribulancer jasa penulis artikel', kind: 'platform' },
      { name: 'Grup penulis lepas', searchQuery: 'grup facebook lowongan penulis artikel freelance indonesia', kind: 'komunitas' },
    ],
  },
  {
    id: 'foto-produk',
    title: 'Foto produk untuk UMKM',
    category: 'Kreatif & Konten',
    earnMin: 100_000,
    earnMax: 400_000,
    unit: 'per sesi (10 foto)',
    hoursPerUnit: 3,
    maxUnitsPerWeek: 4,
    daysToFirstPay: 3,
    startupCost: 50_000,
    remoteFriendly: false,
    description:
      'Memotret produk penjual kecil dengan latar bersih supaya jualannya terlihat layak di marketplace. Kamera HP yang baik sudah cukup.',
    howToStart:
      'Foto lima produk milikmu sendiri dengan latar kertas putih dan cahaya jendela. Bandingkan dengan foto asli penjual — selisihnya itu yang kamu jual.',
    caution:
      'Modal awalnya kecil (kertas latar dan lampu sederhana), tapi tetap keluar uang. Pastikan sudah ada klien pertama sebelum membelinya.',
    skills: ['fotografi', 'photoshop'],
    channels: [
      { name: 'UMKM di sekitar rumah', searchQuery: 'cara menawarkan jasa foto produk ke umkm', kind: 'langsung' },
      { name: 'Fastwork', searchQuery: 'fastwork jasa foto produk', kind: 'platform' },
    ],
  },
  {
    id: 'terjemahan',
    title: 'Terjemahan Inggris–Indonesia',
    category: 'Kreatif & Konten',
    earnMin: 30_000,
    earnMax: 90_000,
    unit: 'per halaman',
    hoursPerUnit: 1,
    maxUnitsPerWeek: 12,
    daysToFirstPay: 5,
    startupCost: 0,
    remoteFriendly: true,
    description:
      'Menerjemahkan dokumen, subtitle, atau materi kuliah. Satuan kerjanya kecil, jadi mudah diselipkan di sela waktu.',
    howToStart:
      'Terjemahkan satu halaman artikel berita sebagai contoh. Sebutkan bidang yang kamu kuasai — penerjemah yang punya bidang dibayar lebih baik daripada yang serba bisa.',
    caution:
      'Terjemahan dokumen resmi (ijazah, akta, kontrak) butuh penerjemah tersumpah. Menerimanya tanpa sertifikasi merugikan kliennya dan namamu.',
    skills: ['bahasa-inggris', 'riset'],
    channels: [
      { name: 'Projects.co.id', searchQuery: 'projects.co.id jasa terjemahan', kind: 'platform' },
      { name: 'Fastwork', searchQuery: 'fastwork jasa terjemahan inggris indonesia', kind: 'platform' },
    ],
  },

  // ── Jasa Digital ─────────────────────────────────────────────────────────
  {
    id: 'kelola-sosmed-bulanan',
    title: 'Kelola media sosial satu klien',
    category: 'Jasa Digital',
    earnMin: 500_000,
    earnMax: 1_500_000,
    unit: 'per bulan (1 klien)',
    hoursPerUnit: 20,
    maxUnitsPerWeek: 2,
    daysToFirstPay: 30,
    startupCost: 0,
    remoteFriendly: true,
    description:
      'Menyusun jadwal konten, membuat materinya, dan membalas komentar untuk satu akun usaha. Bayarannya paling besar di daftar ini, tapi uangnya baru masuk sebulan kemudian.',
    howToStart:
      'Susun rencana konten 30 hari untuk satu usaha yang kamu incar, kirim sebagai proposal. Kebanyakan pemilik usaha tidak pernah menerima proposal semacam itu.',
    caution:
      'Uangnya baru masuk setelah sebulan. Kalau ada cicilan yang jatuh tempo minggu ini, jangan bertumpu pada gig ini — pakai yang bayarannya harian lebih dulu.',
    skills: ['social-media', 'content-planning', 'copywriting', 'canva'],
    channels: [
      { name: 'Fastwork', searchQuery: 'fastwork jasa admin sosial media bulanan', kind: 'platform' },
      { name: 'Penawaran langsung', searchQuery: 'contoh proposal jasa kelola media sosial umkm', kind: 'langsung' },
    ],
  },
  {
    id: 'landing-page-sederhana',
    title: 'Bikin landing page sederhana',
    category: 'Jasa Digital',
    earnMin: 400_000,
    earnMax: 1_500_000,
    unit: 'per halaman',
    hoursPerUnit: 10,
    maxUnitsPerWeek: 2,
    daysToFirstPay: 10,
    startupCost: 0,
    remoteFriendly: true,
    description:
      'Membuat satu halaman promosi untuk usaha atau acara, lengkap dengan tombol WhatsApp. Tidak perlu framework rumit.',
    howToStart:
      'Buat satu halaman contoh dan letakkan di hosting gratis. Tautan yang bisa dibuka langsung jauh lebih meyakinkan daripada tangkapan layar.',
    caution:
      'Minta uang muka 30–50% sebelum mulai. Pekerjaan web adalah yang paling sering ditinggal begitu file diserahkan.',
    skills: ['html-css', 'javascript', 'figma'],
    channels: [
      { name: 'Projects.co.id', searchQuery: 'projects.co.id proyek landing page', kind: 'platform' },
      { name: 'Sribulancer', searchQuery: 'sribulancer jasa pembuatan website sederhana', kind: 'platform' },
    ],
  },
  {
    id: 'les-privat',
    title: 'Les privat anak sekolah',
    category: 'Jasa Digital',
    earnMin: 75_000,
    earnMax: 175_000,
    unit: 'per pertemuan',
    hoursPerUnit: 1.5,
    maxUnitsPerWeek: 12,
    daysToFirstPay: 7,
    startupCost: 0,
    remoteFriendly: true,
    description:
      'Mengajar satu mata pelajaran ke anak SD–SMA, tatap muka atau lewat video call. Ijazah S1 tidak selalu diminta untuk jenjang SD–SMP.',
    howToStart:
      'Sebar tawaran di grup RT/RW dan grup wali murid sekolah terdekat. Sebutkan mata pelajaran dan jenjang secara spesifik, bukan "les semua mapel".',
    caution:
      'Sepakati jadwal dan cara pembayaran di awal, tertulis. Les privat paling sering bermasalah di pembayaran yang menumpuk lalu ditunda.',
    skills: ['komunikasi', 'presentasi', 'bahasa-inggris'],
    channels: [
      { name: 'Superprof / Ruangguru', searchQuery: 'daftar jadi tutor les privat online indonesia', kind: 'platform' },
      { name: 'Grup wali murid', searchQuery: 'cara menawarkan les privat di grup lingkungan', kind: 'komunitas' },
    ],
  },

  // ── Lapangan ─────────────────────────────────────────────────────────────
  {
    id: 'kurir-jastip',
    title: 'Kurir & jasa titip harian',
    category: 'Lapangan',
    earnMin: 80_000,
    earnMax: 200_000,
    unit: 'per hari',
    hoursPerUnit: 6,
    maxUnitsPerWeek: 6,
    daysToFirstPay: 1,
    startupCost: 0,
    remoteFriendly: false,
    description:
      'Mengantar paket, belanja titipan, atau mengurus keperluan orang lain di sekitar kota. Uangnya bisa diterima di hari yang sama.',
    howToStart:
      'Tawarkan ke toko yang belum punya kurir sendiri, atau daftar ke aplikasi pengantaran. Mulai dari radius yang kamu hafal jalannya.',
    caution:
      'Hitung bensin dan servis kendaraan sebagai pengurang penghasilan, bukan bonus. Tanpa itu, angka hariannya terlihat lebih besar daripada yang benar-benar tersisa.',
    skills: ['manajemen-waktu', 'layanan-pelanggan'],
    channels: [
      { name: 'Aplikasi pengantaran', searchQuery: 'cara daftar mitra kurir aplikasi pengantaran', kind: 'platform' },
      { name: 'Toko sekitar', searchQuery: 'cara menawarkan jasa kurir harian ke toko', kind: 'langsung' },
    ],
  },
  {
    id: 'jaga-stan-event',
    title: 'Jaga stan / kru event akhir pekan',
    category: 'Lapangan',
    earnMin: 150_000,
    earnMax: 350_000,
    unit: 'per hari',
    hoursPerUnit: 8,
    maxUnitsPerWeek: 3,
    daysToFirstPay: 7,
    startupCost: 0,
    remoteFriendly: false,
    description:
      'Menjaga stan pameran, membantu acara, atau menjadi kru bazar. Terpusat di akhir pekan, jadi tidak bentrok dengan melamar kerja di hari kerja.',
    howToStart:
      'Ikuti akun penyelenggara event di kotamu — perekrutan kru hampir selalu diumumkan 1–2 minggu sebelum acara dan cepat penuh.',
    caution:
      'Perekrutan yang meminta uang pendaftaran, biaya seragam, atau "deposit" di muka adalah penipuan. Kru event yang sah dibayar, bukan membayar.',
    skills: ['komunikasi', 'sales', 'layanan-pelanggan'],
    channels: [
      { name: 'Akun event lokal', searchQuery: 'lowongan kru event bazar akhir pekan kota', kind: 'komunitas' },
      { name: 'Agensi SPG', searchQuery: 'agensi spg event daftar freelance', kind: 'platform' },
    ],
  },
  {
    id: 'cuci-sepatu',
    title: 'Jasa cuci sepatu & setrika',
    category: 'Lapangan',
    earnMin: 25_000,
    earnMax: 60_000,
    unit: 'per pasang / keranjang',
    hoursPerUnit: 1,
    maxUnitsPerWeek: 20,
    daysToFirstPay: 1,
    startupCost: 150_000,
    remoteFriendly: false,
    description:
      'Jasa rumahan dengan modal kecil dan uang harian. Pasarnya anak kos dan pekerja yang tidak sempat mengurus sendiri.',
    howToStart:
      'Mulai dari satu jenis saja supaya modalnya kecil. Sebar tawaran di grup kos dan kontrakan sekitar, dengan harga yang jelas.',
    caution:
      'Modal awal sekitar Rp 150.000 untuk sabun dan sikat. Jangan meminjam untuk modal ini — mulai dari yang alatnya sudah ada di rumah dulu.',
    skills: ['manajemen-waktu', 'layanan-pelanggan'],
    channels: [
      { name: 'Grup kos & kontrakan', searchQuery: 'cara promosi jasa cuci sepatu di grup kos', kind: 'komunitas' },
      { name: 'Marketplace jasa', searchQuery: 'daftar jasa cuci sepatu online marketplace', kind: 'platform' },
    ],
  },

  // ── Jualan ───────────────────────────────────────────────────────────────
  {
    id: 'dropship',
    title: 'Dropship tanpa stok',
    category: 'Jualan',
    earnMin: 20_000,
    earnMax: 100_000,
    unit: 'per pesanan (margin)',
    hoursPerUnit: 0.5,
    maxUnitsPerWeek: 15,
    daysToFirstPay: 7,
    startupCost: 0,
    remoteFriendly: true,
    description:
      'Menjual barang milik supplier tanpa menyetok. Yang kamu kerjakan adalah menjualnya; barangnya dikirim langsung oleh supplier.',
    howToStart:
      'Pilih satu jenis barang yang kamu pahami betul, bukan yang sedang ramai. Menjawab pertanyaan calon pembeli dengan yakin adalah seluruh pekerjaannya.',
    caution:
      'Supplier yang meminta biaya pendaftaran reseller, biaya keanggotaan, atau paket "modal awal" hampir selalu penipuan. Dropship yang sah tidak memungut apa pun di depan.',
    skills: ['social-media', 'sales', 'layanan-pelanggan'],
    channels: [
      { name: 'Marketplace supplier', searchQuery: 'supplier dropship tanpa biaya pendaftaran indonesia', kind: 'platform' },
      { name: 'Grup dropshipper', searchQuery: 'grup facebook dropshipper indonesia pemula', kind: 'komunitas' },
    ],
  },
  {
    id: 'titip-jual-makanan',
    title: 'Titip jual makanan & snack',
    category: 'Jualan',
    earnMin: 100_000,
    earnMax: 300_000,
    unit: 'per hari',
    hoursPerUnit: 4,
    maxUnitsPerWeek: 6,
    daysToFirstPay: 1,
    startupCost: 200_000,
    remoteFriendly: false,
    description:
      'Menitipkan makanan ringan ke warung, kantin, atau kantor sekitar. Perputaran uangnya harian, jadi cocok saat ada tenggat dekat.',
    howToStart:
      'Mulai dari lima titik titipan dan satu jenis produk. Catat mana yang laku sebelum menambah jenis — menambah terlalu cepat mengunci modalmu di barang yang tidak laku.',
    caution:
      'Modal awalnya paling besar di daftar ini (± Rp 200.000) dan barang yang tidak laku hangus. Jangan memakai uang cicilan sebagai modal.',
    skills: ['manajemen-stok', 'sales', 'komunikasi'],
    channels: [
      { name: 'Warung & kantin sekitar', searchQuery: 'cara menawarkan titip jual makanan ke warung', kind: 'langsung' },
      { name: 'Grup jual beli daerah', searchQuery: 'grup jual beli makanan rumahan daerah', kind: 'komunitas' },
    ],
  },
]
