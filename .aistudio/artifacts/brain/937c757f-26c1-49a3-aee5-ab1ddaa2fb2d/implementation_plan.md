# Rencana Implementasi: Penyesuaian Logika Sesi Harian & Pembersihan Tampilan

Dokumen rencana kerja untuk menyesuaikan deteksi otomatis **Waktu Pulang Sekolah (After School)** pada Kotak Sesi Harian serta menyederhanakan tampilan dengan menghapus teks status kondisi piket.

---

## 1. Masalah Yang Ditemukan
* Pada jam 15:46 WIB (hari Jumat), di mana jam pelajaran ke-5 berakhir pada 10:45 WIB, sistem masih mencatat 23 sesi sebagai **Sesi Aktif** karena perhitungan sebelumnya hanya membandingkan `activePeriodNumber > maxPeriodInToday` (`5 > 5` = false).
* Terdapat baris tambahan `"Kondisi: Perlu perhatian piket"` di bagian bawah Kotak 3 yang menambah beban visual dan tidak lagi diperlukan.

---

## 2. Rencana Perubahan & Solusi

### A. Penyesuaian Logika Waktu Pulang Sekolah (`isAfterSchool`)
1. **Deteksi Menit WIB Real-time vs Jam Selesai Sesi Terakhir**:
   * Menghitung total menit WIB saat ini (`wibHours * 60 + utcMinutes`).
   * Mengambil jam selesai dari jadwal pelajaran terakhir hari ini (`lastSchedule.endTime`, misal `10:45` = 645 menit untuk Jumat, atau `14:00` = 840 menit untuk Senin-Kamis).
   * Menetapkan `isAfterSchool = true` jika:
     - Waktu menit WIB saat ini `>=` menit waktu selesai jadwal pelajaran terakhir.
     - ATAU `activePeriodNumber > maxPeriodInToday`.

2. **Dampak Saat `isAfterSchool = true`**:
   * **Sesi Harian (Kotak 3)**:
     - **Berlalu**: `53` (semua sesi KBM masuk ke kategori terlampaui/berlalu).
     - **Sesi Aktif**: `0`.
     - **Akan Datang**: `0`.
   * **Sesi KBM Hari Ini (Kotak 2)**:
     - Sesi kumulatif memperhitungkan seluruh `53` sesi harian untuk rasio terkonfirmasi vs belum konfirmasi.

### B. Meringkas Tampilan Kotak Sesi Harian
1. Menghapus elemen baris bawah `"Kondisi: Perlu perhatian piket"` / `"Kondisi: KBM Lancar"` pada Kotak 3.
2. Memastikan ketiga sub-kotak (Berlalu, Sesi Aktif, Akan Datang) tampil simetris, rapi, dan responsif di layar mobile maupun desktop.

---

## 3. Langkah Implikasi Kode
* **File Target**: `src/components/ExecutiveInfographic.tsx`
  - Perbarui pembuatan flag `isAfterSchool` dengan memperhitungkan `lastSchedule.endTime` vs waktu WIB saat ini.
  - Hapus div indikator `Kondisi:` pada render Kotak 3.

---

## 4. Rencana Verifikasi
1. Menjalankan `compile_applet` untuk memastikan tidak ada kesalahan TypeScript/JSX.
2. Menjalankan `lint_applet` untuk menjamin kualitas dan kerapihan kode.
3. Memastikan tampilan Kotak 3 terlihat sangat ringkas, bersih, dan angkanya akurat saat jam KBM telah terlampaui.
