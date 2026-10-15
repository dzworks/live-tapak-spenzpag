import React from 'react';
import { 
  ScheduleItem, 
  AttendanceLogItem, 
  MasterGuru, 
  MasterMapel, 
  ClassMaster 
} from '../types';
import { normalizeClassName, getDayNameIndonesian } from '../utils/appsScriptCode';
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
    return attendanceLogs.filter(l => l.tanggal === selectedDate);
  }, [attendanceLogs, selectedDate]);

  // Jadwal aktif di jam ini untuk hari terpilih
  const unconfirmedClasses = React.useMemo(() => {
    const activeSchedules = schedules.filter(s => 
      s.hari.toLowerCase() === dayNameIndo.toLowerCase() && 
      s.periods.includes(activePeriodNumber)
    );

    const items: UnconfirmedClassItem[] = [];

    if (activeSchedules.length > 0) {
      activeSchedules.forEach(sched => {
        const normSchedClass = normalizeClassName(sched.namaKelas);
        
        // Cek apakah sudah ada catatan presensi untuk kelas ini di jam aktif
        const hasAttendance = logsToday.some(log => {
          const normLogClass = normalizeClassName(log.kelas);
          if (normLogClass !== normSchedClass) return false;

          // Cocokkan periode jam atau guru terjadwal
          if (log.periods && log.periods.includes(activePeriodNumber)) return true;
          if (log.mapelKe && log.mapelKe === sched.mapelKe) return true;
          if (log.startPeriod && log.endPeriod && activePeriodNumber >= log.startPeriod && activePeriodNumber <= log.endPeriod) return true;
          if (log.kodeGuru && log.kodeGuru === sched.kodeGuru) return true;
          
          return false;
        });

        // Jika belum ada presensi, masukkan ke daftar belum terkonfirmasi
        if (!hasAttendance) {
          const teacher = teachersMap[sched.kodeGuru];
          const subject = subjectsMap[sched.kodeMapel];
          const classMaster = classesMap[sched.namaKelas] || classesMap[normSchedClass];

          items.push({
            id: `unconf-${sched.namaKelas}-${sched.kodeGuru}-${activePeriodNumber}`,
            namaKelas: sched.namaKelas,
            kodeMapel: sched.kodeMapel || '-',
            namaMapel: subject?.namaMapel || sched.kodeMapel || 'Mata Pelajaran',
            kodeGuru: sched.kodeGuru,
            namaGuru: teacher?.namaLengkap || sched.kodeGuru,
            ruang: classMaster?.lokasiRuang || `R. ${sched.namaKelas}`,
            period: activePeriodNumber,
          });
        }
      });
    } else {
      // Fallback jika database jadwal belum terisi untuk hari ini
      classes.forEach(cls => {
        const normClass = normalizeClassName(cls.namaKelas);
        const hasLog = logsToday.some(l => 
          normalizeClassName(l.kelas) === normClass && 
          (l.periods ? l.periods.includes(activePeriodNumber) : true)
        );
        if (!hasLog) {
          items.push({
            id: `unconf-${cls.namaKelas}-fallback`,
            namaKelas: cls.namaKelas,
            kodeMapel: '-',
            namaMapel: 'Belum Terjadwal',
            kodeGuru: '-',
            namaGuru: 'Belum Terjadwal',
            ruang: cls.lokasiRuang,
            period: activePeriodNumber,
          });
        }
      });
    }

    // Urutkan berdasarkan nama kelas (VII-A, VII-B, dst)
    return items.sort((a, b) => a.namaKelas.localeCompare(b.namaKelas, undefined, { numeric: true, sensitivity: 'base' }));
  }, [schedules, dayNameIndo, activePeriodNumber, logsToday, teachersMap, subjectsMap, classesMap, classes]);

  const count = unconfirmedClasses.length;

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
            count > 0 
              ? 'bg-rose-100/80 text-rose-800 border-rose-300 animate-pulse' 
              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}>
            {count > 0 ? `${count} Ruang Belum Terisi` : 'Semua Terisi (0 Ruang)'}
          </span>

          <span className="text-[10px] text-slate-500 hidden sm:inline">
            (Jam ke-{activePeriodNumber})
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

      {/* Konten Kotak Kelas Belum Terkonfirmasi (Micro Grid Tanpa Scroll, Seukuran Kotak Guru Izin) */}
      {isExpanded && (
        <div className="p-1.5 sm:p-2 bg-slate-50/40">
          {count === 0 ? (
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">
                Alhamdulillah! Seluruh kelas pada Jam ke-{activePeriodNumber} sudah terkonfirmasi hadir di presensi.
              </span>
            </div>
          ) : (
            <>
              {/* Petunjuk Aksi Singkat */}
              <div className="flex items-center justify-between mb-1 px-1 text-[10px] text-slate-500">
                <span>Klik kartu untuk sorot kelas di matriks KBM:</span>
                <span className="text-[9.5px] text-slate-400 font-mono hidden sm:inline">
                  {count} dari {classes.length} kelas belum absen
                </span>
              </div>

              {/* Grid Mikro Tanpa Scroll: Seukuran Kotak Guru Izin, Muat Semua Kotak */}
              <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1 sm:gap-1.5">
                {unconfirmedClasses.map(item => (
                  <div
                    key={item.id}
                    onClick={() => onSelectClass(item.namaKelas)}
                    title={`Klik untuk sorot kelas ${item.namaKelas} pada matriks.\nGuru: ${item.namaGuru}\nMapel: ${item.namaMapel} (${item.kodeMapel})`}
                    className="group p-1 px-1.5 rounded-lg bg-white hover:bg-rose-50/80 border border-rose-200/90 hover:border-indigo-400 cursor-pointer transition-all flex flex-col justify-between shadow-2xs"
                  >
                    {/* Baris Atas: Nama Kelas & Kode Mapel */}
                    <div className="flex items-center justify-between gap-1 leading-tight">
                      <span className="text-[9.5px] font-bold font-mono text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-200 truncate">
                        {item.namaKelas}
                      </span>
                      <span className="text-[8px] font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded shrink-0 border border-slate-200 truncate" title={item.namaMapel}>
                        {item.kodeMapel}
                      </span>
                    </div>

                    {/* Baris Bawah: Nama Guru (Kompak Seukuran Baris Guru Izin) */}
                    <div className="flex items-center gap-0.5 mt-0.5 text-slate-700 group-hover:text-indigo-900 transition-colors">
                      <User className="w-2.5 h-2.5 text-slate-400 shrink-0 group-hover:text-indigo-600" />
                      <span className="text-[9px] font-medium truncate" title={item.namaGuru}>
                        {item.namaGuru}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
