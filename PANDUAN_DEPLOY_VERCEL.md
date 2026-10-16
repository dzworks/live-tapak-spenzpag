# Panduan Lengkap Deployment dari GitHub ke Vercel & Cara Update

Dokumen ini berisi panduan langkah demi langkah untuk melakukan deploy aplikasi **Sistem Monitoring Kehadiran Kelas (Vite SPA)** dari repositori GitHub ke platform **Vercel**, serta cara memperbarui (update/redeploy) aplikasi setelah berhasil dideploy.

---

## 1. File Konfigurasi yang Sudah Disiapkan

Di dalam repositori ini, telah disiapkan file konfigurasi khusus agar proses build dan routing di Vercel berjalan lancar:

1. **`vercel.json`**  
   - Mengatur framework `vite`.
   - Mengarahkan direktori build ke `dist`.
   - Mengaktifkan aturan *rewrite* Single Page Application (SPA), sehingga ketika Anda me-refresh halaman pada rute manapun, tidak akan muncul error 404 (semua request diarahkan ke `index.html`).
2. **`.npmrc`**  
   - Berisi `legacy-peer-deps=true`.
   - Mencegah error konflik *peer dependency* (seperti `esbuild` vs `vite`) saat Vercel menjalankan `npm install`.

---

## 2. Cara Deploy Pertama Kali (GitHub ke Vercel)

Ikuti langkah-langkah berikut untuk mendeploy aplikasi untuk pertama kali:

### Langkah 1: Sinkronkan / Push Kode ke GitHub
Pastikan seluruh file kode terbaru (termasuk `vercel.json` dan `.npmrc`) sudah ter-push ke repository GitHub Anda:
```bash
git add .
git commit -m "Siapkan konfigurasi vercel.json dan panduan deployment"
git push origin main
```
*(Catatan: ganti `main` dengan nama branch utama Anda jika menggunakan `master`)*.

---

### Langkah 2: Buka dan Login ke Vercel
1. Buka situs [https://vercel.com](https://vercel.com).
2. Login atau Sign Up menggunakan akun **GitHub** Anda agar Vercel dapat membaca repositori Anda secara langsung.

---

### Langkah 3: Import Repositori
1. Pada halaman **Dashboard Vercel**, klik tombol **"Add New..."** di kanan atas, lalu pilih **"Project"**.
2. Di bagian **"Import Git Repository"**, cari nama repositori GitHub Anda.
3. Klik tombol **"Import"** di samping nama repositori tersebut.

---

### Langkah 4: Konfigurasi Project di Vercel
Pada halaman **Configure Project**:
1. **Project Name**: Masukkan nama aplikasi sesuai keinginan Anda (misal: `monitoring-kelas-sekolah`).
2. **Framework Preset**: Vercel akan otomatis mendeteksi **Vite** karena sudah ada `vercel.json`. Jika belum terpilih, pilih `Vite` secara manual.
3. **Root Directory**: Biarkan `./` (default).
4. **Build and Output Settings**:
   - *Build Command*: `npm run build`
   - *Output Directory*: `dist`
   - *Install Command*: Biarkan default
5. **Environment Variables** *(Opsional)*:
   - Jika aplikasi Anda memerlukan variabel lingkungan tertentu (misal API URL khusus), tambahkan di bagian ini. Jika tidak ada, lewati bagian ini.

---

### Langkah 5: Jalankan Deployment
1. Klik tombol **"Deploy"** di bagian bawah.
2. Tunggu proses build berlangsung (biasanya sekitar 1–2 menit).
3. Setelah selesai, akan muncul animasi ucapan selamat (*Congratulations!*) beserta tautan domain publik aplikasi Anda, misalnya:  
   `https://monitoring-kelas-sekolah.vercel.app`

---

## 3. Cara Memperbarui (Update / Redeploy) Aplikasi

Setelah aplikasi terpasang di Vercel, ada 2 cara praktis untuk mengupdate aplikasi Anda saat ada perubahan kode:

### Metode A: Update Otomatis via Git Push (Continuous Deployment — Sangat Direkomendasikan)
Vercel telah terhubung langsung dengan GitHub Anda. Setiap kali Anda melakukan perubahan kode dan mem-push commit baru ke GitHub:
1. Lakukan perubahan pada kode Anda.
2. Commit dan push ke branch utama:
   ```bash
   git add .
   git commit -m "Update fitur monitoring dan tampilan terbaru"
   git push origin main
   ```
3. **Vercel akan otomatis mendeteksi perubahan tersebut** dan langsung memulai proses build & deploy versi terbaru tanpa Anda perlu membuka dashboard Vercel!
4. Status deployment terbaru dapat dipantau di dashboard Vercel atau tab pull-request/commit di GitHub.

---

### Metode B: Redeploy Manual via Dashboard Vercel
Gunakan metode ini jika build otomatis gagal karena kendala jaringan atau jika Anda ingin memaksa Vercel membersihkan *cache* build:

1. Buka [https://vercel.com](https://vercel.com) dan pilih project Anda.
2. Masuk ke tab **Deployments** di bilah menu atas.
3. Pada baris deployment paling atas (status *Production* atau *Failed*), klik ikon titik tiga (**`...`**) di sisi kanan.
4. Klik **"Redeploy"**.
5. *Opsional*: Jika Anda baru saja memperbarui dependensi di `package.json` dan ingin memastikan dependensi diunduh ulang dari awal secara bersih, hilangkan centang pada opsi **"Redeploy with existing build cache"**.
6. Klik tombol konfirmasi **"Redeploy"**.

---

### Metode C: Deploy Cepat via Vercel CLI (Khusus Pengguna Terminal)
Jika Anda terbiasa menggunakan command line / terminal lokal:
```bash
# Pasang Vercel CLI jika belum ada
npm i -g vercel

# Login ke akun Vercel Anda
vercel login

# Deploy langsung ke versi produksi
vercel --prod
```

---

## 4. Solusi Masalah Umum (Troubleshooting)

| Kendala / Error | Penyebab | Solusi |
| :--- | :--- | :--- |
| **`Conflicting peer dependency: esbuild...`** | Konflik versi peer dependency antara Vite dan paket pendukung saat `npm install`. | File `.npmrc` dengan `legacy-peer-deps=true` sudah disediakan di root proyek ini. Pastikan file `.npmrc` tersebut ikut ter-push ke GitHub. |
| **PIN Pengawas / Admin dianggap salah terus saat input `1234` di Vercel** | Vercel mem-build aplikasi sebagai Static SPA (tanpa Node Express server), sehingga request `POST /api/verify-pin` ditolak Vercel dengan HTTP 405. | Kode di `AdminUrlModal.tsx` telah disempurnakan dengan deteksi otomatis hosting statis: verifikasi PIN dan penyimpanan URL Google Apps Script kini otomatis beralih ke `localStorage` browser tanpa bergantung pada API server backend! |
| **Error 404 saat me-refresh halaman atau membuka tautan rute langsung** | Server Vercel mencari file statis fisik yang tidak ada di direktori build. | Sudah diatasi oleh file `vercel.json` dengan konfigurasi `rewrites` ke `/index.html`. Pastikan `vercel.json` berada di root repository. |
| **Tampilan tidak berubah setelah push** | Browser menyimpan file CSS/JS lama di cache lokal. | Lakukan *Hard Refresh* pada browser dengan menekan `Ctrl + Shift + R` (Windows) atau `Cmd + Shift + R` (Mac), atau coba buka melalui tab *Incognito/Private*. |
| **Build Gagal (*Build Failed*)** | Ada syntax error atau tipe data TypeScript yang belum lolos validasi. | Periksa log error di tab **Deployments** -> Klik deployment yang gagal -> Klik bagian **Building**. Anda juga bisa menguji build di lokal terlebih dahulu dengan menjalankan perintah `npm run build`. |

---

*Selamat! Aplikasi Monitoring Kehadiran Kelas Anda kini siap digunakan dan ter-deploy secara profesional di Vercel.*
