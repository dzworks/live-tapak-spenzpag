# Rencana Implementasi: Infografis Jam Ke, Warna Sesi Mapel Luar Kelas, & Penyederhanaan Kolom Matriks Kelas

## Ringkasan Perubahan
Berdasarkan arahan terbaru, terdapat 3 penyelarasan utama pada tampilan dashboard:
1. **Penataan Infografis Jam Ke (`ExecutiveInfographic.tsx`)**:
   - **Baris 1**: Menampilkan tulisan **Jam Ke** dengan ukuran font yang jauh lebih besar, tebal, dan menonjol dibanding elemen lainnya, disertai badge status kelancaran KBM dan tombol ciutkan.
   - **Baris 2**: Menempatkan informasi **Durasi Jam KBM** dan **Jam Digital Realtime WIB** secara rapi berdampingan di baris kedua.
2. **Logika Warna Kotak Sesi Mapel (Hadir di Luar Kelas = Biru)**:
   - Jika guru hadir dan `ruangBelajar` adalah **ruang kelas** (default) -> warna kotak sesi mapel tetap **Hijau** (`green`).
   - Jika guru hadir dan `ruangBelajar` **selain ruang kelas** (misal: *Lapangan Olahraga, Lab Komputer, Perpustakaan, Aula, dsb.*) -> warna kotak sesi mapel menjadi **Biru** (`blue`).
   - Melengkapi styling Tailwind kartu sesi mapel biru (background, border, badge lokasi ruang belajar) di `ClassroomMatrix.tsx`, modal detail `DetailModal.tsx`, serta legenda warna di footer matriks.
3. **Penyederhanaan Kolom Matriks Kelas (`ClassroomMatrix.tsx`)**:
   - Ubah judul header kolom dari **"Ruang / Kelas"** menjadi **"Kelas"** saja.
   - Hilangkan kata dan data lokasi ruang (`cls.lokasiRuang`) pada isi sel kolom kelas di setiap baris, sehingga hanya menampilkan nama kelas (misal: `X-1`, `XI-MIPA-2`, dsb.) dan badge presensi baru jika ada. Hal ini membuat kolom kelas jauh lebih ringkas, rapi, dan memberikan ruang pandang yang lebih luas untuk slot sesi mapel.

---

## Rincian Perubahan File

### 1. `src/components/ExecutiveInfographic.tsx`
- **Restrukturisasi Header Jam Ke & Waktu**:
  - Mengubah layout header menjadi 2 baris terstruktur:
    - **Baris 1**: Tulisan `Jam Ke: {activePeriod?.period || '-'}` dengan font besar (`text-xl sm:text-2xl font-black text-indigo-950 tracking-tight`), didampingi badge kelancaran sesi dan tombol aksi.
    - **Baris 2**: Flex row yang memuat:
      - Durasi KBM: Badge rentang jam aktif (`{activePeriod.startTime} - {activePeriod.endTime} WIB`) dengan durasi menit.
      - Realtime Clock: Jam digital realtime WIB (`{currentTimeString} WIB`) dengan ikon jam dan dot pulsasi aktif.

### 2. Penentuan Warna Sesi Mapel `SlotColorStatus` ('blue')
- **`src/types.ts`**:
  - Memastikan tipe `SlotColorStatus` mendukung `'blue'`: `'green' | 'red' | 'yellow' | 'purple' | 'slate' | 'blue'`.
- **`src/utils/appsScriptCode.ts` (dan fungsi resolving di frontend/mock data)**:
  - Pada logika penentuan warna:
    - Jika log kehadiran guru berstatus `"Hadir"` (atau penginputan presensi hadir):
      - Cek apakah `ruangBelajar` adalah ruang kelas (misal: bernilai sama dengan default ruang kelas, mengandung kata "kelas", atau log kosong menggunakan default ruang kelas).
      - Jika ruang belajar adalah selain ruang kelas (contoh: "Lapangan Olahraga", "Lab Komputer", "Perpustakaan", "Luar Ruang Kelas"): tandai status warna sebagai `'blue'`.
      - Jika ruang belajar adalah ruang kelas biasa: tandai status warna sebagai `'green'`.
- **`src/components/ClassroomMatrix.tsx`**:
  - Menambahkan styling warna untuk `slot.statusColor === 'blue'`:
    - Background: `bg-sky-50/95 border-sky-300 text-sky-950 hover:border-sky-500 hover:shadow-2xs`
    - Status label: `"Hadir (Luar Kelas)"` atau `"Hadir"` dengan penanda khusus lokasi luar kelas.
    - Progress time bar berwarna biru (`bg-sky-500/90`, ping biru).
  - Menambahkan item legenda warna di footer matriks:
    - **Biru**: `Hadir (Luar Kelas)` berdampingan dengan Hijau, Merah, Kuning, dan Ungu.
- **`src/data/initialData.ts`**:
  - Memperbarui data contoh attendance log agar memiliki variasi sesi guru hadir di luar ruang kelas (misal: Penjas di Lapangan Olahraga, TIK di Lab Komputer) sehingga warna biru langsung terlihat nyata di dashboard.

### 3. Penyederhanaan Kolom Kelas di `src/components/ClassroomMatrix.tsx`
- **Header Kolom**:
  - Mengubah `<span className="block font-bold">Ruang / Kelas</span>` menjadi `<span className="block font-bold">Kelas</span>`.
- **Isi Kolom (Cell)**:
  - Menghapus rendering `<span className="text-[10px] text-slate-500 font-mono truncate max-w-[50px]">{cls.lokasiRuang}</span>`.
  - Merapikan alignment nama kelas (`shortName`) agar terpusat secara rapi dan proporsional.

---

## Rencana Verifikasi & Uji
1. **Verifikasi Visual Infografis Jam Ke**:
   - Memastikan teks "Jam Ke: X" tampil besar dan dominan di baris pertama.
   - Memastikan durasi KBM dan jam realtime WIB berada di baris kedua secara simetris dan rapi di layar desktop maupun mobile.
2. **Verifikasi Kotak Sesi Mapel (Hijau vs Biru)**:
   - Sesi di dalam ruang kelas tetap berwarna hijau.
   - Sesi dengan ruang belajar selain kelas (misal Lapangan Olahraga, Lab) otomatis tampil dengan kartu berwarna biru cerah dan label lokasi yang jelas.
   - Legenda footer menampilkan keterangan warna biru dengan benar.
3. **Verifikasi Kolom Matriks Kelas**:
   - Judul kolom adalah "Kelas".
   - Tidak ada lagi kata atau data ruang di isi kolom kelas, tampilan tabel menjadi jauh lebih bersih dan kompak.
4. **Build & Lint**:
   - Menjalankan `compile_applet` untuk memastikan tidak ada kesalahan kompilasi TypeScript atau CSS.
