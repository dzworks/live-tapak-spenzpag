# Rencana Optimasi Infografis Eksekutif KBM Mode Full Screen

Rencana penyesuaian tata letak infografis eksekutif pada mode layar penuh (full screen) agar tampilan lebih kompak, ramping, dan mudah dibaca tanpa mengubah kode di luar instruksi.

> [!IMPORTANT] Keputusan yang Telah Dikonfirmasi Pengguna:
> 1. **Header Jam Ke & Ciutkan**: Tombol "Ciutkan" disusun sejajar dalam satu baris fleksibel bersama judul "Jam ke-X", durasi KBM, dan jam realtime tanpa jarak vertikal ekstra.
> 2. **Kotak Status Guru 2 Kolom**: Pembagian informasi status guru menjadi 2 kolom (Kolom Kiri: Ada Guru & Izin; Kolom Kanan: Belum Konfirmasi & Tidak Ada Jadwal).
> 3. **Presisi Tinggi Kotak Infografis**: Pengurangan padding vertikal dan jarak elemen pada kotak Sesi KBM dan kartu sejajar untuk menghasilkan tampilan padat dan ramping.

---

### 1. Ringkasan Perubahan

- **Header Streamlined Sebaris**: Menyatukan tombol "Ciutkan", badge "Jam ke-X", durasi waktu, jam realtime, dan status kelancaran ke dalam 1 baris fleksibel ringkas saat full screen.
- **Kategori Status Guru 2 Kolom**: Mengatur item legenda/ringkasan pada Kotak Status Guru menjadi 2 kolom vertikal berdampingan saat full screen.
- **Kepadatan Tinggi Kartu (Compact Height)**: Mengurangi padding internal (`py-1` hingga `py-2`) dan gap antar elemen pada 4 kotak kartu infografis utama (KBM Kumulatif, Sesi KBM Hari Ini, Status Guru, dan Guru Izin).

---

### 2. Desain Visual & Tata Letak

#### Header Infografis Full Screen
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Jam ke-3]  [Durasi: 08:20-09:00]  [Realtime: 08:45 WIB]  [KBM Lancar]   [Ciutkan ▲]  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Kotak Status Guru 2 Kolom Full Screen
```
┌───────────────────────────┬───────────────────────────┐
│ • Ada Guru : 18 Guru      │ • Belum Konfirmasi : 2    │
│ • Izin     : 3 Guru       │ • Tidak Ada Jadwal : 5    │
└───────────────────────────┴───────────────────────────┘
```

---

### 3. Tahapan Pekerjaan (`src/components/ExecutiveInfographic.tsx`)

1. **Optimasi Header Top Bar Full Screen**:
   - Memastikan container header menggunakan `flex items-center justify-between` pada 1 baris tunggal.
   - Menyelaraskan posisi tombol `Ciutkan` di sisi kanan sejajar dengan badge `Jam ke-X` dan waktu.

2. **Refactoring Layout Kotak Status Guru (2 Kolom)**:
   - Menyesuaikan penataan kategori `teacherStats` menggunakan `grid grid-cols-2 gap-x-2 gap-y-1` pada mode full screen.
   - Menempatkan item "Ada Guru" dan "Izin" di kolom kiri, serta "Belum Konfirmasi" dan "Tidak ada jadwal" di kolom kanan.

3. **Pengurangan Padding & Margin Kartu Sesi KBM**:
   - Menyesuaikan padding kartu dari `p-2.5 sm:p-3` menjadi `p-1.5 sm:p-2` saat `isFullscreen`.
   - Mengatur tinggi minimum dan ruang vertikal agar konsisten dan sejajar.

4. **Kompilasi & Verifikasi**:
   - Menjalankan `compile_applet` dan `lint_applet` untuk mengonfirmasi tidak ada kesalahan sintaks dan UI terintegrasi sempurna.
