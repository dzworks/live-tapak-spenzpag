/**
 * Konfigurasi Terpusat Aplikasi Live Monitoring Presensi
 */

export const CONFIG = {
  // URL Web App Google Apps Script (Diatur via file .env atau langsung di sini)
  APPS_SCRIPT_URL: import.meta.env.VITE_APPS_SCRIPT_URL || '',
  
  // Interval otomatis sinkronisasi ke spreadsheet dalam detik (default: 60 detik)
  AUTO_REFRESH_INTERVAL: 60,

  // Nama Sekolah & Branding
  APP_NAME: 'GuruLive Monitor',
  SCHOOL_NAME: 'Monitoring Presensi KBM 23 Kelas',
};
