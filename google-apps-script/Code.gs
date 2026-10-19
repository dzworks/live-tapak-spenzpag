/**
 * =========================================================================
 * KONFIGURASI ID SPREADSHEET (STANDALONE GOOGLE APPS SCRIPT)
 * =========================================================================
 * Skrip ini bersifat MANDIRI (Standalone), dibuat di https://script.google.com
 * dan TIDAK PERLU menempel pada file spreadsheet.
 *
 * CARA MENDAPATKAN ID SPREADSHEET:
 * 1. Buka spreadsheet database TAPAK Anda di browser.
 * 2. Lihat URL di address bar browser, polanya:
 *    https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * 3. Salin teks acak yang berada di antara "/d/" dan "/edit".
 *    Pada contoh di atas, ID Spreadsheet adalah:
 *    1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
 * 4. Tempelkan ID tersebut menggantikan teks di bawah ini:
 */
const SPREADSHEET_ID = "1a15izDig_qjKEjEEIlv6DbzqxGaDwZDogkzuw6bDSfM";

/**
 * =========================================================================
 * SISTEM TAPAK LIVE MONITORING (ALL-IN-ONE 7 SHEET API)
 * =========================================================================
 * Mode: 100% READ-ONLY (Membaca 7 Sheet Sekaligus dalam 1 Respons JSON)
 *
 * 7 Sheet yang dibaca:
 * 1. MasterGuru     -> Kode Guru, Nama Lengkap, NIP
 * 2. MasterMapel    -> Kode Mapel, Nama Mapel
 * 3. Classes        -> Token QR, ID Kelas, Nama Kelas, Lokasi Ruang
 * 4. MasterRuangan  -> Token QR, Nama Ruangan, PIN Akses
 * 5. Schedules      -> Hari, Jam Ke, Mapel Ke, Nama Kelas, Jam Mulai, Jam Selesai, Kode Guru, Kode Mapel
 * 6. AttendanceLogs -> Tanggal, Waktu Absen (WIB), Kelas, Mapel Ke, Kode Guru, Status Kehadiran,
 *                      Mata Pelajaran, Kegiatan Pembelajaran, Pengganti (Y/N), Info Ketidakhadiran,
 *                      Ruang Belajar, ID Kiriman
 * 7. MasterLogin    -> Nama, Jabatan, Username, Password, Role
 */

function doGet(e) {
  try {
    // 1. Validasi Keberadaan Spreadsheet ID
    if (!SPREADSHEET_ID || SPREADSHEET_ID.trim() === "" || SPREADSHEET_ID.includes("MASUKKAN_ID_SPREADSHEET")) {
      return createJsonResponse({
        status: "error",
        success: false,
        message: "SPREADSHEET_ID belum dikonfigurasi di file Code.gs. Silakan buka script.google.com dan tempelkan ID Spreadsheet Anda pada konstanta SPREADSHEET_ID di baris paling atas."
      });
    }

    // 2. Buka Spreadsheet Mandiri berdasarkan ID
    let ss;
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (err) {
      return createJsonResponse({
        status: "error",
        success: false,
        message: 'Gagal membuka Google Spreadsheet dengan ID "' + SPREADSHEET_ID.trim() + '". Pastikan: 1) ID Spreadsheet sudah benar, 2) Akun Google Anda memiliki akses minimal Lihat/Editor ke file spreadsheet tersebut. Error detail: ' + err.toString()
      });
    }

    // 3. Baca 7 Sheet
    const masterGuru = readSheetAsObjects(ss, 'MasterGuru', ['Kode Guru', 'Nama Lengkap', 'NIP']);
    const masterMapel = readSheetAsObjects(ss, 'MasterMapel', ['Kode Mapel', 'Nama Mapel']);
    const classes = readSheetAsObjects(ss, 'Classes', ['Token QR', 'ID Kelas', 'Nama Kelas', 'Lokasi Ruang']);
    const masterRuangan = readSheetAsObjects(ss, 'MasterRuangan', ['Token QR', 'Nama Ruangan', 'PIN Akses']);
    const schedules = readSheetAsObjects(ss, 'Schedules', [
      'Hari', 'Jam Ke', 'Mapel Ke', 'Nama Kelas', 'Jam Mulai', 'Jam Selesai', 'Kode Guru', 'Kode Mapel'
    ]);
    const attendanceLogs = readSheetAsObjects(ss, 'AttendanceLogs', [
      'Tanggal', 'Waktu Absen (WIB)', 'Kelas', 'Mapel Ke', 'Kode Guru', 'Mata Pelajaran',
      'Status Kehadiran', 'Jam Ke', 'Jam Mulai', 'Jam Selesai', 'Ruang Belajar',
      'Kegiatan Pembelajaran', 'Info Ketidakhadiran', 'Pengganti (Y/N)', 'Sumber Data', 'ID Kiriman'
    ]);
    const masterLogin = readSheetAsObjects(ss, 'MasterLogin', ['Nama', 'Jabatan', 'Username', 'Password', 'Role']);

    // 4. Normalisasi Data
    const normalizedGuru = masterGuru.map(r => ({
      kodeGuru: String(r['Kode Guru'] || '').trim(),
      namaLengkap: String(r['Nama Lengkap'] || '').trim(),
      nip: String(r['NIP'] || '').trim()
    })).filter(g => g.kodeGuru);

    const normalizedMapel = masterMapel.map(r => ({
      kodeMapel: String(r['Kode Mapel'] || '').trim(),
      namaMapel: String(r['Nama Mapel'] || '').trim()
    })).filter(m => m.kodeMapel);

    const normalizedClasses = classes.map(r => ({
      tokenQr: String(r['Token QR'] || '').trim(),
      idKelas: String(r['ID Kelas'] || '').trim(),
      namaKelas: String(r['Nama Kelas'] || '').trim(),
      lokasiRuang: String(r['Lokasi Ruang'] || '').trim()
    })).filter(c => c.namaKelas);

    const normalizedRuangan = masterRuangan.map(r => ({
      tokenQr: String(r['Token QR'] || '').trim(),
      namaRuangan: String(r['Nama Ruangan'] || '').trim(),
      pinAkses: String(r['PIN Akses'] || '').trim()
    })).filter(room => room.namaRuangan);

    const normalizedSchedules = schedules.map(r => ({
      hari: String(r['Hari'] || '').trim(),
      jamKe: String(r['Jam Ke'] || '').trim(),
      mapelKe: Number(r['Mapel Ke']) || 1,
      namaKelas: String(r['Nama Kelas'] || '').trim(),
      jamMulai: String(r['Jam Mulai'] || '').trim(),
      jamSelesai: String(r['Jam Selesai'] || '').trim(),
      kodeGuru: String(r['Kode Guru'] || '').trim(),
      kodeMapel: String(r['Kode Mapel'] || '').trim()
    })).filter(s => s.namaKelas && s.hari);

    const normalizedLogs = attendanceLogs.map(r => ({
      tanggal: String(r['Tanggal'] || '').trim(),
      waktuAbsen: String(r['Waktu Absen (WIB)'] || r['Waktu Absen'] || '').trim(),
      kelas: String(r['Kelas'] || '').trim(),
      mapelKe: Number(r['Mapel Ke']) || 1,
      kodeGuru: String(r['Kode Guru'] || '').trim(),
      statusKehadiran: String(r['Status Kehadiran'] || 'Hadir').trim(),
      mataPelajaran: String(r['Mata Pelajaran'] || '').trim(),
      jamKe: String(r['Jam Ke'] || r['jam_ke'] || '').trim(),
      jamMulai: String(r['Jam Mulai'] || '').trim(),
      jamSelesai: String(r['Jam Selesai'] || '').trim(),
      ruangBelajar: String(r['Ruang Belajar'] || '').trim(),
      kegiatanPembelajaran: String(r['Kegiatan Pembelajaran'] || '').trim(),
      infoKetidakhadiran: String(r['Info Ketidakhadiran'] || '').trim(),
      pengganti: String(r['Pengganti (Y/N)'] || 'N').trim().toUpperCase(),
      sumberData: String(r['Sumber Data'] || '').trim(),
      idKiriman: String(r['ID Kiriman'] || '').trim()
    })).filter(l => l.kelas && l.tanggal);

    const normalizedLogin = masterLogin.map(r => ({
      nama: String(r['Nama'] || r['Nama Lengkap'] || '').trim(),
      jabatan: String(r['Jabatan'] || '').trim(),
      username: String(r['Username'] || r['User'] || '').trim(),
      password: String(r['Password'] || r['Sandi'] || '').trim(),
      role: String(r['Role'] || r['Hak Akses'] || 'Admin').trim()
    })).filter(u => u.username && u.password);

    // 5. Kembalikan Respons JSON Sukses
    return createJsonResponse({
      status: 'success',
      success: true,
      source: 'standalone_apps_script',
      spreadsheetId: SPREADSHEET_ID.trim(),
      spreadsheetName: ss.getName(),
      timestamp: new Date().toISOString(),
      counts: {
        masterGuru: normalizedGuru.length,
        masterMapel: normalizedMapel.length,
        classes: normalizedClasses.length,
        masterRuangan: normalizedRuangan.length,
        schedules: normalizedSchedules.length,
        attendanceLogs: normalizedLogs.length,
        masterLogin: normalizedLogin.length
      },
      data: {
        masterGuru: normalizedGuru,
        masterMapel: normalizedMapel,
        classes: normalizedClasses,
        masterRuangan: normalizedRuangan,
        schedules: normalizedSchedules,
        attendanceLogs: normalizedLogs,
        masterLogin: normalizedLogin
      }
    });

  } catch (err) {
    return createJsonResponse({
      status: 'error',
      success: false,
      message: 'Terjadi kesalahan sistem Apps Script: ' + err.toString()
    });
  }
}

/**
 * Helper membaca sheet menjadi array objek berdasarkan nama header
 */
function readSheetAsObjects(ss, sheetName, expectedHeaders) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const rawHeaders = values[0].map(h => String(h).trim());
  const rows = values.slice(1);

  return rows.map(row => {
    const obj = {};
    rawHeaders.forEach((header, colIdx) => {
      let val = row[colIdx];
      if (val instanceof Date) {
        if (header.toLowerCase().includes('tanggal')) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "dd-MMM-yyyy");
        } else {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
        }
      }
      obj[header] = val;
    });
    return obj;
  });
}

/**
 * Helper pembungkus JSON TextOutput
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * =========================================================================
 * FUNGSI UJI COBA KONEKSI LANGSUNG (TEST RUN)
 * =========================================================================
 * Jalankan fungsi ini langsung dari editor script.google.com untuk:
 * 1. Memberikan otorisasi izin akses Google Drive/Spreadsheet
 * 2. Memverifikasi apakah SPREADSHEET_ID Anda sudah benar dan dapat dibaca
 */
function testStandaloneConnection() {
  Logger.log("=== MEMULAI PENGUJIAN APPS SCRIPT MANDIRI TAPAK ===");
  Logger.log("Target SPREADSHEET_ID: " + SPREADSHEET_ID);

  if (!SPREADSHEET_ID || SPREADSHEET_ID.trim() === "" || SPREADSHEET_ID.includes("MASUKKAN_ID_SPREADSHEET")) {
    Logger.log("❌ ERROR: SPREADSHEET_ID belum diganti! Silakan masukkan ID Spreadsheet Anda di baris teratas.");
    return;
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    Logger.log("✅ SUKSES: Terhubung ke Spreadsheet: '" + ss.getName() + "'");

    const allSheets = ss.getSheets().map(s => s.getName());
    Logger.log("Daftar Sheet yang ada: " + allSheets.join(", "));

    const requiredSheets = ['MasterGuru', 'MasterMapel', 'Classes', 'MasterRuangan', 'Schedules', 'AttendanceLogs', 'MasterLogin'];
    let foundCount = 0;
    requiredSheets.forEach(name => {
      if (allSheets.includes(name)) {
        foundCount++;
        const sh = ss.getSheetByName(name);
        Logger.log("  [✓] Sheet '" + name + "': " + sh.getLastRow() + " baris data.");
      } else {
        Logger.log("  [!] PERINGATAN: Sheet '" + name + "' tidak ditemukan.");
      }
    });

    Logger.log("Status: " + foundCount + " dari " + requiredSheets.length + " sheet ditemukan.");
    Logger.log("=== PENGUJIAN SELESAI DENGAN SUKSES ===");
  } catch (err) {
    Logger.log("❌ GAGAL: Terjadi error saat membuka spreadsheet: " + err.toString());
  }
}
