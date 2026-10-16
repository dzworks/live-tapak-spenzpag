import React, { useEffect, useState } from 'react';
import { 
  BellRing, 
  CheckCircle2, 
  Clock, 
  X, 
  UserCheck, 
  AlertCircle, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export interface AttendanceAlertToast {
  id: string;
  className: string;
  teacherName: string;
  teacherCode: string;
  subjectName?: string;
  waktuAbsen: string;
  statusKehadiran: string;
  pengganti?: string;
  namaPengganti?: string;
  timestamp: number;
}

interface AttendanceToastContainerProps {
  toasts: AttendanceAlertToast[];
  onDismiss: (id: string) => void;
  onSelectClass: (className: string) => void;
}

export const AttendanceToastContainer: React.FC<AttendanceToastContainerProps> = ({
  toasts,
  onDismiss,
  onSelectClass,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onSelectClass={onSelectClass}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: AttendanceAlertToast;
  onDismiss: (id: string) => void;
  onSelectClass: (className: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, onSelectClass }) => {
  const [progress, setProgress] = useState(100);
  const DURATION = 7000; // 7 detik

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remainingPercent = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remainingPercent);
      if (remainingPercent <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.id, onDismiss]);

  const isInfal = toast.pengganti === 'Y';
  const isHadir = toast.statusKehadiran === 'Hadir';

  return (
    <div className="pointer-events-auto bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden transform transition-all animate-in slide-in-from-bottom-5 duration-300 hover:scale-[1.01]">
      <div className="p-3.5 space-y-2">
        {/* Header Toast */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <BellRing className="w-3.5 h-3.5 animate-bounce" />
              <span>Presensi Baru Masuk</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-mono">
              Baru Saja
            </span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition cursor-pointer"
              title="Tutup Notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Details */}
        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30 font-mono">
              {toast.className}
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isInfal
                ? 'bg-purple-900/60 text-purple-200 border border-purple-500/40'
                : isHadir
                ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/40'
                : 'bg-amber-900/60 text-amber-200 border border-amber-500/40'
            }`}>
              {isInfal ? 'Guru Infal' : toast.statusKehadiran}
            </span>
          </div>

          <div className="text-xs">
            <div className="font-semibold text-slate-200 truncate">
              {toast.teacherName || `Guru [${toast.teacherCode}]`}
            </div>
            {toast.subjectName && (
              <div className="text-[11px] text-slate-400 truncate">
                Mapel: {toast.subjectName}
              </div>
            )}
          </div>

          {/* Timestamp Indicator */}
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700/60 text-slate-300 font-mono">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Waktu Absen: {toast.waktuAbsen || 'Tercatat'} WIB</span>
            </span>
          </div>
        </div>

        {/* Action Button: Sorot Kelas di Matriks */}
        <button
          type="button"
          onClick={() => {
            onSelectClass(toast.className);
            onDismiss(toast.id);
          }}
          className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <span>Sorot Baris Kelas di Matriks</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Animated Countdown Progress Bar */}
      <div className="w-full h-1 bg-slate-800">
        <div 
          className="h-full bg-emerald-500 transition-all ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
