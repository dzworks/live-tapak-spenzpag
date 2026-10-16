# Penyesuaian Sinkronisasi Presensi AttendanceLogs & Pemilih Tanggal KBM

Rencana ini merinci penyesuaian skema dan logika pencocokan agar data presensi guru dari sheet **AttendanceLogs** Google Spreadsheet dapat disinkronkan dan ditampilkan secara langsung dan akurat pada matriks, infografis, dan daftar presensi GuruLive Monitor.

---

## Ringkasan Konfirmasi Pengguna

> [!IMPORTANT]
> Berdasarkan jawaban klarifikasi yang telah dikonfirmasi:
> 1. **Prioritas Tanggal Aktif**: Sistem akan langsung menarik dan memprioritaskan data presensi pada **tanggal hari ini** (atau tanggal terbaru yang terdeteksi di sheet), sedangkan kontrol pemilih tanggal (*Date Selector*) berfungsi untuk memilih hari dalam bulan berjalan.
> 2. **Cakupan Jam Jamak (Multi-Period)**: Jika guru mengabsen rentang jam seperti `Jam Ke: "1 - 3"`, guru tersebut secara otomatis ditandai **Hadir di seluruh jam** dalam rentang tersebut (Jam 1, Jam 2, dan Jam 3).

---

## 1. Analisis Akar Masalah

Mengapa data guru yang hadir di `attendancelogs` sebelumnya tidak tercatat di GuruLive?

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AKAR MASALAH UTAMA                              │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Filter Tanggal Statis:                                             │
│    Aplikasi terkunci pada default '09-Okt-2026', sedangkan data riil    │
│    di spreadsheet bertanggal '16-Okt-2026'. Akibatnya, filter          │
│    l.tanggal === selectedDate menghasilkan array kosong [].            │
│                                                                        │
│ 2. Kolom 'Jam Ke' Tidak Terpetakan di Apps Script (Code.gs):          │
│    Fungsi readSheetAsObjects di Code.gs tidak memetakan kolom          │
│    'Jam Ke', sehingga rentang jam seperti '1 - 3' hilang saat dikirim  │
│    ke web, menyebabkan sistem menganggap absen hanya untuk 1 jam.      │
│                                                                        │
│ 3. Variasi Format Tanggal Google Sheets:                               │
│    Cell tanggal di Sheets sering dievaluasi sebagai objek Date         │
│    ('2026-10-16 00:00') vs string teks ('16-Okt-2026'), sehingga     │
│    perbandingan string biasa gagal.                                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Rencana Perubahan & Penyesuaian

### A. Normalisasi Tanggal & Pemilih Tanggal Bulan Berjalan (`src/utils/appsScriptCode.ts` & `src/App.tsx`)
- Membuat helper fungsi `canonicalDateKey(dateStr)` dan `formatIndonesianDate(date)` yang dapat menyelaraskan format `16-Okt-2026`, `2026-10-16`, `16/10/2026`, maupun objek `Date`.
- Pada saat aplikasi dimuat atau saat sinkronisasi berhasil:
  - Cari tanggal hari ini (WIB UTC+7). Jika terdapat data presensi untuk hari ini, otomatis gunakan tanggal hari ini.
  - Jika belum ada data hari ini, otomatis pilih **tanggal terbaru** yang ada pada data `attendanceLogs`.
- Mengembangkan pemilih tanggal KBM agar mencakup seluruh tanggal KBM pada bulan berjalan yang memiliki data atau jadwal KBM aktif.

### B. Pemetaan Penuh Kolom Sheet `AttendanceLogs` (`src/types.ts` & `src/utils/appsScriptCode.ts`)
- Memperluas antarmuka `AttendanceLogItem` untuk memuat seluruh kolom resmi:
  - `tanggal`, `waktuAbsen`, `kelas`, `mapelKe`, `kodeGuru`, `mataPelajaran`, `statusKehadiran`
  - `jamKe`, `jamMulai`, `jamSelesai`, `ruangBelajar`, `kegiatanPembelajaran`, `infoKetidakhadiran`, `pengganti`, `idKiriman`, `sumberData`
- Memperbaiki parser `parsePeriodRange`:
  - Mampu membaca format seperti `"1 - 3"`, `"1 - 2"`, `"3 - 5"`, `"1 - 9"`, maupun `"1"`.
  - Menghasilkan array `periods: [1, 2, 3]` lengkap sehingga seluruh slot jam terkait ditandai **Hadir** (hijau) sekaligus.

### C. Logika Pencocokan Slot Jadwal (`resolveScheduleSlot` di `src/utils/appsScriptCode.ts`)
- Meningkatkan toleransi pencocokan antara jadwal dan catatan presensi:
  1. Kesamaan kelas: `normalizeClassName(log.kelas) === normalizeClassName(sched.namaKelas)`.
  2. Irisan jam: jika `log.periods` beririsan dengan `sched.periods`, slot langsung ditandai hadir.
  3. Kesamaan urutan mapel (`mapelKe`) atau kode guru (`kodeGuru`).
  4. Penanganan status ketidakhadiran non-hadir khusus: `Instruksi Pimpinan`, `Keperluan Pribadi`, `Dinas Luar`, `Sakit`, `Izin`.

### D. Pembaruan Skrip Google Apps Script (`google-apps-script/Code.gs`)
- Memperbarui konstanta kolom `AttendanceLogs` di `Code.gs` agar menyertakan:
  `['Tanggal', 'Waktu Absen (WIB)', 'Kelas', 'Mapel Ke', 'Kode Guru', 'Mata Pelajaran', 'Status Kehadiran', 'Jam Ke', 'Jam Mulai', 'Jam Selesai', 'Ruang Belajar', 'Kegiatan Pembelajaran', 'Info Ketidakhadiran', 'Pengganti (Y/N)', 'Sumber Data', 'ID Kiriman']`.
- Memastikan `normalizedLogs` memetakan properti `jamKe`, `jamMulai`, `jamSelesai` secara lengkap.

### E. Penyertaan Contoh Data Riil ke `DEFAULT_ATTENDANCE_LOGS` (`src/data/initialData.ts`)
- Memasukkan ke-16 data presensi contoh dari pengguna bertanggal `16-Okt-2026` ke dalam data awal aplikasi sebagai demonstrasi instan dan fallback offline.

---

## 3. Diagram Alur Data Presensi

```
┌─────────────────────────────────┐
│ Google Sheet: AttendanceLogs    │
│ (Tanggal, Jam Ke '1 - 3', dsb)  │
└────────────────┬────────────────┘
                 │ Web App GET /exec
                 ▼
┌─────────────────────────────────┐
│ processTapakBundle()            │
│ - enrichAttendanceLogItem()     │
│ - parsePeriodRange('1 - 3')     │
│   -> periods: [1, 2, 3]         │
│ - canonicalDateKey()            │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ App.tsx: State Management       │
│ - Auto-switch ke tanggal hari ini│
│ - Pemilih tanggal bulan berjalan│
└────────┬───────────────┬────────┘
         │               │
         ▼               ▼
┌─────────────────┐  ┌──────────────────┐
│ ClassroomMatrix │  │ AttendanceFeed   │
│ Jam 1, 2, 3:    │  │ Menampilkan feed │
│ Hijau (Hadir)   │  │ presensi lengkap │
└─────────────────┘  └──────────────────┘
```

---

## 4. Rencana Pengujian & Verifikasi

1. **Uji Parse Rentang Jam**: Memastikan `"1 - 3"` terurai menjadi rentang jam 1, 2, 3 dan mewarnai slot jam 1, jam 2, dan jam 3 menjadi hijau (Hadir) untuk kelas `VIII-C`, `VII-H`, `VII-E`, dll.
2. **Uji Sinkronisasi Tanggal Otomatis**: Memastikan aplikasi otomatis menampilkan data `16-Okt-2026` saat dibuka tanpa harus memilih manual di dropdown.
3. **Uji Pemilih Tanggal Bulan Berjalan**: Memastikan tanggal-tanggal lain di bulan Oktober 2026 tetap dapat diakses melalui dropdown.
4. **Kompilasi & Linting**: Menjalankan `compile_applet` dan `lint_applet` untuk menjamin tidak ada error TypeScript.
