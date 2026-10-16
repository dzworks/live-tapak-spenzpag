import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, UserX, CheckCircle2, Clock, CalendarX, AlertCircle, Filter, BookOpen } from 'lucide-react';
import { MasterGuru, ScheduleItem, AttendanceLogItem } from '../types';
import { isSampleEntity } from '../utils/appsScriptCode';

export type TeacherStatusTab = 'all' | 'izin' | 'belumKonfirmasi' | 'nonJadwal' | 'hadir';

interface TeacherStatusDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TeacherStatusTab;
  masterGuru: MasterGuru[];
  schedulesToday: ScheduleItem[];
  logsToday: AttendanceLogItem[];
  selectedDate: string;
}

export interface TeacherDetailRow {
  kodeGuru: string;
  namaLengkap: string;
  nip?: string;
  statusCategory: 'hadir' | 'izin' | 'belumKonfirmasi' | 'nonJadwal';
  statusLabel: string;
  badgeClass: string;
  alasan: string;
  jadwalText: string;
  hasScheduleToday: boolean;
}

export const TeacherStatusDetailModal: React.FC<TeacherStatusDetailModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'izin',
  masterGuru,
  schedulesToday,
  logsToday,
}) => {
  const [activeTab, setActiveTab] = useState<TeacherStatusTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sinkronisasi tab awal saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
    }
  }, [isOpen, initialTab]);

  // Listener tombol ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Kalkulasi data guru terperinci
  const teacherRows = useMemo<TeacherDetailRow[]>(() => {
    // 1. Filter masterGuru non-sample
    const activeMaster = masterGuru.filter(
      g => !isSampleEntity({ kodeGuru: g.kodeGuru, namaGuru: g.namaLengkap })
    );

    // Map jadwal hari ini per kode guru
    const scheduleByGuru: Record<string, ScheduleItem[]> = {};
    schedulesToday.forEach(sched => {
      if (!sched.kodeGuru) return;
      if (!scheduleByGuru[sched.kodeGuru]) {
        scheduleByGuru[sched.kodeGuru] = [];
      }
      scheduleByGuru[sched.kodeGuru].push(sched);
    });

    // Map log presensi hari ini per kode guru
    const logsByGuru: Record<string, AttendanceLogItem[]> = {};
    logsToday.forEach(log => {
      if (!log.kodeGuru) return;
      if (!logsByGuru[log.kodeGuru]) {
        logsByGuru[log.kodeGuru] = [];
      }
      logsByGuru[log.kodeGuru].push(log);
    });

    return activeMaster.map(guru => {
      const kode = guru.kodeGuru;
      const nama = guru.namaLengkap || kode || 'Guru';
      const guruSchedules = scheduleByGuru[kode] || [];
      const guruLogs = logsByGuru[kode] || [];
      const hasScheduleToday = guruSchedules.length > 0;

      // Format string ringkasan jadwal mengajar hari ini
      const jadwalText = hasScheduleToday
        ? guruSchedules
            .map(s => `${s.namaKelas} (JP ${s.jamKe || `${s.startPeriod}-${s.endPeriod}`})`)
            .join(', ')
        : 'Tidak Ada Jadwal';

      // 1) Cek log perizinan / ketidakhadiran
      const leaveLog = guruLogs.find(l => l.statusKehadiran && l.statusKehadiran !== 'Hadir');

      if (leaveLog) {
        const statusRaw = leaveLog.statusKehadiran;
        const stLower = statusRaw.toLowerCase();
        let badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
        
        if (stLower.includes('sakit')) {
          badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
        } else if (stLower.includes('pribadi') || stLower.includes('izin')) {
          badgeClass = 'bg-rose-100 text-rose-900 border-rose-300';
        } else if (stLower.includes('dinas')) {
          badgeClass = 'bg-sky-100 text-sky-900 border-sky-300';
        } else if (stLower.includes('instruksi') || stLower.includes('pimpinan')) {
          badgeClass = 'bg-violet-100 text-violet-900 border-violet-300';
        }

        const alasan = leaveLog.infoKetidakhadiran || leaveLog.kegiatanPembelajaran || `Izin Resmi (${statusRaw})`;

        return {
          kodeGuru: kode,
          namaLengkap: nama,
          nip: guru.nip,
          statusCategory: 'izin',
          statusLabel: statusRaw,
          badgeClass,
          alasan,
          jadwalText,
          hasScheduleToday,
        };
      }

      // 2) Cek log kehadiran 'Hadir'
      const presentLog = guruLogs.find(l => l.statusKehadiran === 'Hadir');
      if (presentLog) {
        return {
          kodeGuru: kode,
          namaLengkap: nama,
          nip: guru.nip,
          statusCategory: 'hadir',
          statusLabel: 'Ada Guru (Hadir)',
          badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          alasan: `Presensi KBM di kelas ${presentLog.kelas || 'Aktif'} (${presentLog.waktuAbsen || 'Hadir'})`,
          jadwalText,
          hasScheduleToday,
        };
      }

      // 3) Jika tidak ada log sama sekali
      if (hasScheduleToday) {
        // Punya jadwal tapi belum mengabsen sekalipun = Belum Konfirmasi
        return {
          kodeGuru: kode,
          namaLengkap: nama,
          nip: guru.nip,
          statusCategory: 'belumKonfirmasi',
          statusLabel: 'Belum Konfirmasi',
          badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
          alasan: 'Belum mengisi presensi KBM hari ini',
          jadwalText,
          hasScheduleToday: true,
        };
      } else {
        // Tidak punya jadwal mengajar hari ini = Tidak Ada Jadwal (Non-Jadwal)
        return {
          kodeGuru: kode,
          namaLengkap: nama,
          nip: guru.nip,
          statusCategory: 'nonJadwal',
          statusLabel: 'Tidak Ada Jadwal',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
          alasan: 'Tidak ada jadwal mengajar pada hari ini',
          jadwalText: '-',
          hasScheduleToday: false,
        };
      }
    });
  }, [masterGuru, schedulesToday, logsToday]);

  // Hitung angka di masing-masing kriteria
  const counts = useMemo(() => {
    let izin = 0;
    let belumKonfirmasi = 0;
    let nonJadwal = 0;
    let hadir = 0;

    teacherRows.forEach(r => {
      if (r.statusCategory === 'izin') izin++;
      else if (r.statusCategory === 'belumKonfirmasi') belumKonfirmasi++;
      else if (r.statusCategory === 'nonJadwal') nonJadwal++;
      else if (r.statusCategory === 'hadir') hadir++;
    });

    return {
      all: teacherRows.length,
      izin,
      belumKonfirmasi,
      nonJadwal,
      hadir,
    };
  }, [teacherRows]);

  // Sorting default untuk tabel (diutamakan: 1. Izin, 2. Belum Konfirmasi, 3. Non Jadwal, 4. Hadir)
  const sortedAndFilteredRows = useMemo(() => {
    let list = teacherRows;

    // Filter Berdasarkan Tab Aktif
    if (activeTab === 'izin') {
      list = list.filter(r => r.statusCategory === 'izin');
    } else if (activeTab === 'belumKonfirmasi') {
      list = list.filter(r => r.statusCategory === 'belumKonfirmasi');
    } else if (activeTab === 'nonJadwal') {
      list = list.filter(r => r.statusCategory === 'nonJadwal');
    } else if (activeTab === 'hadir') {
      list = list.filter(r => r.statusCategory === 'hadir');
    }

    // Filter Berdasarkan Kata Kunci Pencarian Nama / Kode
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        r =>
          r.namaLengkap.toLowerCase().includes(q) ||
          r.kodeGuru.toLowerCase().includes(q) ||
          (r.nip && r.nip.toLowerCase().includes(q)) ||
          r.alasan.toLowerCase().includes(q) ||
          r.jadwalText.toLowerCase().includes(q)
      );
    }

    // Sort Urutan Status Sesuai Permintaan Spesifik:
    // 1. Izin
    // 2. Belum Konfirmasi
    // 3. Non Jadwal
    // 4. Hadir
    const categoryPriority: Record<string, number> = {
      izin: 1,
      belumKonfirmasi: 2,
      nonJadwal: 3,
      hadir: 4,
    };

    return [...list].sort((a, b) => {
      const prioA = categoryPriority[a.statusCategory] || 99;
      const priob = categoryPriority[b.statusCategory] || 99;
      if (prioA !== priob) return prioA - priob;
      return a.namaLengkap.localeCompare(b.namaLengkap);
    });
  }, [teacherRows, activeTab, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      {/* Container Modal */}
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">Detail Status Guru Hari Ini</h2>
              <p className="text-xs text-slate-400">
                Rincian status perizinan, konfirmasi KBM, dan jadwal mengajar guru
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Baris Tab Filter & Pencarian Nama (Urutan Tepat Sesuai Permintaan) */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          {/* Form Pencarian */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama guru, kode, mapel, atau alasan..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                Bersihkan
              </button>
            )}
          </div>

          {/* Tab Filter Button Strip (Urutan Sesuai Permintaan) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {/* 1. Tab Status Izin */}
            <button
              onClick={() => setActiveTab('izin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                activeTab === 'izin'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>1. Izin / Ketidakhadiran</span>
              <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                activeTab === 'izin' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {counts.izin}
              </span>
            </button>

            {/* 2. Tab Belum Konfirmasi */}
            <button
              onClick={() => setActiveTab('belumKonfirmasi')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                activeTab === 'belumKonfirmasi'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>2. Belum Konfirmasi</span>
              <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                activeTab === 'belumKonfirmasi' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {counts.belumKonfirmasi}
              </span>
            </button>

            {/* 3. Tab Non Jadwal */}
            <button
              onClick={() => setActiveTab('nonJadwal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                activeTab === 'nonJadwal'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <CalendarX className="w-3.5 h-3.5" />
              <span>3. Tidak Ada Jadwal</span>
              <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                activeTab === 'nonJadwal' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-800'
              }`}>
                {counts.nonJadwal}
              </span>
            </button>

            {/* 4. Tab Ada Guru */}
            <button
              onClick={() => setActiveTab('hadir')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                activeTab === 'hadir'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ada Guru (Hadir)</span>
              <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                activeTab === 'hadir' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {counts.hadir}
              </span>
            </button>

            {/* 5. Tab Semua Guru */}
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Semua Guru</span>
              <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                activeTab === 'all' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {counts.all}
              </span>
            </button>
          </div>
        </div>

        {/* Tabel Rincian Guru (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {sortedAndFilteredRows.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 my-4">
              <UserX className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Tidak ada data guru yang sesuai</p>
              <p className="text-xs text-slate-500 mt-1">
                Coba ubah kata kunci pencarian atau ganti kriteria tab filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Nama Guru & Kode</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Status Kehadiran</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Alasan / Keterangan</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Jadwal Mengajar Hari Ini</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {sortedAndFilteredRows.map((row, idx) => (
                    <tr 
                      key={row.kodeGuru}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Nomor Urut */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-medium">
                        {idx + 1}
                      </td>

                      {/* Nama & Kode Guru */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {row.namaLengkap}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 text-slate-700 font-bold">
                            {row.kodeGuru}
                          </span>
                          {row.nip && row.nip !== '-' && (
                            <span className="truncate">NIP: {row.nip}</span>
                          )}
                        </div>
                      </td>

                      {/* Status Kehadiran */}
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] ${row.badgeClass}`}>
                          {row.statusCategory === 'izin' && <AlertCircle className="w-3 h-3 shrink-0" />}
                          {row.statusCategory === 'belumKonfirmasi' && <Clock className="w-3 h-3 shrink-0" />}
                          {row.statusCategory === 'nonJadwal' && <CalendarX className="w-3 h-3 shrink-0" />}
                          {row.statusCategory === 'hadir' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                          <span>{row.statusLabel}</span>
                        </span>
                      </td>

                      {/* Alasan / Keterangan */}
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {row.alasan}
                      </td>

                      {/* Jadwal Mengajar Hari Ini */}
                      <td className="py-2.5 px-3 text-slate-600">
                        {row.hasScheduleToday ? (
                          <div className="flex items-center gap-1 font-mono text-[11px] text-indigo-900 bg-indigo-50/70 px-2 py-1 rounded-lg border border-indigo-100">
                            <BookOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span className="truncate">{row.jadwalText}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-4 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Menampilkan <strong className="font-mono text-slate-900">{sortedAndFilteredRows.length}</strong> dari <strong className="font-mono text-slate-900">{teacherRows.length}</strong> guru
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
