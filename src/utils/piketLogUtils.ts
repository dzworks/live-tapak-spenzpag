import { AttendanceLogItem, ScheduleItem, ClassMaster, MasterGuru } from '../types';
import { canonicalDateKey, formatToIndonesianDisplayDate, parsePeriodRange } from './appsScriptCode';

/**
 * Menghasilkan ID Kiriman untuk log yang diinput/diedit oleh petugas Piket
 * Sesuai aturan: "samakan kecuali 2 huruf terakhir, ubah menjadi PIKET"
 * Format baku dari contoh: [DDMMYYYY][KelasTanpaMinus][MapelKe]PIKET
 * Contoh: 20-Okt-2026, IX-F, Mapel 1, Guru GR -> 20102026IXF1PIKET
 */
export function generatePiketIdKiriman(
  tanggal: string,
  namaKelas: string,
  mapelKe: number,
  kodeGuru: string,
  existingId?: string
): string {
  // Jika sudah ada ID sebelumnya dari data sheet
  if (existingId && existingId.trim().length > 2) {
    const trimmed = existingId.trim();
    if (trimmed.endsWith('PIKET')) {
      return trimmed;
    }
    // Ganti 2 huruf terakhir dengan 'PIKET'
    return trimmed.slice(0, -2) + 'PIKET';
  }

  // Format baru otomatis jika belum ada ID sebelumnya:
  // 1. Ambil DDMMYYYY dari tanggal kanonik
  const canon = canonicalDateKey(tanggal); // YYYY-MM-DD
  let ddmmyyyy = '20102026';
  if (canon && canon.includes('-')) {
    const parts = canon.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      ddmmyyyy = `${d}${m}${y}`;
    }
  }

  // 2. Bersihkan nama kelas dari tanda hubung / spasi (contoh: IX-F -> IXF, VII-A -> VIIA)
  const cleanClass = (namaKelas || '')
    .replace(/^Kelas\s+/i, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  const mapelNum = Number(mapelKe) || 1;

  // Format baku ID kiriman berakhiran PIKET
  return `${ddmmyyyy}${cleanClass}${mapelNum}PIKET`;
}

/**
 * Format jam ke dengan spasi agar sesuai contoh CSV (misal: "1 - 2" bukan "1-2")
 */
export function formatJamKeWithSpaces(jamKe: string | number): string {
  const str = String(jamKe ?? '1').trim();
  if (str.includes('-') && !str.includes(' - ')) {
    return str.replace(/-/g, ' - ');
  }
  return str;
}

/**
 * Membentuk objek AttendanceLogItem lengkap sesuai skema sheet attendancelogs
 */
export function buildPiketAttendanceLogItem(params: {
  schedule: ScheduleItem;
  tanggal: string;
  statusKehadiran: string;
  kegiatanPembelajaran?: string;
  infoKetidakhadiran?: string;
  sumberData?: string;
  penginputData?: string;
  petugasUsername?: string;
  classes?: ClassMaster[];
  masterGuru?: MasterGuru[];
  existingLog?: AttendanceLogItem | null;
}): AttendanceLogItem {
  const {
    schedule,
    tanggal,
    statusKehadiran,
    kegiatanPembelajaran = '',
    infoKetidakhadiran = '',
    sumberData = 'Agenda Kelas',
    penginputData = '',
    petugasUsername = 'admin',
    classes = [],
    masterGuru = [],
    existingLog,
  } = params;

  // Tanggal display (contoh: "22-Okt-2026")
  const displayTanggal = formatToIndonesianDisplayDate(tanggal);

  // Ruang belajar statis "Ruang Kelas"
  const ruangBelajar = 'Ruang Kelas';


  // Nama Guru & NIP jika ada
  const teacher = masterGuru.find(
    g => g.kodeGuru.toLowerCase() === schedule.kodeGuru.toLowerCase()
  );

  // ID Kiriman Piket
  const piketId = generatePiketIdKiriman(
    displayTanggal,
    schedule.namaKelas,
    schedule.mapelKe,
    schedule.kodeGuru,
    existingLog?.idKiriman
  );

  const isHadir = statusKehadiran.trim().toLowerCase() === 'hadir';

  // Sesuai aturan:
  // - Waktu Absen: dikosongkan ("")
  // - Pengganti: "N"
  // - Kegiatan Pembelajaran: isi jika hadir, '-' jika bukan hadir
  // - Info Ketidakhadiran: isi jika bukan hadir, '-' jika hadir
  const formattedKegiatan = isHadir
    ? (kegiatanPembelajaran.trim() ? kegiatanPembelajaran.trim() : '-')
    : '-';

  const formattedInfoKetidakhadiran = !isHadir
    ? (infoKetidakhadiran.trim() ? infoKetidakhadiran.trim() : '-')
    : '-';

  const jamKeFormatted = formatJamKeWithSpaces(schedule.jamKe);
  const parsed = parsePeriodRange(schedule.jamKe);

  const finalSumberData = (sumberData && sumberData.trim()) ? sumberData.trim() : 'Agenda Kelas';
  const finalPenginput = (penginputData && penginputData.trim())
    ? penginputData.trim()
    : (petugasUsername && petugasUsername.trim()) ? petugasUsername.trim() : 'Petugas Piket';

  return {
    tanggal: displayTanggal,
    waktuAbsen: '', // Dikosongkan sesuai instruksi
    kelas: schedule.namaKelas,
    mapelKe: schedule.mapelKe,
    kodeGuru: schedule.kodeGuru,
    mataPelajaran: schedule.kodeMapel, // Menggunakan kode singkatan mapel (MTK, IND, dsb.)
    statusKehadiran,
    jamKe: jamKeFormatted,
    jamMulai: schedule.jamMulai,
    jamSelesai: schedule.jamSelesai,
    ruangBelajar,
    kegiatanPembelajaran: formattedKegiatan,
    infoKetidakhadiran: formattedInfoKetidakhadiran,
    pengganti: 'N', // Nilai N sesuai instruksi
    sumberData: finalSumberData,
    penginputData: finalPenginput,
    idKiriman: piketId,
    startPeriod: parsed.startPeriod,
    endPeriod: parsed.endPeriod,
    spanJP: parsed.spanJP,
    periods: parsed.periods,
    namaGuru: teacher?.namaLengkap || existingLog?.namaGuru || schedule.kodeGuru,
    nip: teacher?.nip || existingLog?.nip || '-',
    diinputOleh: existingLog?.diinputOleh || finalPenginput,
    diubahOleh: existingLog ? finalPenginput : undefined,
  };
}

/**
 * Membentuk payload baris JSON dengan key persis sesuai header sheet attendancelogs
 */
export function formatLogForSheetPayload(log: AttendanceLogItem) {
  const chosenSumberData = log.sumberData || 'Agenda Kelas';
  const chosenPenginput = log.penginputData || log.diinputOleh || 'Petugas Piket';

  return {
    'Tanggal': log.tanggal,
    'Waktu Absen (WIB)': log.waktuAbsen || '',
    'Kelas': log.kelas,
    'Mapel Ke': log.mapelKe,
    'Kode Guru': log.kodeGuru,
    'Mata Pelajaran': log.mataPelajaran || '',
    'Status Kehadiran': log.statusKehadiran,
    'Jam Ke': log.jamKe || '',
    'Jam Mulai': log.jamMulai || '',
    'Jam Selesai': log.jamSelesai || '',
    'Ruang Belajar': log.ruangBelajar || 'Ruang Kelas',
    'Kegiatan Pembelajaran': log.kegiatanPembelajaran || '-',
    'Info Ketidakhadiran': log.infoKetidakhadiran || '-',
    'Pengganti (Y/N)': log.pengganti || 'N',
    'Sumber data': chosenSumberData,
    'Sumber Data': chosenSumberData,
    'Penginput Data': chosenPenginput,
    'ID Kiriman': log.idKiriman,
  };
}
