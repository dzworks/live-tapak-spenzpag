/**
 * TAPAK - Backend REST API (Google Apps Script)
 * Versi: Database Normalization + Perizinan + Ruang Khusus + Split Jam + Kode Mapel + Sumber Data
 */

// Menangani permintaan tarik data (GET Request) - Pre-Fetch Jadwal
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'init') {
      const hariIni = e.parameter.hariIni;
      const data = apiInitData(hariIni);
      return createJsonResponse(data);
    }
    
    return createJsonResponse({ status: "error", message: "Aksi GET tidak dikenali." });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.message });
  }
}

// Menangani permintaan simpan data (POST Request) - Simpan Absen & Perizinan
function doPost(e) {
  try {
    if (typeof e === 'undefined' || !e.postData) {
       return createJsonResponse({ status: "error", message: "Tidak ada data payload." });
    }
    
    const req = JSON.parse(e.postData.contents);
    
    if (req.action === 'submit') {
      const result = apiSubmitData(req.payload);
      return createJsonResponse(result);
    }
    
    return createJsonResponse({ status: "error", message: "Aksi POST tidak valid." });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.message });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function apiInitData(hariIni) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("Spreadsheet tidak terhubung.");

    // 1. KAMUS MASTER GURU
    const sheetGuru = ss.getSheetByName("MasterGuru");
    const dictGuru = {};
    if (sheetGuru) {
      const dataGuru = sheetGuru.getDataRange().getValues();
      const headers = dataGuru[0];
      const hKode = headers.indexOf("Kode Guru");
      const hNama = headers.indexOf("Nama Lengkap");
      const hNip = headers.indexOf("NIP");
      
      for(let i = 1; i < dataGuru.length; i++) {
         let kode = headers[hKode] ? dataGuru[i][hKode] : null;
         if (kode) {
            dictGuru[kode.toString().trim()] = {
               nama: hNama !== -1 ? dataGuru[i][hNama] : "-",
               nip: hNip !== -1 ? dataGuru[i][hNip] : "-"
            };
         }
      }
    }

    // 2. KAMUS MASTER MAPEL
    const sheetMapel = ss.getSheetByName("MasterMapel");
    const dictMapel = {};
    if (sheetMapel) {
      const dataMapel = sheetMapel.getDataRange().getValues();
      const headers = dataMapel[0];
      const hKode = headers.indexOf("Kode Mapel");
      const hNama = headers.indexOf("Nama Mapel");
      
      for(let i = 1; i < dataMapel.length; i++) {
         let kode = headers[hKode] ? dataMapel[i][hKode] : null;
         if (kode && hNama !== -1) {
            dictMapel[kode.toString().trim()] = dataMapel[i][hNama];
         }
      }
    }

    // 3. BACA DATA KELAS (QR)
    const sheetClasses = ss.getSheetByName("Classes");
    if (!sheetClasses) throw new Error("Sheet 'Classes' tidak ditemukan.");
    
    const classDataRaw = sheetClasses.getDataRange().getValues();
    const classHeaders = classDataRaw[0];
    
    const hToken = classHeaders.indexOf("Token QR");
    const hIdKelas = classHeaders.indexOf("ID Kelas"); 
    const hNamaKelas = classHeaders.indexOf("Nama Kelas");
    const hRuang = classHeaders.indexOf("Lokasi Ruang");
    
    const dictClasses = {};
    for (let i = 1; i < classDataRaw.length; i++) {
      const row = classDataRaw[i];
      const token = row[hToken];
      if (token && token.toString().trim() !== "") {
        dictClasses[token.toString().trim()] = {
          id_kelas: hIdKelas !== -1 ? row[hIdKelas] : "-", 
          nama_kelas: hNamaKelas !== -1 ? row[hNamaKelas].toString().trim() : "-",
          lokasi_ruang: hRuang !== -1 ? row[hRuang] : "-"
        };
      }
    }

    // 4. BACA MASTER RUANGAN KHUSUS
    const sheetRuangan = ss.getSheetByName("MasterRuangan");
    const dictRuangan = {};
    if (sheetRuangan) {
      const dataRuangan = sheetRuangan.getDataRange().getValues();
      const headers = dataRuangan[0];
      const hTokenR = headers.indexOf("Token QR");
      const hNamaR = headers.indexOf("Nama Ruangan");
      const hPinR = headers.indexOf("PIN Akses");
      
      for(let i = 1; i < dataRuangan.length; i++) {
         let token = headers[hTokenR] ? dataRuangan[i][hTokenR] : null;
         if (token && token.toString().trim() !== "") {
            dictRuangan[token.toString().trim()] = {
               nama_ruangan: hNamaR !== -1 ? dataRuangan[i][hNamaR].toString().trim() : "-",
               pin: hPinR !== -1 ? dataRuangan[i][hPinR].toString().trim() : ""
            };
         }
      }
    }

    // 5. BACA JADWAL (THE JOINER & PARSER)
    const sheetSchedules = ss.getSheetByName("Schedules");
    const dictSchedules = {};
    
    if (sheetSchedules) {
      const schedDataRaw = sheetSchedules.getDataRange().getValues();
      const schedHeaders = schedDataRaw[0];
      
      const sHari = schedHeaders.indexOf("Hari");
      const sJamKe = schedHeaders.indexOf("Jam Ke");
      const sMapelKe = schedHeaders.indexOf("Mapel Ke");
      const sNamaKelas = schedHeaders.indexOf("Nama Kelas");
      const sMulai = schedHeaders.indexOf("Jam Mulai");
      const sSelesai = schedHeaders.indexOf("Jam Selesai");
      const sKodeGuru = schedHeaders.indexOf("Kode Guru");
      const sKodeMapel = schedHeaders.indexOf("Kode Mapel");

      for (let i = 1; i < schedDataRaw.length; i++) {
        const row = schedDataRaw[i];
        
        if (sHari !== -1 && row[sHari].toString().trim() === hariIni) {
          if (sNamaKelas === -1 || !row[sNamaKelas]) continue;
          
          const namaKelasSched = row[sNamaKelas].toString().trim();
          if (!dictSchedules[namaKelasSched]) dictSchedules[namaKelasSched] = [];

          let strMulai = row[sMulai];
          let strSelesai = row[sSelesai];
          if (strMulai instanceof Date) strMulai = Utilities.formatDate(strMulai, "Asia/Jakarta", "HH:mm");
          if (strSelesai instanceof Date) strSelesai = Utilities.formatDate(strSelesai, "Asia/Jakarta", "HH:mm");

          const rawKodeGuru = sKodeGuru !== -1 ? row[sKodeGuru].toString().trim() : "";
          const rawKodeMapel = sKodeMapel !== -1 ? row[sKodeMapel].toString().trim() : "";
          
          const namaGuruMatang = dictGuru[rawKodeGuru] ? dictGuru[rawKodeGuru].nama : (rawKodeGuru || "-");
          const nipMatang = dictGuru[rawKodeGuru] ? dictGuru[rawKodeGuru].nip : "-";
          const namaMapelMatang = dictMapel[rawKodeMapel] ? dictMapel[rawKodeMapel] : (rawKodeMapel || "-");

          const jamKe = sJamKe !== -1 ? row[sJamKe].toString().trim() : "-";
          const mapelKe = sMapelKe !== -1 ? row[sMapelKe].toString().trim() : "-";

          dictSchedules[namaKelasSched].push({
            jam_ke: jamKe,
            mapel_ke: mapelKe,
            jam_mulai: strMulai,
            jam_selesai: strSelesai,
            nama_guru: namaGuruMatang,
            nip: nipMatang,
            mata_pelajaran: namaMapelMatang,
            kode_guru: rawKodeGuru,
            kode_mapel: rawKodeMapel 
          });
        }
      }

      for (const kelas in dictSchedules) {
        dictSchedules[kelas].sort((a, b) => {
          if (!a.jam_mulai || !b.jam_mulai) return 0;
          return a.jam_mulai.localeCompare(b.jam_mulai);
        });
      }
    }

    return { 
        status: "success", 
        data: { 
            classes: dictClasses, 
            schedules: dictSchedules, 
            master_guru: dictGuru, 
            master_mapel: dictMapel,
            master_ruangan: dictRuangan 
        } 
    };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}

function apiSubmitData(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const idKiriman = payload.id_kiriman;
    const dataJadwal = payload.data_jadwal;
    
    const sheetLogs = ss.getSheetByName("AttendanceLogs");
    if (!sheetLogs) throw new Error("Sheet AttendanceLogs belum dibuat.");
    
    const logsDataRaw = sheetLogs.getDataRange().getValues();
    const logsHeaders = logsDataRaw[0];
    
    const waktuSekarang = new Date();
    const bulanIndo = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const tgl = waktuSekarang.getDate().toString().padStart(2, '0');
    const bln = bulanIndo[waktuSekarang.getMonth()];
    const thn = waktuSekarang.getFullYear();
    
    const strTanggal = payload.is_leave ? payload.leave_date_formatted : `${tgl}-${bln}-${thn}`;
    const strWaktu = payload.is_leave ? payload.leave_time : Utilities.formatDate(waktuSekarang, "Asia/Jakarta", "HH:mm");

    const idxLogIdKiriman = logsHeaders.indexOf("ID Kiriman");

    // Mencegah Duplikat
    if (idxLogIdKiriman !== -1) {
      const startIndex = Math.max(1, logsDataRaw.length - 200); 
      for (let i = startIndex; i < logsDataRaw.length; i++) {
        const row = logsDataRaw[i];
        if (row[idxLogIdKiriman] === idKiriman) {
          return {
             status: "error", 
             message: `Presensi ditolak: Anda sudah melakukan presensi/perizinan untuk sesi ini (Kelas ${dataJadwal.nama_kelas}, Mapel Ke-${dataJadwal.mapel_ke}).`
          };
        }
      }
    }

    const newRow = new Array(logsHeaders.length).fill("");

    const setCol = (headerName, value) => {
      const idx = logsHeaders.indexOf(headerName);
      if (idx !== -1) newRow[idx] = value;
    };

    setCol("Tanggal", strTanggal);
    setCol("Waktu Absen (WIB)", strWaktu);
    setCol("Kelas", dataJadwal.nama_kelas);
    setCol("Jam Ke", dataJadwal.jam_ke || "-");
    
    // UPDATE: Paksa Sheet untuk baca string murni (HH:MM) menggunakan petik tunggal
    const wm = dataJadwal.waktu_mulai;
    setCol("Jam Mulai", (wm && wm !== "-") ? `'${wm}` : "-");
    const ws = dataJadwal.waktu_selesai;
    setCol("Jam Selesai", (ws && ws !== "-") ? `'${ws}` : "-");
    
    setCol("Mapel Ke", dataJadwal.mapel_ke);
    setCol("Kode Guru", dataJadwal.kode_guru);
    
    if (payload.is_leave) {
        setCol("Status Kehadiran", payload.leave_type);
        setCol("Kegiatan Pembelajaran", "-");
        setCol("Pengganti (Y/N)", "-");
        setCol("Info Ketidakhadiran", payload.info_ketidakhadiran || "-");
    } else {
        // UPDATE: Status dinamis untuk Guru Pengganti
        if (payload.pengganti && payload.pengganti.toString().startsWith("Y")) {
            setCol("Status Kehadiran", "Pengganti");
        } else {
            setCol("Status Kehadiran", "Hadir");
        }
        setCol("Kegiatan Pembelajaran", payload.kegiatan_pembelajaran);
        // UPDATE: Pengganti Y - Kode Guru
        setCol("Pengganti (Y/N)", payload.pengganti);
        setCol("Info Ketidakhadiran", "-");
    }

    // UPDATE: Mata Pelajaran dikirim sebagai Kode Mapel
    setCol("Mata Pelajaran", dataJadwal.kode_mapel || "-");
    
    setCol("Ruang Belajar", payload.ruang_belajar || "Ruang Kelas");
    setCol("ID Kiriman", idKiriman);
    
    // UPDATE: Menyematkan sumber data presensi
    setCol("Sumber Data", "Input Mandiri");

    sheetLogs.appendRow(newRow); 

    return {
       status: "success", 
       message: "Data tersimpan.",
       data: { waktu_absen: Utilities.formatDate(waktuSekarang, "Asia/Jakarta", "HH:mm") }
    };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}