# Rencana Pembaruan: Format Pesan WhatsApp Laporan Keterlibatan Guru

Rencana ini merinci penyesuaian format dan struktur template pesan WhatsApp pada sub-menu **Keterlibatan Guru** di `ReportWorkspace.tsx`. Penataan ini menyajikan rekapitulasi komprehensif seluruh kelompok guru dengan urutan prioritas yang disepakati serta representasi visual emoji kuadran yang jelas.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi kebutuhan pada sesi klarifikasi, struktur format pesan WhatsApp telah disepakati sebagai berikut:

- **Confirmed Decision 1 (Urutan Rincian Kelompok Guru)**:
  1. 🟢 **GURU KETERLIBATAN PENUH** (Kelompok A · 100%)
  2. 🔴 **DAFTAR GURU NIHIL LAPORAN** (Kelompok D · 0%)
  3. 🔵 **GURU KETERLIBATAN TINGGI** (Kelompok B · 60% s/d 99%)
  4. 🟠 **GURU KETERLIBATAN RENDAH** (Kelompok C · <60%)
- **Confirmed Decision 2 (Pemberian Emoji Kuadran)**: Menyematkan emoji lingkaran warna yang konsisten dengan palet sistem kuadran: 🟢 (Penuh), 🔴 (Nihil), 🔵 (Tinggi), dan 🟠 (Rendah).
- **Confirmed Decision 3 (Penanganan Kelompok Kosong)**: Jika dalam suatu periode tidak terdapat guru pada kelompok tertentu, sistem akan menampilkan baris `- Nihil`.

---

### 1. Overview & Core Concept

- **What It Does**: Memperbarui fungsi generator teks WhatsApp (`waMessageKeterlibatanText`) agar menyusun pesan terstruktur yang mencakup ringkasan statistik dan daftar terurai untuk keempat kelompok kuadran keterlibatan.
- **Target Audience**: Kepala Madrasah, Waka Kurikulum, dan Tim Manajemen Sekolah untuk kebutuhan koordinasi dan evaluasi live berkala melalui grup koordinasi WhatsApp.
- **Key Value**: Informasi keterlibatan guru tersampaikan secara transparan, adil, rapi, dan mudah dipahami langsung dari ponsel tanpa harus membuka file eksternal.

---

### 2. User Experience & Visual Design

#### Format Teks Pesan WhatsApp yang Dihasilkan
```text
🏆 *LAPORAN REKAPITULASI KETERLIBATAN GURU*
🗓 *Periode*: [Label Periode Terpilih, contoh: Laporan Pekanan (19/10/2026 s/d 23/10/2026)]
📊 *Evaluasi Guru Terjadwal*: [Jumlah] Guru
----------------------------------------
🟢 *Kelompok A (Keterlibatan Penuh 100%)*: [Jml] Guru
🔵 *Kelompok B (Keterlibatan Tinggi 60-99%)*: [Jml] Guru
🟠 *Kelompok C (Keterlibatan Rendah <60%)*: [Jml] Guru
🔴 *Kelompok D (Nihil Laporan 0%)*: [Jml] Guru
----------------------------------------
🟢 *GURU KETERLIBATAN PENUH*:
- [Nama Lengkap Guru] ([Input]/[Total] Sesi · [Persen]%)
----------------------------------------
🔴 *DAFTAR GURU NIHIL LAPORAN*:
- [Nama Lengkap Guru] ([Input]/[Total] Sesi · [Persen]%)
----------------------------------------
🔵 *GURU KETERLIBATAN TINGGI*:
- [Nama Lengkap Guru] ([Input]/[Total] Sesi · [Persen]%)
----------------------------------------
🟠 *GURU KETERLIBATAN RENDAH*:
- [Nama Lengkap Guru] ([Input]/[Total] Sesi · [Persen]%)
----------------------------------------
_Diunduh & disinkronkan otomatis dari Sistem TAPAK Live Monitoring_
```

#### Modal Pratinjau WhatsApp di Antarmuka Pengguna
- Modal pratinjau pesan WhatsApp yang ada saat ini telah dilengkapi area teks scrollable (`max-h-[260px] overflow-y-auto`) dengan tombol aksi:
  - **Salin Teks**: Menyalin teks lengkap ke clipboard pengguna disertai toast feedback.
  - **Buka / Kirim WhatsApp**: Membuka tautan resmi `https://wa.me/?text=...` untuk langsung meneruskan ke aplikasi WhatsApp.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Menampilkan Seluruh 4 Kelompok (Bukan Hanya Nihil dan Rendah)**
  - *Chosen Approach*: Menampilkan seluruh kelompok A, D, B, C secara berurutan.
  - *Why*: Memberikan apresiasi yang seimbang bagi guru yang berkinerja penuh (Kelompok A) dan tinggi (Kelompok B), sekaligus tetap memberikan atensi pembinaan pada kelompok nihil (D) dan rendah (C).
  - *Alternatives Considered*: Hanya menampilkan kelompok D dan C seperti sebelumnya, namun kurang memberikan visibilitas positif terhadap guru yang rajin mengisi absen KBM.
- **Decision 2: Standarisasi Format Baris Guru**
  - *Chosen Approach*: `- ${t.namaLengkap} (${t.inputMandiriSesi}/${t.totalSesi} Sesi · ${t.percentage}%)`.
  - *Why*: Sangat konsisten dan memudahkan pembaca mencerna angka riil sesi yang telah dilaporkan versus beban sesi yang terjadwal.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    ReportWorkspace.tsx                      │
│                                                             │
│   keterlibatanData.list (Daftar Guru Terjadwal Terkalkulasi)│
│                            │                                │
│                            ▼                                │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              waMessageKeterlibatanText              │   │
│   │                                                     │   │
│   │  groupAList ──> 🟢 *GURU KETERLIBATAN PENUH*:        │   │
│   │  groupDList ──> 🔴 *DAFTAR GURU NIHIL LAPORAN*:      │   │
│   │  groupBList ──> 🔵 *GURU KETERLIBATAN TINGGI*:       │   │
│   │  groupCList ──> 🟠 *GURU KETERLIBATAN RENDAH*:       │   │
│   └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│   Modal Pratinjau WhatsApp & Integrasi Tombol Kirim         │
└─────────────────────────────────────────────────────────────┘
```

#### Rencana Modifikasi Kode:
1. Perbarui hook `waMessageKeterlibatanText` di `src/components/ReportWorkspace.tsx`:
   - Filter `list` ke `groupAList`, `groupDList`, `groupBList`, `groupCList`.
   - Bentuk template string sesuai urutan A ➔ D ➔ B ➔ C dengan pemisah `----------------------------------------`.
   - Gunakan format `- ${t.namaLengkap} (${t.inputMandiriSesi}/${t.totalSesi} Sesi · ${t.percentage}%)` dan fallback `- Nihil`.
2. Validasi dengan `lint_applet` dan `compile_applet`.
