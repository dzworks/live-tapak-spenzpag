/**
 * Konfigurasi Terpusat Aplikasi Live Monitoring Presensi
 */

export const CONFIG = {
  // URL Web App Google Apps Script bawaan proyek (terhubung langsung ke spreadsheet backend)
  APPS_SCRIPT_URL: import.meta.env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwXprXHiRJjCCUi743dMmgqYjfYjaJjcJnh1MfudAYq6bCaCLGwKheu-IMS8i6wXZxY/exec',
  
  // Interval otomatis sinkronisasi ke spreadsheet dalam detik (default: 60 detik)
  AUTO_REFRESH_INTERVAL: 60,

  // Nama Sekolah & Branding
  APP_NAME: 'GuruLive Monitor',
  SCHOOL_NAME: 'Monitoring Presensi KBM 23 Kelas',
};
