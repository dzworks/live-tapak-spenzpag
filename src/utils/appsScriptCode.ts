import { 
  MasterGuru, 
  MasterMapel, 
  ClassMaster, 
  MasterRuangan, 
  ScheduleItem, 
  AttendanceLogItem, 
  TapakDatabaseBundle,
  ResolvedScheduleSlot,
  PeriodSchedule,
  PeriodSchedule as PeriodType
} from '../types';
import { PERIOD_SCHEDULES_REGULAR, PERIOD_SCHEDULES_FRIDAY } from '../data/initialData';

const MONTH_NAMES_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nop', 'Des'];

/**
 * Normalisasi format tanggal ke bentuk kanonik YYYY-MM-DD untuk komparasi aman
 * Menerima variasi: "16-Okt-2026", "16-Oct-2026", "2026-10-16", "16/10/2026", Date object
 */
export function canonicalDateKey(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '';
  if (dateStr instanceof Date) {
    const y = dateStr.getFullYear();
    const m = String(dateStr.getMonth() + 1).padStart(2, '0');
    const d = String(dateStr.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const clean = String(dateStr).trim().split(/[\sT]/)[0]; // Buang waktu jika ada (misal: 2026-10-16 00:00)

  // Format 1: YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Format 2: DD-MM-YYYY atau DD/MM/YYYY
  const dmyNumericMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyNumericMatch) {
    const d = dmyNumericMatch[1].padStart(2, '0');
    const m = dmyNumericMatch[2].padStart(2, '0');
    const y = dmyNumericMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Format 3: DD-Mmm-YYYY (e.g. "16-Okt-2026", "16-Oct-2026", "16 Okt 2026")
  const idMonthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05', jun: '06',
    jul: '07', agu: '08', aug: '08', sep: '09', okt: '10', oct: '10', nop: '11', nov: '11', des: '12', dec: '12'
  };
  const dmyNamedMatch = clean.match(/^(\d{1,2})[-/\s]([a-zA-Z]{3,4})[-/\s](\d{4})$/);
  if (dmyNamedMatch) {
    const d = dmyNamedMatch[1].padStart(2, '0');
    const mStr = dmyNamedMatch[2].toLowerCase().slice(0, 3);
    const m = idMonthMap[mStr] || '10';
    const y = dmyNamedMatch[3];
    return `${y}-${m}-${d}`;
  }

  return clean;
}

/**
 * Mengecek apakah dua tanggal sama terlepas dari variasi penulisan
 */
export function isSameDate(date1: string | Date | undefined | null, date2: string | Date | undefined | null): boolean {
  if (!date1 || !date2) return false;
  return canonicalDateKey(date1) === canonicalDateKey(date2);
}

/**
 * Memformat tanggal ke bentuk standar tampilan Bahasa Indonesia: "16-Okt-2026"
 */
export function formatToIndonesianDisplayDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '';
  const key = canonicalDateKey(dateStr);
  if (!key) return String(dateStr);
  const parts = key.split('-');
  if (parts.length === 3) {
    const day = parts[2].replace(/^0/, '');
    const monthIndex = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    const mName = MONTH_NAMES_ID[monthIndex] || 'Okt';
    return `${day.padStart(2, '0')}-${mName}-${year}`;
  }
  return String(dateStr);
}

/**
 * Mendapatkan tanggal hari ini dalam format WIB (UTC+7) "16-Okt-2026"
 */
export function getTodayWIBDisplayDate(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wibDate = new Date(utc + 3600000 * 7);
  return formatToIndonesianDisplayDate(wibDate);
}

/**
 * Parser rentang jam pelajaran yang fleksibel dan tangguh
 * Contoh: "1-2" -> start: 1, end: 2, span: 2, periods: [1, 2]
 *         "1 - 3" -> start: 1, end: 3, span: 3, periods: [1, 2, 3]
 *         "3 - 5" -> start: 3, end: 5, span: 3, periods: [3, 4, 5]
 *         "1 - 9" -> start: 1, end: 9, span: 9, periods: [1, 2, 3, 4, 5, 6, 7, 8, 9]
 *         "5"   -> start: 5, end: 5, span: 1, periods: [5]
 */
export function parsePeriodRange(jamKeValue: string | number): {
  startPeriod: number;
  endPeriod: number;
  spanJP: number;
  periods: number[];
  normalizedStr: string;
} {
  const str = String(jamKeValue ?? '1').trim();
  
  // Pola rentang seperti "1-2", "1 - 2", "1 - 3", "1 s/d 3", "1 sd 3", "1,2,3"
  const delimiterRegex = /[-–—]|s\/?d|,/i;
  if (delimiterRegex.test(str)) {
    const parts = str.split(delimiterRegex).map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n));
    if (parts.length >= 2) {
      const start = Math.min(Math.max(1, parts[0]), 9);
      const end = Math.min(Math.max(start, parts[parts.length - 1]), 9);
      const span = Math.max(1, end - start + 1);
      const periods: number[] = [];
      for (let p = start; p <= end; p++) {
        periods.push(p);
      }
      return {
        startPeriod: start,
        endPeriod: end,
        spanJP: span,
        periods,
        normalizedStr: `${start}-${end}`,
      };
    }
  }

  // Angka tunggal
  const single = parseInt(str.replace(/[^0-9]/g, ''), 10) || 1;
  const clamped = Math.min(Math.max(1, single), 9);
  return {
    startPeriod: clamped,
    endPeriod: clamped,
    spanJP: 1,
    periods: [clamped],
    normalizedStr: String(clamped),
  };
}

/**
 * Menentukan nama hari dalam bahasa Indonesia dari string tanggal
 * Contoh: "16-Okt-2026" -> "Jumat", "2026-10-12" -> "Senin"
 */
export function getDayNameIndonesian(dateStr: string): string {
  if (!dateStr) return 'Jumat';
  const key = canonicalDateKey(dateStr);
  if (!key) return 'Jumat';

  const parts = key.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (!isNaN(d.getTime())) {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[d.getDay()];
    }
  }

  return 'Jumat';
}

/**
 * Normalisasi dan enrich raw Schedule Item
 */
export function enrichScheduleItem(raw: any): ScheduleItem {
  const jamKe = String(raw.jamKe || raw['Jam Ke'] || '1').trim();
  const parsed = parsePeriodRange(jamKe);

  return {
    hari: String(raw.hari || raw['Hari'] || 'Jumat').trim(),
    jamKe: parsed.normalizedStr,
    mapelKe: Number(raw.mapelKe || raw['Mapel Ke']) || 1,
    namaKelas: String(raw.namaKelas || raw['Nama Kelas'] || raw.kelas || '').trim(),
    jamMulai: String(raw.jamMulai || raw['Jam Mulai'] || '').trim(),
    jamSelesai: String(raw.jamSelesai || raw['Jam Selesai'] || '').trim(),
    kodeGuru: String(raw.kodeGuru || raw['Kode Guru'] || '').trim(),
    kodeMapel: String(raw.kodeMapel || raw['Kode Mapel'] || '').trim(),
    startPeriod: parsed.startPeriod,
    endPeriod: parsed.endPeriod,
    spanJP: parsed.spanJP,
    periods: parsed.periods,
  };
}

/**
 * Normalisasi dan enrich raw Attendance Log Item
 */
export function enrichAttendanceLogItem(raw: any): AttendanceLogItem {
  const rawJamKe = raw.jamKe || raw['Jam Ke'] || raw.jam_ke || raw['jam_ke'] || raw.mapelKe || '1';
  const parsed = parsePeriodRange(rawJamKe);
  const rawTanggal = raw.tanggal || raw['Tanggal'] || '';
  const displayTanggal = formatToIndonesianDisplayDate(rawTanggal);

  return {
    tanggal: displayTanggal,
    waktuAbsen: String(raw.waktuAbsen || raw['Waktu Absen (WIB)'] || raw['Waktu Absen'] || '').trim(),
    kelas: String(raw.kelas || raw['Kelas'] || '').trim(),
    mapelKe: Number(raw.mapelKe || raw['Mapel Ke']) || 1,
    kodeGuru: String(raw.kodeGuru || raw['Kode Guru'] || '').trim(),
    statusKehadiran: String(raw.statusKehadiran || raw['Status Kehadiran'] || 'Hadir').trim(),
    mataPelajaran: String(raw.mataPelajaran || raw['Mata Pelajaran'] || '').trim(),
    kegiatanPembelajaran: String(raw.kegiatanPembelajaran || raw['Kegiatan Pembelajaran'] || '').trim(),
    pengganti: String(raw.pengganti || raw['Pengganti (Y/N)'] || 'N').trim().toUpperCase() as 'Y' | 'N',
    infoKetidakhadiran: String(raw.infoKetidakhadiran || raw['Info Ketidakhadiran'] || '').trim(),
    ruangBelajar: String(raw.ruangBelajar || raw['Ruang Belajar'] || '').trim(),
    idKiriman: String(raw.idKiriman || raw['ID Kiriman'] || ('log_' + Math.random().toString(36).slice(2))).trim(),
    jamKe: parsed.normalizedStr,
    jamMulai: String(raw.jamMulai || raw['Jam Mulai'] || '').trim(),
    jamSelesai: String(raw.jamSelesai || raw['Jam Selesai'] || '').trim(),
    sumberData: String(raw.sumberData || raw['Sumber Data'] || '').trim(),
    startPeriod: parsed.startPeriod,
    endPeriod: parsed.endPeriod,
    spanJP: parsed.spanJP,
    periods: parsed.periods,
    namaGuru: String(raw.namaGuru || raw['Nama Guru'] || '').trim(),
    namaPengganti: String(raw.namaPengganti || raw['Nama Pengganti'] || '').trim(),
    nip: String(raw.nip || raw['NIP'] || '').trim(),
  };
}

/**
 * Normalizer untuk membersihkan nama kelas agar toleran terhadap variasi format
 * Contoh: "Kelas VII A", "VII A", "VII-A", "Kelas VII-A" -> "VII-A"
 */
export function normalizeClassName(className: string): string {
  if (!className) return '';
  return className
    .replace(/^Kelas\s+/i, '')
    .replace(/\s+/g, '-')
    .toUpperCase();
}

/**
 * Memproses bundle 6 sheet dari Google Apps Script
 */
export function processTapakBundle(rawBundle: any): TapakDatabaseBundle {
  if (!rawBundle) {
    return {
      masterGuru: [],
      masterMapel: [],
      classes: [],
      masterRuangan: [],
      schedules: [],
      attendanceLogs: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  const masterGuru: MasterGuru[] = Array.isArray(rawBundle.masterGuru)
    ? rawBundle.masterGuru.map((g: any) => ({
        kodeGuru: String(g.kodeGuru || g['Kode Guru'] || '').trim(),
        namaLengkap: String(g.namaLengkap || g['Nama Lengkap'] || '').trim(),
        nip: String(g.nip || g['NIP'] || '-').trim(),
      })).filter((g: MasterGuru) => g.kodeGuru)
    : [];

  const masterMapel: MasterMapel[] = Array.isArray(rawBundle.masterMapel)
    ? rawBundle.masterMapel.map((m: any) => ({
        kodeMapel: String(m.kodeMapel || m['Kode Mapel'] || '').trim(),
        namaMapel: String(m.namaMapel || m['Nama Mapel'] || '').trim(),
      })).filter((m: MasterMapel) => m.kodeMapel)
    : [];

  const classes: ClassMaster[] = Array.isArray(rawBundle.classes)
    ? rawBundle.classes.map((c: any) => ({
        tokenQr: String(c.tokenQr || c['Token QR'] || '').trim(),
        idKelas: String(c.idKelas || c['ID Kelas'] || '').trim(),
        namaKelas: String(c.namaKelas || c['Nama Kelas'] || '').trim(),
        lokasiRuang: String(c.lokasiRuang || c['Lokasi Ruang'] || '').trim(),
      })).filter((c: ClassMaster) => c.namaKelas)
    : [];

  const masterRuangan: MasterRuangan[] = Array.isArray(rawBundle.masterRuangan)
    ? rawBundle.masterRuangan.map((r: any) => ({
        tokenQr: String(r.tokenQr || r['Token QR'] || '').trim(),
        namaRuangan: String(r.namaRuangan || r['Nama Ruangan'] || '').trim(),
        pinAkses: String(r.pinAkses || r['PIN Akses'] || '').trim(),
      })).filter((r: MasterRuangan) => r.namaRuangan)
    : [];

  const schedules: ScheduleItem[] = Array.isArray(rawBundle.schedules)
    ? rawBundle.schedules.map(enrichScheduleItem).filter((s: ScheduleItem) => Boolean(s.namaKelas && s.hari))
    : [];

  const attendanceLogs: AttendanceLogItem[] = Array.isArray(rawBundle.attendanceLogs)
    ? rawBundle.attendanceLogs.map(enrichAttendanceLogItem).filter((l: AttendanceLogItem) => Boolean(l.kelas && l.tanggal))
    : [];

  return {
    masterGuru,
    masterMapel,
    classes,
    masterRuangan,
    schedules,
    attendanceLogs,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Menghubungkan Schedule dengan Kamus & Attendance Log untuk 1 Slot Jadwal
 */
export function resolveScheduleSlot(
  schedule: ScheduleItem,
  teachersMap: Record<string, MasterGuru>,
  subjectsMap: Record<string, MasterMapel>,
  classesMap: Record<string, ClassMaster>,
  attendanceLogsForDate: AttendanceLogItem[],
  activePeriodNumber: number,
  isTodayDate: boolean
): ResolvedScheduleSlot {
  const teacher = teachersMap[schedule.kodeGuru];
  const subject = subjectsMap[schedule.kodeMapel];
  const classInfo = classesMap[schedule.namaKelas] || classesMap[normalizeClassName(schedule.namaKelas)];
  const defaultRoom = classInfo?.lokasiRuang || `R. ${schedule.namaKelas}`;

  // Normalisasi nama kelas jadwal
  const normScheduleClass = normalizeClassName(schedule.namaKelas);

  // Cari log kehadiran yang cocok untuk kelas dan jadwal ini
  // Pencocokan: kelas sama & (periods beririsan ATAU mapelKe sama ATAU guru sama)
  const matchingLog = attendanceLogsForDate.find(log => {
    const normLogClass = normalizeClassName(log.kelas);
    if (normLogClass !== normScheduleClass) return false;

    // 1. Prioritas Utama: Irisan jam pelajaran (periods overlap)
    // Jika log mencakup Jam 1-3, maka slot jam 1, jam 2, dan jam 3 otomatis MATCH (hadir seluruhnya)
    if (log.periods && log.periods.length > 0 && schedule.periods && schedule.periods.length > 0) {
      if (log.periods.some(p => schedule.periods.includes(p))) {
        return true;
      }
    }

    // 2. Prioritas Kedua: Urutan mapel sama pada kelas tersebut
    if (log.mapelKe && schedule.mapelKe && Number(log.mapelKe) === Number(schedule.mapelKe)) {
      return true;
    }

    // 3. Prioritas Ketiga: Kesamaan kode guru pada kelas tersebut
    if (
      log.kodeGuru && schedule.kodeGuru &&
      log.kodeGuru.toLowerCase() === schedule.kodeGuru.toLowerCase()
    ) {
      return true;
    }

    return false;
  });

  const activeRoom = matchingLog?.ruangBelajar && matchingLog.ruangBelajar.trim() !== ''
    ? matchingLog.ruangBelajar
    : defaultRoom;

  const isCoveredNow = schedule.periods.includes(activePeriodNumber);

  // Tentukan warna status
  let statusColor: ResolvedScheduleSlot['statusColor'] = 'slate';
  let statusLabel = 'Terjadwal';

  if (matchingLog) {
    if (matchingLog.pengganti === 'Y') {
      statusColor = 'purple';
      statusLabel = `Didampingi Guru Pengganti / Infal${matchingLog.namaPengganti ? `: ${matchingLog.namaPengganti}` : ''}`;
    } else if (
      matchingLog.statusKehadiran === 'Izin' || 
      matchingLog.statusKehadiran === 'Sakit' || 
      matchingLog.statusKehadiran === 'Keperluan Pribadi' || 
      matchingLog.statusKehadiran === 'Dinas Luar' ||
      matchingLog.statusKehadiran === 'Instruksi Pimpinan'
    ) {
      statusColor = 'yellow';
      statusLabel = `Guru Tidak Hadir (${matchingLog.statusKehadiran})`;
    } else if (matchingLog.statusKehadiran === 'Hadir') {
      const isRegularClassroom = (() => {
        if (!matchingLog.ruangBelajar || matchingLog.ruangBelajar.trim() === '') return true;
        const clean = matchingLog.ruangBelajar.trim().toLowerCase();
        if (clean === 'ruang kelas' || clean === 'kelas' || clean === 'di dalam kelas' || clean === 'dalam kelas') return true;
        if (defaultRoom && clean === defaultRoom.trim().toLowerCase()) return true;
        if (/^(r\.|ruang\s+kelas|kelas)\s+[a-z0-9\-]+$/i.test(clean)) return true;
        return false;
      })();

      if (isRegularClassroom) {
        statusColor = 'green';
        statusLabel = `Hadir di Kelas (Absen: ${matchingLog.waktuAbsen || '-'} WIB)`;
      } else {
        statusColor = 'blue';
        statusLabel = `Hadir di Luar Kelas (${activeRoom}) - Absen: ${matchingLog.waktuAbsen || '-'} WIB`;
      }
    } else {
      const isRegularClassroom = (() => {
        if (!matchingLog.ruangBelajar || matchingLog.ruangBelajar.trim() === '') return true;
        const clean = matchingLog.ruangBelajar.trim().toLowerCase();
        if (clean === 'ruang kelas' || clean === 'kelas' || clean === 'di dalam kelas' || clean === 'dalam kelas') return true;
        if (defaultRoom && clean === defaultRoom.trim().toLowerCase()) return true;
        if (/^(r\.|ruang\s+kelas|kelas)\s+[a-z0-9\-]+$/i.test(clean)) return true;
        return false;
      })();

      statusColor = isRegularClassroom ? 'green' : 'blue';
      statusLabel = matchingLog.statusKehadiran;
    }
  } else {
    // Belum ada log di attendanceLogs
    if (isCoveredNow) {
      // Sedang jam aktif tapi belum ada absen -> MERAH
      statusColor = 'red';
      statusLabel = 'Jam Aktif Sekarang - Belum Ada Absen Masuk';
    } else if (schedule.endPeriod < activePeriodNumber) {
      // Jam sudah lewat tapi tidak ada catatan -> MERAH (terlewat / belum sinkron)
      statusColor = 'red';
      statusLabel = 'Jam Pelajaran Terlewat - Tidak Ada Catatan Kehadiran';
    } else {
      // Jam mendatang -> SLATE
      statusColor = 'slate';
      statusLabel = 'Jadwal Mendatang (Belum Mulai)';
    }
  }

  return {
    schedule,
    teacher,
    subject,
    defaultRoom,
    activeRoom,
    attendance: matchingLog,
    statusColor,
    statusLabel,
    isCoveredNow,
  };
}

/**
 * Deteksi jam pelajaran aktif saat ini berdasarkan waktu lokal WIB (UTC+7)
 */
export function getCurrentPeriodInfo(schedules: PeriodSchedule[] = PERIOD_SCHEDULES_REGULAR) {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const wibHours = (utcHours + 7) % 24;
  const currentMinutesTotal = wibHours * 60 + utcMinutes;

  for (const item of schedules) {
    const [startH, startM] = item.startTime.split(':').map(Number);
    const [endH, endM] = item.endTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (currentMinutesTotal >= startTotal && currentMinutesTotal <= endTotal) {
      return {
        activePeriod: item.period,
        schedule: item,
        status: 'in_session' as const,
        wibTimeStr: `${String(wibHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')} WIB`,
      };
    }
  }

  const [firstStartH, firstStartM] = schedules[0].startTime.split(':').map(Number);
  const firstTotal = firstStartH * 60 + firstStartM;
  const [lastEndH, lastEndM] = schedules[schedules.length - 1].endTime.split(':').map(Number);
  const lastTotal = lastEndH * 60 + lastEndM;

  let fallbackPeriod = schedules.length >= 4 ? 4 : 1;
  if (currentMinutesTotal < firstTotal) {
    fallbackPeriod = 1;
  } else if (currentMinutesTotal > lastTotal) {
    fallbackPeriod = schedules[schedules.length - 1].period;
  }

  return {
    activePeriod: fallbackPeriod,
    schedule: schedules.find(s => s.period === fallbackPeriod) || schedules[0],
    status: (currentMinutesTotal < firstTotal ? 'before_school' : currentMinutesTotal > lastTotal ? 'after_school' : 'break') as 'before_school' | 'after_school' | 'break',
    wibTimeStr: `${String(wibHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')} WIB`,
  };
}

/**
 * Backward compatibility: Deduplicate attendance records
 */
export function processAndDeduplicateAttendance(records: any[]): AttendanceLogItem[] {
  return records.map(enrichAttendanceLogItem);
}

/**
 * Deteksi entitas sampel / contoh (guru contoh, mapel contoh, ruang/kelas contoh)
 * Digunakan untuk mengecualikan data uji coba dari kalkulasi statistik & infografis
 */
export function isSampleEntity(params: {
  kodeGuru?: string | null;
  namaGuru?: string | null;
  kodeMapel?: string | null;
  namaMapel?: string | null;
  namaKelas?: string | null;
  lokasiRuang?: string | null;
}): boolean {
  const checkText = (txt?: string | null): boolean => {
    if (!txt) return false;
    const lower = String(txt).toLowerCase().trim();
    return (
      lower.includes('contoh') ||
      lower.includes('dummy') ||
      lower.includes('sample') ||
      lower.includes('test') ||
      lower === 'ct'
    );
  };

  return (
    checkText(params.kodeGuru) ||
    checkText(params.namaGuru) ||
    checkText(params.kodeMapel) ||
    checkText(params.namaMapel) ||
    checkText(params.namaKelas) ||
    checkText(params.lokasiRuang)
  );
}

