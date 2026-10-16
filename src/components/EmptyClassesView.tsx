import React from 'react';
import { 
  AttendanceLogItem, 
  ScheduleItem, 
  MasterGuru, 
  MasterMapel, 
  ClassMaster,
  ResolvedScheduleSlot
} from '../types';
import { 
  getScheduleForDate, 
  getDayType, 
  getDayLabel,
  DEFAULT_CLASSES,
  DEFAULT_MASTER_GURU,
  DEFAULT_MASTER_MAPEL
} from '../data/initialData';
import { 
  getDayNameIndonesian, 
  normalizeClassName,
  isSameDate
} from '../utils/appsScriptCode';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  CalendarOff,
  UserCheck,
  Layers,
  MapPin,
  BookOpen
} from 'lucide-react';

interface EmptyClassesViewProps {
  records: AttendanceLogItem[];
  schedules?: ScheduleItem[];
  masterGuru?: MasterGuru[];
  masterMapel?: MasterMapel[];
  classes?: ClassMaster[];
  activePeriodNumber: number;
  selectedDate: string;
  onSelectRecord?: (record: AttendanceLogItem) => void;
}

export const EmptyClassesView: React.FC<EmptyClassesViewProps> = ({
  records,
  schedules = [],
  masterGuru = DEFAULT_MASTER_GURU,
  masterMapel = DEFAULT_MASTER_MAPEL,
  classes = DEFAULT_CLASSES,
  activePeriodNumber,
  selectedDate,
  onSelectRecord,
}) => {
  const currentSchedules = getScheduleForDate(selectedDate);
  const currentPeriodSchedule = currentSchedules.find(p => p.period === activePeriodNumber) || currentSchedules[0];
  const dayType = getDayType(selectedDate);
  const dayNameIndo = getDayNameIndonesian(selectedDate);
  const isWeekend = dayType === 'weekend';

  const teachersMap = React.useMemo(() => {
    const map: Record<string, MasterGuru> = {};
    masterGuru.forEach(g => { if (g.kodeGuru) map[g.kodeGuru] = g; });
    return map;
  }, [masterGuru]);

  const subjectsMap = React.useMemo(() => {
    const map: Record<string, MasterMapel> = {};
    masterMapel.forEach(m => { if (m.kodeMapel) map[m.kodeMapel] = m; });
    return map;
  }, [masterMapel]);

  // Schedules for today active at the current period
  const activeSchedulesToday = React.useMemo(() => {
    return schedules.filter(s => 
      s.hari.toLowerCase() === dayNameIndo.toLowerCase() && 
      s.periods.includes(activePeriodNumber)
    );
  }, [schedules, dayNameIndo, activePeriodNumber]);

  // Log kehadiran tanggal ini
  const logsToday = React.useMemo(() => {
    return records.filter(r => isSameDate(r.tanggal, selectedDate));
  }, [records, selectedDate]);

  // Deteksi kelas kosong di jam aktif sekarang
  const emptyClassesCurrentPeriod: {
    className: string;
    room: string;
    schedule?: ScheduleItem;
    teacherName: string;
    subjectName: string;
    reason: 'no_attendance' | 'teacher_absent';
    existingRecord?: AttendanceLogItem;
  }[] = [];

  // Jika ada schedules di database, kita cek per jadwal aktif
  if (activeSchedulesToday.length > 0) {
    activeSchedulesToday.forEach(sched => {
      const normSchedClass = normalizeClassName(sched.namaKelas);
      const matchLog = logsToday.find(l => {
        const normLogClass = normalizeClassName(l.kelas);
        if (normLogClass !== normSchedClass) return false;
        if (l.periods && l.periods.length > 0 && sched.periods && sched.periods.length > 0) {
          if (l.periods.some(p => sched.periods.includes(p))) return true;
        }
        if (l.mapelKe && sched.mapelKe && Number(l.mapelKe) === Number(sched.mapelKe)) return true;
        if (l.kodeGuru && sched.kodeGuru && l.kodeGuru.toLowerCase() === sched.kodeGuru.toLowerCase()) return true;
        return false;
      });

      const teacher = teachersMap[sched.kodeGuru];
      const subject = subjectsMap[sched.kodeMapel];
      const classMaster = classes.find(c => normalizeClassName(c.namaKelas) === normSchedClass);
      const room = classMaster?.lokasiRuang || `R. ${sched.namaKelas}`;

      if (!matchLog) {
        emptyClassesCurrentPeriod.push({
          className: sched.namaKelas,
          room,
          schedule: sched,
          teacherName: teacher?.namaLengkap || sched.kodeGuru,
          subjectName: subject?.namaMapel || sched.kodeMapel,
          reason: 'no_attendance',
        });
      } else if (
        (matchLog.statusKehadiran === 'Izin' || matchLog.statusKehadiran === 'Sakit' || matchLog.statusKehadiran === 'Dinas Luar') &&
        matchLog.pengganti !== 'Y'
      ) {
        emptyClassesCurrentPeriod.push({
          className: sched.namaKelas,
          room: matchLog.ruangBelajar || room,
          schedule: sched,
          teacherName: teacher?.namaLengkap || sched.kodeGuru,
          subjectName: matchLog.mataPelajaran || subject?.namaMapel || sched.kodeMapel,
          reason: 'teacher_absent',
          existingRecord: matchLog,
        });
      }
    });
  } else {
    // Fallback jika belum ada schedules di database
    classes.forEach(cls => {
      const normClass = normalizeClassName(cls.namaKelas);
      const record = logsToday.find(r => normalizeClassName(r.kelas) === normClass && (r.periods ? r.periods.includes(activePeriodNumber) : true));
      if (!record) {
        emptyClassesCurrentPeriod.push({
          className: cls.namaKelas,
          room: cls.lokasiRuang,
          teacherName: 'Belum Terjadwal',
          subjectName: '-',
          reason: 'no_attendance',
        });
      }
    });
  }

  // Active Substitutes
  const activeSubstitutes = logsToday.filter(
    r => r.pengganti === 'Y' && (r.periods ? r.periods.includes(activePeriodNumber) : true)
  );

  if (isWeekend) {
    return (
      <div className="p-10 text-center bg-white rounded-xl border border-slate-200">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
          <CalendarOff className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Hari Libur Sekolah ({selectedDate})
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Tidak ada kegiatan belajar mengajar (KBM) pada hari Sabtu dan Minggu. Ruang kelas berstatus bebas jam pelajaran aktif.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      <div className="p-4 sm:p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Pusat Pantau: Deteksi Jam Kosong & Guru Infal
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Papan pengawasan real-time pada <span className="font-semibold text-rose-900">{currentPeriodSchedule.label} ({currentPeriodSchedule.startTime} - {currentPeriodSchedule.endTime})</span> untuk mengidentifikasi ruang kelas yang belum terisi guru.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-mono text-xs bg-white px-3 py-1.5 rounded-lg border border-rose-200">
          <Clock className="w-3.5 h-3.5 text-rose-600" />
          <span>Status Jam Ke-{activePeriodNumber} ({dayNameIndo})</span>
        </div>
      </div>

      {/* Main Grid: Empty Classes vs Active Substitutes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1 & 2: Daftar Kelas yang Perlu Segera Ditangani */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Kelas Belum Terisi Guru (Jam Ini)</span>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-rose-100 text-rose-800 rounded-full tabular-nums">
                {emptyClassesCurrentPeriod.length} Ruang
              </span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Tanggal: {selectedDate}
            </span>
          </div>

          {emptyClassesCurrentPeriod.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Seluruh Kelas Terjadwal Telah Terisi
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Semua ruang belajar pada jam ke-{activePeriodNumber} telah tercatat hadir atau didampingi oleh guru infal di database TAPAK.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {emptyClassesCurrentPeriod.map((item, idx) => (
                <div
                  key={`${item.className}-${idx}`}
                  className="p-4 rounded-xl border bg-white border-rose-200 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-900 font-mono">
                            {item.className}
                          </span>
                          <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {item.room}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                        item.reason === 'no_attendance'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {item.reason === 'no_attendance' ? 'Belum Absen' : 'Guru Izin'}
                      </span>
                    </div>

                    <div className="space-y-1 my-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold">{item.subjectName}</span>
                      </div>
                      <div className="text-slate-600 pl-5">
                        Guru Terjadwal: <span className="font-semibold text-slate-900">{item.teacherName}</span>
                      </div>
                      {item.existingRecord?.infoKetidakhadiran && item.existingRecord.infoKetidakhadiran !== '-' && (
                        <div className="text-amber-800 font-medium pl-5 text-[11px]">
                          Ket: {item.existingRecord.infoKetidakhadiran}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono">Jam Ke-{item.schedule?.jamKe || activePeriodNumber}</span>
                    <span className="text-rose-600 font-semibold text-[11px]">Perlu Pendampingan</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kolom 3: Guru Pengganti / Infal Aktif */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-600" />
              <span>Guru Infal Bertugas</span>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-purple-100 text-purple-800 rounded-full tabular-nums">
                {activeSubstitutes.length}
              </span>
            </h3>
          </div>

          {activeSubstitutes.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
              Tidak ada guru pengganti / infal yang sedang ditugaskan di jam ini.
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeSubstitutes.map(sub => (
                <div
                  key={sub.idKiriman}
                  className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-950 font-mono">
                      {sub.kelas}
                    </span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">
                      Infal Aktif
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {sub.namaPengganti || 'Guru Piket'}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Menggantikan: <span className="font-medium text-slate-900">{sub.namaGuru || sub.kodeGuru}</span> ({sub.mataPelajaran})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
