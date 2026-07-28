# RintisUlang (KarirPulih)

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
npm run dev        # http://localhost:3000
npm run build      # build produksi
npm run typecheck  # vue-tsc
```

## Aturan privasi (non-negotiable)

Seluruh angka utang, bunga, dan cicilan **hanya hidup di memori browser**.

- [composables/useDebtCalculator.ts](composables/useDebtCalculator.ts) — JavaScript murni, tanpa
  satu pun panggilan jaringan.
- [stores/financial.ts](stores/financial.ts) — Pinia store yang **sengaja tidak di-persist**. Tidak
  boleh ditambahi plugin persist, `$fetch`, atau sinkronisasi database.
- Yang boleh dikirim ke server suatu saat nanti **hanya** angka teragregasi (Target Income), dan
  hanya setelah consent eksplisit user.

Cara verifikasi saat demo: buka DevTools → Network, isi form audit, pastikan tidak ada request
keluar selain aset statis.

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
components/financial/        DebtInputForm, DebtRow, LivingCostForm, TargetIncomeCard,
                             DueDateOverview
components/ui/               BaseButton, BaseCard, CurrencyInput, FormField, PrivacyNote,
                             DueBadge, ComingSoon, StepProgress, LogoMark
composables/                 useDebtCalculator.ts (jantung aplikasi)
stores/financial.ts          Pinia, in-memory only
types/financial.ts           Debt, DueInfo, SimulationInput, SimulationResult, MonthSnapshot
pages/                       index, audit, skill-gap, roadmap, jobs
```

Komponen dipakai tanpa prefix folder (`<DebtInputForm />`) lewat `components.pathPrefix: false` di
[nuxt.config.ts](nuxt.config.ts).

## Status sprint

| Sprint | Isi | Status |
| --- | --- | --- |
| 1 | Setup, landing, form audit, formula Target Income | ✅ selesai |
| 2 | SnowballSimulator (chart) + DebtFreeCountdown | ⬜ |
| 3 | Job board, filter minimum salary, micro-gigs | ⬜ |
| 4 | Skill gap analyzer + roadmap generator | ⬜ |
| 5 | CV ATS generator, polish UI, PWA | ⬜ |
| 6 | Uji privasi + skenario demo juri | ⬜ |

Halaman `/skill-gap`, `/roadmap`, dan `/jobs` sudah punya placeholder agar navigasi utuh saat demo.

## Catatan tone

Banyak calon user sedang dalam tekanan finansial berat. Copywriting harus suportif dan tidak
menghakimi: sebut kondisi apa adanya, sertakan jalan keluar, hindari kata yang menyalahkan.
Footer memuat kanal OJK (157) dan layanan kesehatan jiwa (119 ext. 8).
