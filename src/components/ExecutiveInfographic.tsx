import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  CalendarDays, 
  ChevronUp, 
  ChevronDown, 
  Sparkles,
  UserX,
  ShieldCheck,
  Pause,
  Play
} from 'lucide-react';
import { ScheduleItem, AttendanceLogItem, MasterGuru, ClassMaster } from '../types';
import { normalizeClassName } from '../utils/appsScriptCode';

interface ExecutiveInfographicProps {
  schedules: ScheduleItem[];
  attendanceLogs: AttendanceLogItem[];
  masterGuru: MasterGuru[];
  classes: ClassMaster[];
  activePeriodNumber: number;
  selectedDate: string;
  wibTimeStr: string;
  isWeekend?: boolean;
  dayNameIndo: string;
  periodScheduleInfo?: {
    startTime: string;
    endTime: string;
    label: string;
  } | null;
  onFilterEmpty?: () => void;
  onFilterSubstitute?: () => void;
  onResetFilter?: () => void;
  onToggleUnconfirmed?: () => void;
}

export const ExecutiveInfographic: React.FC<ExecutiveInfographicProps> = ({
  schedules,
  attendanceLogs,
  masterGuru,
  classes,
  activePeriodNumber,
  selectedDate,
  wibTimeStr,
  isWeekend = false,
  dayNameIndo,
  periodScheduleInfo,
  onFilterEmpty,
  onResetFilter,
  onToggleUnconfirmed,
}) => {
  // State ciutkan/buka panel infografis (bisa disembunyikan jika ingin ruang penuh)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isPausedScroll, setIsPausedScroll] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Kamus nama lengkap guru
  const teachersMap = useMemo(() => {
    const map: Record<string, MasterGuru> = {};
    masterGuru.forEach(g => {
      map[g.kodeGuru] = g;
    });
    return map;
  }, [masterGuru]);

  // 1. DATA KBM HARI INI
  const schedulesToday = useMemo(() => {
    return schedules.filter(s => s.hari.toLowerCase() === dayNameIndo.toLowerCase());
  }, [schedules, dayNameIndo]);

  const logsToday = useMemo(() => {
    return attendanceLogs.filter(l => l.tanggal === selectedDate);
  }, [attendanceLogs, selectedDate]);

  // Sesi Aktif Saat Ini
  const activeSchedules = useMemo(() => {
    return schedulesToday.filter(s => s.periods.includes(activePeriodNumber));
  }, [schedulesToday, activePeriodNumber]);

  const activeSessionsCount = activeSchedules.length;

  // Analisis Sesi Aktif
  const activeSessionsAnalysis = useMemo(() => {
    let adaGuru = 0;
    let belumKonfirmasi = 0;

    activeSchedules.forEach(sched => {
      const normSchedClass = normalizeClassName(sched.namaKelas);
      const matchedLog = logsToday.find(l => {
        const normLogClass = normalizeClassName(l.kelas);
        return normLogClass === normSchedClass && (
          l.mapelKe === sched.mapelKe || 
          (l.periods && l.periods.includes(activePeriodNumber))
        );
      });

      if (matchedLog && (matchedLog.statusKehadiran === 'Hadir' || matchedLog.pengganti === 'Y')) {
        adaGuru++;
      } else {
        belumKonfirmasi++;
      }
    });

    const percent = activeSessionsCount > 0 
      ? Math.round((adaGuru / activeSessionsCount) * 100) 
      : 0;

    return {
      adaGuru,
      belumKonfirmasi,
      percent,
    };
  }, [activeSchedules, logsToday, activePeriodNumber, activeSessionsCount]);

  // 2. DATA SESI KBM KESELURUHAN HARI INI
  const totalDailySessions = schedulesToday.length;
  const passedSessions = useMemo(() => {
    return schedulesToday.filter(s => s.endPeriod < activePeriodNumber).length;
  }, [schedulesToday, activePeriodNumber]);

  const upcomingSessions = useMemo(() => {
    return schedulesToday.filter(s => s.startPeriod > activePeriodNumber).length;
  }, [schedulesToday, activePeriodNumber]);

  // Status kelancaran KBM
  const kbmStatus = useMemo(() => {
    if (isWeekend) return { text: 'Libur Akhir Pekan', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (activeSessionsAnalysis.belumKonfirmasi === 0 && activeSessionsCount > 0) {
      return { text: 'KBM 100% Lancar', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }
    if (activeSessionsAnalysis.percent >= 80) {
      return { text: 'KBM Sangat Lancar', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }
    if (activeSessionsAnalysis.percent >= 60) {
      return { text: 'KBM Berjalan Baik', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    }
    return { text: 'Perlu Perhatian Piket', color: 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse' };
  }, [activeSessionsAnalysis, activeSessionsCount, isWeekend]);

  // 3. STATISTIK KETERANGAN GURU TERJADWAL HARI INI (DIAGRAM PIE/DONUT)
  const teacherStats = useMemo(() => {
    // Kumpulan kode guru unik yang terjadwal mengajar hari ini
    const scheduledGuruCodes = Array.from(new Set(schedulesToday.map(s => s.kodeGuru).filter(Boolean)));
    const totalTeachers = scheduledGuruCodes.length;

    let hadirCount = 0;
    let sakitCount = 0;
    let izinPribadiCount = 0;
    let dinasLuarCount = 0;
    let instruksiPimpinanCount = 0;

    scheduledGuruCodes.forEach(kode => {
      // Cari catatan di logsToday untuk guru ini
      const logs = logsToday.filter(l => l.kodeGuru === kode);
      const leaveLog = logs.find(l => l.statusKehadiran && l.statusKehadiran !== 'Hadir');

      if (!leaveLog) {
        hadirCount++;
      } else {
        const st = (leaveLog.statusKehadiran || '').toLowerCase();
        if (st.includes('sakit')) {
          sakitCount++;
        } else if (st.includes('pribadi')) {
          izinPribadiCount++;
        } else if (st.includes('dinas')) {
          dinasLuarCount++;
        } else if (st.includes('instruksi') || st.includes('pimpinan')) {
          instruksiPimpinanCount++;
        } else {
          izinPribadiCount++;
        }
      }
    });

    const categories = [
      { key: 'hadir', label: 'Ada Guru', count: hadirCount, color: '#10b981', bgClass: 'bg-emerald-500' },
      { key: 'sakit', label: 'Guru Sakit', count: sakitCount, color: '#f59e0b', bgClass: 'bg-amber-500' },
      { key: 'pribadi', label: 'Keperluan Pribadi', count: izinPribadiCount, color: '#f43f5e', bgClass: 'bg-rose-500' },
      { key: 'dinas', label: 'Dinas Luar', count: dinasLuarCount, color: '#0ea5e9', bgClass: 'bg-sky-500' },
      { key: 'instruksi', label: 'Instruksi Pimpinan', count: instruksiPimpinanCount, color: '#8b5cf6', bgClass: 'bg-violet-500' },
    ];

    return {
      totalTeachers,
      categories,
      hadirCount,
      totalAbsent: totalTeachers - hadirCount,
    };
  }, [schedulesToday, logsToday]);

  // Perhitungan Sudut Donut Chart SVG
  const donutSlices = useMemo(() => {
    const total = teacherStats.totalTeachers || 1;
    let cumulativePercent = 0;
    const radius = 28;
    const circumference = 2 * Math.PI * radius; // ~175.93

    return teacherStats.categories.map(cat => {
      const percent = cat.count / total;
      const strokeDasharray = `${percent * circumference} ${circumference}`;
      const strokeDashoffset = -cumulativePercent * circumference;
      cumulativePercent += percent;

      return {
        ...cat,
        percent: Math.round(percent * 100),
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [teacherStats]);

  // 4. TABEL GURU IZIN TIDAK MENGAJAR HARI INI
  const absentTeacherList = useMemo(() => {
    const list: Array<{
      id: string;
      kodeGuru: string;
      namaLengkap: string;
      statusKehadiran: string;
      alasan: string;
      badgeColor: string;
    }> = [];

    const seenGuru = new Set<string>();

    logsToday.forEach(log => {
      if (log.statusKehadiran && log.statusKehadiran !== 'Hadir') {
        const key = `${log.kodeGuru}_${log.statusKehadiran}`;
        if (!seenGuru.has(key)) {
          seenGuru.add(key);
          const teacherObj = teachersMap[log.kodeGuru];
          const namaLengkap = teacherObj?.namaLengkap || log.namaGuru || log.kodeGuru || 'Guru Pengampu';
          
          let badgeColor = 'bg-slate-100 text-slate-800 border-slate-200';
          const st = log.statusKehadiran.toLowerCase();
          if (st.includes('sakit')) {
            badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
          } else if (st.includes('pribadi')) {
            badgeColor = 'bg-rose-100 text-rose-900 border-rose-300';
          } else if (st.includes('dinas')) {
            badgeColor = 'bg-sky-100 text-sky-900 border-sky-300';
          } else if (st.includes('instruksi') || st.includes('pimpinan')) {
            badgeColor = 'bg-violet-100 text-violet-900 border-violet-300';
          }

          const alasan = log.infoKetidakhadiran || log.kegiatanPembelajaran || 'Izin resmi tidak mengajar';

          list.push({
            id: log.idKiriman || `${log.kodeGuru}_${Math.random()}`,
            kodeGuru: log.kodeGuru,
            namaLengkap,
            statusKehadiran: log.statusKehadiran,
            alasan,
            badgeColor,
          });
        }
      }
    });

    return list;
  }, [logsToday, teachersMap]);

  // Auto-scroll loop effect untuk Tabel Guru Izin
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || absentTeacherList.length <= 3) return;

    let animId: number;
    let timeoutId: any = null;
    const speed = 0.5; // Kecepatan scroll halus

    const step = () => {
      if (!isPausedScroll && el) {
        el.scrollTop += speed;
        // Jika sudah mencapai batas paling bawah
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          // Jeda sejenak lalu kembali ke atas secara mulus
          timeoutId = setTimeout(() => {
            if (el) el.scrollTop = 0;
          }, 1500);
          return;
        }
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPausedScroll, absentTeacherList.length]);

  // Durasi jam aktif
  const timeRangeText = periodScheduleInfo 
    ? `${periodScheduleInfo.startTime} - ${periodScheduleInfo.endTime}` 
    : '07:00 - 14:00';

  return (
    <div className="mb-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
      {/* 1. KOTAK ATAS: Jam Ke, Durasi, dan Realtime WIB (Besar & Mencolok) + Toggle Ciutkan */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white border-b border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3.5 flex-wrap">
          {/* Jam Ke Badge Besar */}
          <div className="flex items-center gap-1.5">
            <span className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg text-xs sm:text-sm md:text-base font-black shadow-sm border border-indigo-400/40 tracking-tight transition-colors">
              {isWeekend ? 'AKHIR PEKAN' : `JAM KE-${activePeriodNumber}`}
            </span>
          </div>

          <span className="text-slate-500 hidden min-[380px]:inline text-sm font-light">|</span>

          {/* Durasi Waktu Jam KBM Terpadu */}
          <div className="flex items-center gap-1 text-slate-200 font-mono text-xs sm:text-sm md:text-base font-bold tracking-tight">
            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0 hidden sm:inline" />
            <span>{isWeekend ? 'Hari Libur KBM' : timeRangeText}</span>
          </div>

          <span className="text-slate-500 hidden sm:inline text-sm font-light">|</span>

          {/* Jam Realtime WIB Digital Besar & Mencolok */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg border border-emerald-500/40 shadow-inner">
            <span className="relative flex h-2 sm:h-2.5 w-2 sm:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 sm:h-2.5 w-2 sm:w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-mono font-black tracking-wider text-xs sm:text-sm md:text-base">
              {wibTimeStr}
            </span>
          </div>

          {/* Status Kelancaran KBM */}
          <span className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 sm:py-1 rounded-full border hidden xl:inline-flex items-center gap-1 ${kbmStatus.color}`}>
            <Sparkles className="w-3 h-3" />
            {kbmStatus.text}
          </span>
        </div>

        {/* Tombol Ciutkan / Buka Panel Infografis */}
        <button
          onClick={() => setIsCollapsed(prev => !prev)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 ml-2"
          title={isCollapsed ? 'Buka Infografis KBM' : 'Ciutkan Infografis KBM'}
        >
          <span className="hidden sm:inline">{isCollapsed ? 'Buka Ringkasan' : 'Ciutkan'}</span>
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Konten Infografis Utama (Bisa diciutkan) */}
      {!isCollapsed && (
        <div className="p-2 sm:p-2.5 bg-slate-50/50">
          {/* TATA LETAK FIT 1-LAYAR HP (2x2 grid) & RESPONSIVE DESKTOP (4 kolom) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
            
            {/* KOTAK 2: SESI KBM SAAT INI */}
            <div 
              onClick={() => {
                if (onToggleUnconfirmed) {
                  onToggleUnconfirmed();
                } else if (onFilterEmpty) {
                  onFilterEmpty();
                }
              }}
              title="Klik untuk membuka / menutup daftar kelas belum terkonfirmasi di bawah"
              className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs shadow-2xs flex flex-col justify-between cursor-pointer transition-all min-h-[98px]"
            >
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 truncate">
                  <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
                  Sesi KBM Aktif
                </span>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">Jam {activePeriodNumber}</span>
              </div>

              <div className="flex items-center justify-between gap-1.5">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
                      {activeSessionsAnalysis.percent}%
                    </span>
                  </div>
                  <div className="flex flex-col text-[10px] sm:text-[11px] text-slate-600 leading-tight mt-0.5 font-medium">
                    <span className="text-emerald-700 font-semibold truncate">Ada Guru: {activeSessionsAnalysis.adaGuru}</span>
                    <span className={`truncate flex items-center gap-1 ${activeSessionsAnalysis.belumKonfirmasi > 0 ? 'text-rose-600 font-bold hover:underline' : 'text-slate-400'}`}>
                      Belum Konfirmasi: {activeSessionsAnalysis.belumKonfirmasi}
                    </span>
                  </div>
                </div>

                {/* Visual Radial Gauge Ring Mini */}
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      className="text-slate-100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      className={
                        activeSessionsAnalysis.percent >= 80 
                          ? 'text-emerald-500' 
                          : activeSessionsAnalysis.percent >= 60 
                            ? 'text-amber-500' 
                            : 'text-rose-500'
                      }
                      strokeWidth="3.5"
                      strokeDasharray={`${(activeSessionsAnalysis.percent / 100) * 88} 88`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold text-slate-700">
                    {activeSessionsAnalysis.adaGuru}/{activeSessionsCount}
                  </div>
                </div>
              </div>
            </div>

            {/* KOTAK 3: SESI KBM KESELURUHAN HARI INI */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[98px]">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 truncate">
                  <CalendarDays className="w-3 h-3 text-blue-600 shrink-0" />
                  Sesi Harian
                </span>
                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded font-mono shrink-0">
                  {totalDailySessions} Total
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                <div className="p-1 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[9px] text-slate-500 block leading-none">Berlalu</span>
                  <span className="text-sm sm:text-base font-bold font-mono text-slate-700 tabular-nums">
                    {passedSessions}
                  </span>
                </div>
                <div className="p-1 rounded-lg bg-indigo-50/70 border border-indigo-100 text-center">
                  <span className="text-[9px] text-indigo-700 block leading-none font-medium">Akan Datang</span>
                  <span className="text-sm sm:text-base font-bold font-mono text-indigo-800 tabular-nums">
                    {upcomingSessions}
                  </span>
                </div>
              </div>

              {/* Status kelancaran di HP */}
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 text-[9px]">Kondisi:</span>
                <span className={`font-semibold px-1.5 py-0.2 rounded text-[9px] border truncate ${kbmStatus.color}`}>
                  {kbmStatus.text}
                </span>
              </div>
            </div>

            {/* KOTAK 4: KETERANGAN GURU (DIAGRAM PIE/DONUT) */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[98px]">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 truncate">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  Status Guru ({teacherStats.totalTeachers})
                </span>
                {teacherStats.totalAbsent > 0 ? (
                  <span className="text-[9.5px] text-rose-700 font-bold bg-rose-50 px-1 py-0.2 rounded font-mono shrink-0">
                    {teacherStats.totalAbsent} Izin
                  </span>
                ) : (
                  <span className="text-[9.5px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded font-mono shrink-0">
                    Nihil Izin
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Donut Chart SVG */}
                <div className="relative w-12 h-12 sm:w-13 sm:h-13 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 76 76">
                    <circle
                      cx="38"
                      cy="38"
                      r="28"
                      className="text-slate-100"
                      strokeWidth="9"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    {donutSlices.map(slice => {
                      if (slice.count === 0) return null;
                      return (
                        <circle
                          key={slice.key}
                          cx="38"
                          cy="38"
                          r="28"
                          stroke={slice.color}
                          strokeWidth="9"
                          strokeDasharray={slice.strokeDasharray}
                          strokeDashoffset={slice.strokeDashoffset}
                          fill="transparent"
                          className="transition-all duration-500 hover:opacity-80"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center leading-none text-center">
                    <span className="font-mono text-xs font-black text-slate-800 tabular-nums">
                      {teacherStats.hadirCount}
                    </span>
                    <span className="text-[8px] text-slate-500 font-medium">Hadir</span>
                  </div>
                </div>

                {/* Keterangan Angka di Samping Donut */}
                <div className="flex-1 grid grid-cols-1 gap-0.5 text-[9px] sm:text-[9.5px] leading-tight">
                  <div className="flex items-center justify-between text-emerald-800">
                    <span className="flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      Ada Guru
                    </span>
                    <span className="font-mono font-bold">{teacherStats.hadirCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-800">
                    <span className="flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                      Sakit
                    </span>
                    <span className="font-mono font-bold">{teacherStats.categories.find(c => c.key === 'sakit')?.count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-rose-800">
                    <span className="flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                      Pribadi
                    </span>
                    <span className="font-mono font-bold">{teacherStats.categories.find(c => c.key === 'pribadi')?.count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sky-800">
                    <span className="flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></span>
                      Dinas Luar
                    </span>
                    <span className="font-mono font-bold">{teacherStats.categories.find(c => c.key === 'dinas')?.count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-violet-800">
                    <span className="flex items-center gap-1 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0"></span>
                      Instruksi
                    </span>
                    <span className="font-mono font-bold">{teacherStats.categories.find(c => c.key === 'instruksi')?.count || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* KOTAK 5: TABEL GURU IZIN TIDAK MENGAJAR (AUTO-SCROLL) */}
            <div 
              className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[98px] relative"
              onMouseEnter={() => setIsPausedScroll(true)}
              onMouseLeave={() => setIsPausedScroll(false)}
              onTouchStart={() => setIsPausedScroll(true)}
              onTouchEnd={() => setIsPausedScroll(false)}
            >
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 truncate">
                  <UserX className="w-3 h-3 text-rose-600 shrink-0" />
                  Guru Izin ({absentTeacherList.length})
                </span>
                
                {absentTeacherList.length > 3 && (
                  <button 
                    onClick={() => setIsPausedScroll(p => !p)}
                    className="text-[9px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5 cursor-pointer"
                    title={isPausedScroll ? 'Lanjutkan Auto-scroll' : 'Jeda Auto-scroll'}
                  >
                    {isPausedScroll ? <Play className="w-2.5 h-2.5 text-indigo-600" /> : <Pause className="w-2.5 h-2.5" />}
                    <span>{isPausedScroll ? 'Jeda' : 'Scroll'}</span>
                  </button>
                )}
              </div>

              {/* Kontainer Scroll Vertikal */}
              <div 
                ref={scrollRef}
                className="h-[74px] sm:h-[78px] overflow-y-auto no-scrollbar space-y-1 pr-0.5"
                style={{ scrollBehavior: 'smooth' }}
              >
                {absentTeacherList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-1 bg-emerald-50/50 rounded-lg border border-emerald-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 mb-0.5" />
                    <span className="text-[9.5px] font-bold text-emerald-800">Semua Guru Hadir</span>
                    <span className="text-[8.5px] text-emerald-600">Nihil Izin / Sakit Hari Ini</span>
                  </div>
                ) : (
                  absentTeacherList.map((item, idx) => (
                    <div 
                      key={`${item.id}_${idx}`} 
                      className="p-1 px-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-150 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1 leading-tight">
                        <span className="text-[9.5px] font-bold text-slate-800 truncate" title={item.namaLengkap}>
                          {item.namaLengkap}
                        </span>
                        <span className={`text-[8px] font-bold px-1 py-0.2 rounded shrink-0 border ${item.badgeColor}`}>
                          {item.statusKehadiran}
                        </span>
                      </div>
                      <div className="text-[8.5px] text-slate-500 truncate mt-0.5" title={item.alasan}>
                        <span className="text-slate-400 font-mono">Alasan: </span>
                        {item.alasan}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
