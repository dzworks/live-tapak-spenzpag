import React, { useState } from 'react';
import { AttendanceRecord } from '../types';
import { isSameDate } from '../utils/appsScriptCode';
import { 
  Search, 
  Download, 
  History, 
  UserCheck, 
  ChevronRight,
  Layers
} from 'lucide-react';

interface AttendanceFeedProps {
  records: AttendanceRecord[];
  onSelectRecord?: (record: AttendanceRecord) => void;
  selectedDate: string;
}

export const AttendanceFeed: React.FC<AttendanceFeedProps> = ({
  records,
  onSelectRecord,
  selectedDate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterKelas, setFilterKelas] = useState<string>('all');

  const filteredRecords = records.filter(r => {
    if (!isSameDate(r.tanggal, selectedDate)) return false;
    if (filterStatus === 'hadir' && (r.statusKehadiran !== 'Hadir' || r.pengganti === 'Y')) return false;
    if (filterStatus === 'pengganti' && r.pengganti !== 'Y') return false;
    if (filterStatus === 'izin' && r.statusKehadiran === 'Hadir') return false;
    if (filterKelas !== 'all' && r.kelas !== filterKelas) return false;

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      return (
        (r.mataPelajaran ? r.mataPelajaran.toLowerCase().includes(q) : false) ||
        (r.namaGuru ? r.namaGuru.toLowerCase().includes(q) : false) ||
        (r.kodeGuru ? r.kodeGuru.toLowerCase().includes(q) : false) ||
        (r.kelas ? r.kelas.toLowerCase().includes(q) : false) ||
        (r.kegiatanPembelajaran ? r.kegiatanPembelajaran.toLowerCase().includes(q) : false) ||
        (r.namaPengganti ? r.namaPengganti.toLowerCase().includes(q) : false)
      );
    }
    return true;
  });

  // Export to CSV tanpa kolom GPS/Foto
  const handleExportCSV = () => {
    const headers = [
      'Tanggal',
      'Waktu Absen (WIB)',
      'Kelas',
      'Jam Ke (Rentang)',
      'Durasi (JP)',
      'Mapel Ke',
      'Kode Guru',
      'Status Kehadiran',
      'Ruang Belajar',
      'Mata Pelajaran',
      'Kegiatan Pembelajaran',
      'Info Ketidakhadiran',
      'Pengganti (Y/N)',
      'ID Kiriman',
      'Nama Pengganti',
      'Nama Guru',
      'NIP',
    ];

    const rows = filteredRecords.map(r => [
      `"${r.tanggal || ''}"`,
      `"${r.waktuAbsen || ''}"`,
      `"${r.kelas || ''}"`,
      `"${r.jamKe || ''}"`,
      r.spanJP ?? 1,
      r.mapelKe ?? 1,
      `"${r.kodeGuru || ''}"`,
      `"${r.statusKehadiran || ''}"`,
      `"${r.ruangBelajar || ''}"`,
      `"${r.mataPelajaran || ''}"`,
      `"${(r.kegiatanPembelajaran || '').replace(/"/g, '""')}"`,
      `"${r.infoKetidakhadiran || ''}"`,
      `"${r.pengganti || ''}"`,
      `"${r.idKiriman || ''}"`,
      `"${r.namaPengganti || ''}"`,
      `"${r.namaGuru || ''}"`,
      `"${r.nip || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_presensi_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueClasses = Array.from(new Set(records.map(r => r.kelas))).sort();

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Feed Filters */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari guru, materi ajar, kode guru..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="all">Semua Status</option>
            <option value="hadir">Hadir Langsung</option>
            <option value="pengganti">Guru Infal (Y)</option>
            <option value="izin">Izin / Sakit</option>
          </select>

          <select
            value={filterKelas}
            onChange={e => setFilterKelas(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="all">Semua Kelas</option>
            {uniqueClasses.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-3 px-3.5 w-24">Waktu</th>
              <th className="py-3 px-3">Kelas & Ruang</th>
              <th className="py-3 px-3">Jam Ke & Mapel Ke</th>
              <th className="py-3 px-3">Guru & NIP</th>
              <th className="py-3 px-3">Mata Pelajaran</th>
              <th className="py-3 px-3">Kegiatan Pembelajaran</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  Tidak ada catatan presensi yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              filteredRecords.map(record => (
                <tr
                  key={record.idKiriman}
                  onClick={() => onSelectRecord?.(record)}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                >
                  {/* Waktu Absen */}
                  <td className="py-3 px-3.5 font-mono text-slate-900 font-medium whitespace-nowrap">
                    <div>{record.waktuAbsen} WIB</div>
                    <div className="text-[10px] text-slate-400">{record.tanggal}</div>
                  </td>

                  {/* Kelas & Ruang */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{record.kelas}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {record.ruangBelajar || 'R. Kelas'}
                    </div>
                  </td>

                  {/* Jam Ke (Durasi JP) & Mapel Ke */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-900 font-mono">
                        Jam {record.jamKe || (record.periods ? record.periods.join('-') : '-')}
                      </span>
                      {(record.spanJP ?? 1) > 1 && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {record.spanJP} JP
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Mapel Ke-{record.mapelKe}
                    </div>
                  </td>

                  {/* Guru & NIP */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded text-[10px]">
                        {record.kodeGuru}
                      </span>
                      <span className="font-semibold text-slate-900 truncate max-w-[140px]">
                        {record.namaGuru || '-'}
                      </span>
                    </div>
                    {record.nip && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        NIP: {record.nip}
                      </div>
                    )}
                    {record.pengganti === 'Y' && (
                      <div className="text-[10px] text-indigo-700 font-medium mt-0.5 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        <span>Infal: {record.namaPengganti}</span>
                      </div>
                    )}
                  </td>

                  {/* Mata Pelajaran */}
                  <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                    {record.mataPelajaran}
                  </td>

                  {/* Kegiatan Pembelajaran */}
                  <td className="py-3 px-3 max-w-[280px]">
                    <div className="line-clamp-2 text-slate-600 leading-snug">
                      {record.kegiatanPembelajaran || '-'}
                    </div>
                    {record.revisiKe && record.revisiKe > 1 && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 mt-1">
                        <History className="w-2.5 h-2.5" />
                        Revisi ke-{record.revisiKe} ({record.history?.length} log sebelumnya)
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {record.pengganti === 'Y' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Pengganti
                      </span>
                    ) : record.statusKehadiran === 'Hadir' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Hadir
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {record.statusKehadiran}
                      </span>
                    )}
                  </td>

                  {/* Detail link */}
                  <td className="py-3 px-3 text-right">
                    <button
                      className="p-1 rounded text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200/50 transition-colors"
                      title="Lihat Detail"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
