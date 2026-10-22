# Rancangan Penambahan Tampilan Hari & Tanggal di Kotak Realtime Header

## 1. Ringkasan Perubahan
Menambahkan teks **Hari dan Tanggal KBM** (contoh: `Kamis, 22-Okt-2026`) secara langsung di dalam kotak status **Realtime** pada sub-header `TopNav.tsx`, diletakkan tepat di sebelah kanan indikator waktu WIB.

---

## 2. Rincian Perubahan Kode

### A. Komponen Navigasi Utama (`src/components/TopNav.tsx`)
1. **Penambahan Props**:
   - Menambahkan prop `selectedDate?: string` dan `dayNameIndo?: string` pada `TopNavProps`.
2. **Penyesuaian Kotak Realtime Status**:
   - Di dalam wadah `Realtime` sub-header, menambahkan pemisah titik (`·`) dan elemen teks yang menampilkan `dayNameIndo` serta `selectedDate`:
     ```tsx
     {/* Jam Realtime WIB Digital & Hari / Tanggal */}
     <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-0.5 rounded-md border border-emerald-500/40 shadow-inner shrink-0">
       <span className="relative flex h-2 w-2">
         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
         <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
       </span>
       <span className="text-slate-400 text-[10px] font-normal hidden min-[480px]:inline">Realtime:</span>
       <span className="text-emerald-400 font-mono font-black tracking-wider text-xs">
         {wibTime}
       </span>
       <span className="text-slate-600 font-mono text-xs">·</span>
       <span className="text-emerald-300 font-mono font-bold text-xs">
         {dayNameIndo}, {selectedDate}
       </span>
     </div>
     ```

### B. Komponen Utama (`src/App.tsx`)
- Meneruskan prop `selectedDate={selectedDate}` dan `dayNameIndo={dayNameIndo}` ke pemanggilan `<TopNav ... />`.

---

## 3. Rencana Verifikasi
1. Menjalankan `lint_applet` (`tsc --noEmit`) untuk memastikan variabel dan tipe props sesuai.
2. Menjalankan `compile_applet` untuk memastikan aplikasi terkompilasi tanpa error.
