# Rencana Pembaharuan Format WhatsApp Laporan KBM TAPAK Live

Menyesuaikan struktur dan format teks WhatsApp pada **Laporan KBM TAPAK Live** di `src/components/ReportWorkspace.tsx` sesuai dengan kebutuhan dan keputusan konfirmasi pengguna.

## User Review & Critical Decisions

> [!IMPORTANT] Keputusan & Rancangan yang Telah Dikonfirmasi Pengguna:
1. **Status Kualitas Data (Grading)**:
   - ≥ 90%: `🟢 Sangat Baik`
   - 75% – 89%: `🔵 Baik`
   - 50% – 74%: `🟠 Cukup`
   - < 50%: `🔴 Perlu Perhatian`
2. **Format Persentase Data Masuk**:
   - `*% Data yang masuk aplikasi:*`
   - `   [Percent]% ([Input] / [Total] Sesi)`
   - `Status Kualitas Data: [Grading Emoji + Teks]`
3. **Rincian Sesi KBM**:
   - `*Total Sesi*: [Total] Sesi`
   - `*Sesi Guru Hadir/Mengajar*:`
   - `   [PresentPercent]% / [PresentCount] Sesi`
   - `*Guru Izin / Sakit / Dinas*:`
   - `   [LeavePercent]% / [LeaveCount] Sesi`
4. **Catatan Guru Izin/Sakit**:
   - **Tanpa Emoji** pada nama guru.
   - **Urutan Kronologis**: Diurutkan berdasarkan hari izin (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu).
   - **Format 2 Baris Indentasi**:
     ```
     -  Nama Guru, S.Pd.
        (Hari, Kelas-kelas · Alasan/Keterangan)
     ```
5. **Footer**: Menampilkan timestamp lengkap real-time: `_Diunduh & disinkronkan otomatis dari Sistem TAPAK Live Monitoring pada [Tanggal, Jam WIB]_`.

## 1. Struktur Teks WhatsApp Laporan KBM Baru

```text
📊 *LAPORAN REKAPITULASI KBM TAPAK LIVE*
🗓 *Periode*: Laporan Pekanan (19/10/2026 s/d 23/10/2026)
🎓 *Periode Akademik*: 2026/2027 Ganjil
📅 *Hari Efektif KBM*: 5 Hari Aktif (0 Libur/ KBM non efektif)
----------------------------------------
*% Data yang masuk aplikasi:*
   44% (189 / 425 Sesi)
Status Kualitas Data: 🔴 Perlu Perhatian
----------------------------------------
*Total Sesi*: 425 Sesi
*Sesi Guru Hadir/Mengajar*: 
   50% / 211 Sesi 
*Guru Izin / Sakit / Dinas*: 
   7% / 30 Sesi
----------------------------------------
📋 *CATATAN GURU IZIN/SAKIT*:
-  Nurlaela, S.Pd. 
   (Senin, IX-F, IX-B, VII-H · Keperluan Pribadi: Melayat orang tua)
-  Iif Fakhrurozi, S.Pd., M.Pd. 
   (Selasa, VIII-B, VIII-C, VIII-E · Sakit: Gangguan pencernaan)
-  Guruh Sabar Gustiawan, S.Pd. 
   (Selasa, IX-F, VIII-H · Instruksi Pimpinan: Memantau penggunaan aplikasi)
...
----------------------------------------
_Diunduh & disinkronkan otomatis dari Sistem TAPAK Live Monitoring pada 23/10/2026, 05:42 WIB_
```

## 2. Langkah Implementasi

1. **Perbarui fungsi pembentukan `waMessageText` di `src/components/ReportWorkspace.tsx`**:
   - Tambahkan fungsi penentu `Status Kualitas Data` berbasis rentang persentase.
   - Tambahkan pengurutan kronologis hari untuk `leaveTeachersList` (`Senin` = 1, `Selasa` = 2, dst.).
   - Hapus emoji dari nama guru pada rincian catatan izin/sakit.
   - Format rincian catatan 2 baris dengan indentasi 3 spasi pada baris kedua.
   - Format footer dengan tanggal dan jam WIB real-time.
2. **Pengujian & Verifikasi**:
   - Jalankan `compile_applet` dan `lint_applet` untuk memastikan tidak ada kesalahan kompilasi.
