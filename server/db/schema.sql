-- ────────────────────────────────────────────────────────────────────────────
-- Pivot — skema MySQL 8
--
-- APA YANG ADA DI SINI
--   Katalog keterampilan, peran kerja, dan micro-gig; lowongan hasil pencarian
--   Google Jobs; dan cache jawaban LLM.
--
-- APA YANG SENGAJA TIDAK ADA DI SINI
--   Tidak ada tabel utang, cicilan, biaya hidup, atau teks CV. Data itu tetap
--   hidup di memori browser user. Kalau suatu saat ada kebutuhan menyimpannya,
--   itu keputusan produk yang harus lewat consent eksplisit — bukan ditambahkan
--   diam-diam ke file ini.
--
-- Dijalankan oleh: npm run db:migrate
-- ────────────────────────────────────────────────────────────────────────────

-- ── Katalog keterampilan ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS skills (
  id          VARCHAR(64)  NOT NULL,
  label       VARCHAR(120) NOT NULL,
  category    VARCHAR(64)  NOT NULL,
  -- Menjaga urutan chip di UI tetap stabil antar-reload.
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_skills_category (category, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kata kunci alternatif untuk mendeteksi keterampilan dari teks CV.
CREATE TABLE IF NOT EXISTS skill_aliases (
  id        INT          NOT NULL AUTO_INCREMENT,
  skill_id  VARCHAR(64)  NOT NULL,
  alias     VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skill_alias (skill_id, alias),
  CONSTRAINT fk_alias_skill FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Katalog peran kerja ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
  id              VARCHAR(64)  NOT NULL,
  title           VARCHAR(160) NOT NULL,
  field           VARCHAR(64)  NOT NULL,
  -- Rupiah per bulan. BIGINT karena nominal gaji tahunan bisa lewat batas INT.
  salary_min      BIGINT       NOT NULL DEFAULT 0,
  salary_typical  BIGINT       NOT NULL DEFAULT 0,
  entry_friendly  TINYINT(1)   NOT NULL DEFAULT 0,
  remote_friendly TINYINT(1)   NOT NULL DEFAULT 0,
  time_to_entry   VARCHAR(64)  NOT NULL DEFAULT '',
  description     TEXT         NOT NULL,
  -- Kata kunci yang dikirim ke Google Jobs untuk peran ini, mis.
  -- "admin media sosial". Dipisah dari `title` supaya istilah yang dipakai
  -- lowongan asli (sering campur Inggris) tidak mengubah label di UI.
  search_query    VARCHAR(255) NOT NULL DEFAULT '',
  sort_order      INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_roles_field (field),
  KEY idx_roles_salary (salary_typical)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_skills (
  role_id   VARCHAR(64) NOT NULL,
  skill_id  VARCHAR(64) NOT NULL,
  sort_order INT        NOT NULL DEFAULT 0,
  PRIMARY KEY (role_id, skill_id),
  KEY idx_role_skills_skill (skill_id),
  CONSTRAINT fk_rs_role  FOREIGN KEY (role_id)  REFERENCES roles (id)  ON DELETE CASCADE,
  CONSTRAINT fk_rs_skill FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Katalog micro-gig (langkah 5) ───────────────────────────────────────────

-- Pekerjaan lepas berskala kecil yang bisa menghasilkan dalam hitungan hari.
-- Berbeda dari `roles` yang bicara gaji bulanan, di sini satuannya per pesanan
-- atau per hari — karena pertanyaan yang dijawab juga berbeda: bukan "berapa
-- gaji peran ini", tapi "berapa yang bisa kuhasilkan minggu ini".
CREATE TABLE IF NOT EXISTS gigs (
  id                VARCHAR(64)  NOT NULL,
  title             VARCHAR(160) NOT NULL,
  category          VARCHAR(64)  NOT NULL,
  -- Rupiah per satu satuan pekerjaan. Rentang pasar untuk pemula; batas
  -- bawahnya yang dipakai penyusun rencana supaya tidak menjanjikan lebih.
  earn_min          BIGINT       NOT NULL DEFAULT 0,
  earn_max          BIGINT       NOT NULL DEFAULT 0,
  -- Satuan bayaran, mis. 'per pesanan', 'per hari', 'per artikel'.
  unit              VARCHAR(48)  NOT NULL DEFAULT 'per pesanan',
  hours_per_unit    DECIMAL(5,2) NOT NULL DEFAULT 1,
  -- Berapa satuan yang realistis DIDAPAT pemula dalam seminggu — bukan berapa
  -- yang muat di jam kerjanya. Yang membatasi micro-gig biasanya permintaan,
  -- bukan waktu; tanpa kolom ini penyusun rencana menyarankan hal seperti
  -- "80x dropship minggu ini".
  max_units_per_week INT         NOT NULL DEFAULT 5,
  -- Berapa hari sampai uangnya benar-benar diterima.
  days_to_first_pay INT          NOT NULL DEFAULT 7,
  -- Modal awal yang tidak bisa dihindari. 0 = bisa mulai tanpa uang sama sekali.
  startup_cost      BIGINT       NOT NULL DEFAULT 0,
  remote_friendly   TINYINT(1)   NOT NULL DEFAULT 0,
  description       TEXT         NOT NULL,
  how_to_start      TEXT         NOT NULL,
  -- Risiko yang harus diwaspadai. Sengaja NOT NULL: audiens aplikasi ini
  -- justru sasaran empuk penipuan kerja lepas, jadi tidak boleh ada gig yang
  -- tayang tanpa peringatannya.
  caution           TEXT         NOT NULL,
  sort_order        INT          NOT NULL DEFAULT 0,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gigs_category (category, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Keterampilan yang biasanya diminta. Memakai katalog `skills` yang sama
-- dengan peran kerja, supaya hasil langkah 2 bisa langsung dipakai di sini.
CREATE TABLE IF NOT EXISTS gig_skills (
  gig_id     VARCHAR(64) NOT NULL,
  skill_id   VARCHAR(64) NOT NULL,
  sort_order INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (gig_id, skill_id),
  KEY idx_gig_skills_skill (skill_id),
  CONSTRAINT fk_gs_gig   FOREIGN KEY (gig_id)   REFERENCES gigs (id)   ON DELETE CASCADE,
  CONSTRAINT fk_gs_skill FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tempat mencari pekerjaannya. Yang disimpan kata kunci pencarian, BUKAN URL —
-- alasannya sama dengan sumber belajar di roadmap: tautan platform berpindah,
-- kata kunci tidak.
CREATE TABLE IF NOT EXISTS gig_channels (
  id           INT          NOT NULL AUTO_INCREMENT,
  gig_id       VARCHAR(64)  NOT NULL,
  name         VARCHAR(120) NOT NULL,
  search_query VARCHAR(200) NOT NULL,
  -- 'platform' | 'komunitas' | 'langsung'
  kind         VARCHAR(24)  NOT NULL DEFAULT 'platform',
  sort_order   INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gig_channel (gig_id, name),
  CONSTRAINT fk_gc_gig FOREIGN KEY (gig_id) REFERENCES gigs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Lowongan ────────────────────────────────────────────────────────────────

-- Satu baris per kombinasi kueri+lokasi. Dipakai untuk menahan pemanggilan
-- SerpApi supaya kuota bulanan tidak habis oleh pencarian yang sama.
CREATE TABLE IF NOT EXISTS job_searches (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  -- SHA-256 dari `query|location|remote_only` — pembeda cache yang sebenarnya.
  query_hash  CHAR(64)     NOT NULL,
  query       VARCHAR(255) NOT NULL,
  location    VARCHAR(120) NOT NULL DEFAULT '',
  remote_only TINYINT(1)   NOT NULL DEFAULT 0,
  role_id     VARCHAR(64)  NULL,
  provider    VARCHAR(32)  NOT NULL DEFAULT 'serpapi_google_jobs',
  -- Jumlah lowongan mentah yang dikembalikan provider sebelum penyaringan.
  raw_count   INT          NOT NULL DEFAULT 0,
  -- Jumlah yang lolos validasi dan tersimpan.
  kept_count  INT          NOT NULL DEFAULT 0,
  fetched_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  TIMESTAMP    NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_query_hash (query_hash),
  KEY idx_searches_expiry (expires_at),
  CONSTRAINT fk_search_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jobs (
  id               BIGINT        NOT NULL AUTO_INCREMENT,
  -- ID stabil dari Google Jobs (`job_id`). Kalau provider tidak memberikannya,
  -- seeder memakai hash dari judul+perusahaan+lokasi.
  external_id      VARCHAR(191)  NOT NULL,
  title            VARCHAR(255)  NOT NULL,
  company          VARCHAR(255)  NOT NULL DEFAULT '',
  location         VARCHAR(191)  NOT NULL DEFAULT '',
  is_remote        TINYINT(1)    NOT NULL DEFAULT 0,
  -- 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance' | ''
  employment_type  VARCHAR(32)   NOT NULL DEFAULT '',
  -- Rentang gaji BULANAN dalam Rupiah, hasil normalisasi LLM. 0 = tidak
  -- disebutkan di lowongan. Jangan pernah menampilkan 0 sebagai "gaji Rp0".
  salary_min       BIGINT        NOT NULL DEFAULT 0,
  salary_max       BIGINT        NOT NULL DEFAULT 0,
  -- Apakah angka gaji disebut eksplisit di lowongan (1) atau ditaksir LLM (0).
  salary_stated    TINYINT(1)    NOT NULL DEFAULT 0,
  seniority        VARCHAR(32)   NOT NULL DEFAULT '',
  description      MEDIUMTEXT    NULL,
  apply_url        TEXT          NULL,
  -- Papan lowongan asal, mis. 'Glints', 'JobStreet', 'LinkedIn'.
  source           VARCHAR(120)  NOT NULL DEFAULT '',
  posted_at        DATE          NULL,
  posted_label     VARCHAR(64)   NOT NULL DEFAULT '',
  role_id          VARCHAR(64)   NULL,
  -- 0..100 dari LLM: seberapa lengkap & meyakinkan lowongan ini.
  quality_score    TINYINT       NOT NULL DEFAULT 0,
  -- Array alasan lowongan dicurigai, mis. ["minta biaya di muka"].
  red_flags        JSON          NULL,
  -- 1 = lolos validasi LLM. 0 = disimpan tapi disembunyikan dari hasil.
  is_valid         TINYINT(1)    NOT NULL DEFAULT 1,
  first_seen_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_job_external (external_id),
  KEY idx_jobs_role (role_id),
  KEY idx_jobs_salary (salary_min),
  KEY idx_jobs_valid (is_valid, last_seen_at),
  CONSTRAINT fk_job_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lowongan yang sama bisa muncul di beberapa pencarian; relasi dipisah supaya
-- satu lowongan tidak tersimpan berkali-kali.
CREATE TABLE IF NOT EXISTS job_search_results (
  search_id  BIGINT NOT NULL,
  job_id     BIGINT NOT NULL,
  position   INT    NOT NULL DEFAULT 0,
  PRIMARY KEY (search_id, job_id),
  KEY idx_jsr_job (job_id),
  CONSTRAINT fk_jsr_search FOREIGN KEY (search_id) REFERENCES job_searches (id) ON DELETE CASCADE,
  CONSTRAINT fk_jsr_job    FOREIGN KEY (job_id)    REFERENCES jobs (id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Keterampilan yang diminta lowongan, hasil pemetaan LLM ke katalog `skills`.
CREATE TABLE IF NOT EXISTS job_skills (
  job_id   BIGINT      NOT NULL,
  skill_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (job_id, skill_id),
  KEY idx_job_skills_skill (skill_id),
  CONSTRAINT fk_js_job   FOREIGN KEY (job_id)   REFERENCES jobs (id)   ON DELETE CASCADE,
  CONSTRAINT fk_js_skill FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Cache LLM ───────────────────────────────────────────────────────────────

-- Menyimpan jawaban LLM supaya prompt yang identik tidak dibayar dua kali.
-- Isinya hanya hasil untuk konten yang tidak bersifat pribadi (normalisasi
-- lowongan, roadmap per kombinasi skill). Permintaan yang membawa teks CV
-- ditandai `cacheable = 0` oleh pemanggil dan tidak pernah sampai ke sini.
CREATE TABLE IF NOT EXISTS llm_cache (
  cache_key  CHAR(64)     NOT NULL,
  purpose    VARCHAR(48)  NOT NULL,
  model      VARCHAR(120) NOT NULL,
  response   MEDIUMTEXT   NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP    NOT NULL,
  PRIMARY KEY (cache_key),
  KEY idx_llm_cache_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
