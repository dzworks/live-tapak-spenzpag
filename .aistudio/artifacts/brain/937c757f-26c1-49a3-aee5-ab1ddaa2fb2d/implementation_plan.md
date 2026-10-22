# Rancangan Penyesuaian DetailModal Presensi KBM

## 1. Ringkasan Perubahan
1. **Menghilangkan Tombol Cetak**: Menghapus tampilan dan fungsi tombol *"Cetak Lembar Presensi"* pada bagian footer modal detail sesi KBM (`DetailModal.tsx`).
2. **Menampilkan Informasi Penginputan Piket**: Menambahkan kartu informasi khusus pada `DetailModal.tsx` yang secara otomatis muncul jika data presensi diinput dari agenda kelas/piket (bukan presensi mandiri guru), dengan rincian:
   - Status Indikator: **Diisi oleh Guru Piket**
   - **Sumber Data**: `Agenda Kelas`, `Guru Piket`, `Siswa`, dll.
   - **Nama Penginput**: Nama/Username petugas piket yang mencatat data.

---

## 2. Rincian Perubahan Kode (`src/components/DetailModal.tsx`)

1. **Penghapusan Tombol Cetak**:
   - Menghapus elemen `<button onClick={() => window.print()}>` beserta ikon `<Printer />` di bagian footer modal.
   - Merapikan posisi tombol *"Tutup"* menjadi berada di sebelah kanan (`justify-end`).

2. **Penambahan Kartu Informasi Penginputan Piket**:
   - Menambahkan blok visual baru sebelum ID Log:
     ```tsx
     {/* Kartu Informasi Penginputan Piket (Muncul jika Sumber Data bukan Presensi Mandiri) */}
     {attendance && isPiketRecord && (
       <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 space-y-1">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
             <UserCheck className="w-4 h-4 text-indigo-600" />
             <span>Diisi oleh Guru Piket</span>
           </div>
           <span className="text-[10px] font-mono font-bold bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-full border border-indigo-300/60">
             Mode Piket
           </span>
         </div>
         <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-indigo-200/60 mt-1">
           <div>
             <span className="text-slate-500 text-[10.5px] block font-medium">Sumber Data:</span>
             <span className="font-bold text-slate-800">{attendance.sumberData || 'Agenda Kelas'}</span>
           </div>
           <div>
             <span className="text-slate-500 text-[10.5px] block font-medium">Nama Penginput:</span>
             <span className="font-bold text-slate-800">{attendance.penginputData || attendance.diinputOleh || 'Petugas Piket'}</span>
           </div>
         </div>
       </div>
     )}
     ```
   - Di mana `isPiketRecord` mengidentifikasi apakah record berasal dari piket (misal: `sumberData` mengandung 'Agenda', 'Piket', 'Siswa', atau `idKiriman` berakhiran `PIKET`).

---

## 3. Rencana Verifikasi
- Menjalankan `lint_applet` (`tsc --noEmit`) untuk memastikan tidak ada kesalahan variabel/tipe.
- Menjalankan `compile_applet` untuk memverifikasi aplikasi berhasil dikompilasi.
