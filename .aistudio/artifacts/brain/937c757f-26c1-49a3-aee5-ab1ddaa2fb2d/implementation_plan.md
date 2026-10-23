# Rencana Implementasi Perubahan Pratinjau WhatsApp Laporan KBM

Meningkatkan dan menyelaraskan format pratinjau pesan WhatsApp untuk **Laporan Rekapitulasi KBM TAPAK Live** di komponen `ReportWorkspace.tsx` sesuai dengan preferensi dan arahan pengguna.

---

## 1. Pembaruan Tata Letak & Template Teks WhatsApp (`waMessageText`)

Atur ulang variabel `waMessageText` dalam `ReportWorkspace.tsx` dengan struktur:

```text
📊 *LAPORAN REKAPITULASI KBM TAPAK LIVE*
🗓 *Periode*: [Periode Laporan]
🎓 *Periode Akademik*: [Awal] s/d [Akhir] ([Tahun Ajaran])
📅 *Hari Efektif KBM*: [ActiveDays] Hari Aktif ([HolidayDays] Libur/ KBM non efektif)
----------------------------------------
✅ *Sesi Hadir/Mengajar*: [PresentCount] Sesi ([PresencePercent]%)
📱 *% Keterlibatan Guru (Input Mandiri)*: [FilledAppCount] / [TotalSessions] Sesi ([AppCompliancePercent]%)
⚠️ *Guru Izin / Sakit / Dinas*: [LeaveCount] Sesi
🔴 *Belum Diisi Absensi*: [UnconfirmedCount] Sesi
----------------------------------------
📋 *CATATAN GURU IZIN/SAKIT*:
[Daftar Ringkas Guru Izin/Sakit]
----------------------------------------
_Diunduh & disinkronkan otomatis dari Sistem TAPAK Live Monitoring_
```

---

## 2. Pengelompokan & Pengformatan Cerdas Catatan Guru Izin/Sakit

Memperbarui logika pemrosesan `leaveTeachersList` agar:
- **Pengelompokan Pintar**:
  - Menggabungkan sesi dengan **Guru yang sama**, **Status & Alasan yang sama**, dan **Hari/Tanggal yang sama**.
  - Daftar kelas digabungkan menjadi satu baris (contoh: `IX-F, IX-B, VII-H`).
  - Apabila terjadi pada hari yang berbeda, dipisahkan per baris dan menyertakan nama hari/tanggal.
- **Emoji Indikator Status**:
  - 🏥 **Sakit**: `🏥 Sakit: [Keterangan]`
  - 📝 **Izin / Keperluan Pribadi**: `📝 Keperluan Pribadi: [Keterangan]`
  - 💼 **Dinas Luar / Instruksi Pimpinan**: `💼 Dinas Luar: [Keterangan]`
  - ⚠️ **Lainnya**: `⚠️ [Status]: [Keterangan]`
- **Contoh Output Baris**:
  `- 📝 Nurlaela, S.Pd. (IX-F, IX-B, VII-H · Keperluan Pribadi: Melayat orang tua)`
  `- 🏥 Ahmad Subardjo, S.Pd. (Senin, VII-A, VII-B · Sakit: Demam tinggi)`
  `- 🏥 Ahmad Subardjo, S.Pd. (Rabu, VIII-C · Sakit: Demam tinggi)`

---

## 3. Pengujian & Verifikasi

1. Menjalankan `lint_applet` untuk memastikan tidak ada kesalahan TypeScript/Syntax.
2. Menjalankan `compile_applet` untuk memverifikasi proses build aplikasi.
3. Memastikan kasus tanpa guru izin menampilkan status fallback `- Nihil (Seluruh guru KBM mengajar penuh)`.
