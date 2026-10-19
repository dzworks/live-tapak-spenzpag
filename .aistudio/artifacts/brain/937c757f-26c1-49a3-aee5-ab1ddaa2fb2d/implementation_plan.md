# Rencana Implementasi: Generator Laporan KBM & Grafik Statistik Tren (Harian, Pekanan, Bulanan)

## Ringkasan Proyek
Pengembangan modul **Generator Laporan KBM** pada halaman `ReportWorkspace.tsx`. Modul ini menyediakan Panel Kontrol Filter terpadu (Harian, Pekanan, Bulanan) yang secara cepat memfilter dan memproses 6 entitas data ter-sync (`MasterGuru`, `MasterMapel`, `Classes`, `MasterRuangan`, `Schedules`, `AttendanceLogs`), disertai tombol sinkronisasi ulang data backend. Di bawahnya, sistem menampilkan **Bar Chart Statistik Tren** (Perbandingan Tren Kehadiran KBM vs Tren Kepatuhan Guru Mengisi Aplikasi), tabel rincian presensi/perizinan, serta aksi **Kirim WhatsApp** dan **Cetak PDF Resmi**.

---

## User Review & Critical Decisions

> [!IMPORTANT] Keputusan yang Telah Dikonfirmasi Pengguna (Phase 1):
> 1. **Mekanisme Data Backend**: Data difilter secara cepat di *frontend* dari data 6-sheet yang sudah tersinkronisasi lokal, lengkap dengan tombol **Refresh Data Backend** untuk memicu pengambilan ulang (*sync*) dari Google Apps Script jika diperlukan.
> 2. **Bentuk Visualisasi Grafik**: Menampilkan **Bar Chart Statistik Tren** berdampingan/bertumpuk yang membandingkan persentase **Kehadiran KBM** (Hadir/Pengganti) vs **Kepatuhan Guru Mengisi Aplikasi** per titik waktu/tanggal.
> 3. **Tata Letak Component**: **Panel Kontrol Filter Terpadu** berada di bagian atas (pemilih tanggal, mode laporan, tombol refresh), diikuti **Grafik Bar Chart & Kartu Statistik** di tengah, serta **Tabel Rincian Data Perizinan & Tombol Aksi (WhatsApp & PDF)** di bagian bawah.

---

## 1. Desain Tampilan & Rancangan Layout Laporan (`ReportWorkspace.tsx`)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 📄 PUSAT GENERATOR LAPORAN & REKAPITULASI KBM TAPAK                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ PANEL KONTROL FILTER TERPADU ]                                                       │
│ Mode: [ 📅 Harian ]  [ 🗓️ Pekanan ]  [ 📆 Bulanan ]    Tanggal: [ 09-Okt-2026 ▾ ]     │
│ Tombol Aksi: [ 🔄 Refresh Data Apps Script ]  [ 📱 Pratinjau & WA ]  [ 🖨️ Cetak PDF ] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ RINGKASAN STATISTIK 5 KARTU ]                                                        │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│ │ Total Sesi   │ │ % Kehadiran  │ │ % Kepatuhan  │ │ Sesi Izin    │ │ Belum Absen  │  │
│ │  184 Sesi    │ │    92%       │ │    88%       │ │   8 Sesi     │ │   12 Sesi    │  │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ GRAFIK BAR CHART STATISTIK TREN ]                                                    │
│ 📊 Tren Perbandingan Kehadiran KBM vs Kepatuhan Guru Mengisi Aplikasi                  │
│ [ Bar Chart Visual: Batang Hijau (% Kehadiran) & Batang Indigo (% Kepatuhan) ]         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ TABEL RINCIAN 6 SHEET DATA & PERIZINAN GURU ]                                        │
│ Daftar Guru Izin/Sakit/Dinas dengan Keterangan Lengkap & Mata Pelajaran Pengampu      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pemetaan Data 6 Sheet untuk Filter Laporan

Aplikasi menggunakan 6 skema data utama dari backend Google Apps Script:

1. **`MasterGuru`**: `kodeGuru`, `namaLengkap`, `nip`
2. **`MasterMapel`**: `kodeMapel`, `namaMapel`
3. **`Classes`**: `tokenQr`, `idKelas`, `namaKelas`, `lokasiRuang`
4. **`MasterRuangan`**: `tokenQr`, `namaRuangan`, `pinAkses`
5. **`Schedules`**: `hari`, `jamKe`, `mapelKe`, `namaKelas`, `jamMulai`, `jamSelesai`, `kodeGuru`, `kodeMapel`
6. **`AttendanceLogs`**: `tanggal`, `waktuAbsen`, `kelas`, `mapelKe`, `kodeGuru`, `statusKehadiran`, `mataPelajaran`, `kegiatanPembelajaran`, `pengganti`, `infoKetidakhadiran`, `ruangBelajar`, `idKiriman`

### Kalkulasi Metrik & Filter Periode:
- **Harian**: Menyaring `AttendanceLogs` dan `Schedules` berdasarkan tanggal/hari terpilih.
- **Pekanan**: Memproses rentang 5 hari kerja (Senin–Jumat) dalam pekan tanggal terpilih.
- **Bulanan**: Memproses seluruh tanggal KBM dalam bulan terpilih.
- **Metrik Utama**:
  - `% Kehadiran KBM` = `(Jumlah Sesi Hadir + Pengganti) / Total Sesi Terjadwal * 100%`
  - `% Kepatuhan Aplikasi` = `(Jumlah Sesi Terisi Presensinya di Aplikasi) / Total Sesi Terjadwal * 100%`

---

## 3. Komponen Grafik Bar Chart Tren

- Menggunakan **SVG Bar Chart Custom / SVG Responsive Visualizer** yang ringan, *zero-dependency*, tanpa error kompilasi library eksternal.
- Sumbu X: Titik waktu (Sesi Jam Ke untuk Harian / Tanggal untuk Pekanan & Bulanan).
- Sumbu Y: Persentase (0% - 100%).
- Legend: 
  - 🟩 **Batang Hijau (Emerald)**: Persentase Kehadiran KBM.
  - 🟦 **Batang Biru/Nila (Indigo)**: Persentase Kepatuhan Guru Mengisi Aplikasi.
- Tooltip Interaktif saat *hover* batang grafik untuk menampilkan rincian sesi.

---

## 4. Langkah Implementasi (Sesuai Permintaan: Belum Mengubah Kode)

1. **Persiapan Rencana (Turn Ini)**: Menyajikan rencana arsitektur dan struktur komponen laporan.
2. **Pengembangan Component (`ReportWorkspace.tsx`)**:
   - Memperbarui Panel Kontrol Filter dengan tombol **Refresh Data Backend Apps Script** (`onManualRefresh`).
   - Menambahkan komponen **Bar Chart Statistik Tren** (Komponen Bar Chart SVG SVG-native).
   - Menyempurnakan pemrosesan 6 entitas sheet untuk rekapitulasi Harian, Pekanan, dan Bulanan.
   - Mengintegrasikan modal Pratinjau & **Kirim ke WhatsApp** (`https://wa.me/?text=...`) dan **Cetak PDF Resmi** (`window.print()`).
3. **Verifikasi Build & Lint**: Menjalankan `compile_applet` dan `lint_applet` untuk menjamin nol error.
