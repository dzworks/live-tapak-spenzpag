import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ClassMaster, 
  ScheduleItem, 
  MasterGuru, 
  MasterMapel, 
  AttendanceLogItem, 
  ResolvedScheduleSlot,
  SchoolClass,
  SlotColorStatus
} from '../types';
import { 
  getScheduleForDate, 
  getDayLabel, 
  getDayType 
} from '../data/initialData';
import { 
  getDayNameIndonesian, 
  resolveScheduleSlot,
  normalizeClassName,
  isSameDate
} from '../utils/appsScriptCode';
import { calculateSlotTimeMarker } from '../utils/timeMarker';
import { 
  Search,
  Maximize2,
  Minimize2,
  Clock,
  CalendarOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  ArrowUpDown,
  X,
  BellRing
} from 'lucide-react';

interface ClassroomMatrixProps {
  classes: ClassMaster[];
  schedules: ScheduleItem[];
  masterGuru: MasterGuru[];
  masterMapel: MasterMapel[];
  attendanceLogs: AttendanceLogItem[];
  activePeriodNumber: number;
  selectedDate: string;
  wibTimeStr: string;
  onSelectSlot: (slot: ResolvedScheduleSlot) => void;
  isUltraCompact?: boolean;
  onToggleDensity?: () => void;
  onSelectDateFallback?: (date: string) => void;
  highlightedClassName?: string | null;
  recentlyUpdatedClasses?: string[];
  selectedGrade?: 'all' | 'VII' | 'VIII' | 'IX';
  onSelectGrade?: (grade: 'all' | 'VII' | 'VIII' | 'IX') => void;
}

export type SortOption = 'default' | 'unattended-first' | 'name-asc' | 'room';

export const ClassroomMatrix: React.FC<ClassroomMatrixProps> = ({
  classes,
  schedules,
  masterGuru,
  masterMapel,
  attendanceLogs,
  activePeriodNumber,
  selectedDate,
  wibTimeStr,
  onSelectSlot,
  isUltraCompact = true,
  onToggleDensity,
  onSelectDateFallback,
  highlightedClassName,
  recentlyUpdatedClasses,
  selectedGrade: propSelectedGrade,
  onSelectGrade,
}) => {
  const [internalSelectedGrade, setInternalSelectedGrade] = useState<'all' | 'VII' | 'VIII' | 'IX'>('all');
  const selectedGrade = propSelectedGrade !== undefined ? propSelectedGrade : internalSelectedGrade;
  const setSelectedGrade = (g: 'all' | 'VII' | 'VIII' | 'IX') => {
    setInternalSelectedGrade(g);
    if (onSelectGrade) onSelectGrade(g);
  };
  const [statusFilter, setStatusFilter] = useState<'all' | 'hadir' | 'belum' | 'infal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  // Info Hari & Master Jadwal Sesuai Hari (Reguler 9 JP / Jumat 5 JP / Akhir Pekan Libur)
  const currentSchedules = useMemo(() => getScheduleForDate(selectedDate), [selectedDate]);
  const dayInfo = useMemo(() => getDayLabel(selectedDate), [selectedDate]);
  const dayType = useMemo(() => getDayType(selectedDate), [selectedDate]);
  const dayNameIndo = useMemo(() => getDayNameIndonesian(selectedDate), [selectedDate]);
  const isWeekend = dayType === 'weekend';

  // Kamus cepat O(1) untuk relasi
  const teachersMap = useMemo(() => {
    const map: Record<string, MasterGuru> = {};
    masterGuru.forEach(g => {
      if (g.kodeGuru) map[g.kodeGuru] = g;
    });
    return map;
  }, [masterGuru]);

  const subjectsMap = useMemo(() => {
    const map: Record<string, MasterMapel> = {};
    masterMapel.forEach(m => {
      if (m.kodeMapel) map[m.kodeMapel] = m;
    });
    return map;
  }, [masterMapel]);

  const classesMap = useMemo(() => {
    const map: Record<string, ClassMaster> = {};
    classes.forEach(c => {
      if (c.namaKelas) {
        map[c.namaKelas] = c;
        map[normalizeClassName(c.namaKelas)] = c;
      }
    });
    return map;
  }, [classes]);

  // Filter schedules hanya untuk hari yang dipilih
  const daySchedules = useMemo(() => {
    return schedules.filter(s => s.hari.toLowerCase() === dayNameIndo.toLowerCase());
  }, [schedules, dayNameIndo]);

  // Log kehadiran untuk tanggal terpilih
  const logsForSelectedDate = useMemo(() => {
    return attendanceLogs.filter(l => isSameDate(l.tanggal, selectedDate));
  }, [attendanceLogs, selectedDate]);

  // Ref untuk mengukur posisi kolom jam aktif guna menempatkan garis vertikal real-time
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [indicatorOffsetLeft, setIndicatorOffsetLeft] = useState<number | null>(null);

  // Helper mencari schedule yang MULAI pada jam tertentu untuk kelas tertentu
  const getScheduleStartingAt = (className: string, periodNumber: number) => {
    const normTarget = normalizeClassName(className);
    return daySchedules.find(
      s => normalizeClassName(s.namaKelas) === normTarget && s.startPeriod === periodNumber
    );
  };

  // Helper mengecek apakah jam tertentu tercakup oleh schedule yang dimulai sebelumnya
  const getCoveringSchedule = (className: string, periodNumber: number) => {
    const normTarget = normalizeClassName(className);
    return daySchedules.find(
      s => normalizeClassName(s.namaKelas) === normTarget && s.periods.includes(periodNumber)
    );
  };

  // Status detail per kelas untuk jam aktif saat ini & rekapan hari ini
  const classStatusMap = useMemo(() => {
    const map: Record<string, {
      activeSlotColor: SlotColorStatus | 'none';
      hasUnattendedToday: boolean;
      hasHadirToday: boolean;
      hasInfalToday: boolean;
    }> = {};

    classes.forEach(cls => {
      let activeSlotColor: SlotColorStatus | 'none' = 'none';
      let hasUnattendedToday = false;
      let hasHadirToday = false;
      let hasInfalToday = false;

      const totalPeriods = currentSchedules.length;
      for (let p = 1; p <= totalPeriods; p++) {
        const schedule = getCoveringSchedule(cls.namaKelas, p);
        if (schedule) {
          const slot = resolveScheduleSlot(
            schedule,
            teachersMap,
            subjectsMap,
            classesMap,
            logsForSelectedDate,
            activePeriodNumber,
            true
          );
          if (slot.statusColor === 'red') hasUnattendedToday = true;
          if (slot.statusColor === 'green' || slot.statusColor === 'blue') hasHadirToday = true;
          if (slot.statusColor === 'purple') hasInfalToday = true;

          if (p === activePeriodNumber) {
            activeSlotColor = slot.statusColor;
          }
        }
      }

      map[cls.namaKelas] = {
        activeSlotColor,
        hasUnattendedToday,
        hasHadirToday,
        hasInfalToday,
      };
    });

    return map;
  }, [classes, currentSchedules, daySchedules, teachersMap, subjectsMap, classesMap, logsForSelectedDate, activePeriodNumber]);

  // Hitung jumlah kelas per status berdasarkan filter tingkat & pencarian saat ini
  const statusCounts = useMemo(() => {
    const baseClasses = classes.filter(c => {
      const norm = normalizeClassName(c.namaKelas);
      const grade = norm.startsWith('VII-') ? 'VII' : norm.startsWith('VIII-') ? 'VIII' : 'IX';
      if (selectedGrade !== 'all' && grade !== selectedGrade) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return c.namaKelas.toLowerCase().includes(q) || c.lokasiRuang.toLowerCase().includes(q);
      }
      return true;
    });

    let hadir = 0;
    let belum = 0;
    let infal = 0;

    baseClasses.forEach(c => {
      const st = classStatusMap[c.namaKelas];
      if (!st) return;
      if (activePeriodNumber > 0) {
        if (st.activeSlotColor === 'green' || st.activeSlotColor === 'blue') hadir++;
        else if (st.activeSlotColor === 'red') belum++;
        else if (st.activeSlotColor === 'purple') infal++;
      } else {
        if (st.hasHadirToday) hadir++;
        if (st.hasUnattendedToday) belum++;
        if (st.hasInfalToday) infal++;
      }
    });

    return {
      all: baseClasses.length,
      hadir,
      belum,
      infal,
    };
  }, [classes, selectedGrade, searchQuery, classStatusMap, activePeriodNumber]);

  // Otomatis ubah filter grade ke 'all' jika ada kelas yang disorot dari kartu luar agar tetap terlihat
  useEffect(() => {
    if (highlightedClassName) {
      const norm = normalizeClassName(highlightedClassName);
      const target = classes.find(c => normalizeClassName(c.namaKelas) === norm);
      if (target) {
        const grade = norm.startsWith('VII-') ? 'VII' : norm.startsWith('VIII-') ? 'VIII' : 'IX';
        if (selectedGrade !== 'all' && selectedGrade !== grade) {
          setSelectedGrade('all');
        }
      }
    }
  }, [highlightedClassName, classes, selectedGrade]);

  // Filter & Urutkan 23 kelas berdasarkan tingkat, status, pencarian, dan opsi sorting
  const processedClasses = useMemo(() => {
    // 1. Filter Tingkat & Pencarian
    let result = classes.filter(c => {
      if (highlightedClassName && (
        normalizeClassName(c.namaKelas) === normalizeClassName(highlightedClassName) ||
        c.namaKelas === highlightedClassName
      )) {
        return true;
      }

      const norm = normalizeClassName(c.namaKelas);
      const grade = norm.startsWith('VII-') ? 'VII' : norm.startsWith('VIII-') ? 'VIII' : 'IX';
      if (selectedGrade !== 'all' && grade !== selectedGrade) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return c.namaKelas.toLowerCase().includes(q) || c.lokasiRuang.toLowerCase().includes(q);
      }
      return true;
    });

    // 2. Filter Status Kehadiran
    if (statusFilter !== 'all') {
      result = result.filter(c => {
        if (highlightedClassName && (
          normalizeClassName(c.namaKelas) === normalizeClassName(highlightedClassName) ||
          c.namaKelas === highlightedClassName
        )) {
          return true;
        }

        const st = classStatusMap[c.namaKelas];
        if (!st) return false;
        if (activePeriodNumber > 0) {
          if (statusFilter === 'hadir') return st.activeSlotColor === 'green' || st.activeSlotColor === 'blue';
          if (statusFilter === 'belum') return st.activeSlotColor === 'red';
          if (statusFilter === 'infal') return st.activeSlotColor === 'purple';
        } else {
          if (statusFilter === 'hadir') return st.hasHadirToday;
          if (statusFilter === 'belum') return st.hasUnattendedToday;
          if (statusFilter === 'infal') return st.hasInfalToday;
        }
        return true;
      });
    }

    // 3. Sorting Dinamis
    const sorted = [...result];
    if (sortBy === 'unattended-first') {
      sorted.sort((a, b) => {
        const stA = classStatusMap[a.namaKelas];
        const stB = classStatusMap[b.namaKelas];
        const scoreA = stA?.activeSlotColor === 'red' ? 3 : (stA?.hasUnattendedToday ? 2 : (stA?.activeSlotColor === 'purple' ? 1 : 0));
        const scoreB = stB?.activeSlotColor === 'red' ? 3 : (stB?.hasUnattendedToday ? 2 : (stB?.activeSlotColor === 'purple' ? 1 : 0));
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return a.namaKelas.localeCompare(b.namaKelas, undefined, { numeric: true });
      });
    } else if (sortBy === 'name-asc') {
      sorted.sort((a, b) => a.namaKelas.localeCompare(b.namaKelas, undefined, { numeric: true }));
    } else if (sortBy === 'room') {
      sorted.sort((a, b) => {
        const roomDiff = a.lokasiRuang.localeCompare(b.lokasiRuang, undefined, { numeric: true });
        if (roomDiff !== 0) return roomDiff;
        return a.namaKelas.localeCompare(b.namaKelas, undefined, { numeric: true });
      });
    }

    return sorted;
  }, [classes, selectedGrade, searchQuery, statusFilter, sortBy, classStatusMap, activePeriodNumber, highlightedClassName]);

  // Hitung persentase posisi menit di dalam jam pelajaran aktif saat ini
  const activeSchedule = currentSchedules.find(s => s.period === activePeriodNumber) || currentSchedules[0];

  const calculateMinuteProgress = () => {
    if (!activeSchedule) return 0;
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMin = now.getUTCMinutes();
    const utcSec = now.getUTCSeconds();
    const wibHours = (utcHours + 7) % 24;
    const currentTotalMinutes = wibHours * 60 + utcMin + utcSec / 60;

    const [startH, startM] = activeSchedule.startTime.split(':').map(Number);
    const [endH, endM] = activeSchedule.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const duration = Math.max(1, endMinutes - startMinutes);

    if (currentTotalMinutes < startMinutes) return 0;
    if (currentTotalMinutes > endMinutes) return 1;
    return (currentTotalMinutes - startMinutes) / duration;
  };

  // Update posisi pixel garis vertikal penunjuk waktu secara dinamis
  useEffect(() => {
    if (isWeekend) {
      setIndicatorOffsetLeft(null);
      return;
    }

    const updatePosition = () => {
      if (!tableRef.current) return;
      const thElement = tableRef.current.querySelector<HTMLTableCellElement>(`th[data-period="${activePeriodNumber}"]`);
      if (thElement) {
        const rect = thElement.getBoundingClientRect();
        const parentRect = tableRef.current.getBoundingClientRect();
        const progress = calculateMinuteProgress();
        const leftPos = (rect.left - parentRect.left) + (rect.width * progress);
        setIndicatorOffsetLeft(leftPos);
      }
    };

    updatePosition();
    const timer = setInterval(updatePosition, 1000);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', updatePosition);
    };
  }, [activePeriodNumber, activeSchedule, isUltraCompact, isWeekend, selectedDate]);

  // Lebar proporsional untuk kolom (100% pembagian rata tanpa scrollbar horizontal)
  const classColWidthPercent = 12; // 12% untuk kolom nama rombel
  const periodColWidthPercent = currentSchedules.length > 0
    ? (100 - classColWidthPercent) / currentSchedules.length
    : 10;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs mb-4">
      {/* BILAH KONTROL 2 BARIS TERATUR ANTI TUMPANG-TINDIH */}
      <div className="border-b border-slate-200 bg-slate-50/90 divide-y divide-slate-200/80">
        {/* BARIS 1: Tab Tingkat Kelas & Info Hari Master / Kerapatan Layar */}
        <div className="p-2 px-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Grade tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
              Tingkat:
            </span>
            <button
              onClick={() => setSelectedGrade('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                selectedGrade === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Semua ({classes.length} Rombel)
            </button>
            <button
              onClick={() => setSelectedGrade('VII')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                selectedGrade === 'VII'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Kelas VII (8)
            </button>
            <button
              onClick={() => setSelectedGrade('VIII')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                selectedGrade === 'VIII'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Kelas VIII (8)
            </button>
            <button
              onClick={() => setSelectedGrade('IX')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                selectedGrade === 'IX'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Kelas IX (7)
            </button>
          </div>

          {/* Sisi Kanan Baris 1: Info Hari Master & Tombol Kerapatan Tampilan */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-emerald-50 text-emerald-900 border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Jadwal {dayNameIndo} · {dayInfo.label}</span>
            </div>

            {onToggleDensity && (
              <button
                onClick={onToggleDensity}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 text-slate-700 transition-colors border border-slate-300 cursor-pointer shadow-2xs whitespace-nowrap"
                title="Ubah kerapatan tampilan matriks"
              >
                {isUltraCompact ? <Maximize2 className="w-3.5 h-3.5 text-slate-500" /> : <Minimize2 className="w-3.5 h-3.5 text-slate-500" />}
                <span>{isUltraCompact ? '23 Layar Ringkas' : 'Mode Standar'}</span>
              </button>
            )}
          </div>
        </div>

        {/* BARIS 2: Filter Status, Pencarian, & Opsi Pengurutan (Sorting) */}
        <div className="p-2 px-3 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Sisi Kiri Baris 2: Pencarian & Filter Kehadiran */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Input Pencarian */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kelas / ruang..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 w-36 sm:w-44 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Segmented Filter Status dengan Badge Hitungan */}
            <div className="flex items-center gap-0.5 bg-white p-0.5 border border-slate-200 rounded-lg shadow-2xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Tampilkan semua kelas"
              >
                <span>Semua</span>
                <span className={`text-[10px] px-1 rounded-full ${statusFilter === 'all' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                  {statusCounts.all}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter('hadir')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'hadir'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
                title="Hanya kelas dengan guru hadir"
              >
                <span>Hadir</span>
                <span className={`text-[10px] px-1 rounded-full font-bold ${statusFilter === 'hadir' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                  {statusCounts.hadir}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter('belum')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'belum'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                }`}
                title="Hanya kelas yang belum ada absensi guru"
              >
                <span>Belum</span>
                <span className={`text-[10px] px-1 rounded-full font-bold ${
                  statusFilter === 'belum'
                    ? 'bg-white/20 text-white'
                    : statusCounts.belum > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {statusCounts.belum}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter('infal')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'infal'
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50'
                }`}
                title="Hanya kelas dengan guru pengganti (infal)"
              >
                <span>Infal</span>
                <span className={`text-[10px] px-1 rounded-full font-bold ${statusFilter === 'infal' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'}`}>
                  {statusCounts.infal}
                </span>
              </button>
            </div>
          </div>

          {/* Sisi Kanan Baris 2: Dropdown / Opsi Pengurutan (Sorting) */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Urutkan:</span>
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              aria-label="Pilih opsi urutan baris kelas"
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer shadow-2xs hover:bg-slate-50"
            >
              <option value="default">Urutan Standar (VII → IX)</option>
              <option value="unattended-first">⚠️ Belum Absen Teratas (Prioritas)</option>
              <option value="name-asc">Nama Kelas (A - Z)</option>
              <option value="room">Lokasi Ruangan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jika Hari Libur Akhir Pekan (Sabtu / Minggu): Tampilkan Banner Ramah */}
      {isWeekend ? (
        <div className="p-12 text-center flex flex-col items-center justify-center bg-slate-50/50">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <CalendarOff className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Hari Libur Sekolah ({selectedDate})
          </h3>
          <p className="text-xs text-slate-500 max-w-md mb-4 leading-relaxed">
            Sistem menerapkan <strong>5 Hari Sekolah</strong> (Senin s/d Jumat). Tidak ada jadwal Kegiatan Belajar Mengajar (KBM) pada hari Sabtu dan Minggu.
          </p>
          {onSelectDateFallback && (
            <button
              onClick={() => onSelectDateFallback('09-Okt-2026')}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Lihat Jadwal Terakhir (Jumat, 09 Okt 2026)</span>
            </button>
          )}
        </div>
      ) : (
        /* Matrix Dual-Column Table Layout (Divided Evenly: Left & Right Columns) */
        <div className="relative w-full p-1">
          {processedClasses.length === 0 ? (
            <div className="p-10 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                <AlertCircle className="w-6 h-6 text-slate-400" />
                <span className="font-bold text-xs text-slate-700">Tidak ada rombel yang sesuai kriteria</span>
                <span className="text-[11px] text-slate-500">
                  Coba sesuaikan filter tingkat, status kehadiran, atau bersihkan kata kunci pencarian.
                </span>
                <button
                  onClick={() => {
                    setSelectedGrade('all');
                    setStatusFilter('all');
                    setSearchQuery('');
                    setSortBy('default');
                  }}
                  className="mt-1 px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  Reset Semua Filter
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start w-full">
              {(() => {
                const halfIndex = Math.ceil(processedClasses.length / 2);
                const leftClasses = processedClasses.slice(0, halfIndex);
                const rightClasses = processedClasses.slice(halfIndex);

                const renderClassTable = (classList: ClassMaster[], colTitle: string) => {
                  return (
                    <div className="flex-1 min-w-[320px] w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                      {/* Sub-header Kolom Matriks */}
                      <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                          <span>Matriks {colTitle} ({classList.length} Rombel)</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 font-normal">
                          Jam 1 s/d {currentSchedules.length}
                        </span>
                      </div>

                      <div className="w-full overflow-x-auto">
                        <table className="table-fixed w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 text-xs font-semibold">
                              <th 
                                style={{ width: `${classColWidthPercent}%` }}
                                className="py-2 px-2 bg-slate-100/95 z-10 border-r border-slate-200"
                              >
                                <div className="leading-tight">
                                  <span className="block font-bold">Kelas</span>
                                  <span className="text-[10px] text-slate-500 font-mono font-normal">
                                    {classList.length} Rombel
                                  </span>
                                </div>
                              </th>
                              {currentSchedules.map(schedule => {
                                const isCurrent = schedule.period === activePeriodNumber;
                                return (
                                  <th
                                    key={schedule.period}
                                    data-period={schedule.period}
                                    style={{ width: `${periodColWidthPercent}%` }}
                                    className={`py-1 px-1 text-center border-r border-slate-200 last:border-r-0 ${
                                      isCurrent ? 'bg-emerald-50/80 text-emerald-950 font-bold ring-1 ring-emerald-500/30' : ''
                                    }`}
                                  >
                                    <div className="flex flex-col items-center leading-tight">
                                      <div className="flex items-center justify-center gap-1">
                                        <span className="truncate">{schedule.label}</span>
                                        {isCurrent && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                        )}
                                      </div>
                                      <span className="text-[9px] font-mono text-slate-500 font-normal tabular-nums truncate">
                                        {schedule.startTime} - {schedule.endTime}
                                      </span>
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-xs">
                            {classList.length === 0 ? (
                              <tr>
                                <td colSpan={currentSchedules.length + 1} className="py-8 text-center text-slate-500 bg-slate-50/50">
                                  <span className="text-xs font-semibold text-slate-600">Tidak ada rombel pada kolom ini</span>
                                </td>
                              </tr>
                            ) : (
                              classList.map(cls => {
                                const cells: React.ReactNode[] = [];
                                let skipPeriods = 0;
                                const totalPeriods = currentSchedules.length;

                                for (let period = 1; period <= totalPeriods; period++) {
                                  if (skipPeriods > 0) {
                                    skipPeriods--;
                                    continue;
                                  }

                                  const schedule = getScheduleStartingAt(cls.namaKelas, period);
                                  const isCurrent = period === activePeriodNumber;

                                  if (schedule) {
                                    const span = Math.min(schedule.spanJP, totalPeriods - period + 1);
                                    skipPeriods = span - 1;

                                    const slot = resolveScheduleSlot(
                                      schedule,
                                      teachersMap,
                                      subjectsMap,
                                      classesMap,
                                      logsForSelectedDate,
                                      activePeriodNumber,
                                      true
                                    );

                                    let colorStyle = '';
                                    if (slot.statusColor === 'green') {
                                      colorStyle = 'bg-emerald-50/95 border-emerald-300 text-emerald-950 hover:border-emerald-500 hover:shadow-2xs';
                                    } else if (slot.statusColor === 'blue') {
                                      colorStyle = 'bg-sky-50/95 border-sky-300 text-sky-950 hover:border-sky-500 hover:shadow-2xs';
                                    } else if (slot.statusColor === 'red') {
                                      colorStyle = isCurrent 
                                        ? 'bg-rose-100/90 border-rose-400 text-rose-950 ring-1 ring-rose-500/40 hover:border-rose-600'
                                        : 'bg-rose-50/80 border-rose-300 text-rose-900 hover:border-rose-400';
                                    } else if (slot.statusColor === 'purple') {
                                      colorStyle = 'bg-purple-50/95 border-purple-300 text-purple-950 hover:border-purple-500 hover:shadow-2xs';
                                    } else if (slot.statusColor === 'yellow') {
                                      colorStyle = 'bg-amber-50/95 border-amber-300 text-amber-950 hover:border-amber-500 hover:shadow-2xs';
                                    } else {
                                      colorStyle = 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100';
                                    }

                                    const slotStartTime = schedule.jamMulai || currentSchedules.find(p => p.period === schedule.startPeriod)?.startTime || '07:00';
                                    const slotEndTime = schedule.jamSelesai || currentSchedules.find(p => p.period === schedule.endPeriod)?.endTime || '08:20';
                                    const timeMarker = calculateSlotTimeMarker(slotStartTime, slotEndTime, slot.attendance?.waktuAbsen);

                                    cells.push(
                                      <td
                                        key={`slot-${cls.idKelas}-${period}`}
                                        colSpan={span}
                                        style={{ width: `${periodColWidthPercent * span}%` }}
                                        className={`border-r border-slate-200 last:border-r-0 align-middle ${
                                          isUltraCompact ? 'p-0.5' : 'p-1.5'
                                        } ${slot.isCoveredNow ? 'bg-slate-50/30' : ''}`}
                                      >
                                        <div
                                          onClick={() => onSelectSlot(slot)}
                                          title={`${slot.subject?.namaMapel || schedule.kodeMapel}\nGuru: ${slot.teacher?.namaLengkap || schedule.kodeGuru}\nRuang: ${slot.activeRoom}\nStatus: ${slot.statusLabel}${timeMarker ? `\nWaktu Absen: ${timeMarker.formattedDisplay} (Jadwal: ${timeMarker.startTime} - ${timeMarker.endTime})` : ''}`}
                                          className={`rounded cursor-pointer transition-all border text-left flex ${
                                            isUltraCompact 
                                              ? 'px-1.5 py-0.5 min-h-[30px] leading-tight flex-col justify-between' 
                                              : 'p-2 min-h-[72px] flex-col justify-between'
                                          } ${colorStyle}`}
                                        >
                                          {isUltraCompact ? (
                                            <div className="w-full flex flex-col justify-between h-full">
                                              <div className="flex items-center justify-between gap-1 w-full">
                                                <div className="flex items-center gap-1 min-w-0">
                                                  <span className="font-mono font-bold text-[9px] bg-black/5 px-1 py-0.2 rounded shrink-0">
                                                    {schedule.kodeGuru}
                                                  </span>
                                                  <span className="font-semibold text-[10px] font-mono truncate" title={slot.subject?.namaMapel || schedule.kodeMapel}>
                                                    {schedule.kodeMapel}
                                                  </span>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                                  {timeMarker && (
                                                    <span 
                                                      className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded border flex items-center gap-0.5 shrink-0 ${
                                                        slot.statusColor === 'blue'
                                                          ? 'text-sky-800 bg-sky-100/90 border-sky-300/80'
                                                          : 'text-emerald-800 bg-emerald-100/90 border-emerald-300/80'
                                                      }`}
                                                      title={`Waktu Absen: ${timeMarker.formattedDisplay} (Jadwal: ${timeMarker.startTime} - ${timeMarker.endTime})`}
                                                    >
                                                      🕒 {timeMarker.absenTime}
                                                    </span>
                                                  )}
                                                  <span className="text-[9px] font-mono opacity-80 truncate max-w-[50px]" title={slot.activeRoom}>
                                                    {slot.activeRoom}
                                                  </span>
                                                  {slot.statusColor === 'green' && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" title="Hadir (Kelas)"></span>
                                                  )}
                                                  {slot.statusColor === 'blue' && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0" title="Hadir (Luar Kelas)"></span>
                                                  )}
                                                  {slot.statusColor === 'red' && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse shrink-0" title="Belum Terisi"></span>
                                                  )}
                                                  {slot.statusColor === 'purple' && (
                                                    <span className="text-[8px] font-bold text-purple-700 bg-purple-100 px-0.5 rounded shrink-0">
                                                      Infal
                                                    </span>
                                                  )}
                                                  {slot.statusColor === 'yellow' && (
                                                    <span className="text-[8px] font-bold text-amber-700 bg-amber-100 px-0.5 rounded shrink-0">
                                                      Izin
                                                    </span>
                                                  )}
                                                </div>
                                              </div>

                                              {/* Garis Waktu Presensi KBM Dual-Color (Mini Timeline) */}
                                              {timeMarker && !(slot.statusColor === 'yellow' && timeMarker.isEarly) && (
                                                <div 
                                                  className="w-full mt-1 pt-0.5 border-t border-black/5 relative"
                                                  title={`Garis Waktu KBM: ${timeMarker.startTime} s/d ${timeMarker.endTime} WIB\nPresensi Masuk: ${timeMarker.formattedDisplay}`}
                                                >
                                                  <div className={`h-1.5 w-full ${
                                                    slot.statusColor === 'yellow' 
                                                      ? 'bg-amber-400' 
                                                      : slot.statusColor === 'blue' 
                                                      ? 'bg-sky-500' 
                                                      : 'bg-emerald-500'
                                                  } rounded-full relative overflow-visible shadow-2xs`}>
                                                    <div 
                                                      className="h-full bg-slate-300 dark:bg-slate-400 rounded-l-full" 
                                                      style={{ width: `${timeMarker.percentage}%` }}
                                                    />
                                                    <div 
                                                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
                                                      style={{ left: `${timeMarker.percentage}%` }}
                                                    >
                                                      <span className="relative flex h-3 w-3 items-center justify-center">
                                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                                                          slot.statusColor === 'yellow' 
                                                            ? 'bg-amber-400' 
                                                            : slot.statusColor === 'blue' 
                                                            ? 'bg-sky-400' 
                                                            : 'bg-emerald-400'
                                                        } opacity-75`}></span>
                                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                                          slot.statusColor === 'yellow' 
                                                            ? 'bg-amber-700' 
                                                            : slot.statusColor === 'blue' 
                                                            ? 'bg-sky-700' 
                                                            : 'bg-emerald-700'
                                                        } ring-1 ring-white shadow-2xs`}></span>
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <>
                                              <div className="w-full">
                                                <div className="flex items-center justify-between text-[10px] mb-1">
                                                  <span className="font-bold font-mono">[{schedule.kodeGuru}]</span>
                                                  {span > 1 ? (
                                                    <span className="text-[9px] font-bold text-slate-700 bg-black/5 px-1 rounded font-mono">
                                                      {span} JP ({slotStartTime} - {slotEndTime})
                                                    </span>
                                                  ) : (
                                                    <span className="font-mono text-slate-400">Jam {schedule.jamKe} ({slotStartTime} - {slotEndTime})</span>
                                                  )}
                                                </div>
                                                <div className="font-bold text-xs truncate" title={slot.subject?.namaMapel || schedule.kodeMapel}>
                                                  {slot.subject?.namaMapel || schedule.kodeMapel}
                                                </div>
                                                <div className="text-[10px] text-slate-600 truncate mt-0.5" title={slot.teacher?.namaLengkap || schedule.kodeGuru}>
                                                  {slot.attendance?.pengganti === 'Y' && slot.attendance.namaPengganti 
                                                    ? `Infal: ${slot.attendance.namaPengganti}`
                                                    : slot.teacher?.namaLengkap || schedule.kodeGuru}
                                                </div>
                                              </div>

                                              {/* Garis Waktu Presensi KBM Lengkap Dual-Color */}
                                              {timeMarker && !(slot.statusColor === 'yellow' && timeMarker.isEarly) && (
                                                <div 
                                                  className="w-full my-1.5 p-1.5 bg-white/70 rounded-lg border border-black/5 space-y-1"
                                                  title={`Jadwal KBM: ${timeMarker.startTime} - ${timeMarker.endTime} WIB\nWaktu Absen Masuk: ${timeMarker.formattedDisplay}`}
                                                >
                                                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 font-semibold">
                                                    <span>{timeMarker.startTime}</span>
                                                    <span className={`font-bold ${
                                                      slot.statusColor === 'yellow' 
                                                        ? 'text-amber-900 bg-amber-100 border-amber-300' 
                                                        : slot.statusColor === 'blue'
                                                        ? 'text-sky-900 bg-sky-100 border-sky-300'
                                                        : 'text-emerald-800 bg-emerald-100 border-emerald-300'
                                                    } px-1 py-0.2 rounded border flex items-center gap-0.5`}>
                                                      📍 Absen: {timeMarker.absenTime}
                                                    </span>
                                                    <span>{timeMarker.endTime}</span>
                                                  </div>

                                                  <div className={`h-2 w-full ${
                                                    slot.statusColor === 'yellow' 
                                                      ? 'bg-amber-400' 
                                                      : slot.statusColor === 'blue'
                                                      ? 'bg-sky-500/90'
                                                      : 'bg-emerald-500/90'
                                                  } rounded-full relative overflow-visible shadow-2xs`}>
                                                    <div 
                                                      className="h-full bg-slate-300 dark:bg-slate-400 rounded-l-full" 
                                                      style={{ width: `${timeMarker.percentage}%` }} 
                                                    />
                                                    <div 
                                                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
                                                      style={{ left: `${timeMarker.percentage}%` }}
                                                    >
                                                      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                                                          slot.statusColor === 'yellow' 
                                                            ? 'bg-amber-400' 
                                                            : slot.statusColor === 'blue'
                                                            ? 'bg-sky-400'
                                                            : 'bg-emerald-400'
                                                        } opacity-75`}></span>
                                                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                                          slot.statusColor === 'yellow' 
                                                            ? 'bg-amber-700' 
                                                            : slot.statusColor === 'blue'
                                                            ? 'bg-sky-700'
                                                            : 'bg-emerald-700'
                                                        } ring-2 ring-white shadow-xs`}></span>
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}

                                              <div className="w-full pt-1 border-t border-black/5 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                                                <span className="truncate max-w-[100px]">{slot.activeRoom}</span>
                                                <span className={
                                                  slot.statusColor === 'green' ? 'text-emerald-700 font-bold' :
                                                  slot.statusColor === 'blue' ? 'text-sky-700 font-bold' :
                                                  slot.statusColor === 'red' ? 'text-rose-700 font-bold' :
                                                  slot.statusColor === 'purple' ? 'text-purple-700 font-bold' :
                                                  'text-amber-700 font-bold'
                                                }>
                                                  {slot.statusColor === 'green' ? 'Hadir' :
                                                   slot.statusColor === 'blue' ? 'Hadir (Luar Kelas)' :
                                                   slot.statusColor === 'red' ? 'Belum Absen' :
                                                   slot.statusColor === 'purple' ? 'Guru Infal' :
                                                   'Izin/Sakit'}
                                                </span>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  } else {
                                    const covering = getCoveringSchedule(cls.namaKelas, period);
                                    if (covering) {
                                      continue;
                                    }

                                    cells.push(
                                      <td
                                        key={`slot-${cls.idKelas}-${period}`}
                                        style={{ width: `${periodColWidthPercent}%` }}
                                        className={`border-r border-slate-200 last:border-r-0 align-middle ${
                                          isUltraCompact ? 'p-0.5' : 'p-1.5'
                                        }`}
                                      >
                                        <div
                                          className={`rounded border border-dashed border-slate-200 flex items-center justify-center text-slate-300 font-mono text-[10px] ${
                                            isUltraCompact ? 'min-h-[28px]' : 'min-h-[68px]'
                                          }`}
                                        >
                                          -
                                        </div>
                                      </td>
                                    );
                                  }
                                }

                                const shortName = cls.namaKelas.replace(/^Kelas\s+/i, '');
                                const isHighlighted = Boolean(
                                  highlightedClassName && (
                                    normalizeClassName(cls.namaKelas) === normalizeClassName(highlightedClassName) ||
                                    cls.namaKelas === highlightedClassName
                                  )
                                );
                                const isRecentlyUpdated = Boolean(
                                  recentlyUpdatedClasses && recentlyUpdatedClasses.some(
                                    c => normalizeClassName(c) === normalizeClassName(cls.namaKelas) || c === cls.namaKelas
                                  )
                                );

                                return (
                                  <tr 
                                    key={cls.idKelas || cls.namaKelas} 
                                    id={`class-row-${normalizeClassName(cls.namaKelas)}`}
                                    className={`transition-all duration-300 ${
                                      isHighlighted 
                                        ? 'bg-amber-100/90 ring-2 ring-indigo-500 shadow-md scale-[1.002] z-20' 
                                        : isRecentlyUpdated
                                        ? 'bg-emerald-100/80 ring-2 ring-emerald-500 shadow-lg scale-[1.002] z-20 animate-pulse'
                                        : 'hover:bg-slate-50/60'
                                    } ${
                                      isUltraCompact ? 'h-[29px]' : 'h-[72px]'
                                    }`}
                                  >
                                    <td 
                                      style={{ width: `${classColWidthPercent}%` }}
                                      className={`px-2 z-10 border-r border-slate-200 font-medium py-0.5 transition-colors ${
                                        isHighlighted 
                                          ? 'bg-amber-100 font-black text-indigo-900' 
                                          : isRecentlyUpdated
                                          ? 'bg-emerald-100 font-black text-emerald-950'
                                          : 'bg-white'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1 leading-none py-0.5">
                                        <span className="font-bold text-slate-900 text-xs font-mono tracking-tight">{shortName}</span>
                                        {isRecentlyUpdated && (
                                          <span className="flex items-center gap-0.5 text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full animate-bounce shrink-0" title="Presensi Baru Saja Masuk!">
                                            <BellRing className="w-2.5 h-2.5" />
                                            <span className="hidden sm:inline">Baru</span>
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    {cells}
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {renderClassTable(leftClasses, 'Kiri')}
                    {renderClassTable(rightClasses, 'Kanan')}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Legend status di bawah matriks */}
      <div className="p-2 px-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-600">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-400"></span>
            <span className="font-medium text-emerald-950">Hijau: Hadir (Kelas)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-sky-100 border border-sky-400"></span>
            <span className="font-medium text-sky-950">Biru: Hadir (Luar Kelas)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-400"></span>
            <span className="font-medium text-rose-950">Merah: Belum Terisi / Belum Sinkron</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-400"></span>
            <span className="font-medium text-amber-950">Kuning: Izin / Sakit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-purple-100 border border-purple-400"></span>
            <span className="font-medium text-purple-950">Ungu: Guru Pengganti (Infal)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span>Garis Merah: Jam Aktif Sekarang</span>
          </div>
        </div>

        <div className="text-slate-500 font-mono text-[10px]">
          {isUltraCompact ? 'Mode 23 Layar: Kode Guru · Kode Mapel · Ruang' : 'Mode Standar: Nama Guru · Nama Mapel · Ruang'}
        </div>
      </div>
    </div>
  );
};
