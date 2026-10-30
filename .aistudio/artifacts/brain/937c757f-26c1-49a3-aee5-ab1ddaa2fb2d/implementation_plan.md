# Fitur Input Masal Agenda Piket (Satu Hari / Satu Minggu)

Implementasi fitur input masal agenda piket untuk rentang satu hari (beberapa mapel) atau satu minggu (Senin - Jumat) dengan alur pemilihan guru terlebih dahulu dan pengisian tabel interaktif per baris sesi.

## User Review & Critical Decisions

> [!IMPORTANT]
> Keputusan dan preferensi pengguna yang telah dikonfirmasi:
> - **Alur Pemilihan**: Pilih satu guru terlebih dahulu, kemudian tampilkan seluruh mapel mengajar guru tersebut.
> - **Metode Pengisian**: Tabel interaktif per baris sesi (setiap mapel dapat diisi status kehadiran & materi secara mandiri).
> - **Cakupan**: Satu Hari (semua sesi mapel guru pada hari tersebut) atau Satu Minggu (semua sesi mapel guru dari Senin sampai Jumat).
> - **Sinkronisasi**: Pengiriman data tetap terpisah per sesi KBM di latar belakang tanpa popup toast yang mengganggu.

## 1. Overview & Core Concept

- **What It Does**: Memungkinkan Petugas Piket melakukan input agenda & kehadiran secara masal (batch) untuk 1 hari penuh atau 1 minggu sekaligus untuk seorang guru/mata pelajaran tertentu dengan efisien.
- **Target Audience**: Petugas Piket Sekolah / Admin Piket.
- **Key Value**: Menghemat waktu input piket tanpa harus membuka modal satu per satu per sesi KBM, sambil menjaga integritas data tersimpan terpisah per sesi.

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. Di Menu Agenda Piket, pengguna memilih mode input: "Input Reguler (Per Sesi)" vs "Input Masal (Satu Hari / Satu Minggu)".
  2. Dalam mode masal, pengguna memilih Guru (dari daftar guru aktif).
  3. Sistem menampilkan daftar seluruh sesi mengajar guru tersebut untuk tanggal/rentang waktu yang dipilih (Satu Hari atau Senin-Jumat).
  4. Pengguna mengisi tabel interaktif per baris (Status Kehadiran, Materi, Catatan). Tombol "Simpan Semua Sesi" mengirimkan data secara asinkron di latar belakang dengan indikator sinkronisasi.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Bersih, profesional, utilitarian, selaras dengan desain tabel matriks KBM.
  - *Color Palette*: Slate, Indigo, Emerald (sukses), Amber (izin/sakit), Rose (alpha).

## 3. Key Product Decisions & Trade-Offs

- **Decision 1**: Alur Berbasis Guru & Sesi
  - *Chosen Approach*: Pilih guru dulu -> tampilkan matriks sesi jadwal guru tersebut.
  - *Why*: Lebih natural bagi petugas piket yang memegang catatan per guru piket atau laporan guru piket harian.
- **Decision 2**: Validasi & Pengiriman Terpisah
  - *Chosen Approach*: Tombol "Simpan Semua" memproses setiap baris secara paralel/berurutan di latar belakang dan memperbarui antrean riwayat pengiriman.
  - *Why*: Menjamin data KBM tersimpan terpisah di basis data sesuai arsitektur sesi masing-masing.

## 4. Technical Architecture & Data Strategy

\`\`\`
┌────────────────────────────────────────────────────────┐
│               AdminPiketAgendaWorkspace                │
└───────────────┬───────────────────────┬────────────────┘
                │                       │
     [Regular Single Session]    [Batch Input Mode]
                │                       │
                ▼                       ▼
    ┌───────────────────────┐ ┌──────────────────────────┐
    │ Single Modal Form     │ │ 1. Select Teacher        │
    │                       │ │ 2. Fetch Weekly/Daily    │
    │                       │ │    Schedules             │
    │                       │ │ 3. Interactive Table     │
    │                       │ │    Rows per Session      │
    └───────────┬───────────┘ └───────────┬──────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
                ┌───────────────────────┐
                │ Background Sync Queue │
                │ (attendanceLogs API)  │
                └───────────────────────┘
\`\`\`
