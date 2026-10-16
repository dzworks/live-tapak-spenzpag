# Rencana Implementasi: Konfigurasi Vercel SPA & Panduan Deployment GitHub ke Vercel

Rencana ini merinci penyesuaian file `vercel.json` untuk Single Page Application (SPA) Vite dan pembuatan dokumen panduan lengkap (`PANDUAN_DEPLOY_VERCEL.md`) mengenai instalasi dari GitHub ke Vercel serta tata cara update (sinkronisasi) setelah dideploy.

---

## 1. Konfigurasi `vercel.json`

File `vercel.json` di root direktori akan memastikan:
- **Build Output**: Mendefinisikan direktori output Vite yaitu `dist` dan perintah build `npm run build`.
- **SPA Routing Rewrite**: Mengalihkan seluruh request rute (`/(.*)`) ke `/index.html` sehingga aplikasi Vite SPA tidak memunculkan error 404 saat pengguna melakukan refresh atau mengakses sub-path secara langsung.
- **Konfigurasi Bersih & Standar**:
  ```json
  {
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```

---

## 2. Pembuatan Panduan Markdown (`PANDUAN_DEPLOY_VERCEL.md`)

Akan dibuat file panduan lengkap berbahasa Indonesia di root direktori: `PANDUAN_DEPLOY_VERCEL.md` (dan tautan di `README.md`):

### Isi Dokumen Panduan:
1. **Persiapan Proyek & File Penting**:
   - Penjelasan peran `vercel.json` (routing SPA & output build).
   - Peran `.npmrc` (`legacy-peer-deps=true`) untuk mencegah konflik dependensi build Vercel.
   - Pengecekan file `package.json` dan skrip `build`.
2. **Langkah-demi-Langkah Deploy Pertama Kali dari GitHub ke Vercel**:
   - Menghubungkan akun GitHub ke Vercel (vercel.com).
   - Mengimpor repositori (Add New -> Project -> Import Repository).
   - Pengaturan konfigurasi proyek di Vercel (Framework Preset: **Vite**, Build Command, Output Directory).
   - Konfigurasi Environment Variables (jika ada).
   - Menjalankan Deploy dan mengakses URL domain gratis `*.vercel.app`.
3. **Cara Melakukan Update (Redeploy) Setelah Ada Perubahan**:
   - **Metode 1: Otomatis via Git Push (Rekomendasi Utama)**:
     - Cara menjalankan perintah `git add .`, `git commit -m "pesan update"`, dan `git push origin main`.
     - Vercel mendeteksi push otomatis dan menjalankan *Continuous Deployment* (CD) tanpa perlu intervensi manual.
   - **Metode 2: Manual Redeploy dari Dashboard Vercel**:
     - Langkah trigger ulang build dari tab *Deployments* > *Redeploy* (misalnya dengan opsi *Clear Cache* bila dibutuhkan).
   - **Metode 3: Menggunakan Vercel CLI (Opsional)**:
     - Perintah `npx vercel --prod` untuk deploy langsung dari terminal.
4. **Solusi Masalah Umum (Troubleshooting)**:
   - Mengatasi error *Conflicting peer dependency / ERESOLVE*.
   - Mengatasi rute halaman 404 saat di-refresh (*Single Page Application Fallback*).
   - Memeriksa *Runtime & Build Logs* di Vercel jika terjadi kegagalan.

---

## 3. Langkah Verifikasi
- Memastikan sintaks file `vercel.json` valid JSON.
- Memastikan `PANDUAN_DEPLOY_VERCEL.md` tersusun rapi, jelas, dan mudah dipraktikkan.
- Menjalankan verifikasi kompilasi (`compile_applet`) untuk menjamin tidak ada regresi pada build aplikasi.
