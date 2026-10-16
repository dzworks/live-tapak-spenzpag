# Rencana Implementasi: Timeline Timestamp Dual-Color, Filter Data Contoh Infografis, & Tata Letak Matriks 2 Kolom

Rencana arsitektur dan teknis untuk menerapkan tiga penyesuaian utama pada sistem monitoring presensi GuruLive Monitor:
1. **Garis Waktu Timestamp Dual-Color**: Sebelum titik timestamp berwarna abu-abu (waktu sebelum absen), dan setelah titik berwarna hijau (waktu belajar aktif setelah guru absen).
2. **Eksklusi Data Contoh pada Infografis**: Mengabaikan data guru contoh, mapel contoh, dan ruang contoh dalam perhitungan persentase kehadiran, jumlah rombel, dan statistik lainnya di infografis eksekutif, namun tetap menampilkannya pada matriks kelas.
3. **Pemisahan Tabel Matriks Menjadi 2 Kolom (Kiri & Kanan)**: Membagi daftar kelas/ruang secara merata ke dalam 2 kolom tabel berdampingan, di mana jika jumlah kelas ganjil (misal 23 rombel), kolom kiri akan memuat 1 kelas lebih banyak (12 kiri, 11 kanan).

---

## Ringkasan Keputusan & Konfirmasi

> [!IMPORTANT]
> Tiga keputusan utama yang dirancang dalam rencana ini:
> 1. **Visual Timeline Slot KBM**: Garis waktu slot pelajaran akan memiliki dua segmen warna yang jelas—segmen kiri (0% s/d titik kedatangan guru) berwarna abu-abu netral (`bg-slate-300`), dan segmen kanan (titik s/d 100% durasi jam pelajaran) berwarna hijau emerald (`bg-emerald-500`). Titik presensi guru dilengkapi animasi pulse/ping halus agar mudah dilacak secara visual.
> 2. **Ketepatan Metrik Eksekutif**: Seluruh metrik KPI (persentase kehadiran guru, jumlah sesi aktif, chart statistik guru hadir/sakit/izin, dan rombel aktif) pada `ExecutiveInfographic` hanya mengkalkulasi data riil sekolah. Entitas pengujian atau sampel (nama atau kode bertuliskan "contoh", "dummy", "sample", "test", atau "CT") disaring dari perhitungan, tetapi tetap dapat ditinjau di matriks tabel.
> 3. **Ergonomi Display Matriks 2 Kolom**: Mengubah tabel tunggal 23 baris menjadi layout 2 kolom berdampingan (*split-table grid*). Ini mengoptimalkan ruang layar lebar (dashboard TV piket / monitor 1080p), memangkas kedalaman scroll vertikal hingga 50%, dengan pembagian matematis `Math.ceil(N / 2)` pada kolom kiri dan `Math.floor(N / 2)` pada kolom kanan.

---

## 1. Arsitektur & Diagram Komponen

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TOP NAVIGATION & FILTER TOOLBAR                 │
│  - Info Sekolah & Waktu WIB Live  - Filter Tingkat & Status            │
├────────────────────────────────────────────────────────────────────────┤
│                     EXECUTIVE INFOGRAPHIC (KPI & STATS)                 │
│  - Total Sesi KBM Hari Ini (Eksklusi Guru / Mapel / Ruang Contoh)      │
│  - Persentase Kehadiran Sesi Berjalan (%)                              │
│  - Donut Chart Status Guru Riil (Hadir, Sakit, Pribadi, Dinas)         │
├────────────────────────────────────────────────────────────────────────┤
│                  CLASSROOM MATRIX (2-COLUMN BALANCED GRID)             │
│                                                                        │
│   ┌──────────────────────────────┐    ┌──────────────────────────────┐  │
│   │   KOLOM KIRI (12 Rombel)     │    │   KOLOM KANAN (11 Rombel)    │  │
│   ├──────────────────────────────┤    ├──────────────────────────────┤  │
│   │ Ruang/Kelas │ Jam 1 │ Jam 2  │    │ Ruang/Kelas │ Jam 1 │ Jam 2  │  │
│   ├─────────────┼───────┼────────┤    ├─────────────┼───────┼────────┤  │
│   │ VII A       │ [ ◉─] │ [   ]  │    │ VIII E      │ [───] │ [ ◉─]  │  │
│   │ VII B       │ [───] │ [ ◉─]  │    │ VIII F      │ [ ◉─] │ [───]  │  │
│   │ ...         │ ...   │ ...    │    │ ...         │ ...   │ ...    │  │
│   │ VIII D (12) │ [ ◉─] │ [───]  │    │ IX G (23)   │ [ ◉─] │ [───]  │  │
│   └──────────────────────────────┘    └──────────────────────────────┘  │
│                                                                        │
│   Detail Slot Timeline:                                                │
│   [ 0% ======= Abu-abu (Belum Absen) ===== ◉ === Hijau (KBM Aktif) == 100% ]
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Rincian Teknis Implementasi

### A. Fitur 1: Animasi & Dual-Color Titik Timestamp KBM (`ClassroomMatrix.tsx`)
1. **Struktur Garis Waktu**:
   - Di dalam kartu slot jadwal (baik mode ringkas `isUltraCompact` maupun standar), elemen progress bar track garis waktu dipecah menjadi dua segmen warna:
     - **Segmen Kiri (Sebelum Titik)**: Lebar `0%` sampai `timeMarker.percentage%`, diberi warna abu-abu netral (`bg-slate-300 dark:bg-slate-500`).
     - **Segmen Kanan (Setelah Titik)**: Lebar `timeMarker.percentage%` sampai `100%`, diberi warna hijau terang (`bg-emerald-500`).
   - Alternatif penerapan CSS yang sangat efisien dan mulus: container track menggunakan background hijau `bg-emerald-500` dengan elemen bar anak selebar `${timeMarker.percentage}%` berwarna abu-abu `bg-slate-300`, atau dua elemen `flex` bersebelahan.
2. **Animasi Titik Timestamp**:
   - Titik timestamp check-in guru diberi cincin animasi denyut (`animate-ping` lembut atau `animate-pulse`) dengan lingkaran dalam berwarna hijau tua ber-ring putih (`w-2.5 h-2.5 rounded-full bg-emerald-700 ring-2 ring-white shadow-xs`).
   - Tooltip interaktif menampilkan jam tepat guru absen, rentang waktu KBM, dan durasi keterlambatan/ketepatan waktu.

### B. Fitur 2: Filter Eksklusi Data Contoh pada Infografis (`ExecutiveInfographic.tsx` & `src/utils/appsScriptCode.ts`)
1. **Fungsi Deteksi Data Sampel / Contoh**:
   - Menambahkan helper terpusat `isSampleEntity(params: { kodeGuru?: string; namaGuru?: string; kodeMapel?: string; namaMapel?: string; namaKelas?: string; lokasiRuang?: string }): boolean`.
   - Menguji apakah salah satu properti memuat kata kunci seperti `"contoh"`, `"sample"`, `"dummy"`, `"test"`, atau kode khusus `"CT"`.
2. **Penerapan pada `ExecutiveInfographic.tsx`**:
   - **`schedulesToday`**: Sesi jadwal KBM yang diajar oleh guru contoh, mapel contoh, atau di ruangan/kelas contoh difilter keluar dari kalkulasi analitik.
   - **`activeSessionsAnalysis` & Persentase Kehadiran**: Hanya menghitung sesi KBM riil sehingga persentase kehadiran 100% mencerminkan kondisi lapangan sebenarnya.
   - **`totalDailySessions`, `passedSessions`, & `upcomingSessions`**: Hanya menghitung jadwal riil.
   - **`teacherStats` & Donut Chart**: Kumpulan guru terjadwal disaring agar tidak menyertakan guru contoh.
   - **`absentTeacherList`**: Daftar ketidakhadiran tidak menampilkan data uji coba.
   - **Total Rombel**: Indikator total rombel di infografis hanya menghitung kelas resmi non-contoh.
3. **Preservasi pada `ClassroomMatrix.tsx`**:
   - Matriks kelas tetap merender seluruh rombel dan jadwal termasuk kelas/guru contoh (sesuai instruksi: *"tetap munculkan pada matriks"*), sehingga operator atau admin tetap dapat melihat semua baris yang terdaftar di Google Spreadsheet.

### C. Fitur 3: Tabel Matriks Ruang/Kelas 2 Kolom Seimbang (`ClassroomMatrix.tsx`)
1. **Logika Pembagian Array Kelas**:
   - Menghitung titik tengah pembagian:
     ```ts
     const totalCount = processedClasses.length;
     const splitIndex = Math.ceil(totalCount / 2);
     const leftColumnClasses = processedClasses.slice(0, splitIndex);
     const rightColumnClasses = processedClasses.slice(splitIndex);
     ```
   - Contoh kasus 23 rombel:
     - `splitIndex = Math.ceil(23 / 2) = 12`.
     - Kolom Kiri: 12 kelas (Kelas VII A s/d VIII D).
     - Kolom Kanan: 11 kelas (Kelas VIII E s/d IX G).
     - *Jika ganjil, sebelah kiri memuat 1 kelas lebih banyak*.
2. **Layout Tampilan Dual-Table**:
   - Menggunakan CSS Grid responsif: `grid grid-cols-1 xl:grid-cols-2 gap-4 items-start`.
   - Masing-masing kolom merender komponen tabel mandiri dengan header periode waktu yang seragam (Jam 1 s/d Jam N) dan lebar kolom proporsional.
   - Pada layar monitor besar / desktop widescreen (TV monitoring piket), kedua kolom tampil berdampingan secara penuh.
   - Penunjuk waktu vertikal (*Now-Indicator*) atau penyorotan kolom jam berjalan (`isCurrent`) tetap aktif dan sinkron di kedua tabel.

---

## 3. Rencana Pengujian & Verifikasi

1. **Uji Dual-Color Timeline**:
   - Verifikasi slot kelas yang memiliki catatan presensi: pastikan garis sebelum titik berwarna abu-abu dan setelah titik berwarna hijau.
   - Verifikasi animasi titik timestamp guru aktif dan tampak tajam.
2. **Uji Eksklusi Data Contoh**:
   - Masukkan/simulasikan data dengan kode guru `'CT'` atau nama `'Guru Contoh'`, pastikan persentase dan daftar guru di infografis mengabaikannya.
   - Pastikan pada tabel matriks di bawahnya, baris kelas atau slot terkait tetap muncul normal.
3. **Uji 2 Kolom Matriks**:
   - Verifikasi pembagian 23 rombel: kolom kiri memuat tepat 12 kelas, kolom kanan memuat tepat 11 kelas.
   - Verifikasi klik slot pada kedua tabel membuka modal rincian presensi dengan benar.
   - Verifikasi kompilasi kode bersih tanpa error TypeScript (`compile_applet` & `lint_applet`).
