# Integrasi Login Admin Berbasis Spreadsheet Sheet MasterLogin

Rencana implementasi pembaruan sistem autentikasi login Admin GuruLive Monitor dengan mengambil kredensial langsung dari sheet `MasterLogin` Google Spreadsheet (kolom: Nama, Jabatan, Username, Password, Role), mengganti input PIN statis dengan formulir Username & Password profesional, serta menampilkan sesi identitas admin aktif di Navbar.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Hasil konfirmasi kebutuhan yang telah disepakati bersama pengguna:
> 1. **Susunan Kolom Sheet MasterLogin**: Terdiri dari 5 kolom utama: `Nama`, `Jabatan`, `Username`, `Password`, dan `Role`.
> 2. **Metode Autentikasi**: Otomatis disinkronkan dari Google Apps Script Web App ke dalam bundle data aplikasi, lalu diverifikasi secara cepat di sisi client/server dengan fallback data akun default saat mode offline/inisial.
> 3. **Manajemen Sesi Login**: Sesi disimpan secara persisten (`localStorage`) sehingga admin tetap login antar reload halaman, dan profil admin (Nama & Jabatan/Role) ditampilkan secara elegan di bilah navigasi (Navbar) lengkap dengan tombol Pengaturan & Logout.

---

## 1. Overview & Core Concept

- **Apa yang Dibangun**: Pembaruan menyeluruh pada dialog modal autentikasi admin. Dari yang sebelumnya hanya meminta input angka PIN (4 digit), kini beralih menjadi formulir **Username & Password** modern yang terhubung ke database `MasterLogin` pada Google Spreadsheet sekolah.
- **Pengguna Sasaran**: Kepala Sekolah, Wakil Kepala Sekolah Bidang Kurikulum, Guru Piket, dan Tim IT / Administrator Sistem Monitoring.
- **Nilai Utama**: 
  - Tidak perlu lagi menghafal atau menyamakan PIN tunggal untuk semua orang; setiap pejabat/staf dapat memiliki kredensial masing-masing di sheet `MasterLogin`.
  - Administrator dapat dengan mudah mengelola, menambah, atau menonaktifkan akun admin langsung dari Google Spreadsheet tanpa menyentuh kode program.
  - Navbar langsung mengenali siapa admin yang sedang aktif bertugas (`Nama`, `Jabatan`, `Role`).

---

## 2. User Experience & Visual Design

### 2.1 Alur Pengguna (User Flows)
1. **Membuka Dialog Login**: Pengguna mengklik tombol **Admin** di bilah navigasi (Navbar).
2. **Kondisi Belum Login (Guest)**:
   - Muncul modal dialog bertema gelap-terang elegan dengan judul "Autentikasi Administrator".
   - Input **Username** (dengan ikon User / ID) dan input **Password** (dengan toggle tampilkan/sembunyikan password mata).
   - Tombol **Masuk / Verifikasi** dengan efek transisi halus dan indikator loading spinner saat validasi.
   - Pesan kesalahan yang informatif jika username atau password tidak cocok.
   - Pilihan "Bantuan / Contoh Akun Bawaan" jika spreadsheet belum terhubung pertama kali.
3. **Kondisi Berhasil Login (Authenticated)**:
   - Notifikasi sukses masuk.
   - Modal langsung menampilkan panel konfigurasi (URL Apps Script, uji koneksi, ekspor `app-config.json`, dan ringkasan status sinkronisasi).
   - Sesi tersimpan aman di browser.
4. **Tampilan di Navbar Saat Login Aktif**:
   - Tombol Admin di Navbar berubah menjadi **Badge Akun Admin** yang menampilkan Nama & Jabatan/Role (misal: "Pak Ahmad (Waka Kurikulum)").
   - Dropdown / Menu klik cepat:
     - ⚙️ Buka Pengaturan Server / Apps Script
     - 🔄 Sinkron Ulang Akun MasterLogin
     - 🚪 Keluar / Logout Sesi

### 2.2 Desain Visual & Tema
- **Warna & Aksen**: Tetap harmonis dengan tema emerald-slate gelap modern yang sudah ada di GuruLive.
- **Tipografi & Ikonografi**: Menggunakan Lucide Icons (`User`, `Lock`, `Eye`, `EyeOff`, `BadgeCheck`, `LogOut`, `ShieldCheck`).
- **Kompatibilitas Layar Penuh & Mobile**: Dialog modal responsif, nyaman diakses baik di PC desktop, tablet piket, maupun layar HP vertikal.

---

## 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Integrasi Sheet MasterLogin ke Script Apps Script**:
  - *Pendekatan*: Menambahkan pembacaan sheet `MasterLogin` ke fungsi `doGet()` pada kode Apps Script template GuruLive, menghasilkan properti `masterLogin` dalam bundle JSON utama.
  - *Alasan*: Pengambilan data terpadu dalam 1 round-trip fetch yang sudah ada (tidak menambah latency request jaringan tambahan).
  - *Alternatif yang Ditinggalkan*: Request HTTP POST terpisah ke Apps Script untuk setiap ketukan login (lebih lambat karena cold-start Apps Script rata-rata 1–2 detik).

- **Keputusan 2: Keamanan & Fallback Offline**:
  - *Pendekatan*: Selain memvalidasi akun dari sheet `MasterLogin`, sistem menyediakan 1 akun superadmin fallback bawaan (misal: `admin` / `admin123` atau akun inisial) agar administrator tidak terkunci jika URL spreadsheet belum diset saat instalasi baru.
  - *Alasan*: Menjamin aplikasi tetap bisa dikonfigurasi pertama kali pada deployment baru di Vercel/GitHub.

---

## 4. Technical Architecture & Data Strategy

### 4.1 Diagram Alur Data & Komponen

```
┌────────────────────────────────────────────────────────┐
│               Google Spreadsheet Sekolah               │
│                                                        │
│  [MasterGuru] [MasterMapel] [Classes] [Jadwal] [Log]   │
│  [★ MasterLogin: Nama | Jabatan | Username | Password] │
└───────────────────────────┬────────────────────────────┘
                            │ (JSON Bundle via doGet)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Google Apps Script Web App Endpoint         │
└───────────────────────────┬────────────────────────────┘
                            │ fetchFromAppsScript()
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Aplikasi React                       │
│                                                        │
│  ┌────────────────────────┐  ┌──────────────────────┐  │
│  │   Global State (App)   │  │ localStorage Session │  │
│  │  - masterLoginAccounts │  │  - activeAdminUser   │  │
│  │  - currentAdminSession │  │    (Nama, Role, dll) │  │
│  └───────────┬────────────┘  └──────────┬───────────┘  │
│              │                          │              │
│              ▼                          ▼              │
│  ┌────────────────────────┐  ┌──────────────────────┐  │
│  │   TopNav Component     │  │ AdminLoginModal /    │  │
│  │  - Status Login Admin  │  │ AdminUrlModal        │  │
│  │  - Badge Nama & Role   │  │  - Form User & Pass  │  │
│  │  - Menu Logout         │  │  - Pengaturan URL    │  │
│  └────────────────────────┘  └──────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 4.2 Skema Data Entitas (TypeScript)
```typescript
export interface MasterLoginAccount {
  nama: string;
  jabatan: string;
  username: string;
  password: string; // Sesuai isi sheet
  role: string;     // e.g. 'Admin', 'Superadmin', 'Kepala Sekolah', 'Piket'
}

export interface AdminSession {
  username: string;
  nama: string;
  jabatan: string;
  role: string;
  loginAt: string;
}
```

### 4.3 Rincian Modifikasi File yang Akan Dikerjakan (Setelah Disetujui)
1. **`src/types.ts`**:
   - Menambahkan interface `MasterLoginAccount` dan `AdminSession`.
   - Menambahkan field `masterLogin?: MasterLoginAccount[]` pada `TapakDatabaseBundle`.
2. **`src/data/initialData.ts`**:
   - Menambahkan sampel akun default `INITIAL_MASTER_LOGIN` untuk mode offline / setup awal.
3. **`src/utils/appsScriptCode.ts`**:
   - Menambahkan fungsi parser untuk sheet `MasterLogin`.
   - Memperbarui dokumentasi/template Apps Script agar otomatis membaca tab sheet `MasterLogin` (kolom A: Nama, B: Jabatan, C: Username, D: Password, E: Role).
4. **`src/components/AdminUrlModal.tsx`**:
   - Mengganti input PIN dengan formulir **Username & Password**.
   - Menambahkan logika validasi akun terhadap daftar `masterLogin`.
   - Menambahkan tombol Logout dan info profil admin yang sedang login.
5. **`src/components/TopNav.tsx`**:
   - Menampilkan badge admin aktif (Nama & Jabatan/Role) dengan opsi klik untuk pengaturan atau logout.
6. **`src/App.tsx`**:
   - Menghubungkan state `adminSession` dengan `localStorage`.
   - Mengalirkan data `masterLogin` dari bundle data ke komponen admin dan navbar.
