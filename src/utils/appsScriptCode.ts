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
  PeriodSchedule as PeriodType,
  MasterLoginAccount,
  HariLiburItem,
  PeriodeAkademik,
  HariEfektifResult
} from '../types';
import { 
  PERIOD_SCHEDULES_REGULAR, 
  PERIOD_SCHEDULES_FRIDAY, 
  DEFAULT_MASTER_LOGIN,
  DEFAULT_HARI_LIBUR,
  DEFAULT_PERIODE_AKADEMIK
} from '../data/initialData';

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
 * Memformat tanggal ke bentuk standar baku DD/MM/YYYY (contoh: 17/08/2026)
 */
export function formatDateDMY(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  const key = canonicalDateKey(dateInput);
  if (!key) return String(dateInput);
  const parts = key.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return String(dateInput);
}

/**
 * Parsing string tanggal (berbagai format) ke objek Date JavaScript
 */
export function parseDateDMY(dateStr: string | Date | undefined | null): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  const key = canonicalDateKey(dateStr);
  if (!key) return null;
  const parts = key.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d, 12, 0, 0); // Gunakan jam 12 siang agar aman dari pergeseran timezone
  }
  return null;
}

/**
 * Mengecek apakah tanggal jatuh pada akhir pekan (Sabtu = 6 atau Minggu = 0)
 * Sesuai aturan 5 hari sekolah: Senin s/d Jumat
 */
export function isWeekend(dateInput: Date | string): boolean {
  const d = dateInput instanceof Date ? dateInput : parseDateDMY(dateInput);
  if (!d) return false;
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Mengecek apakah suatu tanggal terdaftar dalam daftar HariLibur
 */
export function isHolidayDate(
  dateInput: Date | string,
  holidays: HariLiburItem[] = []
): { isHoliday: boolean; keterangan?: string } {
  const key = canonicalDateKey(dateInput);
  if (!key || !Array.isArray(holidays)) return { isHoliday: false };
  const matched = holidays.find(h => canonicalDateKey(h.tanggal) === key);
  if (matched) {
    return { isHoliday: true, keterangan: matched.keterangan };
  }
  return { isHoliday: false };
}

/**
 * Menghitung rincian hari efektif KBM secara cerdas:
 * - Mengecualikan Sabtu & Minggu (aturan 5 hari sekolah: Senin s/d Jumat)
 * - Mengecualikan tanggal dalam daftar sheet HariLibur
 * - Otomatis membatasi rentang tanggal dalam batas Mulai Semester dan Selesai Semester jika periode disediakan
 * - Mengembalikan objek detail lengkap jumlah hari efektif, hari libur, dan rincian tanggalnya
 */
export function hitungHariEfektif(
  mulaiInput: Date | string,
  akhirInput: Date | string,
  libur: HariLiburItem[] = [],
  periode?: PeriodeAkademik
): HariEfektifResult {
  let start = parseDateDMY(mulaiInput);
  let end = parseDateDMY(akhirInput);

  // Jika periode disediakan, batasi rentang tanggal agar tidak melampaui batas semester
  if (periode) {
    const periodStart = parseDateDMY(periode.mulaiSemester);
    const periodEnd = parseDateDMY(periode.selesaiSemester || periode.akhirSemester);
    if (periodStart && start && start < periodStart) {
      start = periodStart;
    }
    if (periodEnd && end && end > periodEnd) {
      end = periodEnd;
    }
  }

  if (!start || !end || start > end) {
    return {
      hariEfektif: 0,
      totalHariKalender: 0,
      hariSabtuMinggu: 0,
      hariLiburNasional: 0,
      daftarTanggalLibur: [],
      daftarTanggalEfektif: [],
      rentangDigunakan: {
        mulai: start ? formatDateDMY(start) : '',
        akhir: end ? formatDateDMY(end) : '',
      },
    };
  }

  let totalHariKalender = 0;
  let hariSabtuMinggu = 0;
  let hariLiburNasional = 0;
  let hariEfektif = 0;
  const daftarTanggalLibur: Array<{ tanggal: string; keterangan: string }> = [];
  const daftarTanggalEfektif: string[] = [];

  const current = new Date(start);
  while (current <= end) {
    totalHariKalender++;
    const dayOfWeek = current.getDay(); // 0 = Minggu, 6 = Sabtu
    const dateFormatted = formatDateDMY(current);

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      hariSabtuMinggu++;
    } else {
      const holidayCheck = isHolidayDate(current, libur);
      if (holidayCheck.isHoliday) {
        hariLiburNasional++;
        daftarTanggalLibur.push({
          tanggal: dateFormatted,
          keterangan: holidayCheck.keterangan || 'Hari Libur Nasional / Cuti Bersama',
        });
      } else {
        hariEfektif++;
        daftarTanggalEfektif.push(dateFormatted);
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    hariEfektif,
    totalHariKalender,
    hariSabtuMinggu,
    hariLiburNasional,
    daftarTanggalLibur,
    daftarTanggalEfektif,
    rentangDigunakan: {
      mulai: formatDateDMY(start),
      akhir: formatDateDMY(end),
    },
  };
}

export interface EffectiveSessionsResult {
  totalSessions: number;
  activeDays: number;
  holidayDays: number;
  weekendDays: number;
  holidaysEncountered: Array<{ tanggal: string; keterangan: string }>;
}

/**
 * Menghitung hari efektif KBM dan total sesi KBM terjadwal antara startDate dan endDate
 * - Otomatis membuang Sabtu & Minggu (5 hari sekolah: Senin s/d Jumat)
 * - Otomatis memotong tanggal merah dari daftar HariLibur
 * - Menghitung jumlah sesi KBM yang terjadwal pada hari-hari aktif tersebut
 */
export function calculateEffectiveSchoolSessions(
  startDateInput: Date | string,
  endDateInput: Date | string,
  schedules: ScheduleItem[],
  holidays: HariLiburItem[] = []
): EffectiveSessionsResult {
  const start = parseDateDMY(startDateInput);
  const end = parseDateDMY(endDateInput);

  if (!start || !end || start > end) {
    return {
      totalSessions: 0,
      activeDays: 0,
      holidayDays: 0,
      weekendDays: 0,
      holidaysEncountered: [],
    };
  }

  let totalSessions = 0;
  let activeDays = 0;
  let holidayDays = 0;
  let weekendDays = 0;
  const holidaysEncountered: Array<{ tanggal: string; keterangan: string }> = [];

  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Minggu, 6 = Sabtu

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDays++;
    } else {
      // Hari kerja (Senin..Jumat)
      const holidayCheck = isHolidayDate(current, holidays);
      if (holidayCheck.isHoliday) {
        holidayDays++;
        holidaysEncountered.push({
          tanggal: formatDateDMY(current),
          keterangan: holidayCheck.keterangan || 'Hari Libur Nasional',
        });
      } else {
        activeDays++;
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const dayName = dayNames[dayOfWeek];
        const dayScheds = schedules.filter(
          s => s.hari.toLowerCase() === dayName.toLowerCase() && !isSampleEntity({ kodeGuru: s.kodeGuru, kodeMapel: s.kodeMapel })
        );
        totalSessions += dayScheds.length;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    totalSessions,
    activeDays,
    holidayDays,
    weekendDays,
    holidaysEncountered,
  };
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
    sumberData: String(raw.sumberData || raw['Sumber data'] || raw['Sumber Data'] || '').trim(),
    penginputData: String(raw.penginputData || raw['Penginput Data'] || raw['penginputData'] || '').trim(),
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

  // MasterLogin dari Sheet MasterLogin: Nama | Jabatan | Username | Password | Role
  const rawLoginList = rawBundle.masterLogin || rawBundle.MasterLogin || rawBundle['master_login'];
  const masterLogin: MasterLoginAccount[] = Array.isArray(rawLoginList) && rawLoginList.length > 0
    ? rawLoginList.map((u: any) => ({
        nama: String(u.nama || u['Nama'] || u['Nama Lengkap'] || '').trim(),
        jabatan: String(u.jabatan || u['Jabatan'] || '').trim(),
        username: String(u.username || u['Username'] || u['User'] || '').trim(),
        password: String(u.password || u['Password'] || u['Sandi'] || '').trim(),
        role: String(u.role || u['Role'] || u['Hak Akses'] || 'Admin').trim(),
      })).filter((u: MasterLoginAccount) => Boolean(u.username && u.password))
    : DEFAULT_MASTER_LOGIN;

  // HariLibur dari Sheet HariLibur: Tanggal (DD/MM/YYYY) | Keterangan
  const rawHolidays = rawBundle.hariLibur !== undefined 
    ? rawBundle.hariLibur 
    : (rawBundle.HariLibur !== undefined ? rawBundle.HariLibur : rawBundle['hari_libur']);
  const hariLibur: HariLiburItem[] = Array.isArray(rawHolidays)
    ? rawHolidays.map((h: any) => ({
        tanggal: formatDateDMY(h.tanggal || h['Tanggal'] || ''),
        keterangan: String(h.keterangan || h['Keterangan'] || 'Hari Libur').trim(),
      })).filter(h => Boolean(h.tanggal && h.keterangan))
    : [];

  // PeriodeAkademik dari Sheet PeriodeAkademik: Mulai Semester | Selesai Semester | Tahun Ajaran
  const rawPeriod = rawBundle.periodeAkademik || rawBundle.PeriodeAkademik || rawBundle['periode_akademik'] || rawBundle.pengaturan || rawBundle.Pengaturan;
  let periodeAkademik: PeriodeAkademik = DEFAULT_PERIODE_AKADEMIK;
  if (Array.isArray(rawPeriod) && rawPeriod.length > 0) {
    const p = rawPeriod[0];
    const selesai = formatDateDMY(p.selesaiSemester || p['SelesaiSemester'] || p['Selesai Semester'] || p.akhirSemester || p['AkhirSemester'] || p['Akhir Semester'] || DEFAULT_PERIODE_AKADEMIK.selesaiSemester);
    periodeAkademik = {
      mulaiSemester: formatDateDMY(p.mulaiSemester || p['MulaiSemester'] || p['Mulai Semester'] || DEFAULT_PERIODE_AKADEMIK.mulaiSemester),
      selesaiSemester: selesai,
      akhirSemester: selesai,
      tahunAjaran: String(p.tahunAjaran || p['TahunAjaran'] || p['Tahun Ajaran'] || DEFAULT_PERIODE_AKADEMIK.tahunAjaran).trim(),
    };
  } else if (rawPeriod && typeof rawPeriod === 'object') {
    const selesai = formatDateDMY(rawPeriod.selesaiSemester || rawPeriod['SelesaiSemester'] || rawPeriod['Selesai Semester'] || rawPeriod.akhirSemester || rawPeriod['AkhirSemester'] || DEFAULT_PERIODE_AKADEMIK.selesaiSemester);
    periodeAkademik = {
      mulaiSemester: formatDateDMY(rawPeriod.mulaiSemester || rawPeriod['MulaiSemester'] || rawPeriod['Mulai Semester'] || DEFAULT_PERIODE_AKADEMIK.mulaiSemester),
      selesaiSemester: selesai,
      akhirSemester: selesai,
      tahunAjaran: String(rawPeriod.tahunAjaran || rawPeriod['TahunAjaran'] || rawPeriod['Tahun Ajaran'] || DEFAULT_PERIODE_AKADEMIK.tahunAjaran).trim(),
    };
  }

  return {
    masterGuru,
    masterMapel,
    classes,
    masterRuangan,
    schedules,
    attendanceLogs,
    masterLogin: masterLogin.length > 0 ? masterLogin : DEFAULT_MASTER_LOGIN,
    hariLibur,
    periodeAkademik,
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

/**
 * Menghasilkan kode tunggal Google Apps Script (Code.gs) lengkap
 * yang dapat disalin-tempel oleh admin ke Google Apps Script Editor.
 */
export function generateGoogleAppsScriptCode(): string {
  return `/**
 * ============================================================================
 * GOOGLE APPS SCRIPT BACKEND ENGINE - TAPAK LIVE MONITORING
 * ============================================================================
 * Petunjuk Pemasangan:
 * 1. Buka Google Spreadsheet data TAPAK Anda.
 * 2. Klik menu Extensi -> Apps Script.
 * 3. Hapus seluruh isi default pada file Code.gs, lalu tempelkan (paste) skrip ini.
 * 4. Klik "Simpan" (Ctrl+S / Cmd+S).
 * 5. Klik "Terapkan" (Deploy) -> "Penerapan Baru" (New Deployment).
 * 6. Pilih Jenis: "Aplikasi Web" (Web App).
 * 7. Setel "Jalankan sebagai": "Saya" (Me).
 * 8. Setel "Siapa yang memiliki akses": "Siapa saja" (Anyone).
 * 9. Klik "Terapkan", lalu salin URL Web App dan tempelkan pada Panel Admin TAPAK.
 * ============================================================================
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var bundle = {};
    
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var name = sheet.getName();
      var key = normalizeSheetKey(name);
      bundle[key] = getSheetDataAsJson(sheet);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: bundle,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var contents = e && e.postData && e.postData.contents ? e.postData.contents : null;
    if (!contents) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Payload kosong."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(contents);
    var action = payload.action || 'saveAttendanceLog';

    if (action === 'saveAttendanceLog' || action === 'savePiketLog') {
      return handleSaveAttendanceLog(payload);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Aksi '" + action + "' tidak dikenali."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Gagal memproses request: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSaveAttendanceLog(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('AttendanceLogs') || ss.getSheetByName('attendancelogs') || ss.getSheetByName('Attendance Logs');

  // Jika sheet AttendanceLogs / attendancelogs tidak ditemukan
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Tab sheet 'AttendanceLogs' (atau 'attendancelogs') tidak ditemukan pada Google Spreadsheet."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var logData = payload.log || payload.logData || payload;
  var idKiriman = String(logData['ID Kiriman'] || logData.idKiriman || '').trim();

  if (!idKiriman) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "ID Kiriman wajib diisi."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Baca header baris 1 untuk pemetaan dinamis
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) lastCol = 17;

  var headers = [];
  if (lastRow >= 1) {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });
  }

  // Cari posisi kolom ID Kiriman secara dinamis (Kolom P = 16 atau Kolom Q = 17)
  var idColIdx = -1;
  for (var h = 0; h < headers.length; h++) {
    if (headers[h].toLowerCase() === 'id kiriman') {
      idColIdx = h;
      break;
    }
  }

  // Helper mencocokkan key ke nama header sheet
  function getValueForHeader(headerName) {
    var norm = headerName.toLowerCase();
    
    if (norm === 'tanggal') return logData['Tanggal'] || logData.tanggal || '';
    if (norm.includes('waktu absen')) return logData['Waktu Absen (WIB)'] || logData['Waktu Absen'] || logData.waktuAbsen || '';
    if (norm === 'kelas') return logData['Kelas'] || logData.kelas || '';
    if (norm.includes('mapel ke')) return logData['Mapel Ke'] || logData.mapelKe || 1;
    if (norm.includes('kode guru')) return logData['Kode Guru'] || logData.kodeGuru || '';
    if (norm.includes('mata pelajaran')) return logData['Mata Pelajaran'] || logData.mataPelajaran || '';
    if (norm.includes('status kehadiran')) return logData['Status Kehadiran'] || logData.statusKehadiran || 'Hadir';
    if (norm.includes('jam ke')) return logData['Jam Ke'] || logData.jamKe || '';
    if (norm.includes('jam mulai')) return logData['Jam Mulai'] || logData.jamMulai || '';
    if (norm.includes('jam selesai')) return logData['Jam Selesai'] || logData.jamSelesai || '';
    if (norm.includes('ruang belajar')) return 'Ruang Kelas';
    if (norm.includes('kegiatan pembelajaran')) return logData['Kegiatan Pembelajaran'] || logData.kegiatanPembelajaran || '-';
    if (norm.includes('info ketidakhadiran')) return logData['Info Ketidakhadiran'] || logData.infoKetidakhadiran || '-';
    if (norm.includes('pengganti')) return logData['Pengganti (Y/N)'] || logData.pengganti || 'N';
    if (norm.includes('sumber data')) return logData['Sumber Data'] || logData['Sumber data'] || logData.sumberData || 'Agenda Kelas';
    if (norm.includes('penginput data')) return logData['Penginput Data'] || logData.penginputData || 'Petugas Piket';
    if (norm.includes('id kiriman')) return idKiriman;
    
    return logData[headerName] || logData[norm] || '';
  }

  var rowValues = [];
  if (headers.length > 0) {
    for (var col = 0; col < headers.length; col++) {
      rowValues.push(getValueForHeader(headers[col]));
    }
  } else {
    // Fallback 17 kolom standar jika sheet belum memiliki header
    rowValues = [
      logData['Tanggal'] || logData.tanggal || '',
      logData['Waktu Absen (WIB)'] || logData.waktuAbsen || '',
      logData['Kelas'] || logData.kelas || '',
      logData['Mapel Ke'] || logData.mapelKe || 1,
      logData['Kode Guru'] || logData.kodeGuru || '',
      logData['Mata Pelajaran'] || logData.mataPelajaran || '',
      logData['Status Kehadiran'] || logData.statusKehadiran || 'Hadir',
      logData['Jam Ke'] || logData.jamKe || '',
      logData['Jam Mulai'] || logData.jamMulai || '',
      logData['Jam Selesai'] || logData.jamSelesai || '',
      logData['Ruang Belajar'] || logData.ruangBelajar || 'Ruang Kelas',
      logData['Kegiatan Pembelajaran'] || logData.kegiatanPembelajaran || '-',
      logData['Info Ketidakhadiran'] || logData.infoKetidakhadiran || '-',
      logData['Pengganti (Y/N)'] || logData.pengganti || 'N',
      logData['Sumber Data'] || logData['Sumber data'] || logData.sumberData || 'Agenda Kelas',
      logData['Penginput Data'] || logData.penginputData || 'Petugas Piket',
      idKiriman
    ];
  }

  // Cari ID Kiriman pada kolom terdeteksi (misal Kolom P = 16 atau Kolom Q = 17)
  var targetRow = -1;
  var checkCol = idColIdx >= 0 ? (idColIdx + 1) : 16; // Prioritaskan Kolom P (16) sesuai struktur

  if (lastRow >= 2 && checkCol >= 1) {
    var idRange = sheet.getRange(2, checkCol, lastRow - 1, 1).getValues();
    for (var i = 0; i < idRange.length; i++) {
      if (String(idRange[i][0]).trim() === idKiriman) {
        targetRow = i + 2; // offset header
        break;
      }
    }
  }

  // Fallback tambahan jika ID Kiriman berada di Kolom Q (17) atau P (16)
  if (targetRow < 0 && lastRow >= 2) {
    var checkColsAlt = [16, 17];
    for (var cIdx = 0; cIdx < checkColsAlt.length; cIdx++) {
      var altCol = checkColsAlt[cIdx];
      if (altCol <= lastCol) {
        var altRange = sheet.getRange(2, altCol, lastRow - 1, 1).getValues();
        for (var j = 0; j < altRange.length; j++) {
          if (String(altRange[j][0]).trim() === idKiriman) {
            targetRow = j + 2;
            break;
          }
        }
      }
      if (targetRow > 0) break;
    }
  }

  var actionDone = 'inserted';
  if (targetRow > 0) {
    // Overwrite baris yang ada
    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
    actionDone = 'updated';
  } else {
    // Tambahkan baris baru
    sheet.appendRow(rowValues);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Data presensi berhasil " + (actionDone === 'updated' ? 'diperbarui' : 'ditambahkan') + " pada sheet " + sheet.getName(),
    action: actionDone,
    idKiriman: idKiriman,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function normalizeSheetKey(sheetName) {
  var clean = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.indexOf('guru') !== -1 || clean.indexOf('masterguru') !== -1) return 'masterGuru';
  if (clean.indexOf('mapel') !== -1 || clean.indexOf('mastermapel') !== -1) return 'masterMapel';
  if (clean.indexOf('kelas') !== -1) return 'classes';
  if (clean.indexOf('ruang') !== -1) return 'masterRuangan';
  if (clean.indexOf('jadwal') !== -1 || clean.indexOf('schedule') !== -1) return 'schedules';
  if (clean.indexOf('absen') !== -1 || clean.indexOf('attend') !== -1 || clean.indexOf('log') !== -1) return 'attendanceLogs';
  if (clean.indexOf('login') !== -1 || clean.indexOf('user') !== -1) return 'masterLogin';
  if (clean.indexOf('libur') !== -1) return 'hariLibur';
  if (clean.indexOf('periode') !== -1 || clean.indexOf('pengaturan') !== -1) return 'periodeAkademik';
  return sheetName;
}

function getSheetDataAsJson(sheet) {
  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return [];

  var headers = data[0];
  var result = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var isEmpty = true;
    var obj = {};

    for (var c = 0; c < headers.length; c++) {
      var headerName = String(headers[c]).trim();
      var val = row[c];
      if (val !== "" && val !== null && val !== undefined) {
        isEmpty = false;
      }
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "Asia/Jakarta", "dd-MMM-yyyy");
      }
      obj[headerName] = val;
    }

    if (!isEmpty) {
      result.push(obj);
    }
  }

  return result;
}
`;
}


