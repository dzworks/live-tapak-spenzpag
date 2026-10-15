import { 
  MasterGuru, 
  MasterMapel, 
  ClassMaster, 
  MasterRuangan, 
  ScheduleItem, 
  AttendanceLogItem, 
  PeriodSchedule, 
  SchoolClass, 
  TeacherInfo, 
  DayType 
} from '../types';
import { parsePeriodRange } from '../utils/appsScriptCode';

// 1. MASTER GURU (Kamus Kode Guru -> Nama Lengkap & NIP)
export const DEFAULT_MASTER_GURU: MasterGuru[] = [
  { kodeGuru: 'DZ', namaLengkap: 'Dzul Fikri, S.Pd.', nip: '199304122022211002' },
  { kodeGuru: 'IF', namaLengkap: 'Ilham Fadilah, S.Pd.I.', nip: '199008152019031008' },
  { kodeGuru: 'RH', namaLengkap: 'Rahmat Hidayat, M.Pd.', nip: '198501102010011015' },
  { kodeGuru: 'SN', namaLengkap: 'Siti Nurhaliza, S.Pd.', nip: '199203112020122014' },
  { kodeGuru: 'BS', namaLengkap: 'Budi Santoso, S.Kom.', nip: '198811202015021003' },
  { kodeGuru: 'AN', namaLengkap: 'Aisyah Nabila, M.Pd.', nip: '199407052023212009' },
  { kodeGuru: 'TW', namaLengkap: 'Tri Wahyuni, S.Pd.', nip: '198705142011012012' },
  { kodeGuru: 'AR', namaLengkap: 'Ahmad Ridwan, S.Pd.', nip: '199109032018021004' },
  { kodeGuru: 'WY', namaLengkap: 'Drs. Wahyudi (Guru Piket)', nip: '197906102005011009' },
  { kodeGuru: 'HM', namaLengkap: 'Hj. Mardiah, M.Pd.', nip: '197604121999032001' },
  { kodeGuru: 'FR', namaLengkap: 'Faisal Ramadhan, S.Sn.', nip: '199508172023211005' },
  { kodeGuru: 'DK', namaLengkap: 'Dewi Kartika, S.Pd.', nip: '199101052019022011' },
];

export const TEACHER_DIRECTORY: Record<string, TeacherInfo> = Object.fromEntries(
  DEFAULT_MASTER_GURU.map(g => [
    g.kodeGuru, 
    { kode: g.kodeGuru, nama: g.namaLengkap, nip: g.nip, mapelUtama: '-' }
  ])
);

// 2. MASTER MAPEL (Kamus Kode Mapel -> Nama Mapel)
export const DEFAULT_MASTER_MAPEL: MasterMapel[] = [
  { kodeMapel: 'ENG', namaMapel: 'Bahasa Inggris' },
  { kodeMapel: 'PAI', namaMapel: 'Pendidikan Agama Islam' },
  { kodeMapel: 'MAT', namaMapel: 'Matematika' },
  { kodeMapel: 'IPA', namaMapel: 'IPA Terpadu' },
  { kodeMapel: 'INF', namaMapel: 'Informatika' },
  { kodeMapel: 'IND', namaMapel: 'Bahasa Indonesia' },
  { kodeMapel: 'PKN', namaMapel: 'PPKn' },
  { kodeMapel: 'PJK', namaMapel: 'PJOK' },
  { kodeMapel: 'IPS', namaMapel: 'IPS Terpadu' },
  { kodeMapel: 'SNB', namaMapel: 'Seni Budaya' },
  { kodeMapel: 'BK', namaMapel: 'Bimbingan Konseling' },
];

// 3. CLASSES (Master 23 Rombel Sekolah)
export const DEFAULT_CLASSES: ClassMaster[] = [
  // Kelas VII (8 Rombel)
  { tokenQr: 'QR-VII-A-101', idKelas: 'KLS-07A', namaKelas: 'Kelas VII A', lokasiRuang: 'R. 101' },
  { tokenQr: 'QR-VII-B-102', idKelas: 'KLS-07B', namaKelas: 'Kelas VII B', lokasiRuang: 'R. 102' },
  { tokenQr: 'QR-VII-C-103', idKelas: 'KLS-07C', namaKelas: 'Kelas VII C', lokasiRuang: 'R. 103' },
  { tokenQr: 'QR-VII-D-104', idKelas: 'KLS-07D', namaKelas: 'Kelas VII D', lokasiRuang: 'R. 104' },
  { tokenQr: 'QR-VII-E-105', idKelas: 'KLS-07E', namaKelas: 'Kelas VII E', lokasiRuang: 'R. 105' },
  { tokenQr: 'QR-VII-F-106', idKelas: 'KLS-07F', namaKelas: 'Kelas VII F', lokasiRuang: 'R. 106' },
  { tokenQr: 'QR-VII-G-107', idKelas: 'KLS-07G', namaKelas: 'Kelas VII G', lokasiRuang: 'R. 107' },
  { tokenQr: 'QR-VII-H-108', idKelas: 'KLS-07H', namaKelas: 'Kelas VII H', lokasiRuang: 'R. 108' },

  // Kelas VIII (8 Rombel)
  { tokenQr: 'QR-VIII-A-201', idKelas: 'KLS-08A', namaKelas: 'Kelas VIII A', lokasiRuang: 'R. 201' },
  { tokenQr: 'QR-VIII-B-202', idKelas: 'KLS-08B', namaKelas: 'Kelas VIII B', lokasiRuang: 'R. 202' },
  { tokenQr: 'QR-VIII-C-203', idKelas: 'KLS-08C', namaKelas: 'Kelas VIII C', lokasiRuang: 'R. 203' },
  { tokenQr: 'QR-VIII-D-204', idKelas: 'KLS-08D', namaKelas: 'Kelas VIII D', lokasiRuang: 'R. 204' },
  { tokenQr: 'QR-VIII-E-205', idKelas: 'KLS-08E', namaKelas: 'Kelas VIII E', lokasiRuang: 'R. 205' },
  { tokenQr: 'QR-VIII-F-206', idKelas: 'KLS-08F', namaKelas: 'Kelas VIII F', lokasiRuang: 'R. 206' },
  { tokenQr: 'QR-VIII-G-207', idKelas: 'KLS-08G', namaKelas: 'Kelas VIII G', lokasiRuang: 'R. 207' },
  { tokenQr: 'QR-VIII-H-208', idKelas: 'KLS-08H', namaKelas: 'Kelas VIII H', lokasiRuang: 'R. 208' },

  // Kelas IX (7 Rombel)
  { tokenQr: 'QR-IX-A-301', idKelas: 'KLS-09A', namaKelas: 'Kelas IX A', lokasiRuang: 'R. 301' },
  { tokenQr: 'QR-IX-B-302', idKelas: 'KLS-09B', namaKelas: 'Kelas IX B', lokasiRuang: 'R. 302' },
  { tokenQr: 'QR-IX-C-303', idKelas: 'KLS-09C', namaKelas: 'Kelas IX C', lokasiRuang: 'R. 303' },
  { tokenQr: 'QR-IX-D-304', idKelas: 'KLS-09D', namaKelas: 'Kelas IX D', lokasiRuang: 'R. 304' },
  { tokenQr: 'QR-IX-E-305', idKelas: 'KLS-09E', namaKelas: 'Kelas IX E', lokasiRuang: 'R. 305' },
  { tokenQr: 'QR-IX-F-306', idKelas: 'KLS-09F', namaKelas: 'Kelas IX F', lokasiRuang: 'R. 306' },
  { tokenQr: 'QR-IX-G-307', idKelas: 'KLS-09G', namaKelas: 'Kelas IX G', lokasiRuang: 'R. 307' },
];

export const SCHOOL_CLASSES: SchoolClass[] = DEFAULT_CLASSES.map(c => {
  const shortName = c.namaKelas.replace(/^Kelas\s+/i, '').replace(/\s+/g, '-');
  const grade = shortName.startsWith('VII-') ? 'VII' : shortName.startsWith('VIII-') ? 'VIII' : 'IX';
  return {
    id: shortName,
    grade: grade as any,
    name: shortName,
    room: c.lokasiRuang,
  };
});

// 4. MASTER RUANGAN (Ruang Dinamis / Khusus)
export const DEFAULT_MASTER_RUANGAN: MasterRuangan[] = [
  { tokenQr: 'QR-LAPANGAN-1', namaRuangan: 'Lapangan Basket', pinAkses: '8821' },
  { tokenQr: 'QR-LAB-KOMP', namaRuangan: 'Lab Komputer', pinAkses: '1234' },
  { tokenQr: 'QR-LAB-IPA', namaRuangan: 'Lab IPA Terpadu', pinAkses: '4321' },
  { tokenQr: 'QR-PERPUS', namaRuangan: 'Perpustakaan Digital', pinAkses: '5566' },
  { tokenQr: 'QR-SENI', namaRuangan: 'Ruang Kesenian', pinAkses: '7788' },
];

// Helper membuat item jadwal dengan parsing jam otomatis
function makeSchedule(
  hari: string, 
  jamKe: string, 
  mapelKe: number, 
  namaKelas: string, 
  jamMulai: string, 
  jamSelesai: string, 
  kodeGuru: string, 
  kodeMapel: string
): ScheduleItem {
  const parsed = parsePeriodRange(jamKe);
  return {
    hari,
    jamKe: parsed.normalizedStr,
    mapelKe,
    namaKelas,
    jamMulai,
    jamSelesai,
    kodeGuru,
    kodeMapel,
    startPeriod: parsed.startPeriod,
    endPeriod: parsed.endPeriod,
    spanJP: parsed.spanJP,
    periods: parsed.periods,
  };
}

// 5. MASTER SCHEDULES (Jadwal Terpusat Seluruh 23 Kelas untuk Jumat & Senin-Kamis)
export const DEFAULT_SCHEDULES: ScheduleItem[] = [
  // --- JUMAT (5 JP: Jam 1 s/d Jam 5) ---
  // Kelas VII A
  makeSchedule('Jumat', '1-3', 1, 'Kelas VII A', '07:30', '09:15', 'SN', 'IPA'),
  makeSchedule('Jumat', '4-5', 2, 'Kelas VII A', '10:05', '11:15', 'RH', 'MAT'),

  // Kelas VII B
  makeSchedule('Jumat', '1-2', 1, 'Kelas VII B', '07:30', '08:40', 'TW', 'PKN'),
  makeSchedule('Jumat', '3-4', 2, 'Kelas VII B', '08:40', '10:40', 'DZ', 'ENG'),
  makeSchedule('Jumat', '5', 3, 'Kelas VII B', '10:40', '11:15', 'IF', 'PAI'),

  // Kelas VII C
  makeSchedule('Jumat', '1-2', 1, 'Kelas VII C', '07:30', '08:40', 'AN', 'IND'),
  makeSchedule('Jumat', '3', 2, 'Kelas VII C', '08:40', '09:15', 'HM', 'IPS'),
  makeSchedule('Jumat', '4-5', 3, 'Kelas VII C', '10:05', '11:15', 'BS', 'INF'),

  // Kelas VII D
  makeSchedule('Jumat', '1-2', 1, 'Kelas VII D', '07:30', '08:40', 'FR', 'SNB'),
  makeSchedule('Jumat', '3-4', 2, 'Kelas VII D', '08:40', '10:40', 'AR', 'PJK'),
  makeSchedule('Jumat', '5', 3, 'Kelas VII D', '10:40', '11:15', 'DK', 'BK'),

  // Kelas VII E
  makeSchedule('Jumat', '1-3', 1, 'Kelas VII E', '07:30', '09:15', 'IF', 'PAI'),
  makeSchedule('Jumat', '4-5', 2, 'Kelas VII E', '10:05', '11:15', 'TW', 'PKN'),

  // Kelas VII F
  makeSchedule('Jumat', '1-3', 1, 'Kelas VII F', '07:30', '09:15', 'AR', 'PJK'),
  makeSchedule('Jumat', '4-5', 2, 'Kelas VII F', '10:05', '11:15', 'AN', 'IND'),

  // Kelas VII G
  makeSchedule('Jumat', '1-2', 1, 'Kelas VII G', '07:30', '08:40', 'BS', 'INF'),
  makeSchedule('Jumat', '3', 2, 'Kelas VII G', '08:40', '09:15', 'DK', 'BK'),
  makeSchedule('Jumat', '4-5', 3, 'Kelas VII G', '10:05', '11:15', 'HM', 'IPS'),

  // Kelas VII H
  makeSchedule('Jumat', '1-2', 1, 'Kelas VII H', '07:30', '08:40', 'RH', 'MAT'),
  makeSchedule('Jumat', '3-4', 2, 'Kelas VII H', '08:40', '10:40', 'FR', 'SNB'),
  makeSchedule('Jumat', '5', 3, 'Kelas VII H', '10:40', '11:15', 'SN', 'IPA'),

  // Kelas VIII A
  makeSchedule('Jumat', '1-2', 1, 'Kelas VIII A', '07:30', '08:40', 'RH', 'MAT'),
  makeSchedule('Jumat', '3-4', 2, 'Kelas VIII A', '08:40', '10:40', 'BS', 'INF'),
  makeSchedule('Jumat', '5', 3, 'Kelas VIII A', '10:40', '11:15', 'DZ', 'ENG'),

  // Kelas VIII B
  makeSchedule('Jumat', '1-3', 1, 'Kelas VIII B', '07:30', '09:15', 'HM', 'IPS'),
  makeSchedule('Jumat', '4-5', 2, 'Kelas VIII B', '10:05', '11:15', 'SN', 'IPA'),

  // Kelas VIII C
  makeSchedule('Jumat', '1-2', 1, 'Kelas VIII C', '07:30', '08:40', 'IF', 'PAI'),
  makeSchedule('Jumat', '3-5', 2, 'Kelas VIII C', '08:40', '11:15', 'AR', 'PJK'),

  // Kelas VIII D
  makeSchedule('Jumat', '1-2', 1, 'Kelas VIII D', '07:30', '08:40', 'AN', 'IND'),
  makeSchedule('Jumat', '3', 2, 'Kelas VIII D', '08:40', '09:15', 'TW', 'PKN'),
  makeSchedule('Jumat', '4-5', 3, 'Kelas VIII D', '10:05', '11:15', 'DZ', 'ENG'),

  // Kelas VIII E
  makeSchedule('Jumat', '1-2', 1, 'Kelas VIII E', '07:30', '08:40', 'FR', 'SNB'),
  makeSchedule('Jumat', '3-4', 2, 'Kelas VIII E', '08:40', '10:40', 'AN', 'IND'),
  makeSchedule('Jumat', '5', 3, 'Kelas VIII E', '10:40', '11:15', 'RH', 'MAT'),

  // Kelas VIII F
  makeSchedule('Jumat', '1-3', 1, 'Kelas VIII F', '07:30', '09:15', 'SN', 'IPA'),
  makeSchedule('Jumat', '4-5', 2, 'Kelas VIII F', '10:05', '11:15', 'HM', 'IPS'),

  // Kelas VIII G
  makeSchedule('Jumat', '1-2', 1, 'Kelas VIII G', '07:30', '08:40', 'FR', 'SNB'),
  makeSchedule('Jumat', '3-4', 2, 'Kelas VIII G', '08:40', '10:40', 'IF', 'PAI'),
  makeSchedule('Jumat', '5', 3, 'Kelas VIII G', '10:40', '11:15', 'BS', 'INF'),

  // Kelas VIII H
  makeSchedule('Jumat', '1-3', 1, 'Kelas VIII H', '07:30', '09:15', 'DZ', 'ENG'),
  makeSchedule('Jumat', '4-5', 2, 'Kelas VIII H', '10:05', '11:15', 'TW', 'PKN'),

  // Kelas IX A
  makeSchedule('Jumat', '1-3', 1, 'Kelas IX A', '07:30', '09:15', 'RH', 'MAT'),
  makeSchedule('Jumat', '4-5', 2, 'Kelas IX A', '10:05', '11:15', 'AN', 'IND'),

  // Kelas IX B
  makeSchedule('Jumat', '1-2', 1, 'Kelas IX B', '07:30', '08:40', 'TW', 'PKN'),
  makeSchedule('Jumat', '3-5', 2, 'Kelas IX B', '08:40', '11:15', 'SN', 'IPA'),

  // Kelas IX C
  makeSchedule('Jumat', '1-3', 1, 'Kelas IX C', '07:30', '09:15', 'AR', 'PJK'),
  makeSchedule('Jumat', '4-5', 2, 'Kelas IX C', '10:05', '11:15', 'DZ', 'ENG'),

  // Kelas IX D
  makeSchedule('Jumat', '1-2', 1, 'Kelas IX D', '07:30', '08:40', 'IF', 'PAI'),
  makeSchedule('Jumat', '3', 2, 'Kelas IX D', '08:40', '09:15', 'HM', 'IPS'),
  makeSchedule('Jumat', '4-5', 3, 'Kelas IX D', '10:05', '11:15', 'RH', 'MAT'),

  // Kelas IX E
  makeSchedule('Jumat', '1-2', 1, 'Kelas IX E', '07:30', '08:40', 'FR', 'SNB'),
  makeSchedule('Jumat', '3-4', 2, 'Kelas IX E', '08:40', '10:40', 'BS', 'INF'),
  makeSchedule('Jumat', '5', 3, 'Kelas IX E', '10:40', '11:15', 'AN', 'IND'),

  // Kelas IX F
  makeSchedule('Jumat', '1-3', 1, 'Kelas IX F', '07:30', '09:15', 'SN', 'IPA'),
  makeSchedule('Jumat', '4-5', 2, 'Kelas IX F', '10:05', '11:15', 'IF', 'PAI'),

  // Kelas IX G
  makeSchedule('Jumat', '1-2', 1, 'Kelas IX G', '07:30', '08:40', 'SN', 'IPA'),
  makeSchedule('Jumat', '3-5', 2, 'Kelas IX G', '08:40', '11:15', 'AR', 'PJK'),
];

// 6. ATTENDANCE LOGS DEFAULT (Transaksi Presensi untuk mencocokkan & menimpa warna)
export const DEFAULT_ATTENDANCE_LOGS: AttendanceLogItem[] = [
  // VII-B (Hadir Jam 3-4 DZ Bahasa Inggris)
  {
    tanggal: '09-Okt-2026',
    waktuAbsen: '08:42',
    kelas: 'Kelas VII B',
    mapelKe: 2,
    kodeGuru: 'DZ',
    statusKehadiran: 'Hadir',
    mataPelajaran: 'Bahasa Inggris',
    kegiatanPembelajaran: 'Reading Comprehension Unit 4: Narrative Texts',
    pengganti: 'N',
    infoKetidakhadiran: '-',
    ruangBelajar: 'R. 102',
    idKiriman: '09102026VIIB2DZ',
    startPeriod: 3,
    endPeriod: 4,
    spanJP: 2,
    periods: [3, 4],
  },
  // VII-B (Hadir Jam 5 IF PAI)
  {
    tanggal: '09-Okt-2026',
    waktuAbsen: '10:41',
    kelas: 'Kelas VII B',
    mapelKe: 3,
    kodeGuru: 'IF',
    statusKehadiran: 'Hadir',
    mataPelajaran: 'Pendidikan Agama Islam',
    kegiatanPembelajaran: 'Keteladanan Khulafaur Rasyidin',
    pengganti: 'N',
    infoKetidakhadiran: '-',
    ruangBelajar: 'R. 102',
    idKiriman: '09102026VIIB3IF',
    startPeriod: 5,
    endPeriod: 5,
    spanJP: 1,
    periods: [5],
  },

  // VII-A (Hadir Jam 1-3 SN IPA)
  {
    tanggal: '09-Okt-2026',
    waktuAbsen: '07:31',
    kelas: 'Kelas VII A',
    mapelKe: 1,
    kodeGuru: 'SN',
    statusKehadiran: 'Hadir',
    mataPelajaran: 'IPA Terpadu',
    kegiatanPembelajaran: 'Praktikum Pengukuran Jangka Sorong',
    pengganti: 'N',
    infoKetidakhadiran: '-',
    ruangBelajar: 'Lab IPA Terpadu',
    idKiriman: '09102026VIIA1SN',
    startPeriod: 1,
    endPeriod: 3,
    spanJP: 3,
    periods: [1, 2, 3],
  },
  // VII-A (Jam 4-5 RH Izin Sakit, Didampingi Guru Pengganti WY) -> UNGU / KUNING
  {
    tanggal: '09-Okt-2026',
    waktuAbsen: '10:08',
    kelas: 'Kelas VII A',
    mapelKe: 2,
    kodeGuru: 'RH',
    statusKehadiran: 'Sakit',
    mataPelajaran: 'Matematika',
    kegiatanPembelajaran: 'Latihan Persamaan Linear dipandu Guru Piket',
    pengganti: 'Y',
    namaPengganti: 'Drs. Wahyudi (Guru Piket)',
    infoKetidakhadiran: 'Sakit Demam Tinggi',
    ruangBelajar: 'R. 101',
    idKiriman: '09102026VIIA2RH',
    startPeriod: 4,
    endPeriod: 5,
    spanJP: 2,
    periods: [4, 5],
  },

  // VII-C (Hadir Jam 1-2 AN Bahasa Indonesia)
  {
    tanggal: '09-Okt-2026',
    waktuAbsen: '07:32',
    kelas: 'Kelas VII C',
    mapelKe: 1,
    kodeGuru: 'AN',
    statusKehadiran: 'Hadir',
    mataPelajaran: 'Bahasa Indonesia',
    kegiatanPembelajaran: 'Teks Deskripsi Budaya',
    pengganti: 'N',
    infoKetidakhadiran: '-',
    ruangBelajar: 'R. 103',
    idKiriman: '09102026VIIC1AN',
    startPeriod: 1,
    endPeriod: 2,
    spanJP: 2,
    periods: [1, 2],
  },
  // VII-C (Hadir Jam 4-5 BS Informatika di Lab Komputer)
  {
    tanggal: '09-Okt-2026',
    waktuAbsen: '10:06',
    kelas: 'Kelas VII C',
    mapelKe: 3,
    kodeGuru: 'BS',
    statusKehadiran: 'Hadir',
    mataPelajaran: 'Informatika',
    kegiatanPembelajaran: 'Etika Digital & Cybersecurity',
    pengganti: 'N',
    infoKetidakhadiran: '-',
    ruangBelajar: 'Lab Komputer',
    idKiriman: '09102026VIIC3BS',
    startPeriod: 4,
    endPeriod: 5,
    spanJP: 2,
    periods: [4, 5],
  },

  // VII-D (Hadir Jam 1-2 FR Seni Budaya)
  {
    tanggal: '09-Okt-2026',
    waktuAbsen: '07:34',
    kelas: 'Kelas VII D',
    mapelKe: 1,
    kodeGuru: 'FR',
    statusKehadiran: 'Hadir',
    mataPelajaran: 'Seni Budaya',
    kegiatanPembelajaran: 'Ragam Hias Nusantara',
    pengganti: 'N',
    infoKetidakhadiran: '-',
    ruangBelajar: 'Ruang Kesenian',
    idKiriman: '09102026VIID1FR',
    startPeriod: 1,
    endPeriod: 2,
    spanJP: 2,
    periods: [1, 2],
  },

  // VII-F (Hadir Jam 1-3 AR PJOK di Lapangan Basket)
  {
    tanggal: '09-Okt-2026',
    waktuAbsen: '07:30',
    kelas: 'Kelas VII F',
    mapelKe: 1,
    kodeGuru: 'AR',
    statusKehadiran: 'Hadir',
    mataPelajaran: 'PJOK',
    kegiatanPembelajaran: 'Passing Bawah Bola Voli',
    pengganti: 'N',
    infoKetidakhadiran: '-',
    ruangBelajar: 'Lapangan Basket',
    idKiriman: '09102026VIIF1AR',
    startPeriod: 1,
    endPeriod: 3,
    spanJP: 3,
    periods: [1, 2, 3],
  },

  // VIII-A (Hadir Jam 1-2 RH Matematika)
  {
    tanggal: '09-Okt-2026',
    waktuAbsen: '07:32',
    kelas: 'Kelas VIII A',
    mapelKe: 1,
    kodeGuru: 'RH',
    statusKehadiran: 'Hadir',
    mataPelajaran: 'Matematika',
    kegiatanPembelajaran: 'Teorema Pythagoras',
    pengganti: 'N',
    infoKetidakhadiran: '-',
    ruangBelajar: 'R. 201',
    idKiriman: '09102026VIIIA1RH',
    startPeriod: 1,
    endPeriod: 2,
    spanJP: 2,
    periods: [1, 2],
  },
  // VIII-A (Hadir Jam 3-4 BS Informatika)
  {
    tanggal: '09-Okt-2026',
    waktuAbsen: '08:44',
    kelas: 'Kelas VIII A',
    mapelKe: 2,
    kodeGuru: 'BS',
    statusKehadiran: 'Hadir',
    mataPelajaran: 'Informatika',
    kegiatanPembelajaran: 'Visual Coding Scratch',
    pengganti: 'N',
    infoKetidakhadiran: '-',
    ruangBelajar: 'Lab Komputer',
    idKiriman: '09102026VIIIA2BS',
    startPeriod: 3,
    endPeriod: 4,
    spanJP: 2,
    periods: [3, 4],
  },

  // IX-C (Hadir Jam 1-3 AR PJOK Lapangan Basket)
  {
    tanggal: '09-Okt-2026',
    waktuAbsen: '07:31',
    kelas: 'Kelas IX C',
    mapelKe: 1,
    kodeGuru: 'AR',
    statusKehadiran: 'Hadir',
    mataPelajaran: 'PJOK',
    kegiatanPembelajaran: 'Kebugaran Jasmani',
    pengganti: 'N',
    infoKetidakhadiran: '-',
    ruangBelajar: 'Lapangan Basket',
    idKiriman: '09102026IXC1AR',
    startPeriod: 1,
    endPeriod: 3,
    spanJP: 3,
    periods: [1, 2, 3],
  },
  // IX-C (Jam 4-5 DZ B. Inggris - Belum Absen / Kelas Kosong di jam sekarang) -> MERAH
];

export const RAW_SAMPLE_ATTENDANCE = DEFAULT_ATTENDANCE_LOGS;

// 7. JADWAL PERIODE (Senin-Kamis 9 JP & Jumat 5 JP)
export const PERIOD_SCHEDULES_REGULAR: PeriodSchedule[] = [
  { period: 1, label: 'Jam 1', startTime: '07:00', endTime: '07:40' },
  { period: 2, label: 'Jam 2', startTime: '07:40', endTime: '08:20' },
  { period: 3, label: 'Jam 3', startTime: '08:20', endTime: '09:00' },
  { period: 4, label: 'Jam 4', startTime: '09:00', endTime: '09:40' },
  { period: 5, label: 'Jam 5', startTime: '10:00', endTime: '10:40' },
  { period: 6, label: 'Jam 6', startTime: '10:40', endTime: '11:20' },
  { period: 7, label: 'Jam 7', startTime: '11:20', endTime: '12:00' },
  { period: 8, label: 'Jam 8', startTime: '12:40', endTime: '13:20' },
  { period: 9, label: 'Jam 9', startTime: '13:20', endTime: '14:00' },
];

export const PERIOD_SCHEDULES_FRIDAY: PeriodSchedule[] = [
  { period: 1, label: 'Jam 1', startTime: '07:30', endTime: '08:05' },
  { period: 2, label: 'Jam 2', startTime: '08:05', endTime: '08:40' },
  { period: 3, label: 'Jam 3', startTime: '08:40', endTime: '09:15' },
  { period: 4, label: 'Jam 4', startTime: '10:05', endTime: '10:40' },
  { period: 5, label: 'Jam 5', startTime: '10:40', endTime: '11:15' },
];

export const PERIOD_SCHEDULES = PERIOD_SCHEDULES_REGULAR;

export function parseDateFromString(dateStr: string): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  const idMonthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
    jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nop: 10, nov: 10, des: 11, dec: 11
  };

  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    } else {
      const d = parseInt(parts[0], 10);
      const mStr = parts[1].toLowerCase().slice(0, 3);
      const y = parseInt(parts[2], 10);
      const m = idMonthMap[mStr] !== undefined ? idMonthMap[mStr] : (parseInt(parts[1], 10) - 1 || 0);
      return new Date(y, m, d);
    }
  }

  const parsed = new Date(clean);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function getDayType(dateStr: string): DayType {
  const d = parseDateFromString(dateStr);
  if (!d) return 'friday';

  const dayOfWeek = d.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'weekend';
  }
  if (dayOfWeek === 5) {
    return 'friday';
  }
  return 'regular';
}

export function getScheduleForDate(dateStr: string): PeriodSchedule[] {
  const dayType = getDayType(dateStr);
  if (dayType === 'friday') {
    return PERIOD_SCHEDULES_FRIDAY;
  }
  return PERIOD_SCHEDULES_REGULAR;
}

export function getDayLabel(dateStr: string): { label: string; jpCount: number; isWeekend: boolean } {
  const dayType = getDayType(dateStr);
  if (dayType === 'weekend') {
    return { label: 'Akhir Pekan (Libur KBM)', jpCount: 0, isWeekend: true };
  }
  if (dayType === 'friday') {
    return { label: 'Jumat (Khusus 5 JP)', jpCount: 5, isWeekend: false };
  }
  return { label: 'Senin - Kamis (Reguler 9 JP)', jpCount: 9, isWeekend: false };
}
