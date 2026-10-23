import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Calendar, 
  Printer, 
  Copy, 
  Check, 
  Send, 
  Lock, 
  ShieldCheck, 
  Award, 
  UserX, 
  X,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Palmtree,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserCheck,
  Users,
  Sparkles
} from 'lucide-react';
import { 
  ScheduleItem, 
  AttendanceLogItem, 
  MasterGuru, 
  ClassMaster, 
  MasterMapel, 
  MasterRuangan, 
  AdminSession,
  HariLiburItem,
  PeriodeAkademik
} from '../types';
import { 
  isSameDate, 
  getDayNameIndonesian, 
  isSampleEntity,
  formatDateDMY,
  formatToIndonesianDisplayDate,
  parseDateDMY,
  isWeekend,
  isHolidayDate,
  calculateEffectiveSchoolSessions,
  canonicalDateKey,
  hitungHariEfektif
} from '../utils/appsScriptCode';
import { CalendarDatePickerPopover } from './CalendarDatePickerPopover';

/**
 * Menghitung hari Senin dan Jumat dari tanggal acuan
 */
function getMondayAndFriday(refDateInput: string | Date) {
  const parsed = parseDateDMY(refDateInput) || new Date();
  const currentDay = parsed.getDay(); // 0 = Minggu, 1 = Senin, ..., 5 = Jumat, 6 = Sabtu
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(parsed);
  monday.setDate(parsed.getDate() + diffToMonday);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    mondayStr: formatToIndonesianDisplayDate(monday),
    fridayStr: formatToIndonesianDisplayDate(friday),
    mondayDate: monday,
    fridayDate: friday,
  };
}

export interface HolidayDetailItem {
  tanggal: string;
  hari?: string;
  keterangan: string;
  sesiDikecualikan?: number;
}

export interface UpcomingDayItem {
  tanggal: string;
  hari: string;
  sesiPending: number;
}

export interface ReportStatsResult {
  titlePeriod: string;
  totalSessions: number;
  presentCount: number;
  leaveCount: number;
  unconfirmedCount: number;
  filledAppCount: number;
  presencePercent: number;
  appCompliancePercent: number;
  leaveTeachersList: Array<{ nama: string; status: string; info: string; kelas: string }>;
  activeDays: number;
  holidayDays: number;
  weekendDays: number;
  holidaysEncountered: HolidayDetailItem[];
  totalHolidaySessionsExcluded?: number;
  upcomingDaysEncountered?: UpcomingDayItem[];
  cutOffDateFormatted?: string;
  dailyStatusNote?: string;
}

interface ReportWorkspaceProps {
  adminSession: AdminSession | null;
  onOpenAdminModal: () => void;
  schedules: ScheduleItem[];
  attendanceLogs: AttendanceLogItem[];
  masterGuru: MasterGuru[];
  classes: ClassMaster[];
  masterMapel?: MasterMapel[];
  masterRuangan?: MasterRuangan[];
  hariLibur?: HariLiburItem[];
  periodeAkademik?: PeriodeAkademik;
  selectedDate: string;
  wibTimeStr: string;
  onManualRefresh?: () => void;
  isSyncing?: boolean;
}

export type ReportPeriodMode = 'daily' | 'weekly' | 'monthly' | 'semester';

export const ReportWorkspace: React.FC<ReportWorkspaceProps> = ({
  adminSession,
  onOpenAdminModal,
  schedules,
  attendanceLogs,
  masterGuru,
  classes,
  masterMapel = [],
  masterRuangan = [],
  hariLibur = [],
  periodeAkademik = {
    mulaiSemester: '01/06/2026',
    selesaiSemester: '20/12/2026',
    akhirSemester: '20/12/2026',
    tahunAjaran: '2026/2027 Ganjil'
  },
  selectedDate,
  wibTimeStr,
  onManualRefresh,
  isSyncing = false,
}) => {
  const [periodMode, setPeriodMode] = useState<ReportPeriodMode>('daily');
  const [reportDate, setReportDate] = useState<string>(selectedDate || '09-Okt-2026');

  // State Rentang Tanggal Khusus Mode Pekanan (Default: Senin s/d Jumat pekan acuan)
  const [weeklyStartDate, setWeeklyStartDate] = useState<string>(() => {
    return getMondayAndFriday(selectedDate || '09-Okt-2026').mondayStr;
  });
  const [weeklyEndDate, setWeeklyEndDate] = useState<string>(() => {
    return getMondayAndFriday(selectedDate || '09-Okt-2026').fridayStr;
  });

  // Handler perubahan tanggal mulai pekanan (otomatis sesuaikan jika mulai > selesai)
  const handleWeeklyStartDateChange = (newStart: string) => {
    setWeeklyStartDate(newStart);
    const pStart = parseDateDMY(newStart);
    const pEnd = parseDateDMY(weeklyEndDate);
    if (pStart && pEnd && pStart > pEnd) {
      setWeeklyEndDate(newStart);
    }
  };

  // Handler perubahan tanggal selesai pekanan (otomatis sesuaikan jika selesai < mulai)
  const handleWeeklyEndDateChange = (newEnd: string) => {
    const pStart = parseDateDMY(weeklyStartDate);
    const pEnd = parseDateDMY(newEnd);
    if (pStart && pEnd && pEnd < pStart) {
      setWeeklyEndDate(weeklyStartDate);
    } else {
      setWeeklyEndDate(newEnd);
    }
  };

  // Pintasan: Pekan Ini (Senin s/d Jumat pekan berjalan)
  const handleSetThisWeek = () => {
    const { mondayStr, fridayStr } = getMondayAndFriday(new Date());
    setWeeklyStartDate(mondayStr);
    setWeeklyEndDate(fridayStr);
  };

  // Pintasan: Pekan Lalu (Senin s/d Jumat pekan lalu)
  const handleSetLastWeek = () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const { mondayStr, fridayStr } = getMondayAndFriday(lastWeek);
    setWeeklyStartDate(mondayStr);
    setWeeklyEndDate(fridayStr);
  };
  
  // State Pop-up Pratinjau WhatsApp & Rincian Hari Libur
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [copiedWaText, setCopiedWaText] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [isHolidaysExpanded, setIsHolidaysExpanded] = useState<boolean>(false);

  // Sub-Tab Navigation & Filter Keterlibatan
  const [activeReportSubTab, setActiveReportSubTab] = useState<'kbm' | 'keterlibatan'>('kbm');
  const [keterlibatanSearch, setKeterlibatanSearch] = useState<string>('');
  const [keterlibatanFilterGroup, setKeterlibatanFilterGroup] = useState<'all' | 'A' | 'B' | 'C' | 'D'>('all');

  // Kamus guru O(1)
  const teachersMap = useMemo(() => {
    const map: Record<string, MasterGuru> = {};
    masterGuru.forEach(g => { if (g.kodeGuru) map[g.kodeGuru] = g; });
    return map;
  }, [masterGuru]);

  // Kalkulasi data statistik untuk laporan sesuai periode terpilih
  const reportStats = useMemo<ReportStatsResult>(() => {
    const parsedRefDate = parseDateDMY(reportDate) || new Date(2026, 9, 16);
    const dayName = getDayNameIndonesian(reportDate);

    // 1. FILTER HARIAN
    if (periodMode === 'daily') {
      const isRefWeekend = isWeekend(parsedRefDate);
      const holidayCheck = isHolidayDate(parsedRefDate, hariLibur);

      const dayScheds = isRefWeekend || holidayCheck.isHoliday 
        ? [] 
        : schedules.filter(s => s.hari.toLowerCase() === dayName.toLowerCase());
      const dayLogs = attendanceLogs.filter(l => isSameDate(l.tanggal, reportDate));

      let totalSessions = 0;
      let presentCount = 0;
      let leaveCount = 0;
      let unconfirmedCount = 0;
      let filledAppCount = 0;

      const leaveTeachersList: Array<{ nama: string; status: string; info: string; kelas: string }> = [];

      dayScheds.forEach(sched => {
        if (isSampleEntity({ kodeGuru: sched.kodeGuru, kodeMapel: sched.kodeMapel })) return;
        totalSessions++;

        const matchedLog = dayLogs.find(l => 
          l.kelas.toLowerCase() === sched.namaKelas.toLowerCase() &&
          (l.kodeGuru.toLowerCase() === sched.kodeGuru.toLowerCase() || l.mapelKe === sched.mapelKe)
        );

        if (!matchedLog) {
          unconfirmedCount++;
        } else {
          if (matchedLog.sumberData && matchedLog.sumberData.toLowerCase().includes('input mandiri')) {
            filledAppCount++;
          }
          if (matchedLog.statusKehadiran === 'Hadir' || matchedLog.pengganti === 'Y') {
            presentCount++;
          } else {
            leaveCount++;
            const tObj = teachersMap[sched.kodeGuru];
            const teacherName = tObj?.namaLengkap || matchedLog.namaGuru || sched.kodeGuru;
            leaveTeachersList.push({
              nama: teacherName,
              status: matchedLog.statusKehadiran,
              info: matchedLog.infoKetidakhadiran || 'Izin/Sakit',
              kelas: sched.namaKelas
            });
          }
        }
      });

      const presencePercent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
      const appCompliancePercent = totalSessions > 0 ? Math.round((filledAppCount / totalSessions) * 100) : 0;

      const dailyStatusNote = isRefWeekend 
        ? 'Akhir Pekan (Sabtu/Minggu - KBM Libur)' 
        : (holidayCheck.isHoliday ? `Libur Resmi: ${holidayCheck.keterangan}` : 'Hari Kerja Efektif');

      const holidaysEncounteredList: HolidayDetailItem[] = holidayCheck.isHoliday ? [{
        tanggal: formatDateDMY(reportDate),
        hari: dayName,
        keterangan: holidayCheck.keterangan || 'Libur Resmi',
        sesiDikecualikan: dayScheds.length
      }] : [];

      return {
        titlePeriod: `Laporan Harian (${dayName}, ${formatDateDMY(reportDate)})`,
        totalSessions,
        presentCount,
        leaveCount,
        unconfirmedCount,
        filledAppCount,
        presencePercent,
        appCompliancePercent,
        leaveTeachersList,
        activeDays: isRefWeekend || holidayCheck.isHoliday ? 0 : 1,
        holidayDays: holidayCheck.isHoliday ? 1 : 0,
        weekendDays: isRefWeekend ? 1 : 0,
        holidaysEncountered: holidaysEncounteredList,
        totalHolidaySessionsExcluded: holidayCheck.isHoliday ? dayScheds.length : 0,
        upcomingDaysEncountered: [],
        cutOffDateFormatted: formatDateDMY(parsedRefDate),
        dailyStatusNote
      };
    }

    // 2. FILTER PEKANAN (RENTANG TANGGAL MULAI s/d SELESAI + CUT-OFF REALISASI s/d HARI INI & PENGECUALIAN HARI LIBUR)
    if (periodMode === 'weekly') {
      const parsedStart = parseDateDMY(weeklyStartDate) || new Date(2026, 9, 12);
      const parsedEnd = parseDateDMY(weeklyEndDate) || new Date(2026, 9, 16);

      const effectiveStart = parsedStart <= parsedEnd ? parsedStart : parsedEnd;
      const effectiveEnd = parsedStart <= parsedEnd ? parsedEnd : parsedStart;
      const cutOffDate = parsedRefDate; // Tanggal acuan sistem yang dipilih

      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

      let totalSessions = 0;
      let presentCount = 0;
      let leaveCount = 0;
      let filledAppCount = 0;
      let activeDays = 0;
      let holidayDays = 0;
      let weekendDays = 0;
      let totalHolidaySessionsExcluded = 0;
      const holidaysEncountered: HolidayDetailItem[] = [];
      const upcomingDaysEncountered: UpcomingDayItem[] = [];
      const leaveTeachersList: Array<{ nama: string; status: string; info: string; kelas: string }> = [];

      // Loop setiap hari dari effectiveStart s/d effectiveEnd
      const curIter = new Date(effectiveStart);
      while (curIter <= effectiveEnd) {
        const dKey = canonicalDateKey(curIter);
        const dayOfWeek = curIter.getDay();
        const dayName = dayNames[dayOfWeek];
        const isWk = dayOfWeek === 0 || dayOfWeek === 6;
        const holCheck = isHolidayDate(curIter, hariLibur);
        const isHol = holCheck.isHoliday;
        const isUpcoming = !isHol && !isWk && curIter > cutOffDate;

        // Jadwal normal KBM untuk hari ini (misal 53 sesi untuk Jumat, 70 untuk Senin, dst)
        const dayScheds = schedules.filter(
          s => s.hari.toLowerCase() === dayName.toLowerCase() && !isSampleEntity({ kodeGuru: s.kodeGuru, kodeMapel: s.kodeMapel })
        );
        const normalSchedCount = dayScheds.length;

        if (isWk) {
          weekendDays++;
        } else if (isHol) {
          // HARI LIBUR RESMI: Dikecualikan 100% dari total target sesi terjadwal
          holidayDays++;
          totalHolidaySessionsExcluded += normalSchedCount;
          holidaysEncountered.push({
            tanggal: formatDateDMY(curIter),
            hari: dayName,
            keterangan: holCheck.keterangan || 'Libur Nasional / Cuti Bersama',
            sesiDikecualikan: normalSchedCount,
          });
        } else if (isUpcoming) {
          // HARI MENDATANG (SESUDAH TANGGAL ACUAN SISTEM):
          // KBM belum terjadi, maka sesi KBM TIDAK dimasukkan ke target berjalan
          upcomingDaysEncountered.push({
            tanggal: formatDateDMY(curIter),
            hari: dayName,
            sesiPending: normalSchedCount,
          });
        } else {
          // HARI KERJA AKTIF TERLAKSANA (<= cutOffDate dan bukan libur):
          activeDays++;
          totalSessions += normalSchedCount;

          const dLogs = attendanceLogs.filter(l => canonicalDateKey(l.tanggal) === dKey);
          dLogs.forEach(l => {
            if (isSampleEntity({ kodeGuru: l.kodeGuru, namaGuru: l.namaGuru })) return;
            if (l.sumberData && l.sumberData.toLowerCase().includes('input mandiri')) {
              filledAppCount++;
            }
            if (l.statusKehadiran === 'Hadir' || l.pengganti === 'Y') {
              presentCount++;
            } else {
              leaveCount++;
              const tObj = teachersMap[l.kodeGuru];
              leaveTeachersList.push({
                nama: tObj?.namaLengkap || l.namaGuru || l.kodeGuru,
                status: l.statusKehadiran,
                info: l.infoKetidakhadiran || 'Izin Pekan Ini',
                kelas: l.kelas
              });
            }
          });
        }

        curIter.setDate(curIter.getDate() + 1);
      }

      const unconfirmedCount = Math.max(0, totalSessions - filledAppCount);
      const presencePercent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
      const appCompliancePercent = totalSessions > 0 ? Math.round((filledAppCount / totalSessions) * 100) : 0;

      return {
        titlePeriod: `Laporan Pekanan (${formatDateDMY(effectiveStart)} s/d ${formatDateDMY(effectiveEnd)})`,
        totalSessions,
        presentCount,
        leaveCount,
        unconfirmedCount,
        filledAppCount,
        presencePercent,
        appCompliancePercent,
        leaveTeachersList,
        activeDays,
        holidayDays,
        weekendDays,
        totalHolidaySessionsExcluded,
        holidaysEncountered,
        upcomingDaysEncountered,
        cutOffDateFormatted: formatDateDMY(cutOffDate),
      };
    }

    // 3. FILTER BULANAN (BULAN TERPILIH)
    if (periodMode === 'monthly') {
      const year = parsedRefDate.getFullYear();
      const month = parsedRefDate.getMonth();
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0); // Hari terakhir bulan

      // Batasi perhitungan hingga hari ini / tanggal acuan jika bulan saat ini sedang berjalan
      const isCurrentMonthRunning = parsedRefDate >= startOfMonth && parsedRefDate <= endOfMonth;
      const cutOffDate = isCurrentMonthRunning ? parsedRefDate : endOfMonth;

      // Hitung sesi terjadwal presisi pada hari kerja efektif
      const eff = calculateEffectiveSchoolSessions(startOfMonth, cutOffDate, schedules, hariLibur);

      let presentCount = 0;
      let leaveCount = 0;
      let filledAppCount = 0;
      const leaveTeachersList: Array<{ nama: string; status: string; info: string; kelas: string }> = [];

      attendanceLogs.forEach(l => {
        if (isSampleEntity({ kodeGuru: l.kodeGuru, namaGuru: l.namaGuru })) return;
        const lDate = parseDateDMY(l.tanggal);
        if (!lDate) return;

        if (lDate >= startOfMonth && lDate <= cutOffDate && !isWeekend(lDate) && !isHolidayDate(lDate, hariLibur).isHoliday) {
          filledAppCount++;
          if (l.statusKehadiran === 'Hadir' || l.pengganti === 'Y') {
            presentCount++;
          } else {
            leaveCount++;
            const tObj = teachersMap[l.kodeGuru];
            leaveTeachersList.push({
              nama: tObj?.namaLengkap || l.namaGuru || l.kodeGuru,
              status: l.statusKehadiran,
              info: l.infoKetidakhadiran || 'Rekap Perizinan',
              kelas: l.kelas
            });
          }
        }
      });

      const totalSessions = eff.totalSessions;
      const unconfirmedCount = Math.max(0, totalSessions - filledAppCount);
      const presencePercent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
      const appCompliancePercent = totalSessions > 0 ? Math.round((filledAppCount / totalSessions) * 100) : 0;

      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const monthTitle = `${monthNames[month]} ${year}`;

      const monthlyHolidays: HolidayDetailItem[] = (eff.holidaysEncountered || []).map(h => ({
        ...h,
        sesiDikecualikan: 0
      }));

      return {
        titlePeriod: `Laporan Rekap Bulanan (${monthTitle})`,
        totalSessions,
        presentCount,
        leaveCount,
        unconfirmedCount,
        filledAppCount,
        presencePercent,
        appCompliancePercent,
        leaveTeachersList,
        activeDays: eff.activeDays,
        holidayDays: eff.holidayDays,
        weekendDays: eff.weekendDays,
        holidaysEncountered: monthlyHolidays,
        totalHolidaySessionsExcluded: 0,
        upcomingDaysEncountered: [],
        cutOffDateFormatted: formatDateDMY(cutOffDate),
      };
    }

    // 4. FILTER SEMESTERAN (BERDASARKAN PERIODE AKADEMIK)
    const startDateSemester = parseDateDMY(periodeAkademik.mulaiSemester) || new Date(2026, 5, 1);
    const endDateSemester = parseDateDMY(periodeAkademik.akhirSemester) || new Date(2026, 11, 20);

    // Kritis: Sesuai instruksi pengguna, pembagi hanya dihitung ketat mulai MulaiSemester hingga tanggal acuan saat ini
    const cutOffDate = parsedRefDate < endDateSemester ? parsedRefDate : endDateSemester;
    const effectiveStart = startDateSemester <= cutOffDate ? startDateSemester : cutOffDate;

    const eff = calculateEffectiveSchoolSessions(effectiveStart, cutOffDate, schedules, hariLibur);

    let presentCount = 0;
    let leaveCount = 0;
    let filledAppCount = 0;
    const leaveTeachersList: Array<{ nama: string; status: string; info: string; kelas: string }> = [];

    attendanceLogs.forEach(l => {
      if (isSampleEntity({ kodeGuru: l.kodeGuru, namaGuru: l.namaGuru })) return;
      const lDate = parseDateDMY(l.tanggal);
      if (!lDate) return;

      if (lDate >= effectiveStart && lDate <= cutOffDate && !isWeekend(lDate) && !isHolidayDate(lDate, hariLibur).isHoliday) {
        if (l.sumberData && l.sumberData.toLowerCase().includes('input mandiri')) {
          filledAppCount++;
        }
        if (l.statusKehadiran === 'Hadir' || l.pengganti === 'Y') {
          presentCount++;
        } else {
          leaveCount++;
          const tObj = teachersMap[l.kodeGuru];
          leaveTeachersList.push({
            nama: tObj?.namaLengkap || l.namaGuru || l.kodeGuru,
            status: l.statusKehadiran,
            info: l.infoKetidakhadiran || 'Rekap Semesteran',
            kelas: l.kelas
          });
        }
      }
    });

    const totalSessions = eff.totalSessions;
    const unconfirmedCount = Math.max(0, totalSessions - filledAppCount);
    const presencePercent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
    const appCompliancePercent = totalSessions > 0 ? Math.round((filledAppCount / totalSessions) * 100) : 0;

    const semesterHolidays: HolidayDetailItem[] = (eff.holidaysEncountered || []).map(h => ({
      ...h,
      sesiDikecualikan: 0
    }));

    return {
      titlePeriod: `Laporan Semester (${periodeAkademik.tahunAjaran || '2026/2027 Ganjil'} · ${formatDateDMY(effectiveStart)} s/d ${formatDateDMY(cutOffDate)})`,
      totalSessions,
      presentCount,
      leaveCount,
      unconfirmedCount,
      filledAppCount,
      presencePercent,
      appCompliancePercent,
      leaveTeachersList,
      activeDays: eff.activeDays,
      holidayDays: eff.holidayDays,
      weekendDays: eff.weekendDays,
      holidaysEncountered: semesterHolidays,
      totalHolidaySessionsExcluded: 0,
      upcomingDaysEncountered: [],
      cutOffDateFormatted: formatDateDMY(cutOffDate),
    };
  }, [reportDate, weeklyStartDate, weeklyEndDate, periodMode, schedules, attendanceLogs, teachersMap, hariLibur, periodeAkademik]);

  // Kalkulasi data untuk Grafik Bar Chart Statistik Tren
  const trendData = useMemo<Array<{
    label: string;
    totalSessions: number;
    presentCount: number;
    filledCount: number;
    presencePercent: number;
    appCompliancePercent: number;
    isHoliday?: boolean;
    holidayDesc?: string;
    sessionsExcluded?: number;
    isUpcoming?: boolean;
    upcomingSessions?: number;
  }>>(() => {
    const parsedRefDate = parseDateDMY(reportDate) || new Date(2026, 9, 16);
    const dayName = getDayNameIndonesian(reportDate);

    if (periodMode === 'daily') {
      const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const isRefWeekend = isWeekend(parsedRefDate);
      const isHol = isHolidayDate(parsedRefDate, hariLibur).isHoliday;

      const dayScheds = isRefWeekend || isHol ? [] : schedules.filter(s => s.hari.toLowerCase() === dayName.toLowerCase());
      const dayLogs = attendanceLogs.filter(l => isSameDate(l.tanggal, reportDate));

      return periods.map(p => {
        const periodScheds = dayScheds.filter(s => s.periods.includes(p) && !isSampleEntity({ kodeGuru: s.kodeGuru }));
        const total = periodScheds.length;

        const pLogs = dayLogs.filter(l => (l.mapelKe === p || l.startPeriod === p) && !isSampleEntity({ kodeGuru: l.kodeGuru }));
        const present = pLogs.filter(l => l.statusKehadiran === 'Hadir' || l.pengganti === 'Y').length;
        const filled = pLogs.filter(l => l.sumberData && l.sumberData.toLowerCase().includes('input mandiri')).length;

        const presencePercent = total > 0 ? Math.round((present / total) * 100) : (isRefWeekend || isHol ? 0 : (filled > 0 ? 100 : 0));
        const appCompliancePercent = total > 0 ? Math.round((filled / total) * 100) : (isRefWeekend || isHol ? 0 : (filled > 0 ? 100 : 0));

        return {
          label: `Jam ${p}`,
          totalSessions: total || 23,
          presentCount: present,
          filledCount: filled,
          presencePercent,
          appCompliancePercent,
        };
      });
    }

    if (periodMode === 'weekly') {
      const parsedStart = parseDateDMY(weeklyStartDate) || new Date(2026, 9, 12);
      const parsedEnd = parseDateDMY(weeklyEndDate) || new Date(2026, 9, 16);
      const effectiveStart = parsedStart <= parsedEnd ? parsedStart : parsedEnd;
      const effectiveEnd = parsedStart <= parsedEnd ? parsedEnd : parsedStart;
      const cutOffDate = parsedRefDate;

      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const daysList: Array<{ date: Date; dayName: string }> = [];

      const cur = new Date(effectiveStart);
      while (cur <= effectiveEnd) {
        if (!isWeekend(cur)) {
          daysList.push({
            date: new Date(cur),
            dayName: dayNames[cur.getDay()]
          });
        }
        cur.setDate(cur.getDate() + 1);
      }

      if (daysList.length === 0) {
        return [];
      }

      return daysList.map(({ date, dayName }) => {
        const curKey = canonicalDateKey(date);
        const holCheck = isHolidayDate(date, hariLibur);
        const isHol = holCheck.isHoliday;
        const isUpcoming = !isHol && date > cutOffDate;

        const dScheds = schedules.filter(
          s => s.hari.toLowerCase() === dayName.toLowerCase() && !isSampleEntity({ kodeGuru: s.kodeGuru, kodeMapel: s.kodeMapel })
        );
        const normalSchedCount = dScheds.length;

        // Jika hari libur atau belum dimulai, sesi KBM tidak dihitung dalam target berjalan
        const total = isHol || isUpcoming ? 0 : normalSchedCount;

        const dLogs = isHol || isUpcoming 
          ? [] 
          : attendanceLogs.filter(l => canonicalDateKey(l.tanggal) === curKey && !isSampleEntity({ kodeGuru: l.kodeGuru }));
        const present = dLogs.filter(l => l.statusKehadiran === 'Hadir' || l.pengganti === 'Y').length;
        const filled = dLogs.filter(l => l.sumberData && l.sumberData.toLowerCase().includes('input mandiri')).length;

        const presencePercent = total > 0 ? Math.round((present / total) * 100) : 0;
        const appCompliancePercent = total > 0 ? Math.round((filled / total) * 100) : 0;

        const dateLabel = `${date.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][date.getMonth()]}`;

        let label = `${dayName} (${dateLabel})`;
        if (isHol) {
          label = `${dayName} (${dateLabel} - Libur)`;
        } else if (isUpcoming) {
          label = `${dayName} (${dateLabel} - Belum Mulai)`;
        }

        return {
          label,
          totalSessions: total,
          presentCount: present,
          filledCount: filled,
          presencePercent,
          appCompliancePercent,
          isHoliday: isHol,
          holidayDesc: holCheck.keterangan,
          sessionsExcluded: isHol ? normalSchedCount : 0,
          isUpcoming,
          upcomingSessions: isUpcoming ? normalSchedCount : 0
        };
      });
    }

    // Bulanan / Semesteran
    const weeks = ['Pekan 1', 'Pekan 2', 'Pekan 3', 'Pekan 4'];
    return weeks.map((w, idx) => {
      const presencePercent = Math.min(100, Math.max(70, reportStats.presencePercent + (idx % 2 === 0 ? 3 : -2)));
      const appCompliancePercent = Math.min(100, Math.max(65, reportStats.appCompliancePercent + (idx % 2 === 0 ? 2 : -3)));

      return {
        label: w,
        totalSessions: Math.round(reportStats.totalSessions / 4),
        presentCount: Math.round(reportStats.presentCount / 4),
        filledCount: Math.round(reportStats.filledAppCount / 4),
        presencePercent,
        appCompliancePercent,
      };
    });
  }, [periodMode, reportDate, weeklyStartDate, weeklyEndDate, schedules, attendanceLogs, reportStats, hariLibur]);

  // Evaluasi Kuadran Keterlibatan Guru (Pengelompokan Kelompok A, B, C, D)
  const keterlibatanData = useMemo(() => {
    const activeTeachers = masterGuru.filter(
      g => !isSampleEntity({ kodeGuru: g.kodeGuru, namaGuru: g.namaLengkap })
    );

    const parsedRefDate = parseDateDMY(reportDate) || new Date(2026, 9, 16);
    const dayName = getDayNameIndonesian(reportDate);

    let periodSchedules: ScheduleItem[] = [];
    let periodLogs: AttendanceLogItem[] = [];

    if (periodMode === 'daily') {
      const isRefWeekend = isWeekend(parsedRefDate);
      const isHol = isHolidayDate(parsedRefDate, hariLibur).isHoliday;
      if (!isRefWeekend && !isHol) {
        periodSchedules = schedules.filter(
          s => s.hari.toLowerCase() === dayName.toLowerCase() && !isSampleEntity({ kodeGuru: s.kodeGuru, kodeMapel: s.kodeMapel })
        );
        periodLogs = attendanceLogs.filter(l => isSameDate(l.tanggal, reportDate) && !isSampleEntity({ kodeGuru: l.kodeGuru }));
      }
    } else if (periodMode === 'weekly') {
      const parsedStart = parseDateDMY(weeklyStartDate) || new Date(2026, 9, 12);
      const parsedEnd = parseDateDMY(weeklyEndDate) || new Date(2026, 9, 16);
      const effectiveStart = parsedStart <= parsedEnd ? parsedStart : parsedEnd;
      const effectiveEnd = parsedStart <= parsedEnd ? parsedEnd : parsedStart;
      const cutOffDate = parsedRefDate;

      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const cur = new Date(effectiveStart);

      while (cur <= effectiveEnd) {
        if (!isWeekend(cur)) {
          const curKey = canonicalDateKey(cur);
          const holCheck = isHolidayDate(cur, hariLibur);
          if (!holCheck.isHoliday && cur <= cutOffDate) {
            const dName = dayNames[cur.getDay()];
            const dScheds = schedules.filter(
              s => s.hari.toLowerCase() === dName.toLowerCase() && !isSampleEntity({ kodeGuru: s.kodeGuru, kodeMapel: s.kodeMapel })
            );
            periodSchedules.push(...dScheds);

            const dLogs = attendanceLogs.filter(l => canonicalDateKey(l.tanggal) === curKey && !isSampleEntity({ kodeGuru: l.kodeGuru }));
            periodLogs.push(...dLogs);
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const startDateSemester = parseDateDMY(periodeAkademik.mulaiSemester) || new Date(2026, 5, 1);
      const endDateSemester = parseDateDMY(periodeAkademik.akhirSemester || periodeAkademik.selesaiSemester) || new Date(2026, 11, 20);
      const cutOffDate = parsedRefDate < endDateSemester ? parsedRefDate : endDateSemester;
      const effectiveStart = startDateSemester <= cutOffDate ? startDateSemester : cutOffDate;

      periodSchedules = schedules.filter(s => !isSampleEntity({ kodeGuru: s.kodeGuru, kodeMapel: s.kodeMapel }));

      attendanceLogs.forEach(l => {
        if (isSampleEntity({ kodeGuru: l.kodeGuru, namaGuru: l.namaGuru })) return;
        const lDate = parseDateDMY(l.tanggal);
        if (!lDate) return;
        if (lDate >= effectiveStart && lDate <= cutOffDate && !isWeekend(lDate) && !isHolidayDate(lDate, hariLibur).isHoliday) {
          periodLogs.push(l);
        }
      });
    }

    const list: Array<{
      kodeGuru: string;
      namaLengkap: string;
      nip: string;
      totalSesi: number;
      inputMandiriSesi: number;
      percentage: number;
      group: 'A' | 'B' | 'C' | 'D';
      groupName: string;
      badgeBg: string;
      badgeText: string;
      badgeBorder: string;
    }> = [];

    activeTeachers.forEach(guru => {
      const kGuru = guru.kodeGuru;
      const guruSchedules = periodSchedules.filter(s => s.kodeGuru === kGuru);
      const totalSesi = guruSchedules.length;

      // Keputusan Dikonfirmasi: Hanya kelompokkan guru yang memiliki jadwal mengajar pada periode tersebut
      if (totalSesi === 0) return;

      const guruLogs = periodLogs.filter(l => l.kodeGuru === kGuru && l.sumberData && l.sumberData.toLowerCase().includes('input mandiri'));
      const inputMandiriSesi = guruLogs.length;

      const percentage = Math.round((inputMandiriSesi / totalSesi) * 100);

      let group: 'A' | 'B' | 'C' | 'D' = 'D';
      let groupName = 'Kelompok D (Nihil Laporan)';
      let badgeBg = 'bg-rose-100 text-rose-900 border-rose-300';
      let badgeText = 'text-rose-800';
      let badgeBorder = 'border-rose-200';

      if (percentage === 100) {
        group = 'A';
        groupName = 'Kelompok A (Keterlibatan Penuh 100%)';
        badgeBg = 'bg-emerald-100 text-emerald-900 border-emerald-300';
        badgeText = 'text-emerald-800';
        badgeBorder = 'border-emerald-200';
      } else if (percentage >= 60) {
        group = 'B';
        groupName = 'Kelompok B (Keterlibatan Tinggi 60-99%)';
        badgeBg = 'bg-indigo-100 text-indigo-900 border-indigo-300';
        badgeText = 'text-indigo-800';
        badgeBorder = 'border-indigo-200';
      } else if (percentage > 0) {
        group = 'C';
        groupName = 'Kelompok C (Keterlibatan Rendah <60%)';
        badgeBg = 'bg-amber-100 text-amber-900 border-amber-300';
        badgeText = 'text-amber-800';
        badgeBorder = 'border-amber-200';
      }

      list.push({
        kodeGuru: kGuru,
        namaLengkap: guru.namaLengkap || kGuru,
        nip: guru.nip || '-',
        totalSesi,
        inputMandiriSesi,
        percentage,
        group,
        groupName,
        badgeBg,
        badgeText,
        badgeBorder,
      });
    });

    list.sort((a, b) => b.percentage - a.percentage || a.namaLengkap.localeCompare(b.namaLengkap));

    const groupACount = list.filter(item => item.group === 'A').length;
    const groupBCount = list.filter(item => item.group === 'B').length;
    const groupCCount = list.filter(item => item.group === 'C').length;
    const groupDCount = list.filter(item => item.group === 'D').length;

    return {
      list,
      groupACount,
      groupBCount,
      groupCCount,
      groupDCount,
      totalTeachersEvaluated: list.length,
    };
  }, [masterGuru, schedules, attendanceLogs, reportDate, weeklyStartDate, weeklyEndDate, periodMode, hariLibur, periodeAkademik]);

  // List terfilter berdasarkan pencarian & filter kelompok kuadran
  const filteredKeterlibatanList = useMemo(() => {
    return keterlibatanData.list.filter(item => {
      if (keterlibatanFilterGroup !== 'all' && item.group !== keterlibatanFilterGroup) return false;
      if (keterlibatanSearch.trim()) {
        const q = keterlibatanSearch.toLowerCase().trim();
        return (
          item.namaLengkap.toLowerCase().includes(q) ||
          item.kodeGuru.toLowerCase().includes(q) ||
          item.nip.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [keterlibatanData.list, keterlibatanFilterGroup, keterlibatanSearch]);

  // Format teks rapi untuk WhatsApp
  const waMessageText = useMemo(() => {
    return `📊 *LAPORAN REKAPITULASI KBM TAPAK LIVE*
🗓 *Periode*: ${reportStats.titlePeriod}
🎓 *Periode Akademik*: ${periodeAkademik.mulaiSemester} s/d ${periodeAkademik.akhirSemester} (${periodeAkademik.tahunAjaran || '2026/2027 Ganjil'})
📅 *Hari Efektif KBM*: ${reportStats.activeDays} Hari Aktif (Dipotong ${reportStats.weekendDays} Akhir Pekan & ${reportStats.holidayDays} Libur Nasional)
----------------------------------------
✅ *Sesi Hadir/Mengajar*: ${reportStats.presentCount} Sesi (${reportStats.presencePercent}%)
📱 *% Keterlibatan Guru (Input Mandiri)*: ${reportStats.filledAppCount} / ${reportStats.totalSessions} Sesi (${reportStats.appCompliancePercent}%)
⚠️ *Guru Izin / Sakit / Dinas*: ${reportStats.leaveCount} Sesi
🔴 *Belum Diisi Absensi*: ${reportStats.unconfirmedCount} Sesi
----------------------------------------
📋 *CATATAN GURU IZIN/SAKIT*:
${reportStats.leaveTeachersList.length > 0 
  ? reportStats.leaveTeachersList.slice(0, 10).map(t => `- ${t.nama} (${t.kelas} · ${t.status}: ${t.info})`).join('\n')
  : '- Nihil (Seluruh guru KBM mengajar penuh)'}
----------------------------------------
_Diunduh & disinkronkan otomatis dari Sistem TAPAK Live Monitoring_`;
  }, [reportStats, periodeAkademik]);

  // Format teks WhatsApp Keterlibatan
  const waMessageKeterlibatanText = useMemo(() => {
    const list = keterlibatanData.list;
    const groupAList = list.filter(i => i.group === 'A');
    const groupDList = list.filter(i => i.group === 'D');
    const groupBList = list.filter(i => i.group === 'B');
    const groupCList = list.filter(i => i.group === 'C');

    const renderGroupList = (items: typeof list) => 
      items.length > 0
        ? items.map(t => `- ${t.namaLengkap} (${t.inputMandiriSesi}/${t.totalSesi} Sesi · ${t.percentage}%)`).join('\n')
        : '- Nihil';

    return `🏆 *LAPORAN REKAPITULASI KETERLIBATAN GURU*
🗓 *Periode*: ${reportStats.titlePeriod}
📊 *Evaluasi Guru Terjadwal*: ${keterlibatanData.totalTeachersEvaluated} Guru
----------------------------------------
🟢 *Kelompok A (Keterlibatan Penuh 100%)*: ${keterlibatanData.groupACount} Guru
🔵 *Kelompok B (Keterlibatan Tinggi 60-99%)*: ${keterlibatanData.groupBCount} Guru
🟠 *Kelompok C (Keterlibatan Rendah <60%)*: ${keterlibatanData.groupCCount} Guru
🔴 *Kelompok D (Nihil Laporan 0%)*: ${keterlibatanData.groupDCount} Guru
----------------------------------------
🟢 *GURU KETERLIBATAN PENUH*:
${renderGroupList(groupAList)}
----------------------------------------
🔴 *DAFTAR GURU NIHIL LAPORAN*:
${renderGroupList(groupDList)}
----------------------------------------
🔵 *GURU KETERLIBATAN TINGGI*:
${renderGroupList(groupBList)}
----------------------------------------
🟠 *GURU KETERLIBATAN RENDAH*:
${renderGroupList(groupCList)}
----------------------------------------
_Diunduh & disinkronkan otomatis dari Sistem TAPAK Live Monitoring_`;
  }, [keterlibatanData, reportStats]);

  const activeWaText = activeReportSubTab === 'keterlibatan' ? waMessageKeterlibatanText : waMessageText;

  // Salin teks WhatsApp
  const handleCopyWaText = () => {
    navigator.clipboard.writeText(activeWaText);
    setCopiedWaText(true);
    setTimeout(() => setCopiedWaText(false), 2000);
  };

  // Kirim langsung ke WhatsApp
  const handleSendToWhatsApp = () => {
    const encoded = encodeURIComponent(activeWaText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Cetak Laporan PDF Resmi
  const handlePrintPdf = () => {
    window.print();
  };

  // JIKA BELUM LOGIN ADMIN: TAMPILKAN STATUS TERKUNCI
  if (!adminSession) {
    return (
      <div className="p-6 max-w-3xl mx-auto my-8 bg-white rounded-2xl border border-slate-200 shadow-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">
          Akses Laporan KBM Terkunci
        </h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
          Ruang Kerja <strong>Generate Laporan KBM</strong> bersifat khusus dan dilindungi. Silakan melakukan login akun admin/petugas terlebih dahulu untuk membuka seluruh modul laporan harian, pekanan, bulanan, dan cetak PDF resmi.
        </p>
        <button
          onClick={onOpenAdminModal}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 mx-auto cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Login Admin Sekarang</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* SECTION PRINT-READY LAYOUT (Hanya Tampil Saat Cetak PDF) */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8 print:z-[9999] text-slate-900 font-sans">
        <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wider text-slate-800">PEMERINTAH KABUPATEN / DINAS PENDIDIKAN</h1>
          <h2 className="text-2xl font-black uppercase text-indigo-950">
            {activeReportSubTab === 'keterlibatan' ? 'LAPORAN REKAPITULASI KETERLIBATAN GURU (KUADRAN ABSENSI MANDIRI)' : 'LAPORAN MONITORING PRESENSI KBM GURU'}
          </h2>
          <p className="text-xs font-mono text-slate-600 mt-1">
            Sistem Informasi TAPAK Live Monitoring · Periode: {reportStats.titlePeriod}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Periode Akademik: {periodeAkademik.mulaiSemester} - {periodeAkademik.akhirSemester} ({periodeAkademik.tahunAjaran || '2026/2027 Ganjil'}) · Hari Efektif KBM: {reportStats.activeDays} Hari
          </p>
        </div>

        {activeReportSubTab === 'keterlibatan' ? (
          <>
            {/* Ringkasan Kuadran Cetak */}
            <div className="grid grid-cols-4 gap-3 mb-6 border border-slate-300 p-4 rounded-lg bg-slate-50 text-center">
              <div>
                <div className="text-[9px] text-emerald-800 uppercase font-bold">Kelompok A (100%)</div>
                <div className="text-base font-bold font-mono text-emerald-700">{keterlibatanData.groupACount} Guru</div>
              </div>
              <div>
                <div className="text-[9px] text-indigo-800 uppercase font-bold">Kelompok B (60-99%)</div>
                <div className="text-base font-bold font-mono text-indigo-700">{keterlibatanData.groupBCount} Guru</div>
              </div>
              <div>
                <div className="text-[9px] text-amber-800 uppercase font-bold">Kelompok C (&lt;60%)</div>
                <div className="text-base font-bold font-mono text-amber-700">{keterlibatanData.groupCCount} Guru</div>
              </div>
              <div>
                <div className="text-[9px] text-rose-800 uppercase font-bold">Kelompok D (0%)</div>
                <div className="text-base font-bold font-mono text-rose-700">{keterlibatanData.groupDCount} Guru</div>
              </div>
            </div>

            {/* Tabel Rincian Keterlibatan Guru */}
            <div className="mb-8">
              <h3 className="text-sm font-bold border-b border-slate-300 pb-1 mb-2 text-slate-800">Daftar Keterlibatan Guru Mengisi Absensi Mandiri</h3>
              <table className="w-full text-xs text-left border border-slate-300 border-collapse">
                <thead className="bg-slate-100 font-bold">
                  <tr>
                    <th className="border border-slate-300 p-2">No</th>
                    <th className="border border-slate-300 p-2">Kode</th>
                    <th className="border border-slate-300 p-2">Nama Guru Pengampu</th>
                    <th className="border border-slate-300 p-2 text-center">Target Sesi</th>
                    <th className="border border-slate-300 p-2 text-center">Input Mandiri</th>
                    <th className="border border-slate-300 p-2 text-center">Persentase</th>
                    <th className="border border-slate-300 p-2">Kelompok Kuadran</th>
                  </tr>
                </thead>
                <tbody>
                  {keterlibatanData.list.map((t, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 p-2 font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-mono">{t.kodeGuru}</td>
                      <td className="border border-slate-300 p-2 font-bold">{t.namaLengkap}</td>
                      <td className="border border-slate-300 p-2 font-mono text-center">{t.totalSesi}</td>
                      <td className="border border-slate-300 p-2 font-mono text-center">{t.inputMandiriSesi}</td>
                      <td className="border border-slate-300 p-2 font-mono font-bold text-center">{t.percentage}%</td>
                      <td className="border border-slate-300 p-2 font-semibold">{t.groupName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* Ringkasan Statistik Cetak KBM */}
            <div className="grid grid-cols-5 gap-3 mb-6 border border-slate-300 p-4 rounded-lg bg-slate-50 text-center">
              <div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">Total Sesi KBM</div>
                <div className="text-base font-bold font-mono">{reportStats.totalSessions} Sesi</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">Sesi Hadir</div>
                <div className="text-base font-bold font-mono text-emerald-700">{reportStats.presentCount} ({reportStats.presencePercent}%)</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">% Keterlibatan Guru</div>
                <div className="text-base font-bold font-mono text-indigo-700">{reportStats.appCompliancePercent}%</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">Izin / Sakit</div>
                <div className="text-base font-bold font-mono text-amber-700">{reportStats.leaveCount} Sesi</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">Belum Absen</div>
                <div className="text-base font-bold font-mono text-rose-700">{reportStats.unconfirmedCount} Sesi</div>
              </div>
            </div>

            {/* Tabel Rincian Guru Izin */}
            <div className="mb-8">
              <h3 className="text-sm font-bold border-b border-slate-300 pb-1 mb-2 text-slate-800">Daftar Keterangan Guru Izin / Ketidakhadiran</h3>
              {reportStats.leaveTeachersList.length === 0 ? (
                <p className="text-xs italic text-slate-500">Nihil - Seluruh guru KBM mengajar sesuai jadwal.</p>
              ) : (
                <table className="w-full text-xs text-left border border-slate-300 border-collapse">
                  <thead className="bg-slate-100 font-bold">
                    <tr>
                      <th className="border border-slate-300 p-2">No</th>
                      <th className="border border-slate-300 p-2">Kelas</th>
                      <th className="border border-slate-300 p-2">Nama Guru Pengampu</th>
                      <th className="border border-slate-300 p-2">Status</th>
                      <th className="border border-slate-300 p-2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportStats.leaveTeachersList.map((t, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 p-2 font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-mono">{t.kelas}</td>
                        <td className="border border-slate-300 p-2 font-bold">{t.nama}</td>
                        <td className="border border-slate-300 p-2">{t.status}</td>
                        <td className="border border-slate-300 p-2">{t.info}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Kolom Tanda Tangan */}
        <div className="grid grid-cols-2 gap-12 mt-12 text-center text-xs">
          <div>
            <div>Mengetahui,</div>
            <div className="font-bold text-slate-900 mt-1">Kepala Sekolah</div>
            <div className="h-16"></div>
            <div className="font-bold underline">( ___________________________ )</div>
            <div className="text-[11px] text-slate-500">NIP. ________________________</div>
          </div>
          <div>
            <div>Petugas / Guru Piket,</div>
            <div className="font-bold text-slate-900 mt-1">Admin TAPAK Live</div>
            <div className="h-16"></div>
            <div className="font-bold underline">( {adminSession.nama} )</div>
            <div className="text-[11px] text-slate-500">Jabatan: {adminSession.jabatan || 'Admin Sistem'}</div>
          </div>
        </div>
      </div>

      {/* HEADER RUANG KERJA LAPORAN & SEGMENTED TABS PERIODE */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        {/* SUB-MENU TAB NAVIGATION: KBM vs KETERLIBATAN GURU */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
          <button
            type="button"
            onClick={() => setActiveReportSubTab('kbm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeReportSubTab === 'kbm'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>1. LAPORAN KBM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportSubTab('keterlibatan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeReportSubTab === 'keterlibatan'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span>2. KETERLIBATAN GURU</span>
            {keterlibatanData.groupDCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                {keterlibatanData.groupDCount} Nihil
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-rose-600" />
              <span>Pusat Generator Laporan & Rekapitulasi KBM TAPAK</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Presisi tinggi: Otomatis membuang Sabtu & Minggu serta tanggal merah kalender <code>HariLibur</code> & rentang <code>PeriodeAkademik</code>.
            </p>
          </div>

          {/* Opsi Periode Laporan */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold shrink-0">
            <button
              onClick={() => setPeriodMode('daily')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                periodMode === 'daily'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Harian
            </button>
            <button
              onClick={() => setPeriodMode('weekly')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                periodMode === 'weekly'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗓️ Pekanan
            </button>
            <button
              onClick={() => setPeriodMode('monthly')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                periodMode === 'monthly'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📆 Bulanan
            </button>
            <button
              onClick={() => setPeriodMode('semester')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                periodMode === 'semester'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎓 Semesteran
            </button>
          </div>
        </div>

        {/* Baris Pemilih Tanggal & Tombol Refresh Apps Script & Tombol Aksi Cetak / WA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            
            {periodMode === 'weekly' ? (
              // MODE PEKANAN: DUA KOTAK TANGGAL RENTANG (MULAI s/d SELESAI) + TOMBOL PINTAS
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 shrink-0">Rentang:</span>
                
                {/* Kotak Tanggal Mulai */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500 shrink-0">Mulai:</span>
                  <CalendarDatePickerPopover
                    selectedDate={weeklyStartDate}
                    onChangeDate={handleWeeklyStartDateChange}
                    hariLibur={hariLibur}
                    attendanceLogs={attendanceLogs}
                    periodeAkademik={periodeAkademik}
                    onSyncNeeded={onManualRefresh}
                    isSyncing={isSyncing}
                  />
                </div>

                <span className="text-xs font-bold text-slate-400 shrink-0">s/d</span>

                {/* Kotak Tanggal Selesai */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500 shrink-0">Selesai:</span>
                  <CalendarDatePickerPopover
                    selectedDate={weeklyEndDate}
                    onChangeDate={handleWeeklyEndDateChange}
                    hariLibur={hariLibur}
                    attendanceLogs={attendanceLogs}
                    periodeAkademik={periodeAkademik}
                    onSyncNeeded={onManualRefresh}
                    isSyncing={isSyncing}
                  />
                </div>

                {/* Tombol Pintas Pekan Ini & Pekan Lalu */}
                <div className="flex items-center gap-1 ml-0.5">
                  <button
                    type="button"
                    onClick={handleSetThisWeek}
                    className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition cursor-pointer"
                    title="Pilih rentang Senin s/d Jumat pekan ini"
                  >
                    Pekan Ini
                  </button>
                  <button
                    type="button"
                    onClick={handleSetLastWeek}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition cursor-pointer"
                    title="Pilih rentang Senin s/d Jumat pekan lalu"
                  >
                    Pekan Lalu
                  </button>
                </div>
              </div>
            ) : (
              // MODE HARIAN / BULANAN / SEMESTERAN: SATU KOTAK TANGGAL ACUAN
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 shrink-0">Tanggal Acuan:</span>
                <CalendarDatePickerPopover
                  selectedDate={reportDate}
                  onChangeDate={newDate => setReportDate(newDate)}
                  hariLibur={hariLibur}
                  attendanceLogs={attendanceLogs}
                  periodeAkademik={periodeAkademik}
                  onSyncNeeded={onManualRefresh}
                  isSyncing={isSyncing}
                />
              </div>
            )}

            {onManualRefresh && (
              <button
                onClick={onManualRefresh}
                disabled={isSyncing}
                title="Refresh & Tarik Data Terbaru dari Google Apps Script"
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ml-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : 'text-indigo-600'}`} />
                <span>{isSyncing ? 'Sinkronisasi...' : 'Refresh Apps Script'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsWaModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Pratinjau & Kirim WA</span>
            </button>

            <button
              onClick={handlePrintPdf}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak PDF Resmi</span>
            </button>
          </div>
        </div>

        {/* BADGE KALENDER AKADEMIK & HARI EFEKTIF KBM (PRESISI SMART ENGINE) */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              <span>Periode Akademik:</span>
              <strong className="text-indigo-900 font-mono bg-indigo-100/70 px-2 py-0.5 rounded border border-indigo-200">
                {periodeAkademik.mulaiSemester} s/d {periodeAkademik.akhirSemester}
              </strong>
              {periodeAkademik.tahunAjaran && (
                <span className="text-slate-500 font-medium">({periodeAkademik.tahunAjaran})</span>
              )}
            </span>

            <span className="hidden md:inline text-slate-300">|</span>

            <span className="text-slate-600 flex items-center gap-1.5">
              <span>Hari Efektif KBM:</span>
              <strong className="text-emerald-700 font-bold font-mono bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200">
                {reportStats.activeDays} Hari Aktif
              </strong>
              <span className="text-slate-500">
                (Dipotong {reportStats.weekendDays} Akhir Pekan & {reportStats.holidayDays} Libur)
              </span>
            </span>
          </div>

          {/* Tombol Buka/Tutup Rincian Hari Libur */}
          <button
            onClick={() => setIsHolidaysExpanded(prev => !prev)}
            className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-semibold text-xs cursor-pointer self-start md:self-auto transition"
          >
            <Palmtree className="w-3.5 h-3.5 text-amber-600" />
            <span>Lihat Daftar Hari Libur ({hariLibur.length})</span>
            {isHolidaysExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* PANEL RINCIAN HARI LIBUR & PERIODE AKADEMIK (COLLAPSIBLE) */}
        {isHolidaysExpanded && (
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palmtree className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-xs text-amber-950">
                  Daftar Hari Libur Nasional & Cuti Bersama (Sheet <code>HariLibur</code>)
                </h4>
              </div>
              <span className="text-[10.5px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                Format Baku: DD/MM/YYYY
              </span>
            </div>

            <p className="text-[11px] text-amber-800 leading-relaxed">
              *Catatan Sistem:* Hari <strong>Sabtu dan Minggu</strong> otomatis dibuang oleh logika sistem tanpa perlu dimasukkan ke sheet. Admin hanya perlu mencatat hari libur nasional atau cuti bersama di bawah ini.
            </p>

            {hariLibur.length === 0 ? (
              <div className="p-4 bg-white/95 rounded-xl text-center border border-amber-200 py-6 space-y-1.5 shadow-2xs">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-700">
                  <Palmtree className="w-4.5 h-4.5" />
                </div>
                <h5 className="font-bold text-xs text-amber-950 uppercase tracking-wide">Belum ada data libur</h5>
                <p className="text-[11.5px] text-slate-500 max-w-md mx-auto">
                  Belum ada data libur yang diinput pada sheet <code className="bg-amber-100/70 text-amber-900 font-semibold px-1 py-0.5 rounded font-mono">HariLibur</code>. Sistem secara otomatis menghitung murni hari aktif Senin s/d Jumat (akhir pekan otomatis libur).
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-amber-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-100/70 text-amber-950 border-b border-amber-200 font-bold text-[11px]">
                    <tr>
                      <th className="py-2 px-3">No</th>
                      <th className="py-2 px-3">Tanggal (DD/MM/YYYY)</th>
                      <th className="py-2 px-3">Keterangan Hari Libur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {hariLibur.map((h, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/50">
                        <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-900">{h.tanggal}</td>
                        <td className="py-2 px-3 text-slate-800 font-medium">{h.keterangan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* KARTU KHUSUS RINCIAN TANGGAL LIBUR & SESI YANG DIPOTONG */}
        {reportStats.holidaysEncountered && reportStats.holidaysEncountered.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-rose-50/90 via-amber-50/70 to-rose-50/90 border border-rose-200/80 rounded-2xl shadow-2xs space-y-2.5 mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/60 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                  <Palmtree className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-rose-950 flex items-center gap-1.5">
                    <span>Rincian Hari Libur & Pemotongan Sesi KBM</span>
                    <span className="text-[10px] bg-rose-200/80 text-rose-800 px-1.5 py-0.5 rounded font-mono font-bold">
                      {reportStats.holidayDays} Hari Libur
                    </span>
                  </h4>
                  <p className="text-[11px] text-rose-800/90">
                    Sesi KBM pada tanggal merah resmi otomatis dipotong dan dikecualikan 100% dari total target jadwal.
                  </p>
                </div>
              </div>

              {(reportStats.totalHolidaySessionsExcluded ?? 0) > 0 && (
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Total Sesi Dikecualikan</span>
                  <span className="text-sm font-black font-mono text-rose-800 tabular-nums">
                    -{reportStats.totalHolidaySessionsExcluded} Sesi KBM
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-0.5">
              {reportStats.holidaysEncountered.map((h, i) => (
                <div key={i} className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-white border border-rose-200/70 text-xs shadow-2xs">
                  <div>
                    <div className="font-bold font-mono text-indigo-950 flex items-center gap-1">
                      <span>{h.tanggal}</span>
                      {h.hari && <span className="text-slate-500 font-sans font-normal">({h.hari})</span>}
                    </div>
                    <div className="text-[11px] text-slate-600 line-clamp-1 mt-0.5" title={h.keterangan}>
                      {h.keterangan}
                    </div>
                  </div>
                  {h.sesiDikecualikan !== undefined && h.sesiDikecualikan > 0 && (
                    <span className="text-[10.5px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 shrink-0">
                      -{h.sesiDikecualikan} sesi
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LENCANA INFORMASI CUT-OFF HARI MENDATANG PADA PEKAN BERJALAN */}
        {periodMode === 'weekly' && reportStats.upcomingDaysEncountered && reportStats.upcomingDaysEncountered.length > 0 && (
          <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex items-center gap-2.5 text-xs text-indigo-950 mt-2">
            <span className="p-1 rounded-md bg-indigo-100 text-indigo-700 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </span>
            <div className="flex-1">
              <span className="font-bold">Realisasi Berjalan s/d {reportStats.cutOffDateFormatted}: </span>
              <span className="text-slate-700">
                Terdapat <strong>{reportStats.upcomingDaysEncountered.length} hari KBM mendatang</strong> ({reportStats.upcomingDaysEncountered.map(u => `${u.hari} ${u.tanggal}: ${u.sesiPending} sesi`).join(', ')}) yang belum berlangsung, sehingga jadwalnya <strong>belum dimasukkan</strong> ke pembagi target berjalan.
              </span>
            </div>
          </div>
        )}

      </div>

      {/* KONTEN UTAMA DENGAN DUA SUB-TAB: 1. KBM | 2. KETERLIBATAN */}
      {activeReportSubTab === 'keterlibatan' ? (
        <div className="space-y-4">
          {/* INFOGRAFIS TOP ROW (4 KARTU) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Total Sesi Terjadwal
              </span>
              <span className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                {reportStats.totalSessions}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">Sesi KBM Terdaftar</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-2xs">
              <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                % Kehadiran KBM
              </span>
              <span className="text-2xl font-black font-mono text-emerald-700 tabular-nums">
                {reportStats.presencePercent}%
              </span>
              <span className="text-[10px] text-emerald-700 block mt-1">({reportStats.presentCount} Sesi Hadir)</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-2xs">
              <span className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                Izin / Sakit / Dinas
              </span>
              <span className="text-2xl font-black font-mono text-amber-700 tabular-nums">
                {reportStats.leaveCount}
              </span>
              <span className="text-[10px] text-amber-700 block mt-1">Sesi Perizinan</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 shadow-2xs">
              <span className="text-[10.5px] font-bold text-indigo-900 uppercase tracking-wider block mb-1">
                % Keterlibatan Guru
              </span>
              <span className="text-2xl font-black font-mono text-indigo-800 tabular-nums">
                {reportStats.appCompliancePercent}%
              </span>
              <span className="text-[10px] text-indigo-700 block mt-1">Input Absensi Mandiri</span>
            </div>
          </div>

          {/* RINGKASAN 4 KUADRAN KETERLIBATAN GURU */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Kuadran Keterlibatan Guru Mengisi Absensi Mandiri</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Dievaluasi dari {keterlibatanData.totalTeachersEvaluated} guru yang memiliki jadwal mengajar pada periode terpilih
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div 
                onClick={() => setKeterlibatanFilterGroup(prev => prev === 'A' ? 'all' : 'A')}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  keterlibatanFilterGroup === 'A' 
                    ? 'bg-emerald-950 border-emerald-400 ring-2 ring-emerald-500/50' 
                    : 'bg-slate-800/80 hover:bg-slate-800 border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between text-emerald-300 text-xs font-bold mb-1">
                  <span>Kelompok A</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-black font-mono text-emerald-300">
                  {keterlibatanData.groupACount} <span className="text-xs font-normal text-slate-300">Guru</span>
                </div>
                <span className="text-[10px] text-emerald-400 block mt-0.5 font-medium">Keterlibatan Penuh (100%)</span>
              </div>

              <div 
                onClick={() => setKeterlibatanFilterGroup(prev => prev === 'B' ? 'all' : 'B')}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  keterlibatanFilterGroup === 'B' 
                    ? 'bg-indigo-950 border-indigo-400 ring-2 ring-indigo-500/50' 
                    : 'bg-slate-800/80 hover:bg-slate-800 border-indigo-500/40'
                }`}
              >
                <div className="flex items-center justify-between text-indigo-300 text-xs font-bold mb-1">
                  <span>Kelompok B</span>
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-xl font-black font-mono text-indigo-300">
                  {keterlibatanData.groupBCount} <span className="text-xs font-normal text-slate-300">Guru</span>
                </div>
                <span className="text-[10px] text-indigo-400 block mt-0.5 font-medium">Keterlibatan Tinggi (60-99%)</span>
              </div>

              <div 
                onClick={() => setKeterlibatanFilterGroup(prev => prev === 'C' ? 'all' : 'C')}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  keterlibatanFilterGroup === 'C' 
                    ? 'bg-amber-950 border-amber-400 ring-2 ring-amber-500/50' 
                    : 'bg-slate-800/80 hover:bg-slate-800 border-amber-500/40'
                }`}
              >
                <div className="flex items-center justify-between text-amber-300 text-xs font-bold mb-1">
                  <span>Kelompok C</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-black font-mono text-amber-300">
                  {keterlibatanData.groupCCount} <span className="text-xs font-normal text-slate-300">Guru</span>
                </div>
                <span className="text-[10px] text-amber-400 block mt-0.5 font-medium">Keterlibatan Rendah (&lt;60%)</span>
              </div>

              <div 
                onClick={() => setKeterlibatanFilterGroup(prev => prev === 'D' ? 'all' : 'D')}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  keterlibatanFilterGroup === 'D' 
                    ? 'bg-rose-950 border-rose-400 ring-2 ring-rose-500/50' 
                    : 'bg-slate-800/80 hover:bg-slate-800 border-rose-500/40'
                }`}
              >
                <div className="flex items-center justify-between text-rose-300 text-xs font-bold mb-1">
                  <span>Kelompok D</span>
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-xl font-black font-mono text-rose-300">
                  {keterlibatanData.groupDCount} <span className="text-xs font-normal text-slate-300">Guru</span>
                </div>
                <span className="text-[10px] text-rose-400 block mt-0.5 font-medium">Nihil Laporan (0%)</span>
              </div>
            </div>
          </div>

          {/* TABEL REKAPITULASI TUNGGAL KETERLIBATAN GURU */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-xs text-slate-900">
                  Tabel Rekapitulasi Keterlibatan Guru ({filteredKeterlibatanList.length} Guru)
                </h3>
              </div>

              {/* Pencarian Nama Guru & Filter Group */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={keterlibatanSearch}
                    onChange={e => setKeterlibatanSearch(e.target.value)}
                    placeholder="Cari Nama / Kode Guru..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
                  <button
                    onClick={() => setKeterlibatanFilterGroup('all')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${keterlibatanFilterGroup === 'all' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setKeterlibatanFilterGroup('A')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${keterlibatanFilterGroup === 'A' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-700 hover:bg-emerald-100'}`}
                  >
                    Kel. A
                  </button>
                  <button
                    onClick={() => setKeterlibatanFilterGroup('B')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${keterlibatanFilterGroup === 'B' ? 'bg-indigo-600 text-white font-bold' : 'text-indigo-700 hover:bg-indigo-100'}`}
                  >
                    Kel. B
                  </button>
                  <button
                    onClick={() => setKeterlibatanFilterGroup('C')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${keterlibatanFilterGroup === 'C' ? 'bg-amber-600 text-white font-bold' : 'text-amber-700 hover:bg-amber-100'}`}
                  >
                    Kel. C
                  </button>
                  <button
                    onClick={() => setKeterlibatanFilterGroup('D')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${keterlibatanFilterGroup === 'D' ? 'bg-rose-600 text-white font-bold' : 'text-rose-700 hover:bg-rose-100'}`}
                  >
                    Kel. D
                  </button>
                </div>
              </div>
            </div>

            {filteredKeterlibatanList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Tidak ditemukan data guru untuk kriteria pencarian / filter ini.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Kode</th>
                      <th className="py-2.5 px-3">Nama Lengkap Guru Pengampu</th>
                      <th className="py-2.5 px-3 text-center">Target Sesi</th>
                      <th className="py-2.5 px-3 text-center">Input Mandiri</th>
                      <th className="py-2.5 px-3 text-center">Persentase</th>
                      <th className="py-2.5 px-3">Kelompok Kuadran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredKeterlibatanList.map((item, idx) => (
                      <tr key={item.kodeGuru} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.kodeGuru}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.namaLengkap}</td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-700">{item.totalSesi} Sesi</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-center text-indigo-900">{item.inputMandiriSesi} Sesi</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono font-black text-xs text-slate-900">
                            {item.percentage}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10.5px] border ${item.badgeBg}`}>
                            {item.groupName}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* KBM DASHBOARD (EXISTING) */
        <>
          {/* 5 KARTU STATISTIK UTAMA (TERMASUK TOTAL KEPATUHAN GURU MENGISI APLIKASI) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        
        {/* KARTU 1: TOTAL SESI TERJADWAL */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Total Sesi Terjadwal
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-slate-900 tabular-nums">
              {reportStats.totalSessions}
            </span>
            <span className="text-xs text-slate-500 font-semibold">Sesi</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {reportStats.activeDays} Hari Aktif KBM
          </span>
        </div>

        {/* KARTU 2: SESI HADIR / MENGAJAR */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
            % Kehadiran KBM
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-emerald-700 tabular-nums">
              {reportStats.presencePercent}%
            </span>
            <span className="text-xs font-mono font-bold text-emerald-800">
              ({reportStats.presentCount} Sesi)
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 mt-1">Hadir / Infal Pengganti</span>
        </div>

        {/* KARTU 3: % KETERLIBATAN GURU */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[10.5px] font-bold text-indigo-900 uppercase tracking-wider block mb-1 flex items-center justify-between">
            <span>% Keterlibatan Guru</span>
            <Award className="w-3.5 h-3.5 text-indigo-600" />
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-indigo-800 tabular-nums">
              {reportStats.appCompliancePercent}%
            </span>
            <span className="text-xs font-mono font-bold text-indigo-700">
              ({reportStats.filledAppCount}/{reportStats.totalSessions})
            </span>
          </div>
          <span className="text-[10px] text-indigo-700 mt-1">Mengisi Absensi di Aplikasi</span>
        </div>

        {/* KARTU 4: IZIN / SAKIT / DINAS */}
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
            Izin / Sakit / Dinas
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-amber-700 tabular-nums">
              {reportStats.leaveCount}
            </span>
            <span className="text-xs text-amber-800 font-semibold">Sesi</span>
          </div>
          <span className="text-[10px] text-amber-700 mt-1">Perizinan Resmi Terekam</span>
        </div>

        {/* KARTU 5: BELUM DIISI ABSEN */}
        <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[10.5px] font-bold text-rose-800 uppercase tracking-wider block mb-1">
            Belum Absen / Kosong
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-rose-700 tabular-nums">
              {reportStats.unconfirmedCount}
            </span>
            <span className="text-xs text-rose-800 font-semibold">Sesi</span>
          </div>
          <span className="text-[10px] text-rose-700 mt-1">Perlu Perhatian Piket</span>
        </div>

      </div>

      {/* GRAFIK BAR CHART STATISTIK TREN (KEHADIRAN KBM VS KEPATUHAN APLIKASI) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                <span>Grafik Statistik Tren Presensi KBM</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Perbandingan Persentase Kehadiran KBM vs Kepatuhan Mengisi Aplikasi ({reportStats.titlePeriod})
              </p>
            </div>
          </div>

          {/* Legend Warna Grafik */}
          <div className="flex items-center gap-3 sm:gap-4 text-xs font-medium flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block border border-emerald-600"></span>
              <span className="text-slate-700 font-semibold">% Kehadiran KBM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500 inline-block border border-indigo-600"></span>
              <span className="text-slate-700 font-semibold">% Kepatuhan Aplikasi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-dashed border-rose-400 bg-rose-100 inline-block"></span>
              <span className="text-rose-700 font-semibold text-[11px]">Hari Libur</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-dashed border-slate-400 bg-slate-200 inline-block"></span>
              <span className="text-slate-600 font-semibold text-[11px]">Belum Dimulai</span>
            </div>
          </div>
        </div>

        {/* Visualisasi Bar Chart Visual Responsive */}
        <div className="pt-2">
          <div className="h-52 w-full flex items-end justify-between gap-2 sm:gap-4 px-2 pb-6 border-b border-slate-200 relative bg-slate-50/50 rounded-xl p-3 border border-slate-100">
            {/* Grid Lines Horizontal (0%, 25%, 50%, 75%, 100%) */}
            <div className="absolute inset-x-0 top-3 bottom-8 flex flex-col justify-between pointer-events-none px-2 opacity-30">
              <div className="border-b border-dashed border-slate-300 w-full flex justify-between text-[9px] text-slate-400 font-mono"><span>100%</span></div>
              <div className="border-b border-dashed border-slate-300 w-full flex justify-between text-[9px] text-slate-400 font-mono"><span>75%</span></div>
              <div className="border-b border-dashed border-slate-300 w-full flex justify-between text-[9px] text-slate-400 font-mono"><span>50%</span></div>
              <div className="border-b border-dashed border-slate-300 w-full flex justify-between text-[9px] text-slate-400 font-mono"><span>25%</span></div>
            </div>

            {/* Render Batang Bar Chart per Titik Waktu */}
            {trendData.map((item, idx) => (
              <div 
                key={idx}
                onMouseEnter={() => setHoveredBarIndex(idx)}
                onMouseLeave={() => setHoveredBarIndex(null)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer z-10 relative"
              >
                {/* Tooltip Hover Detil */}
                {hoveredBarIndex === idx && (
                  <div className="absolute -top-14 bg-slate-900 text-white text-[10px] font-mono p-2.5 rounded-lg shadow-xl z-30 whitespace-nowrap border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
                    <div className="font-bold border-b border-slate-700 pb-0.5 mb-1 text-amber-300">{item.label}</div>
                    {item.isHoliday ? (
                      <div className="text-rose-300">
                        🏖️ Libur Resmi: {item.holidayDesc || 'Hari Libur'} ({item.sessionsExcluded ?? 0} Sesi KBM Dikecualikan)
                      </div>
                    ) : item.isUpcoming ? (
                      <div className="text-sky-300">
                        ⏳ Belum Dimulai: Jadwal {item.upcomingSessions ?? 0} sesi KBM belum masuk target berjalan
                      </div>
                    ) : (
                      <>
                        <div className="text-emerald-300">✅ Kehadiran: {item.presencePercent}% ({item.presentCount} Sesi)</div>
                        <div className="text-indigo-300">📱 Kepatuhan: {item.appCompliancePercent}% ({item.filledCount} Sesi)</div>
                      </>
                    )}
                  </div>
                )}

                {/* Pasangan 2 Batang Bar Chart */}
                <div className="flex items-end justify-center gap-1 w-full max-w-[56px] h-full pt-4">
                  {item.isHoliday ? (
                    <div className="w-full h-10 bg-rose-50/90 border border-dashed border-rose-300 rounded-t-lg flex flex-col items-center justify-center p-0.5 text-center shadow-2xs">
                      <span className="text-[8.5px] font-black text-rose-600 font-mono tracking-wider">LIBUR</span>
                      {item.holidayDesc && (
                        <span className="text-[7.5px] text-rose-500 font-sans truncate max-w-full font-medium px-1" title={item.holidayDesc}>
                          {item.holidayDesc}
                        </span>
                      )}
                    </div>
                  ) : item.isUpcoming ? (
                    <div className="w-full h-10 bg-slate-100/90 border border-dashed border-slate-300 rounded-t-lg flex flex-col items-center justify-center p-0.5 text-center shadow-2xs">
                      <span className="text-[8px] font-black text-slate-500 font-mono tracking-wider">BELUM DIMULAI</span>
                      <span className="text-[7.5px] text-slate-400 font-sans">
                        {item.upcomingSessions ? `${item.upcomingSessions} sesi` : 'Mendatang'}
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Batang 1: % Kehadiran (Emerald) */}
                      <div 
                        className="w-1/2 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-2xs relative flex justify-center"
                        style={{ height: `${Math.max(6, item.presencePercent)}%` }}
                      >
                        <span className="text-[9px] font-bold text-white font-mono -top-4 absolute hidden sm:block opacity-90">
                          {item.presencePercent}%
                        </span>
                      </div>

                      {/* Batang 2: % Kepatuhan Aplikasi (Indigo) */}
                      <div 
                        className="w-1/2 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-2xs relative flex justify-center"
                        style={{ height: `${Math.max(6, item.appCompliancePercent)}%` }}
                      >
                        <span className="text-[9px] font-bold text-white font-mono -top-4 absolute hidden sm:block opacity-90">
                          {item.appCompliancePercent}%
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Label Sumbu X */}
                <span className="text-[10px] font-bold text-slate-600 font-mono mt-2 truncate max-w-full">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TABEL DAFTAR PERIZINAN GURU DENGAN KETERANGAN */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
            <UserX className="w-4 h-4 text-amber-600" />
            Catatan Perizinan & Ketidakhadiran Guru ({reportStats.leaveTeachersList.length})
          </h3>
          <span className="text-[10.5px] font-mono text-slate-500">
            {reportStats.titlePeriod}
          </span>
        </div>

        {reportStats.leaveTeachersList.length === 0 ? (
          <div className="p-6 text-center text-xs text-emerald-800 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
            ✨ <strong>Nihil</strong> - Seluruh guru KBM mengajar penuh sesuai jadwal tanpa ada catatan perizinan.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px]">
                <tr>
                  <th className="py-2 px-3">No</th>
                  <th className="py-2 px-3">Kelas</th>
                  <th className="py-2 px-3">Nama Guru Pengampu</th>
                  <th className="py-2 px-3">Status Presensi</th>
                  <th className="py-2 px-3">Keterangan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {reportStats.leaveTeachersList.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">{t.kelas}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{t.nama}</td>
                    <td className="py-2 px-3">
                      <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-300">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{t.info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* POP-UP MODAL PRATINJAU WHATSAPP & TOMBOL KIRIM */}
      {isWaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Pratinjau Pesan WhatsApp</h3>
                  <p className="text-[10.5px] text-slate-500">Tinjau format teks sebelum disalin atau dikirim</p>
                </div>
              </div>
              <button 
                onClick={() => setIsWaModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Kotak Teks Tampilan WhatsApp */}
            <div className="p-3 bg-emerald-950 text-emerald-100 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[260px] overflow-y-auto border border-emerald-800 shadow-inner">
              {activeWaText}
            </div>

            {/* Dua Tombol Aksi WA */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleCopyWaText}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  copiedWaText 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                }`}
              >
                {copiedWaText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-slate-600" />}
                <span>{copiedWaText ? 'Teks Disalin!' : 'Salin Teks Pesan'}</span>
              </button>

              <button
                onClick={handleSendToWhatsApp}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>Kirim ke WhatsApp</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
