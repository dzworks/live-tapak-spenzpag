# Rencana Perbaikan Tampilan & Penambahan Fitur Sorting Matriks Kelas

## Masalah yang Diidentifikasi
- Kontrol penyaringan dan pencarian pada matriks kelas saat ini berada dalam satu kontainer horizontal yang mengalami `flex-wrap` dan tumpang tindih pada layar laptop/tablet/split-view.
- Belum tersedia fitur pengurutan (sorting) dinamis untuk memprioritaskan kelas dengan status "Belum Absen" pada jam aktif saat ini agar guru piket dapat memantau dengan cepat.

---

## Solusi yang Diusulkan

### 1. Restrukturisasi Bilah Kontrol Menjadi 2 Baris Terorganisir
- **Baris 1: Filter Tingkat & Status Hari**
  - Segmented control tingkat rombel: `Semua (23 Rombel)`, `Kelas VII (8)`, `Kelas VIII (8)`, `Kelas IX (7)`.
  - Chip penanda jadwal aktif / hari master di sisi kanan dengan tata letak flex yang tidak bertumpuk.
- **Baris 2: Filter Status, Fitur Sorting, Pencarian & Kerapatan Layar**
  - Input pencarian nama kelas / ruangan dengan ikon dan tombol reset.
  - Filter cepat status: `Semua`, `Hadir`, `Belum`, `Infal` dengan badge hitungan kelas yang sesuai.
  - **Menu Pengurutan (Sorting)** baru:
    - *Urutan Standar (VII → IX)*
    - *Belum Absen Teratas (Prioritas Pantau Piket)*
    - *Nama Kelas A-Z*
    - *Lokasi Ruangan*
  - Tombol beralih kerapatan tampilan (*Layar Ringkas 23 Kelas / Normal*).

### 2. Implementasi Logika Sorting Dinamis
- Menghitung status kelas pada jam aktif saat ini (apakah sedang ada jadwal dan gurunya belum absen).
- Menyediakan sorting prioritas: jika memilih *Belum Absen Teratas*, kelas yang sedang berlangsung tanpa absensi akan langsung muncul di jajaran baris paling atas matriks.

### 3. Responsivitas dan Penataan Ruang
- Memastikan wrapping antar elemen pada mobile maupun tablet tertata rapi tanpa elemen yang terpotong atau saling menimpa.
- Menguji kompilasi kode dan memverifikasi tampilan.
