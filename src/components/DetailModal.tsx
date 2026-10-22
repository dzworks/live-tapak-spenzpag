import React from 'react';
import { ResolvedScheduleSlot, AttendanceLogItem } from '../types';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  UserCheck, 
  BookOpen, 
  Layers,
  MapPin,
  AlertCircle,
  FileText
} from 'lucide-react';

interface DetailModalProps {
  slot: ResolvedScheduleSlot | null;
  onClose: () => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  slot,
  onClose,
}) => {
  if (!slot) return null;

  const { schedule, teacher, subject, activeRoom, defaultRoom, attendance, statusColor, statusLabel } = slot;

  // Cek apakah data diinput dari Agenda Piket (bukan presensi mandiri guru)
  const isPiketRecord = Boolean(
    attendance && (
      (attendance.sumberData && 
       !attendance.sumberData.toLowerCase().includes('mandiri') && 
       !attendance.sumberData.toLowerCase().includes('aplikasi')) ||
      (attendance.idKiriman && attendance.idKiriman.endsWith('PIKET')) ||
      Boolean(attendance.penginputData && attendance.penginputData.trim())
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/80 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-200 text-slate-800">
                {schedule.namaKelas}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                <Layers className="w-3 h-3 text-slate-500" />
                <span>Jam {schedule.jamKe} ({schedule.spanJP} JP)</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Mapel Ke-{schedule.mapelKe} · {schedule.hari}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1.5">
              {subject?.namaMapel || schedule.kodeMapel}
            </h2>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              Waktu: {schedule.jamMulai} - {schedule.jamSelesai} WIB
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Status Kehadiran Card */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            statusColor === 'green'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : statusColor === 'blue'
              ? 'bg-sky-50 border-sky-200 text-sky-950'
              : statusColor === 'purple'
              ? 'bg-purple-50 border-purple-200 text-purple-950'
              : statusColor === 'yellow'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : statusColor === 'red'
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg text-white ${
                statusColor === 'green' ? 'bg-emerald-600' :
                statusColor === 'blue' ? 'bg-sky-600' :
                statusColor === 'purple' ? 'bg-purple-600' :
                statusColor === 'yellow' ? 'bg-amber-600' :
                statusColor === 'red' ? 'bg-rose-600' : 'bg-slate-600'
              }`}>
                {statusColor === 'green' ? <CheckCircle2 className="w-4 h-4" /> :
                 statusColor === 'blue' ? <MapPin className="w-4 h-4" /> :
                 statusColor === 'purple' ? <UserCheck className="w-4 h-4" /> :
                 <AlertCircle className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs uppercase font-bold tracking-wider opacity-75">
                  Status Kehadiran di Kelas
                </div>
                <div className="text-sm font-bold mt-0.5">
                  {statusLabel}
                </div>
              </div>
            </div>

            {attendance && (
              <div className="text-right font-mono">
                <div className="text-[10px] opacity-75">Waktu Kirim Absen</div>
                <div className="font-bold text-xs">{attendance.waktuAbsen || '-'} WIB</div>
              </div>
            )}
          </div>

          {/* Teacher & Subject Profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Guru Terjadwal
              </div>
              <div className="text-sm font-bold text-slate-900">
                {teacher?.namaLengkap || schedule.kodeGuru}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Kode: <span className="font-bold text-slate-800">{schedule.kodeGuru}</span> · NIP: {teacher?.nip || '-'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Ruang Belajar
              </div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{activeRoom}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Ruang Standar: {defaultRoom}
              </div>
            </div>
          </div>

          {/* Substitute details if applicable */}
          {attendance?.pengganti === 'Y' && (
            <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 space-y-1">
              <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                <UserCheck className="w-4 h-4 text-purple-600" />
                <span>Didampingi Guru Pengganti / Infal</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 pl-5">
                {attendance.namaPengganti || 'Guru Piket Sekolah'}
              </div>
              {attendance.infoKetidakhadiran && (
                <div className="text-xs text-purple-800 pl-5">
                  Alasan: {attendance.infoKetidakhadiran}
                </div>
              )}
            </div>
          )}

          {/* Absence info if not present */}
          {attendance?.infoKetidakhadiran && attendance.infoKetidakhadiran !== '-' && attendance.pengganti !== 'Y' && (
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1">
              <div className="font-bold text-xs text-amber-900">Keterangan Ketidakhadiran</div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {attendance.infoKetidakhadiran}
              </p>
            </div>
          )}

          {/* Learning Activities / Jurnal */}
          {attendance?.kegiatanPembelajaran && attendance.kegiatanPembelajaran !== '-' && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>Jurnal Kegiatan Pembelajaran</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pl-5 font-sans">
                {attendance.kegiatanPembelajaran}
              </p>
            </div>
          )}

          {/* Kartu Informasi Penginputan Agenda Piket & Sumber Data */}
          {attendance && isPiketRecord && (
            <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>Diisi oleh Guru Piket</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-full border border-indigo-300/60">
                  Mode Piket
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-indigo-200/60 mt-1">
                <div>
                  <span className="text-slate-500 text-[10.5px] block font-medium">Sumber Data:</span>
                  <span className="font-bold text-slate-800">{attendance.sumberData || 'Agenda Kelas'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10.5px] block font-medium">Nama Penginput:</span>
                  <span className="font-bold text-slate-800">{attendance.penginputData || attendance.diinputOleh || 'Petugas Piket'}</span>
                </div>
              </div>
            </div>
          )}

          {/* ID Kiriman & Verifikasi Database */}
          {attendance?.idKiriman && (
            <div className="p-2.5 rounded-lg bg-slate-100/70 border border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                <span>ID Log: {attendance.idKiriman}</span>
              </span>
              <span>Terverifikasi TAPAK</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
