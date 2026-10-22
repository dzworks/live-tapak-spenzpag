# Petunjuk Backend Google Apps Script Mandiri (Standalone) - TAPAK

Backend ini dirancang sebagai **Google Apps Script Mandiri (Standalone Project)**. Skrip ini dibuat langsung di [script.google.com](https://script.google.com) dan **tidak menempel** pada Google Spreadsheet tertentu, melainkan terhubung melalui **ID Spreadsheet** yang ditempelkan di baris paling atas kode.

---

## 📋 Keuntungan Skrip Mandiri (Standalone)
1. **Terpisah dari Spreadsheet**: File spreadsheet tetap bersih dan tidak terbebani skrip internal.
2. **Fleksibel**: Dapat dengan mudah diarahkan ke spreadsheet lain (misalnya saat ganti tahun ajaran atau ganti semester) hanya dengan mengganti ID Spreadsheet.
3. **Sentralisasi Kode**: Dikelola secara independen di dashboard Google Apps Script pengembang/pengawas.

---

## 9 Sheet yang Dibaca Secara Otomatis:
Skrip akan membaca seluruh 9 sheet berikut dalam 1 panggilan API JSON (All-in-One):
1. **`MasterGuru`** (`Kode Guru`, `Nama Lengkap`, `NIP`)
2. **`MasterMapel`** (`Kode Mapel`, `Nama Mapel`)
3. **`Classes`** (`Token QR`, `ID Kelas`, `Nama Kelas`, `Lokasi Ruang`)
4. **`MasterRuangan`** (`Token QR`, `Nama Ruangan`, `PIN Akses`)
5. **`Schedules`** (`Hari`, `Jam Ke`, `Mapel Ke`, `Nama Kelas`, `Jam Mulai`, `Jam Selesai`, `Kode Guru`, `Kode Mapel`)
6. **`AttendanceLogs`** (`Tanggal`, `Waktu Absen (WIB)`, `Kelas`, `Mapel Ke`, `Kode Guru`, `Status Kehadiran`, `Mata Pelajaran`, `Kegiatan Pembelajaran`, `Pengganti (Y/N)`, `Info Ketidakhadiran`, `Ruang Belajar`, `ID Kiriman`)
7. **`MasterLogin`** (`Nama`, `Jabatan`, `Username`, `Password`, `Role`)
8. **`HariLibur`** (`Tanggal` format DD/MM/YYYY, `Keterangan`)
9. **`PeriodeAkademik`** (`Mulai Semester` format DD/MM/YYYY, `Selesai Semester` format DD/MM/YYYY, `Tahun Ajaran`)

*Catatan Cerdas:* Logika fungsi `hitungHariEfektif` otomatis mengecualikan hari Sabtu dan Minggu (sistem 5 hari sekolah), sehingga Admin TU tidak perlu menginput akhir pekan ke dalam sheet `HariLibur`. Cukup input libur nasional atau cuti bersama saja.

---

## 🚀 Langkah-Langkah Pembuatan & Penerapan (Deploy)

### Langkah 1: Dapatkan ID Spreadsheet Anda
1. Buka file Google Spreadsheet database TAPAK Anda di browser.
2. Lihat alamat URL di bilah browser (address bar):
   ```text
   https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
   ```
3. Salin bagian kode acak di antara `/d/` dan `/edit`.  
   Pada contoh di atas, ID Spreadsheet adalah:
   `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

---

### Langkah 2: Buat Proyek Apps Script Mandiri
1. Buka browser dan kunjungi: **[https://script.google.com](https://script.google.com)**
2. Pastikan Anda login dengan akun Google yang memiliki hak akses (*Viewer* atau *Editor*) ke spreadsheet database TAPAK.
3. Klik tombol **+ Proyek baru** (*+ New project*) di sisi kiri atas.
4. Beri nama proyek di kiri atas (misalnya: `TAPAK Standalone Backend API`).

---

### Langkah 3: Tempelkan Kode & Masukkan ID Spreadsheet
1. Buka file `Code.gs` di editor Apps Script.
2. Hapus kode bawaan `function myFunction() {}`.
3. Salin seluruh isi dari file **`google-apps-script/Code.gs`** pada repositori ini, lalu tempelkan ke editor.
4. Pada baris paling atas, ganti nilai `SPREADSHEET_ID`:
   ```javascript
   const SPREADSHEET_ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"; // <-- Ganti dengan ID Anda
   ```
5. Simpan file dengan menekan **Ctrl+S** (atau Cmd+S di Mac), atau klik ikon disket.

---

### Langkah 4: Uji Koneksi & Otorisasi Izin (PENTING!)
1. Di bilah menu atas editor, pada dropdown fungsi di samping tombol "Debug", pilih fungsi **`testStandaloneConnection`**.
2. Klik tombol **Jalankan** (*Run*).
3. Google akan menampilkan jendela pop-up otorisasi:
   - Klik **Tinjau Izin** (*Review Permissions*).
   - Pilih akun Google Anda.
   - Jika muncul peringatan *"Google hasn't verified this app"*, klik **Advanced** (Lanjutan) di bagian bawah kiri, lalu klik **Go to TAPAK Standalone Backend API (unsafe)**.
   - Klik **Allow** (Izinkan).
4. Lihat log eksekusi di bagian bawah:
   - Harus muncul pesan: `✅ SUKSES: Terhubung ke Spreadsheet: 'Nama Spreadsheet Anda'` dan daftar 6 sheet yang berhasil ditemukan.

---

### Langkah 5: Terapkan Sebagai Aplikasi Web (Deploy as Web App)
1. Di pojok kanan atas, klik tombol biru **Terapkan** (*Deploy*) > **Penerapan baru** (*New deployment*).
2. Klik ikon gerigi (⚙️) di samping *Select type* / Pilih jenis, lalu pilih **Aplikasi Web** (*Web app*).
3. Isi konfigurasi berikut:
   - **Deskripsi**: `TAPAK 6-Sheet Standalone API v1`
   - **Jalankan sebagai** (*Execute as*): **Saya** (*Me / email Anda*)
   - **Siapa yang memiliki akses** (*Who has access*): **Siapa saja** (*Anyone*)
     *(PENTING: Harus "Siapa saja" agar frontend aplikasi web dapat membaca data tanpa error login/CORS)*
4. Klik tombol **Terapkan** (*Deploy*).
5. Salin tautan **URL Aplikasi Web** yang berakhiran **`/exec`**.  
   Contoh format:
   ```text
   https://script.google.com/macros/s/AKfycbz_9yQ-ABC1234567xyz987654321/exec
   ```

---

### Langkah 6: Pasang URL di Antarmuka Web TAPAK
1. Buka aplikasi web monitoring TAPAK.
2. Klik tombol **Gembok (Admin / Pengawas)** di navigasi atas kanan.
3. Masukkan PIN Pengawas (default: `1234`).
4. Tempelkan URL Web App yang sudah disalin ke dalam isian **URL Deployment Baru**.
5. Klik **Uji Koneksi (Test Ping 6 Sheet)** untuk memastikan data 6 sheet terbaca dengan benar.
6. Klik **Simpan Permanen ke Server**.
7. URL kini tersimpan permanen di server frontend dan seluruh device/layar Smart TV akan otomatis langsung menarik data dari Google Spreadsheet Anda!

3. Langkah yang Dilakukan Pengguna Setelah Perbaikan Selesai
Commit perubahan baru (git add ., git commit -m "fix: resolve esbuild peer dependency for vercel deployment", git push origin main).
Vercel akan otomatis mendeteksi commit baru di GitHub dan menjalankan deployment ulang tanpa error dependensi.
