import React from 'react';
import { CheckCircle2, AlertTriangle, UserCheck, Clock, CheckCheck } from 'lucide-react';

interface StatsOverviewProps {
  totalClasses: number;
  activePeriodNumber: number;
  presentCount: number;
  substituteCount: number;
  emptyCount: number;
  permitCount?: number;
  guruSudahAbsenPercent: number;
  onFilterEmpty: () => void;
  onFilterSubstitute: () => void;
  onResetFilter: () => void;
  activeFilter: string;
  isCompactMode?: boolean;
  isWeekend?: boolean;
  dayLabel?: string;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  totalClasses,
  activePeriodNumber,
  presentCount,
  substituteCount,
  emptyCount,
  permitCount,
  guruSudahAbsenPercent,
  onFilterEmpty,
  onFilterSubstitute,
  onResetFilter,
  activeFilter,
  isCompactMode = true,
  isWeekend = false,
  dayLabel,
}) => {
  const attendanceRate = totalClasses > 0 
    ? Math.round(((presentCount + substituteCount) / totalClasses) * 100) 
    : 0;

  // Ultra-Compact 1-Line Strip for 1-Screen Display
  if (isCompactMode) {
    if (isWeekend) {
      return (
        <div className="flex items-center justify-between gap-2 p-2 px-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs mb-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="font-bold text-amber-950">Akhir Pekan (Sabtu & Minggu):</span>
            <span className="text-amber-800">Hari libur sekolah, tidak ada jadwal kegiatan belajar mengajar aktif.</span>
          </div>
          <div className="font-mono text-[11px] text-amber-700 font-semibold">
            {dayLabel || 'Libur KBM'}
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between gap-2 p-2 px-3 rounded-xl bg-white border border-slate-200 text-xs mb-3 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-4 shrink-0">
          {/* Sesi Jam Aktif */}
          <div 
            onClick={onResetFilter}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
              activeFilter === 'all' ? 'bg-slate-900 text-white font-semibold' : 'hover:bg-slate-100 text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Jam {activePeriodNumber} Aktif:</span>
            <span className="font-mono font-bold tabular-nums">{attendanceRate}%</span>
            <span className="text-[11px] opacity-80 font-mono">({presentCount + substituteCount}/{totalClasses})</span>
          </div>

          {/* Guru Hadir */}
          <div 
            onClick={onResetFilter}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hadir:</span>
            <span className="font-bold text-emerald-700 font-mono tabular-nums">{presentCount}</span>
          </div>

          {/* Kelas Kosong / Perlu Infal */}
          <div 
            onClick={onFilterEmpty}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
              emptyCount > 0
                ? activeFilter === 'kosong'
                  ? 'bg-rose-600 text-white font-bold ring-2 ring-rose-500/30'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${emptyCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
            <span>Belum Terisi:</span>
            <span className="font-mono font-bold tabular-nums">{emptyCount} Ruang</span>
          </div>

          {/* Guru Infal */}
          <div 
            onClick={onFilterSubstitute}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition-colors ${
              activeFilter === 'pengganti' ? 'bg-purple-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Infal:</span>
            <span className="font-bold text-purple-700 font-mono tabular-nums">{substituteCount}</span>
          </div>

          {/* Guru Izin / Sakit (jika ada) */}
          {(permitCount !== undefined && permitCount > 0) && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-amber-800 bg-amber-50 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Izin:</span>
              <span className="font-bold font-mono tabular-nums">{permitCount}</span>
            </div>
          )}
        </div>

        {/* Kepatuhan Guru */}
        <div className="flex items-center gap-2 text-slate-500 shrink-0 border-l border-slate-200 pl-3">
          <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Kepatuhan Form:</span>
          <span className="font-mono font-bold text-slate-800 tabular-nums">{guruSudahAbsenPercent}%</span>
        </div>
      </div>
    );
  }

  // Standard Multi-Card Mode
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
      <div 
        onClick={onResetFilter}
        className={`p-4 rounded-xl border transition-all cursor-pointer ${
          activeFilter === 'all'
            ? 'bg-slate-900 border-slate-700 text-white shadow-sm'
            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-medium">Keterisian Jam {activePeriodNumber}</span>
          <Clock className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight tabular-nums">
            {attendanceRate}%
          </span>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            ({presentCount + substituteCount}/{totalClasses} Kelas)
          </span>
        </div>
      </div>

      <div 
        onClick={onResetFilter}
        className="p-4 rounded-xl bg-white border border-slate-200 text-slate-900 hover:border-slate-300 transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-medium">Guru Hadir Mengajar</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-emerald-600 tracking-tight tabular-nums">
            {presentCount}
          </span>
          <span className="text-xs text-slate-500">Ruang Kelas</span>
        </div>
      </div>

      <div 
        onClick={onFilterEmpty}
        className={`p-4 rounded-xl border transition-all cursor-pointer ${
          emptyCount > 0
            ? activeFilter === 'kosong'
              ? 'bg-rose-950/40 border-rose-500 text-rose-900 ring-2 ring-rose-500/20'
              : 'bg-rose-50/70 border-rose-200 hover:border-rose-300 text-rose-900'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium text-rose-700">Kelas Belum Terisi</span>
          <AlertTriangle className={`w-4 h-4 ${emptyCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-rose-600 tracking-tight tabular-nums">
            {emptyCount}
          </span>
          <span className="text-xs text-rose-700">Perlu Infal</span>
        </div>
      </div>

      <div 
        onClick={onFilterSubstitute}
        className={`p-4 rounded-xl border transition-all cursor-pointer ${
          activeFilter === 'pengganti'
            ? 'bg-indigo-950/40 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20'
            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-medium">Guru Pengganti (Infal)</span>
          <UserCheck className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-indigo-600 tracking-tight tabular-nums">
            {substituteCount}
          </span>
          <span className="text-xs text-slate-500">Kelas Didampingi</span>
        </div>
      </div>

      <div className="col-span-2 md:col-span-1 p-4 rounded-xl bg-white border border-slate-200 text-slate-900">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-medium">Kepatuhan Form</span>
          <CheckCheck className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-blue-600 tracking-tight tabular-nums">
            {guruSudahAbsenPercent}%
          </span>
          <span className="text-xs text-slate-500">Sudah Absen</span>
        </div>
      </div>
    </div>
  );
};
