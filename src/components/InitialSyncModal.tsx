import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  RefreshCw, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles,
  Wifi,
  Clock,
  Layers
} from 'lucide-react';

interface InitialSyncModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  isSyncing: boolean;
  isSuccess: boolean;
  errorMessage?: string | null;
  classesCount: number;
  schedulesCount: number;
  logsCount: number;
  teachersCount: number;
}

export const InitialSyncModal: React.FC<InitialSyncModalProps> = ({
  isOpen,
  onDismiss,
  isSyncing,
  isSuccess,
  errorMessage,
  classesCount,
  schedulesCount,
  logsCount,
  teachersCount
}) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Timer penghitung detik untuk menampilkan tombol lewati setelah 7 detik
  useEffect(() => {
    if (!isOpen) return;

    setSecondsElapsed(0);
    setCanSkip(false);
    setIsFinishing(false);

    const interval = setInterval(() => {
      setSecondsElapsed(prev => {
        const next = prev + 1;
        if (next >= 7) {
          setCanSkip(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Jika sync sukses dan tidak sedang error, beri jeda transisi halus 700ms lalu tutup modal otomatis
  useEffect(() => {
    if (isSuccess && !isSyncing && isOpen) {
      setIsFinishing(true);
      const timer = setTimeout(() => {
        onDismiss();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, isSyncing, isOpen, onDismiss]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-opacity duration-500 ${
      isFinishing ? 'opacity-0 pointer-events-none' : 'opacity-100'
    }`}>
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Header Visual dengan Aksen Warna Khas TAPAK */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>

          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner relative">
              {isSuccess && !isSyncing ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-in zoom-in-75 duration-300" />
              ) : errorMessage && canSkip ? (
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              ) : (
                <RefreshCw className="w-6 h-6 text-indigo-300 animate-spin" />
              )}
              {isSyncing && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  Sinkronisasi Awal
                </span>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{secondsElapsed}s</span>
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight mt-1">
                TAPAK Live Monitoring
              </h2>
            </div>
          </div>
        </div>

        {/* Isi Status Sinkronisasi */}
        <div className="p-6 space-y-4">
          <div className="text-center">
            {isSuccess && !isSyncing ? (
              <div className="space-y-1">
                <p className="text-sm font-bold text-emerald-700 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Data Google Spreadsheet Siap!</span>
                </p>
                <p className="text-xs text-slate-500">
                  Membuka dashboard pemantauan KBM...
                </p>
              </div>
            ) : errorMessage && canSkip ? (
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-800">
                  Menggunakan Data Offline Tersimpan
                </p>
                <p className="text-xs text-slate-500">
                  {errorMessage}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  Menyinkronkan Data dari Google Sheets...
                </p>
                <p className="text-xs text-slate-500">
                  Mengunduh jadwal, master guru, dan rekapitulasi presensi harian secara riil.
                </p>
              </div>
            )}
          </div>

          {/* Indikator Status Tahapan / Checklist */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-2 font-medium">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Rombel Kelas</span>
              </span>
              <span className="font-mono font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {classesCount > 0 ? `${classesCount} Kelas` : 'Memuat...'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-2 font-medium">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Jadwal & Guru Pengajar</span>
              </span>
              <span className="font-mono font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {schedulesCount > 0 ? `${schedulesCount} Sesi (${teachersCount} Guru)` : 'Memuat...'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-2 font-medium">
                <Wifi className="w-4 h-4 text-sky-600" />
                <span>Log Presensi KBM</span>
              </span>
              <span className="font-mono font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {logsCount > 0 ? `${logsCount} Rekaman` : 'Memeriksa...'}
              </span>
            </div>
          </div>

          {/* Progress Bar Dinamis */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div 
              className={`h-full transition-all duration-500 ${
                isSuccess 
                  ? 'bg-emerald-500 w-full' 
                  : canSkip 
                  ? 'bg-amber-500 w-full' 
                  : 'bg-indigo-600 animate-pulse'
              }`}
              style={{
                width: isSuccess ? '100%' : canSkip ? '100%' : `${Math.min(95, Math.max(25, secondsElapsed * 15))}%`
              }}
            ></div>
          </div>

          {/* Tombol Lewati jika loading > 7 detik atau jika terjadi kendala */}
          {canSkip && !isSuccess && (
            <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 mb-3 leading-relaxed">
                <p className="font-semibold flex items-center gap-1.5 mb-0.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Koneksi backend memerlukan waktu tambahan</span>
                </p>
                <p className="text-[11px] text-amber-800">
                  Anda dapat langsung masuk ke dashboard sekarang menggunakan data tersimpan di browser.
                </p>
              </div>

              <button
                onClick={onDismiss}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Lewati & Buka dengan Data Offline / Cache</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>
            </div>
          )}
        </div>

        {/* Footer info halus */}
        <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span>Sistem TAPAK Live Monitoring</span>
          <span className="font-mono">WIB (UTC+7)</span>
        </div>
      </div>
    </div>
  );
};
