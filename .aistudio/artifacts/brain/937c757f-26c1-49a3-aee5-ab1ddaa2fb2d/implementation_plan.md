# Perbaikan Konflik Dependensi Deploy Vercel (esbuild & Vite 8)

Solusi terarah untuk mengatasi kegagalan `npm install` (Conflicting peer dependency: esbuild) pada log build Vercel, memastikan proses build dan deployment berjalan sukses.

## 1. Ringkasan Akar Masalah (Root Cause)

Berdasarkan log Vercel:
```text
npm error Conflicting peer dependency: esbuild@0.28.2
npm error node_modules/tsx/node_modules/esbuild
npm error   peerOptional esbuild@"^0.27.0 || ^0.28.0" from vite@8.3.4
npm error Fix the upstream dependency conflict, or retry this command with --force or --legacy-peer-deps
```

* **Penyebab Utama**: Pada file `package.json`, tercatat `"esbuild": "^0.25.0"` di bagian `devDependencies`. Sementara itu, `vite@8.3.x` dan `tsx@4.21.x` membutuhkan versi `esbuild` `^0.27.0 || ^0.28.0`.
* Ketika Vercel menjalankan `npm install` secara default dengan npm 7+, algoritma `ERESOLVE` mendeteksi ketidakcocokan antara versi root `esbuild@0.25.0` dengan kebutuhan `vite`, sehingga menghentikan instalasi dengan status exit code 1.

---

## 2. Rencana Tindakan Perbaikan

```
┌─────────────────────────────────────────────────────────────┐
│                      Langkah Perbaikan                      │
├─────────────────────────────────────────────────────────────┤
│ 1. package.json  ──> Hapus devDependency "esbuild": "^0.25" │
│                      (Biarkan Vite & tsx mengelola versi)   │
│                                                             │
│ 2. .npmrc        ──> Buat konfigurasi legacy-peer-deps=true │
│                      (Mencegah penolakan peer dep di Vercel)│
│                                                             │
│ 3. vercel.json   ──> Konfigurasi Vite SPA routing rewrite   │
│                      (Semua route diarahkan ke index.html)  │
│                                                             │
│ 4. Build Test    ──> Uji compile_applet & tsc --noEmit      │
└─────────────────────────────────────────────────────────────┘
```

### Langkah 1: Pembersihan `package.json`
- Menghapus `"esbuild": "^0.25.0"` dari blok `devDependencies`. Vite dan TSX sudah menyertakan esbuild yang kompatibel secara otomatis di pohon dependensi mereka, sehingga tidak ada lagi versi esbuild kadaluarsa yang dipaksakan di root project.

### Langkah 2: Pembuatan File `.npmrc`
- Menambahkan file `.npmrc` di root direktori dengan isi:
  ```ini
  legacy-peer-deps=true
  ```
  Ini adalah praktik standar terbaik untuk project React 19 + Tailwind 4 + Vite di platform cloud seperti Vercel. Konfigurasi ini menjamin `npm install` pada server Vercel tidak terhenti oleh konflik rentang versi peer dependency minor.

### Langkah 3: Penambahan Konfigurasi `vercel.json`
- Menyediakan file `vercel.json` dengan konfigurasi framework Vite:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```
  Menjamin aplikasi SPA (Single Page Application) dapat di-refresh di halaman mana pun tanpa mengalami error 404 di Vercel.

### Langkah 4: Verifikasi & Uji Kompilasi
- Menjalankan `compile_applet` dan `lint_applet` untuk memastikan build lokal `vite build` dan pemeriksaan tipe TypeScript `tsc --noEmit` lulus 100%.

---

## 3. Langkah yang Dilakukan Pengguna Setelah Perbaikan Selesai
1. Commit perubahan baru (`git add .`, `git commit -m "fix: resolve esbuild peer dependency for vercel deployment"`, `git push origin main`).
2. Vercel akan otomatis mendeteksi commit baru di GitHub dan menjalankan deployment ulang tanpa error dependensi.
