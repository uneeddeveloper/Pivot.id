# Pivot

Platform navigasi karir dan pemulihan finansial di Indonesia. Melayani tiga titik berangkat:
**fresh graduate** yang belum tahu gaji berapa yang layak diambil, **korban PHK** yang perlu
kembali bekerja tanpa turun di bawah kebutuhan hidup, dan **korban pinjaman online ilegal / judi
online** yang butuh strategi pelunasan realistis.

Alur utamanya sama untuk ketiganya: hitung Target Income → cari peran kerja yang menutupinya →
kejar keterampilan yang kurang → lamar dengan CV yang lolos screening.

> Bagian utang bersifat opsional. User tanpa utang tetap mendapat Target Income yang sah, yaitu
> biaya hidupnya sendiri — `isReady` hanya mensyaratkan `livingCost > 0`.

## Menjalankan

```bash
npm install
cp .env.example .env   # lalu isi kredensial MySQL + token (lihat di bawah)
npm run db:setup       # buat database + tabel, lalu isi katalog awal
npm run dev            # http://localhost:3000
```

Perintah lain:

```bash
npm run db:migrate  # buat database & tabel saja (aman diulang)
npm run db:seed     # isi ulang katalog skill & peran dari catalog-seed.ts
npm run build       # build produksi
npm run typecheck   # vue-tsc
```

Cek kesiapan seluruh layanan luar kapan saja lewat **`GET /api/health`** — endpoint itu melaporkan
status MySQL, jumlah baris katalog, dan token mana yang sudah/belum diisi (tanpa pernah
menampilkan nilai tokennya).

### Yang perlu diisi di `.env`

| Variabel | Untuk apa | Kalau kosong |
| --- | --- | --- |
| `MYSQL_*` | Katalog skill & peran, cache lowongan | Aplikasi tidak jalan — katalog gagal dimuat |
| `SUMOPOD_API_KEY` | Baca CV, rapikan lowongan, roadmap, CV ATS | Baca CV turun ke kata kunci; roadmap & CV ATS mati dengan pesan jelas |
| `SERPAPI_KEY` | Ambil lowongan dari Google Jobs | Pencarian menyajikan lowongan terakhir yang tersimpan + peringatan |

Aplikasi **tetap berjalan tanpa dua token itu**. Setiap fitur yang bergantung padanya turun ke mode
cadangan dan mengatakan alasannya, bukan gagal diam-diam.

## Sumber data

Sejak sprint ini, katalog dan lowongan tidak lagi ditulis tangan di kode.

- **MySQL** — sumber kebenaran untuk `skills`, `roles`, lowongan hasil pencarian, dan cache LLM.
  Skemanya di [server/db/schema.sql](server/db/schema.sql), benih awalnya di
  [server/db/catalog-seed.ts](server/db/catalog-seed.ts).
- **Google Jobs lewat SerpApi** — lowongan asli dari papan yang benar-benar ada (JobStreet, Glints,
  Kalibrr, LinkedIn). Dipakai lewat perantara resmi, bukan scraping halaman Google sendiri: itu
  melanggar ToS, mudah diblokir, dan strukturnya berubah tanpa pemberitahuan.
  Custom Search JSON API milik Google tidak dipakai karena **sudah ditutup untuk pendaftar baru
  sejak 2025 dan dimatikan 1 Januari 2027**.
- **Sumopod** — LLM dengan endpoint kompatibel-OpenAI (`{SUMOPOD_BASE_URL}/chat/completions`).
  Dipakai untuk empat hal: membaca CV, menormalkan + memvalidasi lowongan, menyusun roadmap, dan
  menyusun CV ATS.

### Hemat kuota

Dua rem dipasang sejak awal karena paket gratis kedua layanan itu kecil (SerpApi 250 pencarian/bulan):

- Tabel `job_searches` menyimpan kapan sebuah kueri terakhir diambil. Selama masih dalam
  `JOB_CACHE_TTL_HOURS`, pencarian yang sama dilayani dari MySQL tanpa memanggil SerpApi.
- Tabel `llm_cache` menyimpan jawaban LLM per hash prompt. **Hanya jawaban yang lolos validasi
  skema Zod yang masuk cache** — kalau balasan rusak ikut tersimpan, permintaan yang sama akan
  mengambil hasil rusak itu selamanya.

## Aturan privasi (non-negotiable)

Angka utang, bunga, dan cicilan **tidak pernah** meninggalkan browser. Tidak ada tabel utang di
MySQL, dan tidak boleh ditambahkan.

- [composables/useDebtCalculator.ts](composables/useDebtCalculator.ts) — JavaScript murni, tanpa
  satu pun panggilan jaringan.
- [stores/financial.ts](stores/financial.ts) — Pinia store yang **sengaja tidak di-persist**. Tidak
  boleh ditambahi plugin persist, `$fetch`, atau sinkronisasi database.
- [stores/career.ts](stores/career.ts) — sama: tidak di-persist, hilang saat tab ditutup.

**Yang berubah sejak LLM masuk:** langkah 2 kini berupa percakapan, jadi cerita user tentang
riwayat kerjanya *memang* dikirim ke server. Dua endpoint yang boleh menerima data pribadi, dan
syarat yang mengikat keduanya:

| Endpoint | Menerima | Dipicu oleh |
| --- | --- | --- |
| [career/interview.post.ts](server/api/career/interview.post.ts) | Cerita user tentang pengalamannya | User mengetik di kotak obrolan |
| [cv/ats.post.ts](server/api/cv/ats.post.ts) | Nama, kota, kontak yang diketik sendiri | Tombol "Susun CV saya" |

1. Isinya **tidak pernah** ditulis ke MySQL — tidak ke tabel mana pun.
2. Panggilan LLM-nya **wajib `cacheable: false`**, supaya cerita pribadi tidak mengendap di
   `llm_cache`.
3. Isinya tidak pernah masuk log, termasuk saat error.
4. **Server tidak menyimpan sesi.** Riwayat percakapan hidup di komponen
   [SkillChat.vue](components/career/SkillChat.vue) dan ikut dikirim tiap giliran; server
   melupakannya begitu balasan dikirim.
5. Selalu ada **jalan tanpa AI**: tombol "Pilih keterampilan dari daftar" membuka SkillPicker
   manual. Satu token yang belum diisi tidak boleh mematikan langkah 2.

Target Income boleh dikirim ke `/api/jobs/search` sebagai **satu angka teragregasi** untuk menyaring
gaji — rincian utang yang membentuknya tidak ikut.

### Pesan error tidak boleh membocorkan token

`LlmUnavailableError` dan `JobSearchUnavailableError` masing-masing punya dua pesan: `message`
(detail lengkap, untuk log server) dan `userMessage` (kalimat aman untuk ditampilkan). Balasan error
dari Sumopod dan SerpApi memuat potongan API key dan hash token, jadi **route wajib memakai
`userMessage`**, bukan `message`.

Cara verifikasi saat demo: buka DevTools → Network, isi form audit, pastikan tidak ada request
keluar selain aset statis. Lalu di langkah 2, tempel CV dan tekan "Baca di perangkat saja" —
tetap tidak ada request keluar.

## Formula inti

```
Target Income Bulanan = Biaya Hidup Minimal + Total Cicilan Utang Minimal
```

Simulasi pelunasan berjalan bulan demi bulan dengan dana bulanan konstan
(`total cicilan minimal + dana ekstra`). Efek *snowball* muncul otomatis: begitu satu utang lunas,
cicilannya mengalir ke utang berikutnya.

- **Snowball** — saldo terkecil dulu (momentum psikologis).
- **Avalanche** — bunga tertinggi dulu (total bunga terkecil).
- Bunga diinput apa adanya (`% per hari / bulan / tahun`) dan dinormalkan secara sederhana
  (0,4%/hari = 12%/bulan) supaya angkanya cocok dengan yang user lihat di aplikasi pinjaman.
- Bila bunga tumbuh lebih cepat daripada pembayaran, simulasi mengembalikan `feasible: false`
  beserta `shortfall.minimumViableBudget` — UI menampilkannya sebagai target yang bisa dikejar,
  bukan sebagai vonis.

## Simulasi pelunasan (Sprint 2)

Muncul di bawah form audit setelah user menekan **Hitung Target Income**, dan hanya bila ada utang
tercatat. Seluruhnya membaca `simulation` dari store — tidak ada perhitungan baru di komponen.

- **SnowballSimulator** — kerangka section: pemilih strategi, perbandingan snowball vs avalanche,
  dan penanganan kondisi `feasible: false`.
- **DebtFreeCountdown** — angka besar "N bulan" + perkiraan tanggal lunas, plus meter porsi bunga
  terhadap total pembayaran.
- **PayoffChart** — kurva sisa utang per bulan.

### Aturan grafik

Diturunkan dari praktik dataviz standar, bukan selera:

- **Satu seri data, jadi tanpa kotak legenda** — judul kartu sudah menyebut apa yang diplot. Titik
  sage adalah anotasi milestone "satu utang lunas", bukan seri kedua.
- **Path digambar di SVG, seluruh teks dan titik dirender sebagai HTML absolut.** SVG memakai
  `preserveAspectRatio="none"` supaya plot bisa melar mengikuti lebar kartu; kalau teks dan
  lingkaran ikut di dalamnya, keduanya akan gepeng dan mengecil di layar sempit.
- **Batas atas sumbu Y ditentukan dari jarak antar garis** (tangga 1 / 2 / 2,5 / 5 / 10), bukan dari
  nilai maksimumnya. Ini menjamin label seperti "3,75 jt" — yang akan dibulatkan jadi "3,8 jt" dan
  menyesatkan — tidak pernah muncul.
- **Garis bantu hairline solid**, tidak pernah putus-putus, dan satu tingkat dari warna latar.
- **Tooltip tidak boleh jadi satu-satunya jalan membaca angka**: tersedia tombol *Lihat sebagai
  tabel* berisi seluruh nilai, dan grafiknya bisa dijelajahi dengan tombol panah kiri/kanan.
- Warna mark divalidasi terhadap defisiensi penglihatan warna. Pasangan brand `#a90e02` dan sage
  `#6f8a42` lolos (ΔE 11,9 deutan). Pasangan sage dengan `cream-600`/`cream-700` **gagal** —
  jangan dipakai sebagai dua kategori bersebelahan.

## Skill Gap & Role Matching (langkah 2)

Halaman [/skill-gap](pages/skill-gap/index.vue) mengambil Target Income dari langkah 1 sebagai
**ambang gaji**, lalu mencocokkannya dengan katalog peran kerja **dari MySQL** — 17 peran, dari
Data Entry (3,2 jt) sampai Backend Developer (15 jt), dengan 40 keterampilan sebagai kosakata
bersama.

Katalognya diambil lewat `GET /api/catalog` dan ditampung di
[stores/catalog.ts](stores/catalog.ts); [composables/useRoleMatcher.ts](composables/useRoleMatcher.ts)
kini berisi **perhitungan murni saja** — konstanta `SKILLS`/`ROLES` yang dulu ada di sana sudah
pindah ke database. Konsekuensinya: menambah peran atau keterampilan cukup lewat MySQL, tanpa
menyentuh kode. Urutan kategori chip pun mengikuti `sort_order` di database, bukan daftar hardcoded
di klien.

```
coverage    = keterampilan terpenuhi / syarat peran
meetsTarget = salaryTypical >= Target Income
skill gap   = syarat peran − keterampilan yang dimiliki
```

Urutannya: **menutup target dulu, lalu coverage tertinggi, lalu gaji tertinggi.**

- **Peran yang belum menutup target tidak dibuang** — ditandai "Batu loncatan" beserta selisih
  rupiahnya. User yang terdesak butuh opsi jangka pendek, bukan daftar kosong.
- **Status peran tidak mengandalkan warna saja**: setiap badge membawa ikon + teks.
- `topSkillGaps()` menghitung keterampilan yang paling sering diminta oleh peran-peran yang
  menutup target tapi syaratnya belum terpenuhi — inilah bahan mentah roadmap di langkah 3.
- Target Income 0 (user belum audit) ditangani secara sadar: semua peran dianggap "menutup",
  penanda gaji disembunyikan, dan halaman menampilkan ajakan menghitung dulu.

### Alur tiga tahap

Halaman ini membuka dirinya sepotong demi sepotong, bukan menampilkan formulir panjang sekaligus:

| Tahap | Isi | Pindah ke tahap berikutnya saat |
| --- | --- | --- |
| `cerita` | [SkillChat.vue](components/career/SkillChat.vue) — user bercerita, AI menggali | AI menilai keterangannya cukup (`ready: true`) |
| `konfirmasi` | Hasil bacaan AI sebagai chip yang bisa dilepas/ditambah | User menekan "Sudah benar, carikan pekerjaannya" |
| `hasil` | Peran yang cocok + lowongan asli beserta tautan lamarannya | — |

User yang kembali ke halaman ini tidak dipaksa mengulang ceritanya: kalau `career.ownedSkills`
sudah terisi, halaman langsung membuka tahap `hasil`.

### Penggalian keterampilan lewat percakapan

Ini pengganti kotak tempel-CV yang lama, dan alasannya bukan sekadar "biar ada AI-nya":

> Banyak calon user tidak tahu bahwa pengalaman mereka punya nama formal di dunia kerja. Orang yang
> mengurus stok warung keluarga tidak akan pernah mencentang "Manajemen stok" — karena dia tidak
> merasa itu sebuah keterampilan. Daftar centang menghukum ketidaktahuan itu; percakapan
> menutupinya.

`POST /api/career/interview` menerima seluruh riwayat obrolan dan mengembalikan JSON tervalidasi
Zod: balasan AI, id keterampilan yang sudah tertangkap, perkiraan lama pengalaman, dan
`ready`/`missingInfo`. Aturan yang ditanamkan di prompt:

- **Maksimal dua pertanyaan per balasan.** Pertanyaannya konkret ("Sehari-hari di toko itu kamu
  ngapain aja?"), bukan bahasa HRD ("Apa kompetensi inti Anda?").
- **Menangkap yang tersirat.** "jaga warung, catat stok, layani pembeli" → `manajemen-stok`,
  `layanan-pelanggan`, `komunikasi`.
- **Pengalaman non-formal dihitung**: usaha keluarga, kerja sampingan, organisasi, otodidak.
- **Selama `ready` false, balasan wajib diakhiri pertanyaan** — supaya percakapan tidak buntu.
- **Kalau user bilang tidak punya keahlian, AI dilarang menyetujuinya** dan harus menggali kegiatan
  hariannya.

Dua pengaman di sisi kode, bukan cuma di prompt:

- Id yang dikembalikan LLM disaring `keepKnownSkillIds()` terhadap katalog MySQL — model sesekali
  mengarang id baru, dan yang karangan dibuang di server.
- **Tahap `konfirmasi` tidak bisa dilewati.** AI bisa salah tangkap, jadi user selalu punya kata
  terakhir sebelum hasilnya dipakai mencari pekerjaan.

`extractSkillIdsFromText()` di [shared/skills.ts](shared/skills.ts) masih dipakai — sekarang di
sisi server, untuk memetakan deskripsi lowongan ke katalog dan sebagai jaring pengaman saat LLM
gagal merapikan lowongan. Batas katanya **dibuat manual**, bukan `\b`: istilah seperti `node.js` dan
`a/b testing` mengandung tanda baca dan akan terpotong di tempat yang salah oleh `\b`.

### Lowongan langsung di langkah 2

[RecommendedJobs.vue](components/jobs/RecommendedJobs.vue) menampilkan lowongan asli untuk peran
yang direkomendasikan, tanpa user harus pindah halaman. Hanya lowongan yang **punya tautan lamaran**
yang ditampilkan — rekomendasi yang tidak bisa diklik tidak ada gunanya bagi orang yang butuh kerja
minggu ini.

Hemat kuota: hanya peran **pertama** yang dicari otomatis; peran lain dicari saat user mengkliknya,
dan hasil tiap peran ditahan di memori komponen sehingga bolak-balik antar-tab tidak memanggil
SerpApi lagi.

> Keduanya bisa terlalu longgar: "laporan **penjualan**" akan ikut menandai keterampilan
> *Penjualan*. Karena itu hasil deteksi selalu **ditampilkan sebagai chip untuk ditinjau sebelum
> diterapkan**, dan tiap keterampilan bisa dilepas lagi lewat SkillPicker. Jangan mengubahnya jadi
> penerapan otomatis tanpa konfirmasi.

## Lowongan (langkah 4)

Halaman [/jobs](pages/jobs/index.vue) mencari lowongan lewat engine `google_jobs` SerpApi, lalu
melewatkan hasil mentahnya ke LLM untuk dua pekerjaan sekaligus di
[server/utils/jobNormalizer.ts](server/utils/jobNormalizer.ts):

1. **Normalisasi** — gaji diseragamkan ke **Rupiah per bulan** (angka tahunan dibagi 12, "5jt"
   jadi 5.000.000), plus remote/onsite, jenis kontrak, dan pemetaan syarat ke katalog skill.
2. **Validasi** — menandai lowongan yang patut dicurigai. Ini bukan fitur tambahan: audiens
   aplikasi ini justru sasaran empuk lowongan palsu yang meminta "biaya administrasi" di muka.

Keputusan yang sengaja diambil:

- **Gaji yang tidak disebutkan ditulis "gaji tidak disebutkan", bukan "Rp0".** LLM dilarang
  mengarang angka: kalau `salaryStated` false, kolomnya dipaksa 0 dan UI tidak menampilkan nominal.
- **Lowongan tanpa nominal gaji tidak dianggap gagal memenuhi target.** Sebagian besar iklan di
  Indonesia memang tidak mencantumkan angka; membuangnya akan mengosongkan hampir seluruh halaman.
- **Lowongan mencurigakan ditandai, bukan dihapus diam-diam** — peringatannya muncul *di atas*
  angka gaji, sebelum user tergoda. Hanya yang punya ≥3 tanda bahaya yang disembunyikan, dan
  jumlahnya tetap dilaporkan di halaman.
- **Kalau LLM mati, pipeline turun ke heuristik** (regex gaji + pola penipuan di
  `SCAM_PATTERNS`), bukan gagal total. Kegagalan satu batch tidak menjatuhkan batch lain.

## Roadmap belajar (langkah 3)

Halaman [/roadmap](pages/roadmap/index.vue) menyusun kurikulum dari `topSkillGaps()` langkah 2 lewat
`POST /api/roadmap/generate`.

- **Seluruh sumber belajar wajib gratis.** Prompt melarang kursus berbayar dan bootcamp.
- **LLM dilarang menulis URL** — model bahasa sering mengarang tautan yang tidak pernah ada. Yang
  disimpan adalah `searchQuery`, dan UI mengubahnya jadi tautan pencarian YouTube/Google. User
  mendarat di materi yang benar-benar hidup.
- Masukannya hanya id katalog publik, jadi hasilnya **boleh di-cache** — kombinasi skill yang sama
  tidak dibayar dua kali.
- Pelacak kemajuannya di memori komponen saja. Konsekuensi jujurnya (centang hilang saat tab
  ditutup) **disebutkan ke user**, bukan disembunyikan.

## Jatuh tempo

Setiap utang punya field `dueDate` (`YYYY-MM-DD`, boleh kosong) berisi **tanggal pembayaran
terdekat**. Belum ikut memengaruhi simulasi pelunasan — perannya adalah membantu user memilah mana
yang harus disiapkan lebih dulu.

- `dueInfoOf()` mengubah tanggal jadi status: `overdue` / `today` / `soon` (≤ 7 hari) /
  `upcoming` / `none`, lengkap dengan label siap tampil.
- `sortByDueDate()` mengurutkan dari yang paling mendesak; utang tanpa tanggal ditaruh di akhir,
  tidak dibuang.
- `paymentDueWithin()` menjumlahkan cicilan yang jatuh tempo dalam N hari ke depan (termasuk yang
  sudah lewat) → dipakai kartu "Perlu disiapkan dalam 7 hari".
- Tanggal di-parse sebagai **tanggal lokal**, bukan UTC, supaya tidak bergeser sehari di WIB.

## Palet warna

Kombinasi dua warna: **#A90E02** (`brand-600`) dan **#FFFBD4** (`cream-100`), didefinisikan di
[assets/css/main.css](assets/css/main.css).

| Token | Peran |
| --- | --- |
| `cream` | Latar halaman dan kartu lembut — mendominasi layar |
| `brand` | Identitas dan aksi: tombol, judul, kartu Target Income. **Bukan** penanda bahaya |
| `sage` | Progres positif, konfirmasi privasi, milestone lunas |
| `ink` | Netral hangat untuk teks dan garis |

Merah brand hanya dipakai sebagai penanda urgensi pada satu tempat: badge utang yang **sudah lewat
jatuh tempo**. Blok "perlu perhatian" memakai utility `.attention-note` (krem tua + garis kiri),
bukan merah kedua, supaya halaman tidak terasa mengalarmi user. Kontras #A90E02 di atas #FFFBD4
adalah 7.3:1 — lolos WCAG AA.

## Maskot

Anak burung feniks — lahir kembali dari abu, dengan lambang daur ulang di dadanya. Metaforanya
sama dengan logo: memulai lagi. Dipakai lewat satu komponen,
[components/ui/MascotFigure.vue](components/ui/MascotFigure.vue).

```vue
<MascotFigure pose="papan" size="md" float />
<MascotFigure pose="hai" size="sm" alt="Maskot Pivot melambaikan sayap" />
```

**Tiap pose punya satu makna tetap.** Konsistensi inilah yang membuatnya terbaca sebagai satu
karakter yang menemani user dari langkah 1 sampai 4, bukan tempelan gambar lucu.

| Pose | Muncul di |
| --- | --- |
| `hai` | Sapaan pertama di hero landing |
| `papan` | Langkah 1 — audit, memegang papan grafik |
| `tanya` | Langkah 2 — skill gap, pose bertanya |
| `laptop` | Langkah 3 — roadmap belajar |
| `cape` | Langkah 4 — lowongan & CV, siap maju |
| `lari` | Ajakan penutup di landing |
| `sip` | "N peran bisa kamu lamar sekarang juga" |
| `happy` | Hitung mundur bebas utang |
| `hati` | Simulasi belum feasible, dan footer |
| `tidur` | Keadaan kosong: pencarian lowongan & roadmap belum ada isinya |

Aturan yang menempel pada komponennya:

- **Dekoratif secara bawaan.** Tanpa `alt`, gambarnya `aria-hidden`. Itu memang yang benar di
  hampir semua tempat — teks di sebelahnya sudah menyampaikan maknanya, dan maskot yang ikut
  dibacakan hanya menambah kebisingan. Isi `alt` hanya bila gambarnya membawa informasi yang tidak
  ada di teks sekitarnya.
- **Ukurannya ditentukan lewat tinggi, bukan lebar.** Rasio tiap pose berbeda jauh (sayap
  terbentang jauh lebih lebar daripada pose berdiri); yang harus konsisten antar-halaman adalah
  seberapa besar maskotnya *terlihat*.
- **`hati` untuk momen berat, bukan `happy`.** Saat simulasi mengembalikan `feasible: false`,
  maskot memeluk hati — ikon peringatan di sana justru mengalarmi user yang sedang tertekan.
- **Maskot berukuran `md` disembunyikan di bawah `lg`.** Di layar sempit ia akan menggencet judul
  halaman. Yang berukuran `sm` di dalam kartu disembunyikan di bawah `sm`.
- `float` memakai `animate-float` yang sudah dimatikan oleh `prefers-reduced-motion`.

### Berkas gambar

`assets/img/*.png` adalah **master**, ±2.000px dan 2–4 MB per berkas. Komponennya **tidak pernah**
merujuk ke sana — yang dipakai `assets/img/*.webp`: sisi terpanjang dipotong ke 768px (cukup untuk
layar 3x DPR pada ukuran `lg`) dan bidang transparan di tepinya dibuang, supaya tinggi CSS benar-
benar menjadi tinggi maskot. Totalnya turun dari 28 MB jadi ±600 KB.

Banyak calon user membuka ini dari kuota terbatas, jadi ini bukan optimasi opsional. Kalau ada pose
baru, buat turunan `.webp`-nya dengan aturan yang sama sebelum dipakai.

`introduce.png` sengaja tidak didaftarkan di `MascotPose`: papan yang dipegangnya memuat nama
produk lain yang menyatu di gambar.

### Utility kustom

Didaftarkan lewat `@utility` Tailwind v4 (bukan `@layer components`) supaya bisa dipakai ulang di
dalam `@apply` — mis. `.field-input` memanggil `focus-ring`.

| Utility | Peran |
| --- | --- |
| `surface-card` | Kartu putih dengan gradasi krem tipis + garis dalam terang |
| `surface-brand` | Kartu brand: gradasi merah + kilau di sudut kiri atas |
| `field-input` | Bentuk dasar seluruh input teks/tanggal/select |
| `lift` | Angkat kartu ~3px saat hover — **hanya** untuk elemen yang bisa diklik |
| `aurora-blob` | Noda warna ter-blur di latar hero, selalu `aria-hidden` |
| `focus-ring` | Ring fokus konsisten di atas latar krem |
| `attention-note` | Blok "perlu perhatian" yang hangat, bukan alarm |

Tipografi: **Plus Jakarta Sans** untuk judul, **Inter** untuk teks, dimuat dari Google Fonts di
[nuxt.config.ts](nuxt.config.ts). Kalau jaringan mati saat demo, rantai fallback di `--font-sans`
dan `--font-display` menahan tampilan tanpa layout shift besar.

Animasi masuk (`animate-rise`) dan gerak dekoratif (`animate-float`, `animate-drift`) seluruhnya
dimatikan lewat `@media (prefers-reduced-motion: reduce)`.

> Catatan: `animate-rise` memakai `animation-fill-mode: both`, jadi jangan digabung dengan `lift` —
> transform milik animasi akan menang atas transform hover.

## Struktur

```
assets/css/main.css          palet #A90E02 + #FFFBD4 (brand, cream, sage, ink) + utility kustom
assets/img/                  maskot: *.png master, *.webp turunan yang dipakai komponen
components/financial/        DebtInputForm, DebtRow, LivingCostForm, TargetIncomeCard,
                             DueDateOverview, SnowballSimulator, DebtFreeCountdown, PayoffChart
components/ui/               BaseButton, BaseCard, CurrencyInput, FormField, PrivacyNote,
                             DueBadge, ComingSoon, StepProgress, LogoMark, MascotFigure
components/career/           SkillChat, SkillPicker, RoleMatchCard, RoadmapPlan
components/jobs/             JobCard, RecommendedJobs, AtsCvBuilder
composables/                 useDebtCalculator.ts (jantung tahap 1)
                             useRoleMatcher.ts    (pencocokan murni, tahap 2)
shared/skills.ts             pencocokan skill berbasis kata kunci — dipakai klien DAN server
server/db/                   schema.sql, config.ts, catalog-seed.ts, migrate.ts, seed.ts
server/utils/                db.ts        koneksi & helper MySQL
                             catalog.ts   baca katalog dari MySQL (cache 60 detik)
                             llm.ts       klien Sumopod + chatJson tervalidasi Zod
                             serpapi.ts   Google Jobs
                             jobNormalizer.ts  normalisasi + validasi lowongan
                             jobRepository.ts  simpan & baca lowongan, rem kuota
server/api/                  catalog, health, jobs/search, career/interview,
                             cv/ats, roadmap/generate
stores/financial.ts          Pinia, in-memory only
stores/career.ts             Pinia, in-memory only (skill + teks CV + consent)
stores/catalog.ts            Pinia, katalog publik dari /api/catalog
types/financial.ts           Debt, DueInfo, SimulationInput, SimulationResult, MonthSnapshot
types/career.ts              Skill, Role, RoleMatch
types/mascot.ts              MascotPose, MascotSize (+ tabel makna tiap pose), Roadmap
types/jobs.ts                JobListing, JobMatch, JobSearchResponse
pages/                       index, audit, skill-gap, roadmap, jobs
```

Kunci Sumopod dan SerpApi hanya dibaca di `server/**` lewat `runtimeConfig` — keduanya tidak pernah
ikut ke bundel browser. Itu sebabnya semua pemanggilan LLM dan pencarian lowongan lewat
`server/api`, bukan langsung dari komponen.

Komponen dipakai tanpa prefix folder (`<DebtInputForm />`) lewat `components.pathPrefix: false` di
[nuxt.config.ts](nuxt.config.ts).

## Status sprint

| Sprint | Isi | Status |
| --- | --- | --- |
| 1 | Setup, landing, form audit, formula Target Income | ✅ selesai |
| 2 | SnowballSimulator (chart) + DebtFreeCountdown | ✅ selesai |
| 3 | Job board (Google Jobs), filter minimum salary | ✅ selesai |
| 4 | Skill gap analyzer + roadmap generator | ✅ selesai |
| 5 | CV ATS generator, polish UI, PWA | 🟡 CV ATS selesai; PWA belum |
| 6 | Uji privasi + skenario demo juri | ⬜ |

Keempat halaman alur sudah berfungsi penuh dengan data nyata. Yang tersisa: micro-gigs, PWA, dan
skrip demo juri.

Belum dikerjakan dan patut diketahui sebelum demo:

- **Belum ada rate limit** di route `server/api/**`. Di lingkungan publik, satu orang bisa
  menghabiskan kuota SerpApi dan Sumopod. Cukup untuk demo lokal, tidak cukup untuk produksi.
- **Belum ada pembersih cache kedaluwarsa.** Baris `llm_cache` dan `job_searches` yang lewat
  `expires_at` tidak pernah dihapus — tidak salah hasilnya, tapi tabelnya tumbuh terus.
- **`jobs.posted_at` selalu NULL.** Google Jobs hanya memberi label relatif ("3 hari lalu") yang
  disimpan apa adanya di `posted_label`; kolom tanggalnya disiapkan tapi belum diisi.

## Catatan tone

Banyak calon user sedang dalam tekanan finansial berat. Copywriting harus suportif dan tidak
menghakimi: sebut kondisi apa adanya, sertakan jalan keluar, hindari kata yang menyalahkan.
Footer memuat kanal OJK (157) dan layanan kesehatan jiwa (119 ext. 8).
