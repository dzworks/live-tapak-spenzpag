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
import { normalizeClassName, isSameDate, isSampleEntity } from '../utils/appsScriptCode';
import { getScheduleForDate } from '../data/initialData';
import { TeacherStatusDetailModal, TeacherStatusTab } from './TeacherStatusDetailModal';

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

  // State Pop-up Modal Detail Status Guru
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState<boolean>(false);
  const [teacherModalTab, setTeacherModalTab] = useState<TeacherStatusTab>('izin');

  const openTeacherModal = (tab: TeacherStatusTab) => {
    setTeacherModalTab(tab);
    setIsTeacherModalOpen(true);
  };

  // Kamus nama lengkap guru
  const teachersMap = useMemo(() => {
    const map: Record<string, MasterGuru> = {};
    masterGuru.forEach(g => {
      map[g.kodeGuru] = g;
    });
    return map;
  }, [masterGuru]);

  // 1. DATA KBM HARI INI (Mengabaikan guru contoh, mapel contoh, dan kelas/ruang contoh)
  const schedulesToday = useMemo(() => {
    return schedules.filter(s => {
      if (s.hari.toLowerCase() !== dayNameIndo.toLowerCase()) return false;
      const tObj = teachersMap[s.kodeGuru];
      return !isSampleEntity({
        kodeGuru: s.kodeGuru,
        namaGuru: tObj?.namaLengkap,
        kodeMapel: s.kodeMapel,
        namaKelas: s.namaKelas,
      });
    });
  }, [schedules, dayNameIndo, teachersMap]);

  const logsToday = useMemo(() => {
    return attendanceLogs.filter(l => {
      if (!isSameDate(l.tanggal, selectedDate)) return false;
      return !isSampleEntity({
        kodeGuru: l.kodeGuru,
        namaGuru: l.namaGuru,
        namaMapel: l.mataPelajaran,
        namaKelas: l.kelas,
        lokasiRuang: l.ruangBelajar,
      });
    });
  }, [attendanceLogs, selectedDate]);

  // Sesi Aktif Saat Ini
  const activeSchedules = useMemo(() => {
    return schedulesToday.filter(s => s.periods.includes(activePeriodNumber));
  }, [schedulesToday, activePeriodNumber]);

  const activeSessionsCount = activeSchedules.length;

  // Cek apakah waktu saat ini sudah setelah jam pelajaran sekolah berakhir (After School / Pulang Sekolah)
  const isAfterSchool = useMemo(() => {
    // 1. Cek dari activePeriodNumber vs maxPeriod di jadwal hari ini
    const maxPeriodInToday = schedulesToday.length > 0 
      ? schedulesToday.reduce((max, s) => Math.max(max, s.endPeriod), 1)
      : 8;
    if (activePeriodNumber > maxPeriodInToday) return true;

    // 2. Cek jam WIB real-time vs jam selesai jadwal pelajaran hari ini (misal Jumat jam ke-5 selesai 10:45)
    if (wibTimeStr && selectedDate) {
      const daySchedules = getScheduleForDate(selectedDate);
      if (daySchedules && daySchedules.length > 0) {
        const lastPeriod = daySchedules[daySchedules.length - 1];
        if (lastPeriod && lastPeriod.endTime) {
          const [endH, endM] = lastPeriod.endTime.split(':').map(Number);
          const lastPeriodEndMinutes = endH * 60 + endM;

          const cleanTime = wibTimeStr.replace(/[^\d:]/g, '').trim();
          if (cleanTime.includes(':')) {
            const [curH, curM] = cleanTime.split(':').map(Number);
            const currentWibMinutes = curH * 60 + curM;
            if (currentWibMinutes > lastPeriodEndMinutes) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }, [schedulesToday, activePeriodNumber, wibTimeStr, selectedDate]);

  // Analisis Sesi KBM Hari Ini (Kumulatif: Sesi Berjalan & Terlewat yang startPeriod <= activePeriodNumber, atau seluruh sesi jika isAfterSchool)
  const todaySessionsAnalysis = useMemo(() => {
    const cumulativeSchedules = isAfterSchool 
      ? schedulesToday 
      : schedulesToday.filter(s => s.startPeriod <= activePeriodNumber);
    const totalCumulativeCount = cumulativeSchedules.length;

    let terkonfirmasiCount = 0;
    let belumKonfirmasiCount = 0;

    cumulativeSchedules.forEach(sched => {
      const normSchedClass = normalizeClassName(sched.namaKelas);
      const matchedLog = logsToday.find(l => {
        const normLogClass = normalizeClassName(l.kelas);
        if (normLogClass !== normSchedClass) return false;
        if (l.periods && l.periods.length > 0 && sched.periods && sched.periods.length > 0) {
          if (l.periods.some(p => sched.periods.includes(p))) return true;
        }
        if (l.mapelKe && sched.mapelKe && Number(l.mapelKe) === Number(sched.mapelKe)) return true;
        if (l.kodeGuru && sched.kodeGuru && l.kodeGuru.toLowerCase() === sched.kodeGuru.toLowerCase()) return true;
        return false;
      });

      if (
        matchedLog &&
        (matchedLog.statusKehadiran === 'Hadir' ||
          matchedLog.statusKehadiran === 'Sakit' ||
          matchedLog.statusKehadiran === 'Izin' ||
          matchedLog.statusKehadiran === 'Keperluan Pribadi' ||
          matchedLog.statusKehadiran === 'Dinas Luar' ||
          matchedLog.statusKehadiran === 'Instruksi Pimpinan' ||
          matchedLog.pengganti === 'Y')
      ) {
        terkonfirmasiCount++;
      } else {
        belumKonfirmasiCount++;
      }
    });

    const percent = totalCumulativeCount > 0 
      ? Math.round((terkonfirmasiCount / totalCumulativeCount) * 100) 
      : 0;

    return {
      terkonfirmasiCount,
      belumKonfirmasiCount,
      totalCumulativeCount,
      percent,
    };
  }, [schedulesToday, logsToday, activePeriodNumber, isAfterSchool]);

  // 2. DATA SESI KBM KESELURUHAN HARI INI (3 KATEGORI: BERLALU, AKTIF, AKAN DATANG)
  const totalDailySessions = schedulesToday.length;

  const dailySessionsBreakdown = useMemo(() => {
    // Jika waktu sudah lewat jam sekolah, seluruh sesi masuk ke kategori Berlalu (Sesi Aktif & Akan Datang = 0)
    if (isAfterSchool) {
      return {
        passedCount: totalDailySessions,
        activeTotalCount: 0,
        activeConfirmedCount: 0,
        upcomingCount: 0,
      };
    }

    let passedCount = 0;
    let upcomingCount = 0;
    const activeSessionsList: ScheduleItem[] = [];

    schedulesToday.forEach(s => {
      if (s.endPeriod < activePeriodNumber) {
        passedCount++;
      } else if (s.startPeriod > activePeriodNumber) {
        upcomingCount++;
      } else {
        // startPeriod <= activePeriodNumber && endPeriod >= activePeriodNumber
        activeSessionsList.push(s);
      }
    });

    // Hitung berapa sesi aktif yang gurunya sudah mengisi presensi
    let activeConfirmedCount = 0;
    activeSessionsList.forEach(sched => {
      const normSchedClass = normalizeClassName(sched.namaKelas);
      const matchedLog = logsToday.find(l => {
        const normLogClass = normalizeClassName(l.kelas);
        if (normLogClass !== normSchedClass) return false;
        if (l.periods && l.periods.length > 0 && sched.periods && sched.periods.length > 0) {
          if (l.periods.some(p => sched.periods.includes(p))) return true;
        }
        if (l.mapelKe && sched.mapelKe && Number(l.mapelKe) === Number(sched.mapelKe)) return true;
        if (l.kodeGuru && sched.kodeGuru && l.kodeGuru.toLowerCase() === sched.kodeGuru.toLowerCase()) return true;
        return false;
      });

      if (
        matchedLog &&
        (matchedLog.statusKehadiran === 'Hadir' ||
          matchedLog.statusKehadiran === 'Sakit' ||
          matchedLog.statusKehadiran === 'Izin' ||
          matchedLog.statusKehadiran === 'Keperluan Pribadi' ||
          matchedLog.statusKehadiran === 'Dinas Luar' ||
          matchedLog.statusKehadiran === 'Instruksi Pimpinan' ||
          matchedLog.pengganti === 'Y')
      ) {
        activeConfirmedCount++;
      }
    });

    return {
      passedCount,
      activeTotalCount: activeSessionsList.length,
      activeConfirmedCount,
      upcomingCount,
    };
  }, [schedulesToday, logsToday, activePeriodNumber, totalDailySessions, isAfterSchool]);

  // Status kelancaran KBM
  const kbmStatus = useMemo(() => {
    if (isWeekend) return { text: 'Libur Akhir Pekan', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (todaySessionsAnalysis.belumKonfirmasiCount === 0 && todaySessionsAnalysis.totalCumulativeCount > 0) {
      return { text: 'KBM 100% Lancar', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }
    if (todaySessionsAnalysis.percent >= 80) {
      return { text: 'KBM Sangat Lancar', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }
    if (todaySessionsAnalysis.percent >= 60) {
      return { text: 'KBM Berjalan Baik', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    }
    return { text: 'Perlu Perhatian Piket', color: 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse' };
  }, [todaySessionsAnalysis, isWeekend]);

  // 3. STATISTIK KETERANGAN GURU HARI INI (4 KRITERIA: ADA GURU, IZIN, BELUM KONFIRMASI, NON JADWAL)
  const teacherStats = useMemo(() => {
    // 1) Guru master aktif (eksklusi sampel)
    const activeMasterGuru = masterGuru.filter(
      g => !isSampleEntity({ kodeGuru: g.kodeGuru, namaGuru: g.namaLengkap })
    );

    const totalMasterTeachers = activeMasterGuru.length;

    // Kumpulan kode guru unik yang terjadwal mengajar hari ini
    const scheduledGuruCodes = new Set(
      schedulesToday
        .map(s => s.kodeGuru)
        .filter(Boolean)
        .filter(kode => {
          const tObj = teachersMap[kode];
          return !isSampleEntity({ kodeGuru: kode, namaGuru: tObj?.namaLengkap });
        })
    );

    let hadirCount = 0;
    let izinCount = 0;
    let belumKonfirmasiCount = 0;
    let nonJadwalCount = 0;

    activeMasterGuru.forEach(guru => {
      const kode = guru.kodeGuru;
      const isScheduled = scheduledGuruCodes.has(kode);
      const guruLogs = logsToday.filter(l => l.kodeGuru === kode);

      // Cek perizinan / ketidakhadiran
      const leaveLog = guruLogs.find(l => l.statusKehadiran && l.statusKehadiran !== 'Hadir');

      if (leaveLog) {
        izinCount++;
      } else {
        const presentLog = guruLogs.find(l => l.statusKehadiran === 'Hadir');
        if (presentLog) {
          hadirCount++;
        } else if (isScheduled) {
          // Punya jadwal mengajar tapi belum mengabsen sekalipun
          belumKonfirmasiCount++;
        } else {
          // Tidak ada jadwal mengajar hari ini
          nonJadwalCount++;
        }
      }
    });

    const categories = [
      { key: 'hadir', label: 'Ada Guru', count: hadirCount, color: '#10b981', bgClass: 'bg-emerald-500' },
      { key: 'izin', label: 'Izin', count: izinCount, color: '#f59e0b', bgClass: 'bg-amber-500' },
      { key: 'belumKonfirmasi', label: 'Belum Konfirmasi', count: belumKonfirmasiCount, color: '#e11d48', bgClass: 'bg-rose-600' },
      { key: 'nonJadwal', label: 'Tidak ada jadwal', count: nonJadwalCount, color: '#64748b', bgClass: 'bg-slate-500' },
    ];

    return {
      totalMasterTeachers,
      scheduledCount: scheduledGuruCodes.size,
      hadirCount,
      izinCount,
      belumKonfirmasiCount,
      nonJadwalCount,
      categories,
    };
  }, [masterGuru, schedulesToday, logsToday, teachersMap]);

  // Perhitungan Sudut Donut Chart SVG (4 Segmen)
  const donutSlices = useMemo(() => {
    const total = teacherStats.totalMasterTeachers || 1;
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
        const teacherObj = teachersMap[log.kodeGuru];
        if (isSampleEntity({ kodeGuru: log.kodeGuru, namaGuru: teacherObj?.namaLengkap || log.namaGuru })) {
          return;
        }
        const key = `${log.kodeGuru}_${log.statusKehadiran}`;
        if (!seenGuru.has(key)) {
          seenGuru.add(key);
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
            
            {/* KOTAK 2: SESI KBM HARI INI */}
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
                  SESI KBM HARI INI
                </span>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">Jam 1 - {activePeriodNumber}</span>
              </div>

              <div className="flex items-center justify-between gap-1.5">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
                      {todaySessionsAnalysis.percent}%
                    </span>
                  </div>
                  <div className="flex flex-col text-[9.5px] sm:text-[10.5px] text-slate-700 leading-snug mt-1 font-medium space-y-0.5">
                    <span className="text-emerald-800 font-semibold truncate flex items-center justify-between gap-1.5">
                      <span>Terkonfirmasi guru:</span>
                      <strong className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                        {todaySessionsAnalysis.terkonfirmasiCount}
                      </strong>
                    </span>
                    <span className={`truncate flex items-center justify-between gap-1.5 ${todaySessionsAnalysis.belumKonfirmasiCount > 0 ? 'text-rose-800 font-bold' : 'text-slate-500'}`}>
                      <span>Belum konfirmasi:</span>
                      <strong className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200 shrink-0">
                        {todaySessionsAnalysis.belumKonfirmasiCount}
                      </strong>
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
                        todaySessionsAnalysis.percent >= 80 
                          ? 'text-emerald-500' 
                          : todaySessionsAnalysis.percent >= 60 
                            ? 'text-amber-500' 
                            : 'text-rose-500'
                      }
                      strokeWidth="3.5"
                      strokeDasharray={`${(todaySessionsAnalysis.percent / 100) * 88} 88`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold text-slate-700">
                    {todaySessionsAnalysis.terkonfirmasiCount}/{todaySessionsAnalysis.totalCumulativeCount}
                  </div>
                </div>
              </div>
            </div>

            {/* KOTAK 3: SESI KBM KESELURUHAN HARI INI (3 SUB-KOTAK: BERLALU, AKTIF, AKAN DATANG) */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[98px]">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 truncate">
                  <CalendarDays className="w-3 h-3 text-blue-600 shrink-0" />
                  Sesi Harian
                </span>
                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded font-mono shrink-0 border border-blue-200">
                  {totalDailySessions} Total
                </span>
              </div>

              {/* 3 Sub-Kotak: Kiri (Berlalu), Tengah (Sesi Aktif), Kanan (Akan Datang) */}
              <div className="grid grid-cols-3 gap-1 mt-0.5">
                {/* 1. Kiri: Berlalu */}
                <div className="p-1 rounded-lg bg-slate-50 border border-slate-200 text-center flex flex-col justify-center">
                  <span className="text-[8.5px] text-slate-500 block leading-none font-medium">Berlalu</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-slate-800 tabular-nums mt-0.5">
                    {dailySessionsBreakdown.passedCount}
                  </span>
                </div>

                {/* 2. Tengah: Sesi Aktif (Format: Rasio Absen / Sesi Aktif) */}
                <div className="p-1 rounded-lg bg-emerald-50 border border-emerald-200 text-center flex flex-col justify-center">
                  <span className="text-[8.5px] text-emerald-800 block leading-none font-bold truncate">Sesi Aktif</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-emerald-700 tabular-nums mt-0.5" title="Sesi aktif yang sudah absen / Total sesi aktif saat ini">
                    {dailySessionsBreakdown.activeTotalCount > 0
                      ? `${dailySessionsBreakdown.activeConfirmedCount}/${dailySessionsBreakdown.activeTotalCount}`
                      : '0'}
                  </span>
                </div>

                {/* 3. Kanan: Akan Datang */}
                <div className="p-1 rounded-lg bg-indigo-50/70 border border-indigo-200 text-center flex flex-col justify-center">
                  <span className="text-[8.5px] text-indigo-700 block leading-none font-medium truncate">Akan Datang</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-indigo-800 tabular-nums mt-0.5">
                    {dailySessionsBreakdown.upcomingCount}
                  </span>
                </div>
              </div>
            </div>

            {/* KOTAK 4: STATUS GURU (DIAGRAM PIE/DONUT 4-KRITERIA) */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[98px]">
              <div 
                onClick={() => openTeacherModal('all')}
                className="flex items-center justify-between text-slate-500 mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                title="Klik untuk membuka detail status guru"
              >
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 truncate">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  Status Guru ({teacherStats.totalMasterTeachers})
                </span>
                {teacherStats.izinCount > 0 ? (
                  <span className="text-[9.5px] text-amber-800 font-bold bg-amber-50 px-1 py-0.2 rounded font-mono shrink-0 border border-amber-200">
                    {teacherStats.izinCount} Izin
                  </span>
                ) : (
                  <span className="text-[9.5px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded font-mono shrink-0 border border-emerald-200">
                    Nihil Izin
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Donut Chart SVG 4 Segmen (Klik untuk buka modal detail) */}
                <div 
                  onClick={() => openTeacherModal('all')}
                  className="relative w-12 h-12 sm:w-13 sm:h-13 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  title="Klik untuk melihat detail seluruh guru"
                >
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

                {/* 4 Baris Keterangan Ringkas (Sesuai Permintaan Spesifik User) */}
                <div className="flex-1 grid grid-cols-1 gap-0.5 text-[9px] sm:text-[9.5px] leading-tight">
                  {/* 1. Ada Guru */}
                  <div 
                    onClick={() => openTeacherModal('hadir')}
                    className="flex items-center justify-between text-emerald-900 hover:bg-emerald-50 p-0.5 rounded cursor-pointer transition-colors"
                    title="Klik untuk detail Ada Guru"
                  >
                    <span className="flex items-center gap-1 truncate font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      Ada Guru
                    </span>
                    <span className="font-mono font-bold bg-emerald-100/80 px-1 py-0.2 rounded text-[9px] text-emerald-900">
                      {teacherStats.hadirCount}
                    </span>
                  </div>

                  {/* 2. Izin */}
                  <div 
                    onClick={() => openTeacherModal('izin')}
                    className="flex items-center justify-between text-amber-900 hover:bg-amber-50 p-0.5 rounded cursor-pointer transition-colors"
                    title="Klik untuk detail Izin (Sakit, Pribadi, Dinas, Instruksi)"
                  >
                    <span className="flex items-center gap-1 truncate font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                      Izin (Sakit/Dinas)
                    </span>
                    <span className="font-mono font-bold bg-amber-100/80 px-1 py-0.2 rounded text-[9px] text-amber-900">
                      {teacherStats.izinCount}
                    </span>
                  </div>

                  {/* 3. Belum Konfirmasi */}
                  <div 
                    onClick={() => openTeacherModal('belumKonfirmasi')}
                    className="flex items-center justify-between text-rose-900 hover:bg-rose-50 p-0.5 rounded cursor-pointer transition-colors"
                    title="Klik untuk detail Guru Belum Konfirmasi"
                  >
                    <span className="flex items-center gap-1 truncate font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
                      Belum Konfirmasi
                    </span>
                    <span className="font-mono font-bold bg-rose-100/80 px-1 py-0.2 rounded text-[9px] text-rose-900">
                      {teacherStats.belumKonfirmasiCount}
                    </span>
                  </div>

                  {/* 4. Tidak ada jadwal */}
                  <div 
                    onClick={() => openTeacherModal('nonJadwal')}
                    className="flex items-center justify-between text-slate-700 hover:bg-slate-100 p-0.5 rounded cursor-pointer transition-colors"
                    title="Klik untuk detail Guru Non-Jadwal"
                  >
                    <span className="flex items-center gap-1 truncate font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0"></span>
                      Tidak ada jadwal
                    </span>
                    <span className="font-mono font-bold bg-slate-100 px-1 py-0.2 rounded text-[9px] text-slate-800">
                      {teacherStats.nonJadwalCount}
                    </span>
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

      {/* Pop-up Modal Detail Status Guru */}
      <TeacherStatusDetailModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        initialTab={teacherModalTab}
        masterGuru={masterGuru}
        schedulesToday={schedulesToday}
        logsToday={logsToday}
        selectedDate={selectedDate}
      />
    </div>
  );
};
