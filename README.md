# Sistem Monitoring Kehadiran Kelas (Realtime)

Aplikasi web modern untuk monitoring kehadiran guru, status kelas, dan jadwal pelajaran secara real-time, terintegrasi dengan Google Sheets & Google Apps Script.

## Fitur Utama
- **Dashboard Ringkasan Realtime**: Jam ke, durasi pelajaran, dan jam digital yang mencolok dan presisi.
- **Kartu Mikro & Infografis**: Pemantauan kelas belum konfirmasi dan guru izin dengan tata letak padat tanpa scroll.
- **Matriks Status Kelas**: Tampilan matriks kelas 2 baris teratur dengan filter tingkat kelas, pencarian, dan sorting kelas belum absen teratas.
- **Mode Presentasi / TV Display**: Optimal untuk display layar lobi atau ruang guru.
- **Integrasi Google Apps Script**: Sinkronisasi data presensi dan jadwal langsung dari Google Sheets.

## Konfigurasi Deployment (Vercel)
Aplikasi ini sudah dilengkapi konfigurasi siap pakai untuk Vercel:
- `vercel.json`: Konfigurasi build Vite dan rewrite SPA menuju `/index.html` (bebas error 404 saat refresh rute).
- `.npmrc`: Mencegah error peer dependency saat proses `npm install` di Vercel.

📖 **Panduan Lengkap Deployment & Update**:  
Silakan baca panduan lengkap pada file **[PANDUAN_DEPLOY_VERCEL.md](./PANDUAN_DEPLOY_VERCEL.md)** untuk:
1. Cara menghubungkan dan deploy pertama kali dari GitHub ke Vercel.
2. Cara update otomatis (Continuous Deployment via `git push`).
3. Cara redeploy manual dan troubleshooting log error.

## Pengembangan Lokal

```bash
# Instal dependensi
npm install

# Jalankan server pengembangan
npm run dev

# Jalankan build produksi
npm run build
```
