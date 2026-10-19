import React from 'react';
import { 
  ScheduleItem, 
  AttendanceLogItem, 
  MasterGuru, 
  MasterMapel, 
  ClassMaster 
} from '../types';
import { normalizeClassName, getDayNameIndonesian, isSameDate, isSampleEntity } from '../utils/appsScriptCode';
import { 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  User 
} from 'lucide-react';

export interface UnconfirmedClassItem {
  id: string;
  namaKelas: string;
  kodeMapel: string;
  namaMapel: string;
  kodeGuru: string;
  namaGuru: string;
  ruang: string;
  period: number;
  jamKeDisplay?: string;
}

interface UnconfirmedClassesSectionProps {
  schedules: ScheduleItem[];
  attendanceLogs: AttendanceLogItem[];
  masterGuru: MasterGuru[];
  masterMapel: MasterMapel[];
  classes: ClassMaster[];
  activePeriodNumber: number;
  selectedDate: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelectClass: (className: string) => void;
  selectedGrade?: 'all' | 'VII' | 'VIII' | 'IX';
  onSelectGrade?: (grade: 'all' | 'VII' | 'VIII' | 'IX') => void;
}

export function getGradeFromClassName(className: string): 'VII' | 'VIII' | 'IX' | 'other' {
  if (!className) return 'other';
  const upper = className.toUpperCase().replace(/^KELAS\s+/i, '').trim();
  const norm = normalizeClassName(className).toUpperCase();

  // 1. Cek VIII (Tingkat 8) terlebih dahulu agar string 'VIII' tidak terdeteksi sebagai 'VII'
  if (upper.startsWith('VIII') || norm.includes('VIII') || norm.includes('KLS-08') || norm.includes('KLS-8') || norm.includes('08')) {
    return 'VIII';
  }
  // 2. Cek VII (Tingkat 7)
  if (upper.startsWith('VII') || norm.includes('VII') || norm.includes('KLS-07') || norm.includes('KLS-7') || norm.includes('07')) {
    return 'VII';
  }
  // 3. Cek IX (Tingkat 9)
  if (upper.startsWith('IX') || norm.includes('IX') || norm.includes('KLS-09') || norm.includes('KLS-9') || norm.includes('09')) {
    return 'IX';
  }

  return 'other';
}

export const UnconfirmedClassesSection: React.FC<UnconfirmedClassesSectionProps> = ({
  schedules,
  attendanceLogs,
  masterGuru,
  masterMapel,
  classes,
  activePeriodNumber,
  selectedDate,
  isExpanded,
  onToggleExpand,
  onSelectClass,
  selectedGrade = 'all',
  onSelectGrade,
}) => {
  const dayNameIndo = React.useMemo(() => getDayNameIndonesian(selectedDate), [selectedDate]);

  // Lookup maps for O(1) resolution
  const teachersMap = React.useMemo(() => {
    const map: Record<string, MasterGuru> = {};
    masterGuru.forEach(g => {
      if (g.kodeGuru) map[g.kodeGuru] = g;
    });
    return map;
  }, [masterGuru]);

  const subjectsMap = React.useMemo(() => {
    const map: Record<string, MasterMapel> = {};
    masterMapel.forEach(m => {
      if (m.kodeMapel) map[m.kodeMapel] = m;
    });
    return map;
  }, [masterMapel]);

  const classesMap = React.useMemo(() => {
    const map: Record<string, ClassMaster> = {};
    classes.forEach(c => {
      if (c.namaKelas) {
        map[c.namaKelas] = c;
        map[normalizeClassName(c.namaKelas)] = c;
      }
    });
    return map;
  }, [classes]);

  // Log presensi hari ini
  const logsToday = React.useMemo(() => {
    return attendanceLogs.filter(l => isSameDate(l.tanggal, selectedDate));
  }, [attendanceLogs, selectedDate]);

  // Evaluasi apakah waktu WIB saat ini sudah melewati jam selesai KBM (14:00 WIB)
  const isAfterSchool = React.useMemo(() => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const wibHours = (utcHours + 7) % 24;
    const currentMinutesTotal = wibHours * 60 + utcMinutes;
    return currentMinutesTotal >= 14 * 60; // Pukul 14:00 WIB ke atas
  }, []);

  // Jadwal aktif & belum terkonfirmasi untuk hari terpilih (Dedup 1 Kartu per Sesi Mengajar Multi-Period)
  const { activeUnconfirmed, passedUnconfirmed } = React.useMemo(() => {
    const activeItems: UnconfirmedClassItem[] = [];
    const passedItems: UnconfirmedClassItem[] = [];

    const daySchedules = schedules.filter(s => s.hari.toLowerCase() === dayNameIndo.toLowerCase());

    if (daySchedules.length > 0) {
      daySchedules.forEach(sched => {
        const normSchedClass = normalizeClassName(sched.namaKelas);
        const teacher = teachersMap[sched.kodeGuru];
        const subject = subjectsMap[sched.kodeMapel];
        const classMaster = classesMap[sched.namaKelas] || classesMap[normSchedClass];

        // Abaikan guru/mapel/kelas contoh dari kotak kelas belum terkonfirmasi
        if (isSampleEntity({
          kodeGuru: sched.kodeGuru,
          namaGuru: teacher?.namaLengkap,
          kodeMapel: sched.kodeMapel,
          namaMapel: subject?.namaMapel,
          namaKelas: sched.namaKelas,
        })) {
          return;
        }

        // Cek apakah sudah ada catatan presensi untuk sesi mengajar ini
        const hasAttendance = logsToday.some(log => {
          const normLogClass = normalizeClassName(log.kelas);
          if (normLogClass !== normSchedClass) return false;

          // Cocokkan jika log presensi dinaungi oleh jadwal ini (jam/mapel/guru)
          if (log.periods && sched.periods && log.periods.some(p => sched.periods.includes(p))) return true;
          if (log.mapelKe && sched.mapelKe && Number(log.mapelKe) === Number(sched.mapelKe)) return true;
          if (log.startPeriod && log.endPeriod && sched.periods.some(p => p >= log.startPeriod! && p <= log.endPeriod!)) return true;
          if (log.kodeGuru && sched.kodeGuru && log.kodeGuru.toLowerCase() === sched.kodeGuru.toLowerCase()) return true;

          return false;
        });

        // HANYA jika guru/kelas ini BELUM mengisi presensi (data absen tidak ada di AttendanceLogs)
        if (!hasAttendance) {
          const item: UnconfirmedClassItem = {
            id: `unconf-${sched.namaKelas}-${sched.kodeGuru}-${sched.jamKe}`,
            namaKelas: sched.namaKelas,
            kodeMapel: sched.kodeMapel || '-',
            namaMapel: subject?.namaMapel || sched.kodeMapel || 'Mata Pelajaran',
            kodeGuru: sched.kodeGuru,
            namaGuru: teacher?.namaLengkap || sched.kodeGuru,
            ruang: classMaster?.lokasiRuang || `R. ${sched.namaKelas}`,
            period: sched.startPeriod,
            jamKeDisplay: `Jam ${sched.jamKe}`,
          };

          // KATEGORISASI:
          // 1. Jika waktu sudah > 14:00 WIB (isAfterSchool), SEMUA kelas belum terkonfirmasi masuk ke 'passedUnconfirmed'
          if (isAfterSchool) {
            if (!passedItems.some(i => i.id === item.id)) {
              passedItems.push(item);
            }
          } else {
            // 2. Jika waktu KBM aktif:
            if (sched.periods.includes(activePeriodNumber)) {
              if (!activeItems.some(i => i.id === item.id)) {
                activeItems.push(item); // Jam Mengajar Berjalan (1 Kartu Tunggal)
              }
            } else if (sched.endPeriod < activePeriodNumber) {
              if (!passedItems.some(i => i.id === item.id)) {
                passedItems.push(item); // Jam Mengajar Terlewat
              }
            }
          }
        }
      });
    } else {
      // Fallback
      classes.forEach(cls => {
        const normClass = normalizeClassName(cls.namaKelas);
        const hasLog = logsToday.some(l => normalizeClassName(l.kelas) === normClass);
        if (!hasLog) {
          const fallbackItem: UnconfirmedClassItem = {
            id: `unconf-${cls.namaKelas}-fallback`,
            namaKelas: cls.namaKelas,
            kodeMapel: '-',
            namaMapel: 'Belum Terjadwal',
            kodeGuru: '-',
            namaGuru: 'Belum Terjadwal',
            ruang: cls.lokasiRuang,
            period: activePeriodNumber,
            jamKeDisplay: `Jam ${activePeriodNumber}`,
          };
          if (isAfterSchool) {
            passedItems.push(fallbackItem);
          } else {
            activeItems.push(fallbackItem);
          }
        }
      });
    }

    let filteredActive = activeItems;
    let filteredPassed = passedItems;

    if (selectedGrade && selectedGrade !== 'all') {
      filteredActive = activeItems.filter(item => getGradeFromClassName(item.namaKelas) === selectedGrade);
      filteredPassed = passedItems.filter(item => getGradeFromClassName(item.namaKelas) === selectedGrade);
    }

    const sortFn = (a: UnconfirmedClassItem, b: UnconfirmedClassItem) => 
      a.namaKelas.localeCompare(b.namaKelas, undefined, { numeric: true, sensitivity: 'base' });

    return {
      activeUnconfirmed: filteredActive.sort(sortFn),
      passedUnconfirmed: filteredPassed.sort(sortFn),
    };
  }, [schedules, dayNameIndo, activePeriodNumber, logsToday, teachersMap, subjectsMap, classesMap, classes, isAfterSchool, selectedGrade]);

  const totalCount = activeUnconfirmed.length + passedUnconfirmed.length;

  const renderCardGrid = (items: UnconfirmedClassItem[], isPassedGroup = false) => (
    <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1 sm:gap-1.5">
      {items.map(item => (
        <div
          key={item.id}
          onClick={() => onSelectClass(item.namaKelas)}
          title={`Klik untuk sorot kelas ${item.namaKelas} pada matriks.\nGuru: ${item.namaGuru}\nMapel: ${item.namaMapel} (${item.kodeMapel})\nJadwal: ${item.jamKeDisplay || `Jam ${item.period}`}`}
          className={`group p-1 px-1.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between shadow-2xs ${
            isPassedGroup 
              ? 'bg-amber-50/60 hover:bg-amber-100/80 border-amber-200/90 hover:border-amber-400' 
              : 'bg-white hover:bg-rose-50/80 border-rose-200/90 hover:border-indigo-400'
          }`}
        >
          {/* Baris Atas: Nama Kelas, Rentang Jam, & Kode Mapel */}
          <div className="flex items-center justify-between gap-1 leading-tight">
            <span className={`text-[9.5px] font-bold font-mono px-1 py-0.2 rounded border truncate ${
              isPassedGroup 
                ? 'text-amber-800 bg-amber-100/80 border-amber-300' 
                : 'text-rose-700 bg-rose-50 border-rose-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-200'
            }`}>
              {item.namaKelas} <span className="text-[8px] font-normal font-sans opacity-90">({item.jamKeDisplay || `Jam ${item.period}`})</span>
            </span>
            <span className="text-[8px] font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded shrink-0 border border-slate-200 truncate" title={item.namaMapel}>
              {item.kodeMapel}
            </span>
          </div>

          {/* Baris Bawah: Nama Guru */}
          <div className="flex items-center gap-0.5 mt-0.5 text-slate-700 group-hover:text-indigo-900 transition-colors">
            <User className="w-2.5 h-2.5 text-slate-400 shrink-0 group-hover:text-indigo-600" />
            <span className="text-[9px] font-medium truncate" title={item.namaGuru}>
              {item.namaGuru}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="mb-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
      {/* Header Panel: Judul, Jumlah Ruang, & Tombol Ciutkan/Buka */}
      <div 
        onClick={onToggleExpand}
        className="flex items-center justify-between px-3 py-1.5 sm:py-2 bg-gradient-to-r from-slate-50 via-rose-50/40 to-slate-50 border-b border-slate-200 cursor-pointer select-none transition-colors hover:bg-rose-50/60"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="p-0.5 rounded-md bg-rose-100 text-rose-700">
              <AlertCircle className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-800">
              Kelas Belum Terkonfirmasi
            </span>
          </div>

          {/* Badge Jumlah Ruang Belum Terisi */}
          <span className={`px-2 py-0.2 rounded-full text-[10px] sm:text-[11px] font-mono font-bold border transition-colors ${
            totalCount > 0 
              ? 'bg-rose-100/80 text-rose-800 border-rose-300 animate-pulse' 
              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}>
            {totalCount > 0 ? `${totalCount} Ruang Belum Terisi` : 'Semua Terisi (0 Ruang)'}
          </span>

          <span className="text-[10px] text-slate-500 hidden sm:inline">
            (Aktif: {activeUnconfirmed.length} · Terlewat: {passedUnconfirmed.length})
          </span>
        </div>

        {/* Tombol Ciutkan / Buka */}
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
          <span className="hidden sm:inline">
            {isExpanded ? 'Ciutkan Kotak' : 'Buka Kotak'}
          </span>
          <button 
            type="button"
            className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-700 transition-colors"
            title={isExpanded ? 'Ciutkan panel kelas belum terkonfirmasi' : 'Buka panel kelas belum terkonfirmasi'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Konten Kotak Kelas Belum Terkonfirmasi (Dipecah 2 Bagian: Jam Berjalan & Jam Terlewat) */}
      {isExpanded && (
        <div className="p-2 bg-slate-50/40 space-y-2.5">
          {totalCount === 0 ? (
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">
                Alhamdulillah! Seluruh kelas pada Jam ke-{activePeriodNumber} dan jam sebelumnya telah terkonfirmasi.
              </span>
            </div>
          ) : (
            <>
              {/* BAGIAN ATAS: KELAS BELUM TERKONFIRMASI PADA SESI MENGAJAR BERJALAN */}
              {activeUnconfirmed.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-1 text-[10.5px] font-bold text-rose-800">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                      <span>Sesi Mengajar Berjalan (Jam Ke-{activePeriodNumber}):</span>
                      <span className="text-[10px] font-mono text-rose-600 font-normal">({activeUnconfirmed.length} Kelas)</span>
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-normal hidden sm:inline">
                      Berisiran dengan Garis Waktu Sekarang
                    </span>
                  </div>
                  {renderCardGrid(activeUnconfirmed, false)}
                </div>
              )}

              {/* BAGIAN BAWAH: KELAS BELUM TERKONFIRMASI PADA SESI MENGAJAR TERLEWAT */}
              {passedUnconfirmed.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-slate-200/80">
                  <div className="flex items-center justify-between px-1 text-[10.5px] font-bold text-amber-800">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>Sesi Mengajar Terlewat (Jam Ke-1 s/d {activePeriodNumber - 1}):</span>
                      <span className="text-[10px] font-mono text-amber-700 font-normal">({passedUnconfirmed.length} Kelas)</span>
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-normal hidden sm:inline">
                      Sudah Terlampaui Garis Waktu Sesi Sebelumnya
                    </span>
                  </div>
                  {renderCardGrid(passedUnconfirmed, true)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
