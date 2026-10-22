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
 * SISTEM TAPAK LIVE MONITORING (ALL-IN-ONE 9 SHEET API)
 * =========================================================================
 * Mode: 100% READ-ONLY (Membaca 9 Sheet Sekaligus dalam 1 Respons JSON)
 *
 * 9 Sheet yang dibaca:
 * 1. MasterGuru      -> Kode Guru, Nama Lengkap, NIP
 * 2. MasterMapel     -> Kode Mapel, Nama Mapel
 * 3. Classes         -> Token QR, ID Kelas, Nama Kelas, Lokasi Ruang
 * 4. MasterRuangan   -> Token QR, Nama Ruangan, PIN Akses
 * 5. Schedules       -> Hari, Jam Ke, Mapel Ke, Nama Kelas, Jam Mulai, Jam Selesai, Kode Guru, Kode Mapel
 * 6. AttendanceLogs  -> Tanggal, Waktu Absen (WIB), Kelas, Mapel Ke, Kode Guru, Status Kehadiran,
 *                       Mata Pelajaran, Kegiatan Pembelajaran, Pengganti (Y/N), Info Ketidakhadiran,
 *                       Ruang Belajar, ID Kiriman
 * 7. MasterLogin     -> Nama, Jabatan, Username, Password, Role
 * 8. HariLibur       -> Tanggal (DD/MM/YYYY), Keterangan
 * 9. PeriodeAkademik -> Mulai Semester (DD/MM/YYYY), Selesai Semester (DD/MM/YYYY), Tahun Ajaran
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

    // 3. Baca 9 Sheet
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
      'Kegiatan Pembelajaran', 'Info Ketidakhadiran', 'Pengganti (Y/N)', 'Sumber Data', 'Penginput Data', 'ID Kiriman'
    ]);
    const masterLogin = readSheetAsObjects(ss, 'MasterLogin', ['Nama', 'Jabatan', 'Username', 'Password', 'Role']);
    const hariLibur = readSheetAsObjects(ss, 'HariLibur', ['Tanggal', 'Keterangan']);
    const periodeAkademik = readSheetAsObjects(ss, 'PeriodeAkademik', [
      'Mulai Semester', 'Selesai Semester', 'Akhir Semester', 'Tahun Ajaran',
      'MulaiSemester', 'SelesaiSemester', 'AkhirSemester', 'TahunAjaran'
    ]);

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
      sumberData: String(r['Sumber Data'] || r['Sumber data'] || '').trim(),
      penginputData: String(r['Penginput Data'] || '').trim(),
      idKiriman: String(r['ID Kiriman'] || '').trim()
    })).filter(l => l.kelas && l.tanggal);

    const normalizedLogin = masterLogin.map(r => ({
      nama: String(r['Nama'] || r['Nama Lengkap'] || '').trim(),
      jabatan: String(r['Jabatan'] || '').trim(),
      username: String(r['Username'] || r['User'] || '').trim(),
      password: String(r['Password'] || r['Sandi'] || '').trim(),
      role: String(r['Role'] || r['Hak Akses'] || 'Admin').trim()
    })).filter(u => u.username && u.password);

    // Normalisasi HariLibur (Format Baku: DD/MM/YYYY)
    const normalizedHariLibur = hariLibur.map(r => ({
      tanggal: formatToDMY(r['Tanggal'] || r['tanggal']),
      keterangan: String(r['Keterangan'] || r['keterangan'] || 'Hari Libur').trim()
    })).filter(h => h.tanggal);

    // Normalisasi PeriodeAkademik (Format Baku: DD/MM/YYYY)
    let normalizedPeriode = {
      mulaiSemester: '01/06/2026',
      selesaiSemester: '20/12/2026',
      akhirSemester: '20/12/2026',
      tahunAjaran: '2026/2027 Ganjil'
    };
    if (periodeAkademik.length > 0) {
      const p = periodeAkademik[0];
      const selesai = formatToDMY(p['Selesai Semester'] || p['SelesaiSemester'] || p['Akhir Semester'] || p['AkhirSemester'] || '20/12/2026');
      normalizedPeriode = {
        mulaiSemester: formatToDMY(p['Mulai Semester'] || p['MulaiSemester'] || '01/06/2026'),
        selesaiSemester: selesai,
        akhirSemester: selesai,
        tahunAjaran: String(p['Tahun Ajaran'] || p['TahunAjaran'] || '2026/2027 Ganjil').trim()
      };
    }

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
        masterLogin: normalizedLogin.length,
        hariLibur: normalizedHariLibur.length,
        hasPeriodeAkademik: Boolean(periodeAkademik.length > 0)
      },
      data: {
        masterGuru: normalizedGuru,
        masterMapel: normalizedMapel,
        classes: normalizedClasses,
        masterRuangan: normalizedRuangan,
        schedules: normalizedSchedules,
        attendanceLogs: normalizedLogs,
        masterLogin: normalizedLogin,
        hariLibur: normalizedHariLibur,
        periodeAkademik: normalizedPeriode
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
 * =========================================================================
 * FUNGSI DUKUNGAN PENYIMPANAN DATA (POST HTTP / WRITER API)
 * =========================================================================
 * Menangani pengiriman data presensi (agenda piket & presensi mandiri)
 * ke tab sheet AttendanceLogs dengan skema 17 kolom standar.
 */
function doPost(e) {
  try {
    var contents = e && e.postData && e.postData.contents ? e.postData.contents : null;
    if (!contents) {
      return createJsonResponse({
        status: 'error',
        success: false,
        message: "Payload POST kosong."
      });
    }

    var payload = JSON.parse(contents);
    var action = payload.action || 'saveAttendanceLog';

    if (action === 'saveAttendanceLog' || action === 'savePiketLog') {
      return handleSaveAttendanceLog(payload);
    }

    return createJsonResponse({
      status: 'error',
      success: false,
      message: "Aksi '" + action + "' tidak dikenali."
    });

  } catch (err) {
    return createJsonResponse({
      status: 'error',
      success: false,
      message: "Gagal memproses request POST: " + err.toString()
    });
  }
}

function handleSaveAttendanceLog(payload) {
  // 1. Validasi Keberadaan Spreadsheet ID
  if (!SPREADSHEET_ID || SPREADSHEET_ID.trim() === "" || SPREADSHEET_ID.includes("MASUKKAN_ID_SPREADSHEET")) {
    return createJsonResponse({
      status: "error",
      success: false,
      message: "SPREADSHEET_ID belum dikonfigurasi di file Code.gs."
    });
  }

  var ss;
  try {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  } catch (err) {
    return createJsonResponse({
      status: "error",
      success: false,
      message: 'Gagal membuka Google Spreadsheet ID "' + SPREADSHEET_ID.trim() + '": ' + err.toString()
    });
  }

  var sheet = ss.getSheetByName('AttendanceLogs') || ss.getSheetByName('attendancelogs') || ss.getSheetByName('Attendance Logs');

  // Jika sheet AttendanceLogs / attendancelogs tidak ditemukan, kembalikan error
  if (!sheet) {
    return createJsonResponse({
      status: 'error',
      success: false,
      message: "Tab sheet 'AttendanceLogs' (atau 'attendancelogs') tidak ditemukan pada Google Spreadsheet."
    });
  }

  var logData = payload.log || payload.logData || payload;
  var idKiriman = String(logData['ID Kiriman'] || logData.idKiriman || '').trim();

  if (!idKiriman) {
    return createJsonResponse({
      status: 'error',
      success: false,
      message: "ID Kiriman wajib diisi."
    });
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

  return createJsonResponse({
    status: 'success',
    success: true,
    message: "Data presensi berhasil " + (actionDone === 'updated' ? 'diperbarui' : 'ditambahkan') + " pada sheet " + sheet.getName(),
    action: actionDone,
    idKiriman: idKiriman,
    timestamp: new Date().toISOString()
  });
}

/**
 * Helper memformat tanggal ke DD/MM/YYYY baku
 */
function formatToDMY(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
  const str = String(val).trim();
  // Jika format DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const d = ('0' + dmyMatch[1]).slice(-2);
    const m = ('0' + dmyMatch[2]).slice(-2);
    return d + '/' + m + '/' + dmyMatch[3];
  }
  // Jika format YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const d = ('0' + ymdMatch[3]).slice(-2);
    const m = ('0' + ymdMatch[2]).slice(-2);
    return d + '/' + m + '/' + ymdMatch[1];
  }
  return str;
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
        if (header.toLowerCase().includes('tanggal') || header.toLowerCase().includes('semester')) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "dd/MM/yyyy");
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
 * Helper mengubah berbagai format tanggal ke objek Date JavaScript
 */
function parseDMYToDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  const str = String(val).trim();
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    return new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10), 12, 0, 0);
  }
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    return new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10), 12, 0, 0);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * =========================================================================
 * FUNGSI HITUNG HARI EFEKTIF KBM (SMART CALENDAR LOGIC)
 * =========================================================================
 * - Otomatis mengecualikan hari Sabtu (6) dan Minggu (0) -> 5 hari sekolah (Senin - Jumat)
 * - Otomatis memotong tanggal merah yang tercatat di sheet HariLibur
 * - Otomatis membatasi rentang dalam batas Mulai Semester dan Selesai Semester
 * - Format input & output tanggal: DD/MM/YYYY baku
 *
 * @param {string|Date} mulai - Tanggal mulai evaluasi (DD/MM/YYYY atau Date)
 * @param {string|Date} akhir - Tanggal akhir evaluasi (DD/MM/YYYY atau Date)
 * @param {Array<Object>} libur - Array dari sheet HariLibur: [{tanggal: "17/08/2026", keterangan: "..."}]
 * @param {Object} [periode] - Objek dari sheet PeriodeAkademik: {mulaiSemester, selesaiSemester}
 * @returns {Object} Rincian lengkap hari efektif KBM
 */
function hitungHariEfektif(mulai, akhir, libur, periode) {
  let startDate = parseDMYToDate(mulai);
  let endDate = parseDMYToDate(akhir);
  const holidayList = Array.isArray(libur) ? libur : [];

  // Batasi dengan PeriodeAkademik jika ada
  if (periode) {
    const pStart = parseDMYToDate(periode.mulaiSemester);
    const pEnd = parseDMYToDate(periode.selesaiSemester || periode.akhirSemester);
    if (pStart && startDate && startDate < pStart) startDate = pStart;
    if (pEnd && endDate && endDate > pEnd) endDate = pEnd;
  }

  if (!startDate || !endDate || startDate > endDate) {
    return {
      hariEfektif: 0,
      totalHariKalender: 0,
      hariSabtuMinggu: 0,
      hariLiburNasional: 0,
      daftarTanggalLibur: [],
      daftarTanggalEfektif: [],
      rentangDigunakan: {
        mulai: startDate ? formatToDMY(startDate) : '',
        akhir: endDate ? formatToDMY(endDate) : ''
      }
    };
  }

  let totalHariKalender = 0;
  let hariSabtuMinggu = 0;
  let hariLiburNasional = 0;
  let hariEfektif = 0;
  const daftarTanggalLibur = [];
  const daftarTanggalEfektif = [];

  // Map pencarian libur cepat
  const holidayMap = {};
  holidayList.forEach(function(item) {
    const key = formatToDMY(item.tanggal || item.Tanggal);
    if (key) {
      holidayMap[key] = item.keterangan || item.Keterangan || "Hari Libur Nasional / Cuti Bersama";
    }
  });

  const curr = new Date(startDate.getTime());
  while (curr <= endDate) {
    totalHariKalender++;
    const dayOfWeek = curr.getDay(); // 0 = Minggu, 6 = Sabtu
    const dmyStr = formatToDMY(curr);

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      hariSabtuMinggu++;
    } else {
      if (holidayMap[dmyStr]) {
        hariLiburNasional++;
        daftarTanggalLibur.push({
          tanggal: dmyStr,
          keterangan: holidayMap[dmyStr]
        });
      } else {
        hariEfektif++;
        daftarTanggalEfektif.push(dmyStr);
      }
    }

    curr.setDate(curr.getDate() + 1);
  }

  return {
    hariEfektif: hariEfektif,
    totalHariKalender: totalHariKalender,
    hariSabtuMinggu: hariSabtuMinggu,
    hariLiburNasional: hariLiburNasional,
    daftarTanggalLibur: daftarTanggalLibur,
    daftarTanggalEfektif: daftarTanggalEfektif,
    rentangDigunakan: {
      mulai: formatToDMY(startDate),
      akhir: formatToDMY(endDate)
    }
  };
}

/**
 * =========================================================================
 * FUNGSI UJI COBA KONEKSI LANGSUNG (TEST RUN)
 * =========================================================================
 * Jalankan fungsi ini langsung dari editor script.google.com untuk:
 * 1. Memberikan otorisasi izin akses Google Drive/Spreadsheet
 * 2. Memverifikasi apakah SPREADSHEET_ID Anda sudah benar dan dapat dibaca
 * 3. Memverifikasi logika hitungHariEfektif dengan sheet HariLibur & PeriodeAkademik
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

    const requiredSheets = ['MasterGuru', 'MasterMapel', 'Classes', 'MasterRuangan', 'Schedules', 'AttendanceLogs', 'MasterLogin', 'HariLibur', 'PeriodeAkademik'];
    let foundCount = 0;
    requiredSheets.forEach(name => {
      if (allSheets.includes(name)) {
        foundCount++;
        Logger.log("  [✓] Sheet '" + name + "' ditemukan.");
      } else {
        Logger.log("  [!] Sheet '" + name + "' belum ada (akan menggunakan default sistem jika belum dibuat).");
      }
    });

    Logger.log("Hasil: " + foundCount + " dari " + requiredSheets.length + " sheet terdeteksi.");

    // Uji coba hitungHariEfektif
    const rawHolidays = readSheetAsObjects(ss, 'HariLibur', ['Tanggal', 'Keterangan']);
    const rawPeriode = readSheetAsObjects(ss, 'PeriodeAkademik', ['Mulai Semester', 'Selesai Semester', 'Akhir Semester']);
    const testHolidays = rawHolidays.map(r => ({
      tanggal: formatToDMY(r['Tanggal'] || r['tanggal']),
      keterangan: r['Keterangan'] || r['keterangan'] || 'Hari Libur'
    })).filter(h => h.tanggal);
    const testPeriode = rawPeriode.length > 0 ? {
      mulaiSemester: formatToDMY(rawPeriode[0]['Mulai Semester'] || rawPeriode[0]['MulaiSemester'] || '01/06/2026'),
      selesaiSemester: formatToDMY(rawPeriode[0]['Selesai Semester'] || rawPeriode[0]['SelesaiSemester'] || rawPeriode[0]['Akhir Semester'] || '20/12/2026')
    } : { mulaiSemester: '01/06/2026', selesaiSemester: '20/12/2026' };

    const sampleCalc = hitungHariEfektif("01/08/2026", "31/08/2026", testHolidays, testPeriode);
    Logger.log("--- Uji Coba hitungHariEfektif (Agustus 2026) ---");
    Logger.log("Rentang: " + sampleCalc.rentangDigunakan.mulai + " s/d " + sampleCalc.rentangDigunakan.akhir);
    Logger.log("Total Hari Kalender: " + sampleCalc.totalHariKalender);
    Logger.log("Sabtu & Minggu (Dibuang): " + sampleCalc.hariSabtuMinggu);
    Logger.log("Libur Nasional di Hari Kerja: " + sampleCalc.hariLiburNasional);
    Logger.log("Hari Efektif KBM Aktif: " + sampleCalc.hariEfektif);

    Logger.log("🎉 Pengujian selesai! Siap di-deploy via: Deploy > New deployment > Web app.");

  } catch (err) {
    Logger.log("❌ GAGAL: Terjadi kesalahan saat membaca spreadsheet: " + err.toString());
  }
}
