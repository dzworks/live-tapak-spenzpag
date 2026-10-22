import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Calendar, 
  UserCheck, 
  UserX, 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  PlusCircle, 
  RefreshCw, 
  Check, 
  Clock, 
  BookOpen, 
  Shield, 
  Layers, 
  FileText, 
  X,
  Search,
  Hash,
  Palmtree
} from 'lucide-react';
import { 
  ScheduleItem, 
  AttendanceLogItem, 
  ClassMaster, 
  MasterGuru, 
  MasterMapel, 
  AdminSession,
  HariLiburItem
} from '../types';
import { 
  canonicalDateKey, 
  getDayNameIndonesian, 
  formatToIndonesianDisplayDate, 
  isSameDate,
  normalizeClassName,
  isSampleEntity,
  parseDateDMY,
  isHolidayDate,
  isWeekend
} from '../utils/appsScriptCode';
import { buildPiketAttendanceLogItem, generatePiketIdKiriman, formatJamKeWithSpaces } from '../utils/piketLogUtils';
import { CalendarDatePickerPopover } from './CalendarDatePickerPopover';

export type SumberDataOption = 'Agenda Kelas' | 'Guru Piket' | 'Siswa' | 'Lainnya';
export const SUMBER_DATA_OPTIONS: SumberDataOption[] = ['Agenda Kelas', 'Guru Piket', 'Siswa', 'Lainnya'];

interface AdminPiketAgendaWorkspaceProps {
  schedules: ScheduleItem[];
  attendanceLogs: AttendanceLogItem[];
  classes: ClassMaster[];
  masterGuru: MasterGuru[];
  masterMapel: MasterMapel[];
  selectedDate: string;
  adminSession: AdminSession | null;
  onSaveLog: (log: AttendanceLogItem) => Promise<{ success: boolean; message: string }>;
  hariLibur?: HariLiburItem[];
}

export const AdminPiketAgendaWorkspace: React.FC<AdminPiketAgendaWorkspaceProps> = ({
  schedules = [],
  attendanceLogs = [],
  classes = [],
  masterGuru = [],
  masterMapel = [],
  selectedDate = '22-Okt-2026',
  adminSession,
  onSaveLog,
  hariLibur = [],
}) => {
  // Tanggal yang dipilih untuk pengisian agenda piket
  const [activeDate, setActiveDate] = useState<string>(selectedDate);

  // Mode Pemilihan Tanggal KBM: 'daily' (Harian), 'weekly' (Pekan Ini), 'last_week' (Pekan Lalu), 'range' (Rentang Waktu)
  const [dateMode, setDateMode] = useState<'daily' | 'weekly' | 'last_week' | 'range'>('daily');
  const [rangeStart, setRangeStart] = useState<string>(selectedDate);
  const [rangeEnd, setRangeEnd] = useState<string>(selectedDate);

  // Tanggal Hari Ini dalam WIB (UTC+7)
  const todayWib = useMemo(() => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * 7);
  }, []);

  const todayKey = useMemo(() => canonicalDateKey(todayWib), [todayWib]);

  const activeDateParsed = useMemo(() => parseDateDMY(activeDate) || new Date(), [activeDate]);
  const activeDateKey = useMemo(() => canonicalDateKey(activeDateParsed), [activeDateParsed]);

  // Cek apakah tanggal aktif adalah waktu mendatang (> hari ini WIB)
  const isFutureDate = useMemo(() => {
    return activeDateKey > todayKey;
  }, [activeDateKey, todayKey]);

  // Cek status hari libur & akhir pekan
  const holidayStatus = useMemo(() => {
    return isHolidayDate(activeDateParsed, hariLibur);
  }, [activeDateParsed, hariLibur]);

  const isWeekendActive = useMemo(() => {
    return isWeekend(activeDateParsed);
  }, [activeDateParsed]);

  // Daftar Hari KBM (Senin s/d Jumat) untuk mode 'Pekan Ini'
  const weekDays = useMemo(() => {
    const ref = parseDateDMY(activeDate) || new Date();
    const day = ref.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(ref);
    monday.setDate(ref.getDate() + diffToMon);

    const result: Array<{
      date: Date;
      dateStr: string;
      dayName: string;
      dayShort: string;
      isToday: boolean;
      isFuture: boolean;
      isHoliday: boolean;
      holidayDesc?: string;
    }> = [];

    const dayShortNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = formatToIndonesianDisplayDate(d);
      const k = canonicalDateKey(d);
      const hol = isHolidayDate(d, hariLibur);

      result.push({
        date: d,
        dateStr,
        dayName: getDayNameIndonesian(dateStr),
        dayShort: dayShortNames[i],
        isToday: isSameDate(d, todayWib),
        isFuture: k > todayKey,
        isHoliday: hol.isHoliday,
        holidayDesc: hol.keterangan,
      });
    }

    return result;
  }, [activeDate, hariLibur, todayWib, todayKey]);

  // Daftar Hari KBM Efektif (Senin-Jumat) untuk mode 'Rentang Waktu'
  const rangeDays = useMemo(() => {
    const start = parseDateDMY(rangeStart);
    const end = parseDateDMY(rangeEnd);
    if (!start || !end || start > end) return [];

    const result: Array<{
      date: Date;
      dateStr: string;
      dayName: string;
      isToday: boolean;
      isFuture: boolean;
      isHoliday: boolean;
      holidayDesc?: string;
    }> = [];

    const curr = new Date(start);
    while (curr <= end) {
      const dayOfWeek = curr.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Abaikan Sabtu & Minggu
        const dateStr = formatToIndonesianDisplayDate(curr);
        const k = canonicalDateKey(curr);
        const hol = isHolidayDate(curr, hariLibur);

        result.push({
          date: new Date(curr),
          dateStr,
          dayName: getDayNameIndonesian(dateStr),
          isToday: isSameDate(curr, todayWib),
          isFuture: k > todayKey,
          isHoliday: hol.isHoliday,
          holidayDesc: hol.keterangan,
        });
      }
      curr.setDate(curr.getDate() + 1);
    }

    return result;
  }, [rangeStart, rangeEnd, hariLibur, todayWib, todayKey]);

  // Kelas yang sedang dibuka
  const [selectedClass, setSelectedClass] = useState<string>('');

  // Search filter & Grade filter kelas
  const [classSearch, setClassSearch] = useState<string>('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'all' | '7' | '8' | '9'>('all');

  // Mode Tampilan: 'class' (Berdasarkan Kelas) vs 'teacher' (Berdasarkan Guru)
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');

  // Filter & Pemilihan Guru
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [teacherSearch, setTeacherSearch] = useState<string>('');

  // Mode Sortir Sesi Guru: 'time' (Jam 1, 2, 3...) vs 'class' (Kelas 7-9 & A-Z)
  const [teacherSortMode, setTeacherSortMode] = useState<'time' | 'class'>('time');

  // Helper untuk menentukan tingkat kelas (7, 8, 9) secara presisi
  const getGradeLevel = (className: string): '7' | '8' | '9' | null => {
    const norm = className.trim().toUpperCase();

    // Prioritaskan Kelas 8 / VIII terlebih dahulu karena frasa 'VIII' diawali 'VII'
    if (/^VIII\b|^VIII[-_\s]/i.test(norm) || /\bVIII\b/.test(norm) || /^8[-_\sA-Z0-9]/i.test(norm) || /\b8\b/.test(norm)) {
      return '8';
    }
    // Cek Kelas 9 / IX
    if (/^IX\b|^IX[-_\s]/i.test(norm) || /\bIX\b/.test(norm) || /^9[-_\sA-Z0-9]/i.test(norm) || /\b9\b/.test(norm)) {
      return '9';
    }
    // Cek Kelas 7 / VII
    if (/^VII\b|^VII[-_\s]/i.test(norm) || /\bVII\b/.test(norm) || /^7[-_\sA-Z0-9]/i.test(norm) || /\b7\b/.test(norm)) {
      if (!norm.includes('VIII')) {
        return '7';
      }
    }

    return null;
  };

  const matchGrade = (className: string, grade: '7' | '8' | '9'): boolean => {
    return getGradeLevel(className) === grade;
  };

  // Modal Input/Edit State
  const [activeSlotModal, setActiveSlotModal] = useState<{
    schedule: ScheduleItem;
    existingLog: AttendanceLogItem | null;
  } | null>(null);

  // Form Fields State
  const [statusInput, setStatusInput] = useState<string>('Hadir');
  const [kegiatanInput, setKegiatanInput] = useState<string>('');
  const [infoInput, setInfoInput] = useState<string>('');
  const [sumberDataOption, setSumberDataOption] = useState<SumberDataOption>('Agenda Kelas');
  const [sumberDataCustom, setSumberDataCustom] = useState<string>('');
  const [petugasInput, setPetugasInput] = useState<string>(adminSession?.nama || adminSession?.username || 'Petugas Piket');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Kamus Guru & Mapel
  const teachersMap = useMemo(() => {
    const map: Record<string, MasterGuru> = {};
    (masterGuru || []).forEach(g => {
      if (g.kodeGuru) map[g.kodeGuru.toLowerCase()] = g;
    });
    return map;
  }, [masterGuru]);

  const subjectsMap = useMemo(() => {
    const map: Record<string, MasterMapel> = {};
    (masterMapel || []).forEach(m => {
      if (m.kodeMapel) map[m.kodeMapel.toLowerCase()] = m;
    });
    return map;
  }, [masterMapel]);

  // Nama Hari dari Tanggal Terpilih
  const dayNameIndo = useMemo(() => getDayNameIndonesian(activeDate), [activeDate]);

  // Daftar Semua Kelas Unik (Membuang "Kelas Contoh" / Sample)
  const uniqueClassNames = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => {
      if (c.namaKelas && !isSampleEntity({ namaKelas: c.namaKelas })) {
        set.add(c.namaKelas);
      }
    });
    schedules.forEach(s => {
      if (s.namaKelas && !isSampleEntity({ namaKelas: s.namaKelas })) {
        set.add(s.namaKelas);
      }
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [classes, schedules]);

  // Hitung jumlah kelas per tingkat
  const gradeCounts = useMemo(() => {
    const counts = { all: uniqueClassNames.length, '7': 0, '8': 0, '9': 0 };
    uniqueClassNames.forEach(c => {
      const g = getGradeLevel(c);
      if (g === '7') counts['7']++;
      else if (g === '8') counts['8']++;
      else if (g === '9') counts['9']++;
    });
    return counts;
  }, [uniqueClassNames]);

  // Filter kelas berdasarkan tingkat kelas dan pencarian
  const filteredClasses = useMemo(() => {
    let list = uniqueClassNames;
    if (selectedGradeFilter !== 'all') {
      list = list.filter(c => matchGrade(c, selectedGradeFilter));
    }
    if (classSearch.trim()) {
      const q = classSearch.toLowerCase().trim();
      list = list.filter(c => c.toLowerCase().includes(q));
    }
    return list;
  }, [uniqueClassNames, selectedGradeFilter, classSearch]);

  // Set default selectedClass jika belum ada atau tidak ada dalam filteredClasses
  React.useEffect(() => {
    if (filteredClasses.length > 0) {
      if (!selectedClass || !filteredClasses.includes(selectedClass)) {
        setSelectedClass(filteredClasses[0]);
      }
    } else if (uniqueClassNames.length > 0) {
      if (!selectedClass || !uniqueClassNames.includes(selectedClass)) {
        setSelectedClass(uniqueClassNames[0]);
      }
    }
  }, [filteredClasses, uniqueClassNames, selectedClass]);

  // Jadwal KBM pada Hari Terpilih
  const daySchedules = useMemo(() => {
    return schedules.filter(
      s => s.hari.toLowerCase() === dayNameIndo.toLowerCase() &&
           !isSampleEntity({ kodeGuru: s.kodeGuru, kodeMapel: s.kodeMapel })
    );
  }, [schedules, dayNameIndo]);

  // Log Presensi pada Tanggal Terpilih
  const dayLogs = useMemo(() => {
    return attendanceLogs.filter(l => isSameDate(l.tanggal, activeDate));
  }, [attendanceLogs, activeDate]);

  // Daftar Guru yang Memiliki Jadwal KBM pada Hari Terpilih
  const activeTeachersList = useMemo(() => {
    const teacherMapCount: Record<string, { code: string; name: string; total: number; filled: number; unconfirmed: number }> = {};

    daySchedules.forEach(sched => {
      const code = sched.kodeGuru;
      if (!code || isSampleEntity({ kodeGuru: code, kodeMapel: sched.kodeMapel })) return;

      const normCode = code.toLowerCase();
      if (!teacherMapCount[normCode]) {
        const teacherObj = teachersMap[normCode];
        teacherMapCount[normCode] = {
          code,
          name: teacherObj?.namaLengkap || `Guru [${code}]`,
          total: 0,
          filled: 0,
          unconfirmed: 0,
        };
      }

      teacherMapCount[normCode].total += 1;

      const normCls = normalizeClassName(sched.namaKelas);
      const matched = dayLogs.find(log => {
        const normLogClass = normalizeClassName(log.kelas);
        if (normLogClass !== normCls) return false;
        if (log.periods && log.periods.length > 0 && sched.periods && sched.periods.length > 0) {
          if (log.periods.some(p => sched.periods.includes(p))) return true;
        }
        if (log.mapelKe && sched.mapelKe && Number(log.mapelKe) === Number(sched.mapelKe)) return true;
        if (log.kodeGuru && sched.kodeGuru && log.kodeGuru.toLowerCase() === normCode) return true;
        return false;
      });

      if (matched) {
        teacherMapCount[normCode].filled += 1;
      } else {
        teacherMapCount[normCode].unconfirmed += 1;
      }
    });

    return Object.values(teacherMapCount).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [daySchedules, dayLogs, teachersMap]);

  // Filtered teachers by search
  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return activeTeachersList;
    const q = teacherSearch.toLowerCase().trim();
    return activeTeachersList.filter(
      t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
    );
  }, [activeTeachersList, teacherSearch]);

  // Set default selectedTeacher
  React.useEffect(() => {
    if (viewMode === 'teacher') {
      if (filteredTeachers.length > 0) {
        if (!selectedTeacher || !filteredTeachers.some(t => t.code.toLowerCase() === selectedTeacher.toLowerCase())) {
          setSelectedTeacher(filteredTeachers[0].code);
        }
      } else if (activeTeachersList.length > 0) {
        if (!selectedTeacher || !activeTeachersList.some(t => t.code.toLowerCase() === selectedTeacher.toLowerCase())) {
          setSelectedTeacher(activeTeachersList[0].code);
        }
      }
    }
  }, [viewMode, filteredTeachers, activeTeachersList, selectedTeacher]);

  // Hitung status kelengkapan presensi untuk setiap kelas pada hari ini
  const classProgressMap = useMemo(() => {
    const map: Record<string, { total: number; filled: number; unconfirmed: number }> = {};

    uniqueClassNames.forEach(cls => {
      const normCls = normalizeClassName(cls);
      const clsScheds = daySchedules.filter(s => normalizeClassName(s.namaKelas) === normCls);
      let filled = 0;

      clsScheds.forEach(sched => {
        const matched = dayLogs.find(log => {
          const normLogClass = normalizeClassName(log.kelas);
          if (normLogClass !== normCls) return false;
          if (log.periods && log.periods.length > 0 && sched.periods && sched.periods.length > 0) {
            if (log.periods.some(p => sched.periods.includes(p))) return true;
          }
          if (log.mapelKe && sched.mapelKe && Number(log.mapelKe) === Number(sched.mapelKe)) return true;
          if (log.kodeGuru && sched.kodeGuru && log.kodeGuru.toLowerCase() === sched.kodeGuru.toLowerCase()) return true;
          return false;
        });
        if (matched) filled++;
      });

      map[cls] = {
        total: clsScheds.length,
        filled,
        unconfirmed: Math.max(0, clsScheds.length - filled),
      };
    });

    return map;
  }, [uniqueClassNames, daySchedules, dayLogs]);

  // Sesi KBM untuk Kelas yang Sedang Dipilih
  const selectedClassSessions = useMemo(() => {
    if (!selectedClass) return [];
    const norm = normalizeClassName(selectedClass);
    const clsScheds = daySchedules
      .filter(s => normalizeClassName(s.namaKelas) === norm)
      .sort((a, b) => (a.mapelKe || 1) - (b.mapelKe || 1));

    return clsScheds.map(sched => {
      const matched = dayLogs.find(log => {
        const normLogClass = normalizeClassName(log.kelas);
        if (normLogClass !== norm) return false;
        if (log.periods && log.periods.length > 0 && sched.periods && sched.periods.length > 0) {
          if (log.periods.some(p => sched.periods.includes(p))) return true;
        }
        if (log.mapelKe && sched.mapelKe && Number(log.mapelKe) === Number(sched.mapelKe)) return true;
        if (log.kodeGuru && sched.kodeGuru && log.kodeGuru.toLowerCase() === sched.kodeGuru.toLowerCase()) return true;
        return false;
      });

      const teacherObj = teachersMap[sched.kodeGuru.toLowerCase()];
      const subjectObj = subjectsMap[sched.kodeMapel.toLowerCase()];

      return {
        schedule: sched,
        existingLog: matched || null,
        teacherName: teacherObj?.namaLengkap || matched?.namaGuru || sched.kodeGuru,
        subjectName: subjectObj?.namaMapel || sched.kodeMapel,
      };
    });
  }, [selectedClass, daySchedules, dayLogs, teachersMap, subjectsMap]);

  // Sesi KBM untuk Guru yang Sedang Dipilih
  const selectedTeacherSessions = useMemo(() => {
    if (!selectedTeacher) return [];
    const normTeacherCode = selectedTeacher.toLowerCase();

    const teacherScheds = daySchedules.filter(
      s => s.kodeGuru && s.kodeGuru.toLowerCase() === normTeacherCode
    );

    const items = teacherScheds.map(sched => {
      const normCls = normalizeClassName(sched.namaKelas);
      const matched = dayLogs.find(log => {
        const normLogClass = normalizeClassName(log.kelas);
        if (normLogClass !== normCls) return false;
        if (log.periods && log.periods.length > 0 && sched.periods && sched.periods.length > 0) {
          if (log.periods.some(p => sched.periods.includes(p))) return true;
        }
        if (log.mapelKe && sched.mapelKe && Number(log.mapelKe) === Number(sched.mapelKe)) return true;
        if (log.kodeGuru && sched.kodeGuru && log.kodeGuru.toLowerCase() === normTeacherCode) return true;
        return false;
      });

      const teacherObj = teachersMap[normTeacherCode];
      const subjectObj = subjectsMap[sched.kodeMapel.toLowerCase()];

      return {
        schedule: sched,
        existingLog: matched || null,
        teacherName: teacherObj?.namaLengkap || matched?.namaGuru || sched.kodeGuru,
        subjectName: subjectObj?.namaMapel || sched.kodeMapel,
      };
    });

    if (teacherSortMode === 'time') {
      return items.sort((a, b) => (a.schedule.mapelKe || 1) - (b.schedule.mapelKe || 1));
    } else {
      return items.sort((a, b) => {
        const gradeA = getGradeLevel(a.schedule.namaKelas) || '99';
        const gradeB = getGradeLevel(b.schedule.namaKelas) || '99';
        if (gradeA !== gradeB) return gradeA.localeCompare(gradeB);

        const classComp = a.schedule.namaKelas.localeCompare(b.schedule.namaKelas, undefined, { numeric: true, sensitivity: 'base' });
        if (classComp !== 0) return classComp;

        return (a.schedule.mapelKe || 1) - (b.schedule.mapelKe || 1);
      });
    }
  }, [selectedTeacher, daySchedules, dayLogs, teachersMap, subjectsMap, teacherSortMode]);


  // Buka Modal Form
  const handleOpenModal = (sched: ScheduleItem, existing: AttendanceLogItem | null) => {
    setActiveSlotModal({ schedule: sched, existingLog: existing });
    setStatusFeedback(null);
    if (existing) {
      setStatusInput(existing.statusKehadiran || 'Hadir');
      setKegiatanInput(existing.kegiatanPembelajaran && existing.kegiatanPembelajaran !== '-' ? existing.kegiatanPembelajaran : '');
      setInfoInput(existing.infoKetidakhadiran && existing.infoKetidakhadiran !== '-' ? existing.infoKetidakhadiran : '');
      
      const sData = (existing.sumberData || '').trim();
      if (sData === 'Agenda Kelas' || sData === 'Guru Piket' || sData === 'Siswa') {
        setSumberDataOption(sData);
        setSumberDataCustom('');
      } else if (sData && sData !== 'admin' && sData !== 'Input Mandiri') {
        setSumberDataOption('Lainnya');
        setSumberDataCustom(sData);
      } else {
        setSumberDataOption('Agenda Kelas');
        setSumberDataCustom('');
      }

      const defaultOfficer = adminSession?.nama || adminSession?.username || 'Petugas Piket';
      setPetugasInput(existing.penginputData || defaultOfficer);
    } else {
      setStatusInput('Hadir');
      setKegiatanInput('');
      setInfoInput('');
      setSumberDataOption('Agenda Kelas');
      setSumberDataCustom('');
      setPetugasInput(adminSession?.nama || adminSession?.username || 'Petugas Piket');
    }
  };

  // Simpan Form Input/Edit Piket
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSlotModal) return;

    setIsSubmitting(true);
    setStatusFeedback(null);

    try {
      const effectiveSumber = sumberDataOption === 'Lainnya'
        ? (sumberDataCustom.trim() || 'Lainnya')
        : sumberDataOption;

      const effectivePenginput = petugasInput.trim() || adminSession?.nama || adminSession?.username || 'Petugas Piket';

      const logItem = buildPiketAttendanceLogItem({
        schedule: activeSlotModal.schedule,
        tanggal: activeDate,
        statusKehadiran: statusInput,
        kegiatanPembelajaran: statusInput === 'Hadir' ? kegiatanInput : '-',
        infoKetidakhadiran: statusInput !== 'Hadir' ? infoInput : '-',
        sumberData: effectiveSumber,
        penginputData: effectivePenginput,
        petugasUsername: adminSession?.username || 'admin',
        classes,
        masterGuru,
        existingLog: activeSlotModal.existingLog,
      });

      const res = await onSaveLog(logItem);
      if (res.success) {
        setStatusFeedback({ type: 'success', message: res.message || 'Agenda KBM berhasil disimpan ke database!' });
        setTimeout(() => {
          setActiveSlotModal(null);
          setStatusFeedback(null);
        }, 1200);
      } else {
        setStatusFeedback({ type: 'error', message: res.message || 'Gagal menyimpan ke Google Spreadsheet.' });
      }
    } catch (err: any) {
      setStatusFeedback({ type: 'error', message: err.message || 'Terjadi kesalahan sistem saat menyimpan.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { label: 'Hadir', value: 'Hadir', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
    { label: 'Sakit', value: 'Sakit', color: 'border-amber-500 bg-amber-50 text-amber-800' },
    { label: 'Keperluan Pribadi', value: 'Keperluan Pribadi', color: 'border-orange-500 bg-orange-50 text-orange-800' },
    { label: 'Dinas Luar', value: 'Dinas Luar', color: 'border-blue-500 bg-blue-50 text-blue-800' },
    { label: 'Instruksi Pimpinan', value: 'Instruksi Pimpinan', color: 'border-purple-500 bg-purple-50 text-purple-800' },
    { label: 'Tanpa Keterangan', value: 'Tanpa Keterangan', color: 'border-rose-500 bg-rose-50 text-rose-800' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner & Date Selector */}
      <div className="p-4 bg-linear-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-md border border-indigo-800/40 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <ClipboardCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>Input Manual Agenda Siswa (Guru Piket)</span>
                <span className="text-[10px] font-mono bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  Mode Piket
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Catat presensi dan materi pembelajaran berdasarkan buku agenda manual kelas yang dikumpulkan siswa saat pulang.
              </p>
            </div>
          </div>

          {/* Opsi 3 Mode Pemilih Tanggal KBM */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0 bg-white/10 p-2 rounded-xl border border-white/20">
            {/* Sakelar Mode Tanggal */}
            <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDateMode('daily')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer text-xs font-bold ${
                  dateMode === 'daily'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Harian
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateMode('weekly');
                  const thisWeek = new Date(todayWib);
                  const day = thisWeek.getDay();
                  const diffToMon = day === 0 ? -6 : 1 - day;
                  thisWeek.setDate(thisWeek.getDate() + diffToMon);
                  setActiveDate(formatToIndonesianDisplayDate(thisWeek));
                }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer text-xs font-bold ${
                  dateMode === 'weekly'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Pekan Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateMode('last_week');
                  const prevWeek = new Date(todayWib);
                  prevWeek.setDate(todayWib.getDate() - 7);
                  const day = prevWeek.getDay();
                  const diffToMon = day === 0 ? -6 : 1 - day;
                  prevWeek.setDate(prevWeek.getDate() + diffToMon);
                  setActiveDate(formatToIndonesianDisplayDate(prevWeek));
                }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer text-xs font-bold ${
                  dateMode === 'last_week'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Pekan Lalu
              </button>
              <button
                type="button"
                onClick={() => setDateMode('range')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer text-xs font-bold ${
                  dateMode === 'range'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Rentang Waktu
              </button>
            </div>

            {/* Kontrol Kalender berdasarkan Mode */}
            {dateMode === 'daily' && (
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                <CalendarDatePickerPopover
                  selectedDate={activeDate}
                  onChangeDate={(newD: string) => setActiveDate(newD)}
                  hariLibur={hariLibur}
                  disableFutureDates={true}
                />
              </div>
            )}

            {(dateMode === 'weekly' || dateMode === 'last_week') && (
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-slate-300 text-[10px] hidden sm:inline">Acuan Minggu:</span>
                <CalendarDatePickerPopover
                  selectedDate={activeDate}
                  onChangeDate={(newD: string) => setActiveDate(newD)}
                  hariLibur={hariLibur}
                  disableFutureDates={true}
                />
              </div>
            )}

            {dateMode === 'range' && (
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-slate-300 text-[10px]">Mulai:</span>
                <CalendarDatePickerPopover
                  selectedDate={rangeStart}
                  onChangeDate={(newD: string) => {
                    setRangeStart(newD);
                    setActiveDate(newD);
                  }}
                  hariLibur={hariLibur}
                  disableFutureDates={true}
                />
                <span className="text-slate-300 text-[10px] ml-1">Selesai:</span>
                <CalendarDatePickerPopover
                  selectedDate={rangeEnd}
                  onChangeDate={(newD: string) => setRangeEnd(newD)}
                  hariLibur={hariLibur}
                  disableFutureDates={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigasi Hari (Senin - Jumat) ketika mode 'weekly', 'last_week', atau 'range' aktif */}
        {(dateMode === 'weekly' || dateMode === 'last_week') && (
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] text-indigo-200 font-semibold shrink-0 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Hari KBM {dateMode === 'last_week' ? 'Pekan Lalu' : 'Pekan Ini'}:</span>
              </span>
              {weekDays.map(item => {
                const isActive = isSameDate(item.date, activeDate);
                const isDisabled = item.isFuture || item.isHoliday;
                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && setActiveDate(item.dateStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 border ${
                      isActive
                        ? 'bg-white text-indigo-950 border-white shadow-md ring-2 ring-indigo-400 cursor-default'
                        : isDisabled
                        ? item.isHoliday
                          ? 'bg-rose-500/10 border-rose-400/20 text-rose-300 opacity-50 cursor-not-allowed pointer-events-none'
                          : 'bg-white/5 border-white/10 text-slate-400 opacity-50 cursor-not-allowed pointer-events-none'
                        : 'bg-white/10 hover:bg-white/20 border-white/20 text-white cursor-pointer'
                    }`}
                  >
                    <span>{item.dayShort} ({item.dateStr.split('-')[0]})</span>
                    {item.isToday && (
                      <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-mono font-bold">
                        Hari Ini
                      </span>
                    )}
                    {item.isHoliday && (
                      <span className="w-2 h-2 rounded-full bg-rose-400" title={`Libur: ${item.holidayDesc}`} />
                    )}
                    {item.isFuture && (
                      <span className="text-[9px] bg-slate-700 text-slate-300 px-1 py-0.2 rounded-full font-mono">
                        Belum Mulai
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-indigo-200/80 italic font-medium shrink-0">
              *tombol non aktif bagi hari belum dimulai dan hari libur
            </span>
          </div>
        )}

        {dateMode === 'range' && (
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] text-indigo-200 font-semibold shrink-0 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Hari KBM Efektif ({rangeDays.length} Hari):</span>
              </span>
              {rangeDays.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Pilih rentang tanggal yang valid di atas.</span>
              ) : (
                rangeDays.map(item => {
                  const isActive = isSameDate(item.date, activeDate);
                  const isDisabled = item.isFuture || item.isHoliday;
                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && setActiveDate(item.dateStr)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 border ${
                        isActive
                          ? 'bg-white text-indigo-950 border-white shadow-md ring-2 ring-indigo-400 cursor-default'
                          : isDisabled
                          ? item.isHoliday
                            ? 'bg-rose-500/10 border-rose-400/20 text-rose-300 opacity-50 cursor-not-allowed pointer-events-none'
                            : 'bg-white/5 border-white/10 text-slate-400 opacity-50 cursor-not-allowed pointer-events-none'
                          : 'bg-white/10 hover:bg-white/20 border-white/20 text-white cursor-pointer'
                      }`}
                    >
                      <span>{item.dayName} ({item.dateStr.split('-')[0]})</span>
                      {item.isToday && (
                        <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-mono font-bold">
                          Hari Ini
                        </span>
                      )}
                      {item.isHoliday && (
                        <span className="w-2 h-2 rounded-full bg-rose-400" title={`Libur: ${item.holidayDesc}`} />
                      )}
                      {item.isFuture && (
                        <span className="text-[9px] bg-slate-700 text-slate-300 px-1 py-0.2 rounded-full font-mono">
                          Belum Mulai
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <span className="text-[10px] text-indigo-200/80 italic font-medium shrink-0">
              *tombol non aktif bagi hari belum dimulai dan hari libur
            </span>
          </div>
        )}
      </div>

      {/* Grid Pemilih Kelas / Guru & Lembar Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Kolom Kiri: Pemilih Kelas / Guru (4 kolom) */}
        <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-3">
          {/* Sakelar Mode Tampilan: Per Kelas vs Per Guru */}
          <div className="grid grid-cols-2 p-1 bg-slate-200/80 rounded-xl text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setViewMode('class')}
              className={`py-1.5 px-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'class'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Per Kelas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('teacher')}
              className={`py-1.5 px-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'teacher'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Per Guru</span>
            </button>
          </div>

          {/* MODE PER KELAS */}
          {viewMode === 'class' && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Daftar Kelas</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                  {filteredClasses.length} Kelas
                </span>
              </div>

              {/* Tombol Pemilah Tingkat Kelas */}
              <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
                {[
                  { id: 'all', label: 'Semua', count: gradeCounts.all },
                  { id: '7', label: '7 (VII)', count: gradeCounts['7'] },
                  { id: '8', label: '8 (VIII)', count: gradeCounts['8'] },
                  { id: '9', label: '9 (IX)', count: gradeCounts['9'] },
                ].map(item => {
                  const isActive = selectedGradeFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedGradeFilter(item.id as 'all' | '7' | '8' | '9')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                        isActive
                          ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-300'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-300/60 text-slate-700'
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Pencarian Kelas */}
              <div className="relative">
                <input
                  type="text"
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  placeholder="Cari kelas (misal: 7A, VIII-B)..."
                  className="w-full text-xs py-1.5 pl-8 pr-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {/* List Tombol Kelas Scrollable */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-1.5 max-h-[380px] lg:max-h-[600px] overflow-y-auto pr-1">
                {filteredClasses.map(cls => {
                  const prog = classProgressMap[cls] || { total: 0, filled: 0, unconfirmed: 0 };
                  const isSelected = selectedClass === cls;
                  const isComplete = prog.total > 0 && prog.unconfirmed === 0;

                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedClass(cls)}
                      className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-700 text-white shadow-xs font-bold ring-2 ring-indigo-400/30'
                          : 'bg-white hover:bg-indigo-50/50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold tracking-tight">{cls}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            prog.total === 0
                              ? 'bg-slate-300'
                              : isComplete
                              ? (isSelected ? 'bg-emerald-300' : 'bg-emerald-500')
                              : (isSelected ? 'bg-amber-300' : 'bg-rose-500')
                          }`}
                        />
                      </div>
                      <div className={`text-[10px] mt-1 font-mono flex items-center justify-between ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                        <span>{prog.total > 0 ? `${prog.filled}/${prog.total} Sesi` : 'Tidak Ada Sesi'}</span>
                        {prog.unconfirmed > 0 && (
                          <span className={`font-semibold ${isSelected ? 'text-amber-200' : 'text-rose-600'}`}>
                            {prog.unconfirmed} Kosong
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* MODE PER GURU */}
          {viewMode === 'teacher' && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>Daftar Guru ({dayNameIndo})</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                  {filteredTeachers.length} Guru
                </span>
              </div>

              {/* Pencarian Guru */}
              <div className="relative">
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Cari guru mengajar hari ini..."
                  className="w-full text-xs py-1.5 pl-8 pr-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {/* List Tombol Guru Scrollable */}
              <div className="flex flex-col gap-1.5 max-h-[380px] lg:max-h-[600px] overflow-y-auto pr-1">
                {filteredTeachers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 font-medium">
                    Tidak ditemukan guru yang mengajar pada hari {dayNameIndo}.
                  </div>
                ) : (
                  filteredTeachers.map(t => {
                    const isSelected = selectedTeacher.toLowerCase() === t.code.toLowerCase();
                    const isComplete = t.total > 0 && t.unconfirmed === 0;

                    return (
                      <button
                        key={t.code}
                        type="button"
                        onClick={() => setSelectedTeacher(t.code)}
                        className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-700 text-white shadow-xs font-bold ring-2 ring-indigo-400/30'
                            : 'bg-white hover:bg-indigo-50/50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold tracking-tight line-clamp-1">{t.name}</span>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              t.total === 0
                                ? 'bg-slate-300'
                                : isComplete
                                ? (isSelected ? 'bg-emerald-300' : 'bg-emerald-500')
                                : (isSelected ? 'bg-amber-300' : 'bg-rose-500')
                            }`}
                          />
                        </div>
                        <div className={`text-[10px] mt-1 font-mono flex items-center justify-between ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                          <span>Kode: [{t.code}]</span>
                          <span>{t.filled}/{t.total} Sesi</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Kolom Kanan: Sesi KBM Terpilih (8 kolom) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
          {/* Header Panel Kanan */}
          {viewMode === 'class' ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-900">Agenda Kelas: {selectedClass}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                    {dayNameIndo}, {formatToIndonesianDisplayDate(activeDate)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pilih sesi pelajaran di bawah untuk menginput catatan dari buku agenda manual siswa atau merevisi data.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[11px] font-semibold text-slate-600">
                  Total: <strong className="font-mono text-slate-900">{selectedClassSessions.length}</strong> Sesi
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-extrabold text-slate-900">
                    Jadwal Mengajar: {teachersMap[selectedTeacher.toLowerCase()]?.namaLengkap || selectedTeacher}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                    Kode: [{selectedTeacher}]
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Seluruh sesi mengajar guru ini pada hari {dayNameIndo}, {formatToIndonesianDisplayDate(activeDate)}.
                </p>
              </div>

              {/* Tombol Sakelar Pengurutan Sesi Guru */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setTeacherSortMode('time')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    teacherSortMode === 'time'
                      ? 'bg-white text-indigo-700 shadow-xs font-bold border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Urut Jam</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherSortMode('class')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    teacherSortMode === 'class'
                      ? 'bg-white text-indigo-700 shadow-xs font-bold border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Urut Kelas (7-9 A-Z)</span>
                </button>
              </div>
            </div>
          )}

          {/* Daftar Kartu Sesi KBM */}
          {((viewMode === 'class' ? selectedClassSessions : selectedTeacherSessions).length === 0) ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <BookOpen className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
              <p className="text-xs font-semibold text-slate-600">
                {viewMode === 'class'
                  ? `Tidak ada jadwal KBM terjadwal untuk kelas ${selectedClass} pada hari ${dayNameIndo}.`
                  : `Tidak ada jadwal mengajar terjadwal untuk guru ini pada hari ${dayNameIndo}.`}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Pilih {viewMode === 'class' ? 'kelas' : 'guru'} atau hari lain pada tanggal acuan.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] lg:max-h-[640px] overflow-y-auto pr-1">
              {(viewMode === 'class' ? selectedClassSessions : selectedTeacherSessions).map((item, idx) => {
                const { schedule, existingLog, teacherName, subjectName } = item;
                const isFilled = Boolean(existingLog);
                const isHadir = existingLog?.statusKehadiran === 'Hadir';

                return (
                  <div
                    key={`${schedule.namaKelas}_${schedule.mapelKe}_${schedule.kodeGuru}_${idx}`}
                    className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      !isFilled
                        ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                        : isHadir
                        ? 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-300'
                        : 'bg-amber-50/30 border-amber-200 hover:border-amber-300'
                    }`}
                  >
                    {/* Info Sesi, Kelas & Guru */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Lencana Kelas (Muncul Prominen Saat Mode Guru) */}
                        {viewMode === 'teacher' && (
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-indigo-900 text-white flex items-center gap-1 border border-indigo-950 shadow-2xs">
                            <Layers className="w-3 h-3 text-indigo-300" />
                            <span>Kelas {schedule.namaKelas}</span>
                          </span>
                        )}

                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-slate-900 text-white">
                          Mapel {schedule.mapelKe} · Jam {formatJamKeWithSpaces(schedule.jamKe)}
                        </span>
                        <span className="text-xs font-semibold font-mono text-slate-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{schedule.jamMulai} - {schedule.jamSelesai}</span>
                        </span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                          {schedule.kodeMapel} ({subjectName})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900">{teacherName}</span>
                        <span className="text-slate-400 font-mono text-[11px]">[{schedule.kodeGuru}]</span>
                        {viewMode === 'class' && (
                          <span className="text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                            Kelas {schedule.namaKelas}
                          </span>
                        )}
                      </div>

                      {/* Detail Presensi Terisi */}
                      {isFilled && existingLog && (
                        <div className="pt-1 border-t border-slate-200/60 text-xs space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                existingLog.statusKehadiran === 'Hadir'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-amber-600 text-white'
                              }`}
                            >
                              {existingLog.statusKehadiran === 'Hadir' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                              <span>{existingLog.statusKehadiran}</span>
                            </span>

                            <span className="text-[10px] text-slate-500 font-mono">
                              Sumber: <strong>{existingLog.sumberData || 'Piket'}</strong>
                              {existingLog.penginputData && (
                                <span className="ml-1 text-slate-400">({existingLog.penginputData})</span>
                              )}
                            </span>

                            <span className="text-[10px] text-slate-500 font-mono">
                              ID: <span className="font-mono text-slate-700">{existingLog.idKiriman}</span>
                            </span>
                          </div>

                          {/* Catatan Kegiatan atau Izin */}
                          {existingLog.statusKehadiran === 'Hadir' ? (
                            existingLog.kegiatanPembelajaran && existingLog.kegiatanPembelajaran !== '-' && (
                              <p className="text-[11px] text-slate-700 italic bg-white/80 p-1.5 rounded-md border border-slate-200/80">
                                <strong>Materi/Kegiatan:</strong> {existingLog.kegiatanPembelajaran}
                              </p>
                            )
                          ) : (
                            existingLog.infoKetidakhadiran && existingLog.infoKetidakhadiran !== '-' && (
                              <p className="text-[11px] text-amber-900 italic bg-white/80 p-1.5 rounded-md border border-amber-200">
                                <strong>Alasan:</strong> {existingLog.infoKetidakhadiran}
                              </p>
                            )
                          )}
                        </div>
                      )}

                      {!isFilled && (
                        <div className="text-[11px] text-rose-700 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Belum ada catatan presensi KBM untuk sesi ini (Kosong).</span>
                        </div>
                      )}
                    </div>

                    {/* Tombol Aksi Input/Edit */}
                    <div className="shrink-0 flex items-center sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(schedule, existingLog)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                          !isFilled
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                        }`}
                      >
                        {!isFilled ? (
                          <>
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Input Agenda</span>
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Edit Data</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL POPUP FORM INPUT / EDIT SESI KBM */}
      {activeSlotModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <ClipboardCheck className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {activeSlotModal.existingLog ? 'Edit Data Agenda Sesi KBM' : 'Input Manual Agenda Sesi KBM'}
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Kelas {activeSlotModal.schedule.namaKelas} · Mapel Ke {activeSlotModal.schedule.mapelKe} ({activeSlotModal.schedule.kodeMapel})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSlotModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveModal} className="p-5 space-y-4 text-slate-800 text-xs">
              {/* Feedback Alert */}
              {statusFeedback && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2 ${
                    statusFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  {statusFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span className="text-xs font-semibold">{statusFeedback.message}</span>
                </div>
              )}

              {/* Rincian Sesi */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Guru Pengampu:</span>
                  <span className="font-bold text-slate-900">
                    {teachersMap[activeSlotModal.schedule.kodeGuru.toLowerCase()]?.namaLengkap || activeSlotModal.schedule.kodeGuru}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Jam Pelajaran:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    Jam {formatJamKeWithSpaces(activeSlotModal.schedule.jamKe)} ({activeSlotModal.schedule.jamMulai} - {activeSlotModal.schedule.jamSelesai})
                  </span>
                </div>
              </div>

              {/* Pilihan Status Kehadiran */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Status Kehadiran Guru Menurut Agenda Kelas: <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {statusOptions.map(opt => {
                    const isSelected = statusInput === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatusInput(opt.value)}
                        className={`p-2 rounded-xl text-center border font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? `${opt.color} font-bold ring-2 ring-indigo-500 shadow-xs`
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span className="text-[11px]">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field Kegiatan Pembelajaran (Jika Hadir) */}
              {statusInput === 'Hadir' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-slate-700">
                    Kegiatan Pembelajaran (Materi dari Buku Agenda Siswa):
                  </label>
                  <textarea
                    rows={3}
                    value={kegiatanInput}
                    onChange={(e) => setKegiatanInput(e.target.value)}
                    placeholder="Contoh: Bab 3 Persamaan Kuadrat, Pembahasan Latihan Soal No. 1-10 di papan tulis."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    *Materi akan dicatat pada kolom <strong>Kegiatan Pembelajaran</strong> di sheet attendancelogs.
                  </span>
                </div>
              )}

              {/* Field Info Ketidakhadiran (Jika Selain Hadir) */}
              {statusInput !== 'Hadir' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-slate-700">
                    Info Ketidakhadiran / Alasan ({statusInput}): <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={infoInput}
                    onChange={(e) => setInfoInput(e.target.value)}
                    placeholder={
                      statusInput === 'Sakit'
                        ? 'Contoh: Sakit demam berdarah / puyeng, ada surat dokter.'
                        : statusInput === 'Keperluan Pribadi'
                        ? 'Contoh: Izin keperluan keluarga mendesak / mengantar orang tua ke RS.'
                        : statusInput === 'Dinas Luar'
                        ? 'Contoh: Mengikuti pelatihan kurikulum di dinas pendidikan kab/kota.'
                        : statusInput === 'Instruksi Pimpinan'
                        ? 'Contoh: [Instruksi: Kepala Sekolah] Mengikuti rapat koordinasi persiapan ANBK.'
                        : 'Contoh: Tidak ada konfirmasi di agenda kelas.'
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    *Keterangan ini dicatat pada kolom <strong>Info Ketidakhadiran</strong> di sheet attendancelogs.
                  </span>
                </div>
              )}

              {/* Pilihan Sumber Data Sekali Klik */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Sumber Data: <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    *Kolom &quot;Sumber data&quot; di sheet
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {SUMBER_DATA_OPTIONS.map(opt => {
                    const isSelected = sumberDataOption === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSumberDataOption(opt)}
                        className={`py-2 px-2.5 rounded-xl text-center border font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 text-xs whitespace-nowrap ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold ring-2 ring-indigo-500 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-600" />}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Isian Teks Tambahan saat opsi 'Lainnya' dipilih */}
                {sumberDataOption === 'Lainnya' && (
                  <div className="pt-1.5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={sumberDataCustom}
                      onChange={(e) => setSumberDataCustom(e.target.value)}
                      placeholder="Sebutkan sumber data (contoh: Laporan Wali Kelas, Ketua Kelas)..."
                      className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Penginput Data (Nama Petugas Piket) & ID Kiriman Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Penginput Data: <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      *Kolom &quot;Penginput Data&quot;
                    </span>
                  </div>
                  <input
                    type="text"
                    value={petugasInput}
                    onChange={(e) => setPetugasInput(e.target.value)}
                    placeholder="Nama lengkap petugas piket"
                    className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800 font-semibold"
                  />
                  {adminSession && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Akun login: <strong>{adminSession.nama || adminSession.username}</strong> ({adminSession.role})
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ID Kiriman (Formula Baku):
                  </label>
                  <div className="py-2 px-3 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-700 text-xs truncate font-semibold">
                    {generatePiketIdKiriman(
                      activeDate,
                      activeSlotModal.schedule.namaKelas,
                      activeSlotModal.schedule.mapelKe,
                      activeSlotModal.schedule.kodeGuru,
                      activeSlotModal.existingLog?.idKiriman
                    )}
                  </div>
                </div>
              </div>

              {/* Info Tambahan Parameter Kolom Baku */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 space-y-0.5 font-mono">
                <div>• Pengganti (Y/N): <strong>N</strong></div>
                <div>• Waktu Absen: <strong>(Dikosongkan)</strong></div>
                <div>• Sumber data: <strong>{sumberDataOption === 'Lainnya' ? (sumberDataCustom.trim() || 'Lainnya') : sumberDataOption}</strong></div>
                <div>• Penginput Data: <strong>{petugasInput.trim() || adminSession?.nama || adminSession?.username || 'Petugas Piket'}</strong></div>
              </div>

              {/* Tombol Simpan & Batal */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveSlotModal(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isFutureDate}
                  className={`px-5 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs ${
                    isFutureDate
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan ke Spreadsheet...</span>
                    </>
                  ) : isFutureDate ? (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>Waktu Belum Mulai (Terkunci)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan ke Agenda Piket</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
