import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Palmtree, 
  Check, 
  Clock,
  Sparkles,
  X
} from 'lucide-react';
import { HariLiburItem, AttendanceLogItem, PeriodeAkademik } from '../types';
import { 
  formatDateDMY, 
  formatToIndonesianDisplayDate, 
  parseDateDMY, 
  canonicalDateKey, 
  isWeekend, 
  isHolidayDate,
  isSameDate
} from '../utils/appsScriptCode';

interface CalendarDatePickerPopoverProps {
  selectedDate: string; // e.g. "16-Okt-2026"
  onChangeDate: (newDateFormatted: string) => void;
  hariLibur?: HariLiburItem[];
  attendanceLogs?: AttendanceLogItem[];
  periodeAkademik?: PeriodeAkademik;
  onSyncNeeded?: () => void;
  isSyncing?: boolean;
  disableFutureDates?: boolean;
}

const MONTH_NAMES_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES_HEADER = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export const CalendarDatePickerPopover: React.FC<CalendarDatePickerPopoverProps> = ({
  selectedDate,
  onChangeDate,
  hariLibur = [],
  attendanceLogs = [],
  periodeAkademik,
  onSyncNeeded,
  isSyncing = false,
  disableFutureDates = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse tanggal terpilih saat ini
  const parsedCurrentDate = useMemo(() => {
    return parseDateDMY(selectedDate) || new Date();
  }, [selectedDate]);

  // State bulan yang sedang dilihat di kalender
  const [viewDate, setViewDate] = useState<Date>(() => {
    return parseDateDMY(selectedDate) || new Date();
  });

  // Sinkronkan bulan tampilan kalender saat selectedDate berubah dari luar
  useEffect(() => {
    const p = parseDateDMY(selectedDate);
    if (p) {
      setViewDate(p);
    }
  }, [selectedDate]);

  // Click outside listener untuk menutup popover secara aman
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Kumpulan tanggal yang memiliki catatan presensi KBM O(1)
  const attendanceDateKeys = useMemo(() => {
    const set = new Set<string>();
    attendanceLogs.forEach(l => {
      if (l.tanggal) {
        const k = canonicalDateKey(l.tanggal);
        if (k) set.add(k);
      }
    });
    return set;
  }, [attendanceLogs]);

  // Navigasi Bulan Kalender
  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Navigasi langsung Bulan dan Tahun
  const handleMonthChange = (mIndex: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), mIndex, 1));
  };

  const handleYearChange = (year: number) => {
    setViewDate(prev => new Date(year, prev.getMonth(), 1));
  };

  // Pilih tanggal langsung
  const handleSelectDay = (dayDate: Date) => {
    const formatted = formatToIndonesianDisplayDate(dayDate);
    onChangeDate(formatted);
    setIsOpen(false);

    // Cek apakah data tanggal ini ada di memori lokal, jika belum ada picu sinkronisasi
    const key = canonicalDateKey(dayDate);
    if (key && !attendanceDateKeys.has(key) && onSyncNeeded) {
      onSyncNeeded();
    }
  };

  // Tombol Pintas: Hari Ini
  const handleSelectToday = () => {
    const today = new Date();
    handleSelectDay(today);
    setViewDate(today);
  };

  // Tombol Pintas: Kemarin
  const handleSelectYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    handleSelectDay(yesterday);
    setViewDate(yesterday);
  };

  // Perhitungan Grid Tanggal Bulan Aktif
  const calendarGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    // Senin = 0, Minggu = 6
    const startDayOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    interface CalendarCell {
      date: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
      dateKey: string;
      isWeekend: boolean;
      isHoliday: boolean;
      holidayDesc?: string;
      hasAttendance: boolean;
      isSelected: boolean;
      isToday: boolean;
    }

    const cells: CalendarCell[] = [];

    // Hari dari bulan sebelumnya
    for (let i = startDayOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum, 12, 0, 0);
      const k = canonicalDateKey(d);
      const hol = isHolidayDate(d, hariLibur);
      cells.push({
        date: d,
        dayNumber: dayNum,
        isCurrentMonth: false,
        dateKey: k,
        isWeekend: isWeekend(d),
        isHoliday: hol.isHoliday,
        holidayDesc: hol.keterangan,
        hasAttendance: attendanceDateKeys.has(k),
        isSelected: isSameDate(d, selectedDate),
        isToday: isSameDate(d, new Date())
      });
    }

    // Hari dalam bulan saat ini
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const d = new Date(year, month, dayNum, 12, 0, 0);
      const k = canonicalDateKey(d);
      const hol = isHolidayDate(d, hariLibur);
      cells.push({
        date: d,
        dayNumber: dayNum,
        isCurrentMonth: true,
        dateKey: k,
        isWeekend: isWeekend(d),
        isHoliday: hol.isHoliday,
        holidayDesc: hol.keterangan,
        hasAttendance: attendanceDateKeys.has(k),
        isSelected: isSameDate(d, selectedDate),
        isToday: isSameDate(d, new Date())
      });
    }

    // Sisa hari dari bulan berikutnya agar genap kelipatan 7 (minimal 35 atau 42 cell)
    const totalRemaining = 42 - cells.length;
    if (totalRemaining > 0 && totalRemaining < 7) {
      for (let dayNum = 1; dayNum <= totalRemaining; dayNum++) {
        const d = new Date(year, month + 1, dayNum, 12, 0, 0);
        const k = canonicalDateKey(d);
        const hol = isHolidayDate(d, hariLibur);
        cells.push({
          date: d,
          dayNumber: dayNum,
          isCurrentMonth: false,
          dateKey: k,
          isWeekend: isWeekend(d),
          isHoliday: hol.isHoliday,
          holidayDesc: hol.keterangan,
          hasAttendance: attendanceDateKeys.has(k),
          isSelected: isSameDate(d, selectedDate),
          isToday: isSameDate(d, new Date())
        });
      }
    }

    return cells;
  }, [viewDate, selectedDate, hariLibur, attendanceDateKeys]);

  // Cek status tanggal terpilih saat ini
  const currentHolidayCheck = isHolidayDate(parsedCurrentDate, hariLibur);
  const currentIsWeekend = isWeekend(parsedCurrentDate);
  const currentHasLogs = attendanceDateKeys.has(canonicalDateKey(parsedCurrentDate));

  // Daftar opsi tahun (tahun aktif +/- 2 tahun)
  const availableYears = useMemo(() => {
    const curYear = new Date().getFullYear();
    return [curYear - 1, curYear, curYear + 1];
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* TRIGGER BUTTON (KOTAK TANGGAL ACUAN INTERAKTIF) */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-mono text-xs font-bold ${
          isOpen
            ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-indigo-500/30'
            : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-300 hover:border-slate-400 shadow-2xs'
        }`}
      >
        <Calendar className={`w-3.5 h-3.5 ${isOpen ? 'text-indigo-400' : 'text-indigo-600'}`} />
        
        {/* Format DD/MM/YYYY disembunyikan dari tampilan (tetap disimpan untuk kebutuhan logika) */}
        <span className="hidden" aria-hidden="true" data-date-dmy={formatDateDMY(selectedDate)}>
          {formatDateDMY(selectedDate)}
        </span>

        {/* Tampilan utama dalam kotak: DD-MMM-YYYY */}
        <span className="tabular-nums font-mono font-bold tracking-tight">
          {formatToIndonesianDisplayDate(selectedDate) || selectedDate}
        </span>

        {/* Indikator status tanggal aktif */}
        {currentHolidayCheck.isHoliday ? (
          <span 
            title={`Libur Resmi: ${currentHolidayCheck.keterangan}`}
            className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0 ring-2 ring-rose-200"
          />
        ) : currentIsWeekend ? (
          <span 
            title="Akhir Pekan (Sabtu/Minggu)"
            className="w-2 h-2 rounded-full bg-slate-400 inline-block shrink-0"
          />
        ) : currentHasLogs ? (
          <span 
            title="Ada rekaman presensi KBM"
            className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0 ring-2 ring-emerald-200"
          />
        ) : null}

        <ChevronDown 
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : 'text-slate-400 group-hover:text-slate-600'
          }`} 
        />
      </button>

      {/* POPOVER KALENDER BULANAN */}
      {isOpen && (
        <div 
          className="absolute left-0 mt-2 z-50 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 animate-in fade-in zoom-in-95 duration-150 font-sans"
        >
          {/* HEADER NAVIGASI BULAN & TAHUN */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Bulan Sebelumnya"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Selector Bulan */}
              <select
                value={viewDate.getMonth()}
                onChange={e => handleMonthChange(parseInt(e.target.value, 10))}
                className="font-bold text-xs text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none"
              >
                {MONTH_NAMES_INDONESIA.map((mName, idx) => (
                  <option key={idx} value={idx}>{mName}</option>
                ))}
              </select>

              {/* Selector Tahun */}
              <select
                value={viewDate.getFullYear()}
                onChange={e => handleYearChange(parseInt(e.target.value, 10))}
                className="font-mono font-bold text-xs text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none tabular-nums"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextMonth}
                title="Bulan Berikutnya"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              title="Tutup Kalender"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* NAMA HARI HEADER (SENIN - MINGGU) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_NAMES_HEADER.map((dName, idx) => {
              const isWk = idx === 5 || idx === 6; // Sab & Min
              return (
                <div 
                  key={idx}
                  className={`text-[10.5px] font-bold py-1 ${
                    isWk ? 'text-rose-500' : 'text-slate-600'
                  }`}
                >
                  {dName}
                </div>
              );
            })}
          </div>

          {/* GRID TANGGAL KALENDER */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarGrid.map((cell, idx) => {
              const isWeekendCell = cell.isWeekend;
              const isHol = cell.isHoliday;
              const isSelected = cell.isSelected;
              const hasKbm = cell.hasAttendance;
              const isCur = cell.isCurrentMonth;
              const isFuture = disableFutureDates && cell.dateKey > canonicalDateKey(new Date());

              // Tooltip label
              let titleText = `${formatDateDMY(cell.date)}`;
              if (isFuture) titleText += ' · Waktu Belum Mulai (Hari Mendatang)';
              else if (isHol) titleText += ` · Libur Resmi: ${cell.holidayDesc}`;
              else if (isWeekendCell) titleText += ' · Akhir Pekan (Sabtu/Minggu)';
              if (hasKbm) titleText += ' · Terdapat Data Presensi KBM';

              return (
                <button
                  key={idx}
                  type="button"
                  title={titleText}
                  disabled={isFuture}
                  onClick={() => !isFuture && handleSelectDay(cell.date)}
                  className={`relative flex flex-col items-center justify-center h-8 rounded-lg text-xs font-mono tabular-nums transition-all ${
                    isFuture
                      ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-400 font-normal pointer-events-none'
                      : isSelected
                      ? 'bg-slate-900 text-white font-black shadow-sm z-10 ring-2 ring-slate-800 cursor-pointer'
                      : isHol
                      ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200/80 hover:bg-rose-100 cursor-pointer'
                      : isWeekendCell
                      ? isCur 
                        ? 'text-slate-400 bg-slate-50/80 hover:bg-slate-100 cursor-pointer' 
                        : 'text-slate-300 bg-slate-50/40 cursor-pointer'
                      : isCur
                      ? 'text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 font-medium cursor-pointer'
                      : 'text-slate-300 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <span>{cell.dayNumber}</span>

                  {/* Indikator titik status di bawah nomor tanggal */}
                  <div className="flex items-center gap-0.5 mt-[-2px] h-1.5">
                    {/* Titik Hijau: Ada Data KBM */}
                    {hasKbm && (
                      <span 
                        className={`w-1 h-1 rounded-full ${
                          isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                        }`} 
                      />
                    )}

                    {/* Titik Merah: Hari Libur */}
                    {isHol && (
                      <span 
                        className={`w-1 h-1 rounded-full ${
                          isSelected ? 'bg-rose-300' : 'bg-rose-500'
                        }`} 
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* BARIS PINTAS CEPAT & KETERANGAN LEGENDA */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
            {/* Tombol Pintas */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectToday}
                  className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition cursor-pointer"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={handleSelectYesterday}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition cursor-pointer"
                >
                  Kemarin
                </button>
              </div>

              {isSyncing && (
                <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping inline-block" />
                  Sinkronisasi...
                </span>
              )}
            </div>

            {/* Legenda Indikator */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-1 border-t border-slate-50">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                <span>Hari Libur</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                <span>Akhir Pekan</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>Ada Log KBM</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
