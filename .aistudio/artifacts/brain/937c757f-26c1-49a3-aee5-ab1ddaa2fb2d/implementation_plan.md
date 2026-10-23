# Penambahan Informasi Statistik Keseluruhan pada Pratinjau WhatsApp Laporan KETERLIBATAN GURU

Menambahkan seksi ringkasan statistik keseluruhan secara dinamis dan real-time pada pesan pratinjau WhatsApp **Laporan Keterlibatan Guru** di `src/components/ReportWorkspace.tsx`.

## User Review & Critical Decisions

> [!IMPORTANT] Keputusan yang Telah Dikonfirmasi Pengguna:
- **Format Rincian Teks**: Menggunakan emoji indikator di setiap baris rincian (📈 Persentase keterlibatan guru, 📊 Total Sesi, 📱 Guru mengisi aplikasi, 🔴 Guru belum isi aplikasi).
- **Cakupan Periode**: Berlaku dinamis untuk seluruh mode periode laporan (Harian, Pekanan, Bulanan, dan Semesteran).

## 1. Overview & Core Concept

Pesan WhatsApp pratinjau pada sub-menu **Keterlibatan Guru** akan diperkaya dengan blok informasi agregat sebelum rincian per kelompok kuadran (A, B, C, D). Informasi ini menampilkan persentase keterlibatan, total sesi KBM terjadwal, jumlah sesi yang diinput mandiri oleh guru, dan jumlah sesi yang belum diisi.

Format Teks WhatsApp yang Ditargetkan:
```
🏆 *LAPORAN REKAPITULASI KETERLIBATAN GURU*
🗓 *Periode*: Laporan Pekanan (19/10/2026 s/d 23/10/2026)
📊 *Evaluasi Guru Terjadwal*: 39 Guru
----------------------------------------
📈 Persentase keterlibatan guru: [X]%
📊 Total Sesi: [Total] Sesi
📱 Guru mengisi aplikasi: [Filled] Sesi
🔴 Guru belum isi aplikasi: [Unconfirmed] Sesi
----------------------------------------
🟢 *Kelompok A (Keterlibatan Penuh 100%)*: 3 Guru
🔵 *Kelompok B (Keterlibatan Tinggi 60-99%)*: 13 Guru
🟠 *Kelompok C (Keterlibatan Rendah <60%)*: 13 Guru
🔴 *Kelompok D (Nihil Laporan 0%)*: 10 Guru
----------------------------------------
...
```

## 2. Technical Architecture & Component Mapping

### Diagram Alur Data Pratinjau WhatsApp

```
┌────────────────────────────────────────────────────────┐
│               ReportWorkspace Component                │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
   [reportStats Calculations]  [keterlibatanData Analysis]
   - totalSessions             - groupACount / groupBCount
   - filledAppCount            - groupCCount / groupDCount
   - unconfirmedCount          - totalTeachersEvaluated
   - appCompliancePercent
               │                         │
               └────────────┬────────────┘
                            ▼
           [waMessageKeterlibatanText Memo]
                            │
                            ▼
            [WhatsApp Modal / Copy / Direct Send]
```

## 3. Langkah Implementasi

1. **Pembaruan `waMessageKeterlibatanText` di `src/components/ReportWorkspace.tsx`**:
   - Mengambil variabel `reportStats.appCompliancePercent`, `reportStats.totalSessions`, `reportStats.filledAppCount`, dan `reportStats.unconfirmedCount`.
   - Menyisipkan blok teks statistik keseluruhan dengan emoji indikator tepat di antara baris *Evaluasi Guru Terjadwal* dan daftar *Kelompok A/B/C/D*.
2. **Verifikasi Build & Lint**:
   - Menjalankan `compile_applet` dan `lint_applet` untuk memastikan tidak ada kesalahan TypeScript.
