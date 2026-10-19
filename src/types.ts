export interface MasterGuru {
  kodeGuru: string;
  namaLengkap: string;
  nip: string;
}

export interface MasterMapel {
  kodeMapel: string;
  namaMapel: string;
}

export interface ClassMaster {
  tokenQr: string;
  idKelas: string;
  namaKelas: string;
  lokasiRuang: string;
}

export interface MasterRuangan {
  tokenQr: string;
  namaRuangan: string;
  pinAkses?: string;
}

export interface ScheduleItem {
  hari: string; // 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
  jamKe: string; // e.g. "1-2", "3-4", "1-3", "4"
  mapelKe: number; // e.g. 1, 2, 3
  namaKelas: string; // e.g. "Kelas VII A" or "VII-A"
  jamMulai: string; // e.g. "07:00"
  jamSelesai: string; // e.g. "08:20"
  kodeGuru: string; // e.g. "G-01" / "DZ"
  kodeMapel: string; // e.g. "MP-01" / "ENG"

  // Metadata hasil parsing jam
  startPeriod: number;
  endPeriod: number;
  spanJP: number;
  periods: number[];
}

export interface AttendanceLogItem {
  tanggal: string; // e.g. "09-Okt-2026"
  waktuAbsen: string; // e.g. "07:35"
  kelas: string; // e.g. "Kelas VII A" or "VII-A"
  mapelKe: number; // e.g. 1, 2
  kodeGuru: string; // e.g. "G-01" / "DZ"
  statusKehadiran: 'Hadir' | 'Sakit' | 'Keperluan Pribadi' | 'Dinas Luar' | 'Instruksi Pimpinan' | 'Izin' | string;
  mataPelajaran?: string;
  kegiatanPembelajaran?: string;
  pengganti: 'Y' | 'N';
  infoKetidakhadiran?: string;
  ruangBelajar?: string;
  idKiriman: string;

  // Metadata hasil parsing rentang jam jika ada
  jamKe?: string;
  jamMulai?: string;
  jamSelesai?: string;
  sumberData?: string;
  startPeriod?: number;
  endPeriod?: number;
  spanJP?: number;
  periods?: number[];
  namaPengganti?: string;
  namaGuru?: string;
  nip?: string;
  revisiKe?: number;
  history?: AttendanceLogItem[];
}

export interface MasterLoginAccount {
  nama: string;
  jabatan: string;
  username: string;
  password: string;
  role: string;
}

export interface AdminSession {
  username: string;
  nama: string;
  jabatan: string;
  role: string;
  loginAt: string;
}

// Backward compatibility alias for AttendanceRecord
export type AttendanceRecord = AttendanceLogItem;

export interface TapakDatabaseBundle {
  masterGuru: MasterGuru[];
  masterMapel: MasterMapel[];
  classes: ClassMaster[];
  masterRuangan: MasterRuangan[];
  schedules: ScheduleItem[];
  attendanceLogs: AttendanceLogItem[];
  masterLogin?: MasterLoginAccount[];
  lastUpdated?: string;
}

export type SlotColorStatus = 'green' | 'red' | 'yellow' | 'purple' | 'slate' | 'blue';

export interface ResolvedScheduleSlot {
  schedule: ScheduleItem;
  teacher?: MasterGuru;
  subject?: MasterMapel;
  defaultRoom: string;
  activeRoom: string;
  attendance?: AttendanceLogItem;
  statusColor: SlotColorStatus;
  statusLabel: string;
  isCoveredNow: boolean;
}

export interface PeriodSchedule {
  period: number;
  label: string;
  startTime: string; // "07:00"
  endTime: string; // "07:40"
  isBreak?: boolean;
}

export interface SchoolClass {
  id: string;
  grade: 'VII' | 'VIII' | 'IX' | 'X' | 'XI' | 'XII';
  name: string; // "VII-A", "VII-B"
  room: string;
  waliKelas?: string;
}

export interface TeacherInfo {
  kode: string;
  nama: string;
  nip: string;
  mapelUtama: string;
  noHp?: string;
}

export type ViewTab = 'matrix' | 'empty-classes' | 'feed' | 'reports';

export type DayType = 'regular' | 'friday' | 'weekend';
