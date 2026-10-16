/**
 * Utility untuk menghitung posisi penanda waktu (timestamp marker)
 * pada garis waktu rentang jam pelajaran KBM di Matriks Kelas.
 */

export interface SlotTimeMarkerInfo {
  startTime: string;        // contoh: "07:00"
  endTime: string;          // contoh: "09:00"
  absenTime: string;        // contoh: "07:20"
  percentage: number;       // 0 sampai 100 persen (posisi pada garis waktu)
  isEarly: boolean;         // true jika absen sebelum jam mulai
  isLate: boolean;          // true jika absen lebih dari toleransi (misal > 15 menit setelah jam mulai)
  formattedDisplay: string; // contoh: "07:20 WIB"
}

/**
 * Mengubah string waktu "HH:mm" atau "HH.mm" ke menit dari tengah malam (0-1439)
 */
export function timeStringToMinutes(timeStr: string | undefined | null): number | null {
  if (!timeStr) return null;
  const clean = String(timeStr).trim().replace(/[Ww][Ii][Bb]/i, '').trim();
  const match = clean.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;

  return hours * 60 + minutes;
}

/**
 * Format string waktu ke standar "HH:mm WIB"
 */
export function formatDisplayTime(timeStr: string | undefined | null): string {
  if (!timeStr) return '';
  const clean = String(timeStr).trim().replace(/[Ww][Ii][Bb]/i, '').trim();
  const match = clean.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return clean;

  const h = match[1].padStart(2, '0');
  const m = match[2];
  return `${h}:${m} WIB`;
}

/**
 * Ekstrak jam dan menit bersih saja "HH:mm"
 */
export function extractCleanTime(timeStr: string | undefined | null): string {
  if (!timeStr) return '';
  const clean = String(timeStr).trim().replace(/[Ww][Ii][Bb]/i, '').trim();
  const match = clean.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return clean;

  const h = match[1].padStart(2, '0');
  const m = match[2];
  return `${h}:${m}`;
}

/**
 * Menghitung posisi persentase penanda waktu absen pada garis waktu rentang jam slot
 * 
 * Contoh:
 * - Jam KBM: 07:00 s/d 09:00 (durasi 120 menit)
 * - Waktu Absen: 07:20 (20 menit dari awal)
 * - Persentase: (20 / 120) * 100 = 16.67%
 */
export function calculateSlotTimeMarker(
  rawStartTime: string | undefined,
  rawEndTime: string | undefined,
  rawAbsenTime: string | undefined | null
): SlotTimeMarkerInfo | null {
  if (!rawAbsenTime) return null;

  const absenMinutes = timeStringToMinutes(rawAbsenTime);
  if (absenMinutes === null) return null;

  // Fallback default waktu jika kosong: misal 07:00 s/d 08:20
  const startMinutes = timeStringToMinutes(rawStartTime) ?? 420; // 07:00
  const endMinutes = timeStringToMinutes(rawEndTime) ?? (startMinutes + 80); // +80 menit

  const totalDuration = Math.max(1, endMinutes - startMinutes);
  const elapsedFromStart = absenMinutes - startMinutes;

  let rawPercentage = (elapsedFromStart / totalDuration) * 100;
  const isEarly = elapsedFromStart < 0;
  const isLate = elapsedFromStart > 15; // terlambat lebih dari 15 menit dari jam mulai

  // Batasi persentase antara 3% dan 97% agar pin/dot tidak terpotong di tepi kartu
  const percentage = Math.min(Math.max(3, rawPercentage), 97);

  const cleanAbsen = extractCleanTime(rawAbsenTime);
  const cleanStart = extractCleanTime(rawStartTime) || '07:00';
  const cleanEnd = extractCleanTime(rawEndTime) || '08:20';

  return {
    startTime: cleanStart,
    endTime: cleanEnd,
    absenTime: cleanAbsen,
    percentage,
    isEarly,
    isLate,
    formattedDisplay: `${cleanAbsen} WIB`,
  };
}
