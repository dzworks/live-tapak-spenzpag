/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  MasterGuru, 
  MasterMapel, 
  ClassMaster, 
  MasterRuangan, 
  ScheduleItem, 
  AttendanceLogItem, 
  ResolvedScheduleSlot, 
  ViewTab,
  MasterLoginAccount,
  AdminSession,
  HariLiburItem,
  PeriodeAkademik
} from './types';
import { CONFIG } from './config';
import { 
  DEFAULT_MASTER_GURU,
  DEFAULT_MASTER_MAPEL,
  DEFAULT_CLASSES,
  DEFAULT_MASTER_RUANGAN,
  DEFAULT_SCHEDULES,
  DEFAULT_ATTENDANCE_LOGS,
  DEFAULT_MASTER_LOGIN,
  DEFAULT_HARI_LIBUR,
  DEFAULT_PERIODE_AKADEMIK,
  getScheduleForDate, 
  getDayLabel, 
  getDayType 
} from './data/initialData';
import { 
  processTapakBundle, 
  getCurrentPeriodInfo,
  getDayNameIndonesian,
  normalizeClassName,
  isSameDate,
  getTodayWIBDisplayDate,
  formatToIndonesianDisplayDate,
  canonicalDateKey
} from './utils/appsScriptCode';
import { formatLogForSheetPayload } from './utils/piketLogUtils';
import { TopNav } from './components/TopNav';
import { UnconfirmedClassesSection } from './components/UnconfirmedClassesSection';
import { ExecutiveInfographic } from './components/ExecutiveInfographic';
import { ClassroomMatrix } from './components/ClassroomMatrix';
import { EmptyClassesView } from './components/EmptyClassesView';
import { AttendanceFeed } from './components/AttendanceFeed';
import { ReportWorkspace } from './components/ReportWorkspace';
import { DetailModal } from './components/DetailModal';
import { AdminUrlModal } from './components/AdminUrlModal';
import { InitialSetupModal } from './components/InitialSetupModal';
import { AttendanceToastContainer, AttendanceAlertToast } from './components/AttendanceToastContainer';
import { AdminPiketAgendaWorkspace } from './components/AdminPiketAgendaWorkspace';
import { 
  Calendar, 
  Info,
  RefreshCw
} from 'lucide-react';

export default function App() {
  // 1. DATA STORE: 6 Sheet Database TAPAK (dengan fallback offline data yang presisi)
  const [masterGuru, setMasterGuru] = useState<MasterGuru[]>(() => {
    const saved = localStorage.getItem('gurulive_tapak_guru_v2');
    return saved ? JSON.parse(saved) : DEFAULT_MASTER_GURU;
  });

  const [masterMapel, setMasterMapel] = useState<MasterMapel[]>(() => {
    const saved = localStorage.getItem('gurulive_tapak_mapel_v2');
    return saved ? JSON.parse(saved) : DEFAULT_MASTER_MAPEL;
  });

  const [classes, setClasses] = useState<ClassMaster[]>(() => {
    const saved = localStorage.getItem('gurulive_tapak_classes_v2');
    return saved ? JSON.parse(saved) : DEFAULT_CLASSES;
  });

  const [masterRuangan, setMasterRuangan] = useState<MasterRuangan[]>(() => {
    const saved = localStorage.getItem('gurulive_tapak_ruangan_v2');
    return saved ? JSON.parse(saved) : DEFAULT_MASTER_RUANGAN;
  });

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem('gurulive_tapak_schedules_v2');
    return saved ? JSON.parse(saved) : DEFAULT_SCHEDULES;
  });

  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogItem[]>(() => {
    const saved = localStorage.getItem('gurulive_tapak_logs_v2');
    return saved ? JSON.parse(saved) : DEFAULT_ATTENDANCE_LOGS;
  });

  // Database Akun MasterLogin dari Google Spreadsheet
  const [masterLogin, setMasterLogin] = useState<MasterLoginAccount[]>(() => {
    try {
      const saved = localStorage.getItem('gurulive_tapak_login_v2');
      return saved ? JSON.parse(saved) : DEFAULT_MASTER_LOGIN;
    } catch {
      return DEFAULT_MASTER_LOGIN;
    }
  });

  // Database HariLibur dari Sheet HariLibur (Format DD/MM/YYYY)
  const [hariLibur, setHariLibur] = useState<HariLiburItem[]>(() => {
    try {
      const saved = localStorage.getItem('gurulive_tapak_harilibur_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Konfigurasi PeriodeAkademik dari Sheet PeriodeAkademik (MulaiSemester s/d AkhirSemester)
  const [periodeAkademik, setPeriodeAkademik] = useState<PeriodeAkademik>(() => {
    try {
      const saved = localStorage.getItem('gurulive_tapak_periodeakademik_v2');
      return saved ? JSON.parse(saved) : DEFAULT_PERIODE_AKADEMIK;
    } catch {
      return DEFAULT_PERIODE_AKADEMIK;
    }
  });

  // Sesi Login Admin Aktif (Persisten di localStorage)
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => {
    try {
      const saved = localStorage.getItem('gurulive_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = useCallback((session: AdminSession) => {
    setAdminSession(session);
    try {
      localStorage.setItem('gurulive_admin_session', JSON.stringify(session));
    } catch {}
  }, []);

  const handleLogout = useCallback(() => {
    setAdminSession(null);
    setCurrentTab(prev => (prev === 'reports' || prev === 'piket' ? 'matrix' : prev));
    try {
      localStorage.removeItem('gurulive_admin_session');
    } catch {}
  }, []);

  // 2. UI State & Density Mode (Ultra-Compact 23 Kelas default)
  const [currentTab, setCurrentTab] = useState<ViewTab>('matrix');
  // Otomatis prioritaskan tanggal hari ini (WIB UTC+7) atau fallback 16-Okt-2026
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = getTodayWIBDisplayDate();
    return today || '16-Okt-2026';
  });
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<'all' | 'VII' | 'VIII' | 'IX'>('all');
  const [isUltraCompact, setIsUltraCompact] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isUnconfirmedExpanded, setIsUnconfirmedExpanded] = useState<boolean>(true);
  const [highlightedClassName, setHighlightedClassName] = useState<string | null>(null);

  // Aksi ketika kartu kelas belum terkonfirmasi diklik: sorot baris kelas di matriks
  const handleSelectUnconfirmedClass = useCallback((className: string) => {
    setCurrentTab('matrix');
    setHighlightedClassName(className);

    // Smooth scroll ke baris kelas di matriks
    setTimeout(() => {
      const el = document.getElementById(`class-row-${normalizeClassName(className)}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);

    // Hilangkan animasi sorot setelah 2.5 detik
    setTimeout(() => {
      setHighlightedClassName(prev => (prev === className ? null : prev));
    }, 2500);
  }, []);

  // Jadwal & Tipe Hari Terpilih
  const currentSchedules = useMemo(() => getScheduleForDate(selectedDate), [selectedDate]);
  const dayType = useMemo(() => getDayType(selectedDate), [selectedDate]);
  const dayInfo = useMemo(() => getDayLabel(selectedDate), [selectedDate]);
  const dayNameIndo = useMemo(() => getDayNameIndonesian(selectedDate), [selectedDate]);
  const isWeekend = dayType === 'weekend';

  // Jam Real-time & Sesi KBM Aktif (100% Otomatis Mengikuti Waktu Nyata WIB)
  const [wibTimeStr, setWibTimeStr] = useState<string>('10:14:00 WIB');
  const [activePeriodNumber, setActivePeriodNumber] = useState<number>(() => {
    return getCurrentPeriodInfo(getScheduleForDate(selectedDate)).activePeriod;
  });

  // Read-Only Detail Modal Slot
  const [selectedSlot, setSelectedSlot] = useState<ResolvedScheduleSlot | null>(null);

  // Integration state (Configured via Server / localStorage / config.ts)
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    return localStorage.getItem('gurulive_apps_script_url') || CONFIG.APPS_SCRIPT_URL || '';
  });
  
  // Pop-up awal muncul HANYA jika di aplikasi belum ada link backend terekam
  // Apabila terekam link backend, isInitialSetupOpen bernilai false (langsung menampilkan dashboard)
  const [isInitialSetupOpen, setIsInitialSetupOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('gurulive_apps_script_url') || CONFIG.APPS_SCRIPT_URL || '';
    return !saved || !saved.trim();
  });

  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Sistem Alert Visual (Toast) & Indikator Perubahan Real-time Presensi
  const [activeToasts, setActiveToasts] = useState<AttendanceAlertToast[]>([]);
  const [recentlyUpdatedClasses, setRecentlyUpdatedClasses] = useState<string[]>([]);
  const prevLogsMapRef = React.useRef<Map<string, string>>(new Map());
  const isInitialSyncDoneRef = React.useRef<boolean>(false);

  const handleDismissToast = useCallback((id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  }, []);


  // Persist ke localStorage saat data berubah
  useEffect(() => {
    localStorage.setItem('gurulive_tapak_guru_v2', JSON.stringify(masterGuru));
    localStorage.setItem('gurulive_tapak_mapel_v2', JSON.stringify(masterMapel));
    localStorage.setItem('gurulive_tapak_classes_v2', JSON.stringify(classes));
    localStorage.setItem('gurulive_tapak_ruangan_v2', JSON.stringify(masterRuangan));
    localStorage.setItem('gurulive_tapak_schedules_v2', JSON.stringify(schedules));
    localStorage.setItem('gurulive_tapak_logs_v2', JSON.stringify(attendanceLogs));
    localStorage.setItem('gurulive_tapak_login_v2', JSON.stringify(masterLogin));
    localStorage.setItem('gurulive_tapak_harilibur_v3', JSON.stringify(hariLibur));
    try { localStorage.removeItem('gurulive_tapak_harilibur_v2'); } catch {}
    localStorage.setItem('gurulive_tapak_periodeakademik_v2', JSON.stringify(periodeAkademik));
  }, [masterGuru, masterMapel, classes, masterRuangan, schedules, attendanceLogs, masterLogin, hariLibur, periodeAkademik]);

  // Live Clock updater: Menghitung waktu WIB dan jam pelajaran KBM aktif setiap detik secara real-time
  useEffect(() => {
    const updateTimeAndPeriod = () => {
      const now = new Date();
      const utcHours = now.getUTCHours();
      const wibHours = (utcHours + 7) % 24;
      const min = String(now.getUTCMinutes()).padStart(2, '0');
      const sec = String(now.getUTCSeconds()).padStart(2, '0');
      setWibTimeStr(`${String(wibHours).padStart(2, '0')}:${min}:${sec} WIB`);

      const info = getCurrentPeriodInfo(currentSchedules);
      setActivePeriodNumber(info.activePeriod);
    };

    updateTimeAndPeriod();
    const timer = setInterval(updateTimeAndPeriod, 1000);
    return () => clearInterval(timer);
  }, [currentSchedules]);

  // Handle Fullscreen Toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Current active period schedule info (startTime, endTime, label)
  const activePeriodScheduleInfo = useMemo(() => {
    return currentSchedules.find(s => s.period === activePeriodNumber) || null;
  }, [currentSchedules, activePeriodNumber]);

  // Fetch bundle 6-Sheet TAPAK dari Apps Script Web App
  const fetchFromAppsScript = useCallback(async (url: string) => {
    if (!url.trim()) return;

    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const response = await fetch(url.trim(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      if (json.status === 'success' && json.data) {
        const bundle = processTapakBundle(json.data);
        
        if (bundle.masterGuru.length > 0) setMasterGuru(bundle.masterGuru);
        if (bundle.masterMapel.length > 0) setMasterMapel(bundle.masterMapel);
        if (bundle.classes.length > 0) setClasses(bundle.classes);
        if (bundle.masterRuangan.length > 0) setMasterRuangan(bundle.masterRuangan);
        if (bundle.schedules.length > 0) setSchedules(bundle.schedules);
        if (bundle.attendanceLogs.length > 0) {
          // Deteksi alert presensi baru secara real-time jika bukan sinkronisasi awal
          if (isInitialSyncDoneRef.current) {
            const newAlerts: AttendanceAlertToast[] = [];
            const updatedClassNames: string[] = [];

            bundle.attendanceLogs.forEach(log => {
              const logKey = `${canonicalDateKey(log.tanggal)}_${normalizeClassName(log.kelas)}_${(log.kodeGuru || '').toLowerCase()}_${log.mapelKe || 1}`;
              const currentHash = `${log.statusKehadiran}_${log.waktuAbsen}_${log.pengganti}_${log.ruangBelajar}`;
              const prevHash = prevLogsMapRef.current.get(logKey);

              // Jika belum pernah ada di sync sebelumnya (presensi baru masuk!) ATAU status berubah
              if (prevHash !== undefined && prevHash !== currentHash) {
                const teacher = (bundle.masterGuru.length > 0 ? bundle.masterGuru : masterGuru)
                  .find(g => g.kodeGuru.toLowerCase() === (log.kodeGuru || '').toLowerCase());
                const subject = (bundle.masterMapel.length > 0 ? bundle.masterMapel : masterMapel)
                  .find(m => m.kodeMapel.toLowerCase() === (log.mataPelajaran || '').toLowerCase());

                newAlerts.push({
                  id: `${logKey}_${Date.now()}_${Math.random()}`,
                  className: log.kelas,
                  teacherName: teacher?.namaLengkap || log.namaGuru || `Guru [${log.kodeGuru}]`,
                  teacherCode: log.kodeGuru,
                  subjectName: log.mataPelajaran || subject?.namaMapel,
                  waktuAbsen: log.waktuAbsen || 'Tercatat',
                  statusKehadiran: log.statusKehadiran || 'Hadir',
                  pengganti: log.pengganti,
                  namaPengganti: log.namaPengganti,
                  timestamp: Date.now(),
                });

                if (log.kelas && !updatedClassNames.includes(log.kelas)) {
                  updatedClassNames.push(log.kelas);
                }
              }
            });

            if (newAlerts.length > 0) {
              setActiveToasts(prev => [...newAlerts.slice(-3), ...prev].slice(0, 5));
              setRecentlyUpdatedClasses(updatedClassNames);

              // Hilangkan efek glowing border pada matriks kelas setelah 8 detik
              setTimeout(() => {
                setRecentlyUpdatedClasses([]);
              }, 8000);
            }
          }

          // Perbarui map hash untuk perbandingan siklus berikutnya
          const nextMap = new Map<string, string>();
          bundle.attendanceLogs.forEach(log => {
            const logKey = `${canonicalDateKey(log.tanggal)}_${normalizeClassName(log.kelas)}_${(log.kodeGuru || '').toLowerCase()}_${log.mapelKe || 1}`;
            const currentHash = `${log.statusKehadiran}_${log.waktuAbsen}_${log.pengganti}_${log.ruangBelajar}`;
            nextMap.set(logKey, currentHash);
          });
          prevLogsMapRef.current = nextMap;
          isInitialSyncDoneRef.current = true;

          setAttendanceLogs(bundle.attendanceLogs);
          // Selalu prioritaskan tanggal hari ini (WIB) saat reload spreadsheet/database
          const todayWIB = getTodayWIBDisplayDate();
          setSelectedDate(todayWIB);

          // Sinkronkan akun MasterLogin dari spreadsheet
          if (bundle.masterLogin && Array.isArray(bundle.masterLogin) && bundle.masterLogin.length > 0) {
            setMasterLogin(bundle.masterLogin);
          }

          // Sinkronkan HariLibur dari spreadsheet (menerima array kosong jika sheet belum diisi)
          if (bundle.hariLibur !== undefined && Array.isArray(bundle.hariLibur)) {
            setHariLibur(bundle.hariLibur);
          }

          // Sinkronkan PeriodeAkademik dari spreadsheet
          if (bundle.periodeAkademik) {
            setPeriodeAkademik(bundle.periodeAkademik);
          }
        }

        setIsLiveConnected(true);
        const loginCount = bundle.masterLogin?.length || 0;
        const holidayCount = bundle.hariLibur?.length || 0;
        setSyncMessage(`Sinkronisasi Sheet Sukses: ${bundle.classes.length} Kelas, ${bundle.schedules.length} Jadwal, ${bundle.attendanceLogs.length} Log Presensi, ${holidayCount} Hari Libur, ${loginCount} Akun Admin.`);
      } else {
        throw new Error(json.message || 'Format data dari Apps Script tidak sesuai skema TAPAK.');
      }
    } catch (err: any) {
      setIsLiveConnected(false);
      setSyncMessage(`Koneksi: Menggunakan data lokal TAPAK (${err.message})`);
    } finally {
      setIsSyncing(false);
    }
  }, [masterGuru, masterMapel]);

  // Load initial backend URL dari konfigurasi permanen GitHub/Vercel (/app-config.json) atau server (/api/config)
  useEffect(() => {
    let isMounted = true;
    const loadServerConfig = async () => {
      // 1. Coba baca file konfigurasi publik statis (/app-config.json) yang terdeploy dari repo GitHub ke Vercel
      try {
        const staticRes = await fetch('/app-config.json');
        const staticContentType = staticRes.headers.get('content-type') || '';
        if (staticRes.ok && staticContentType.includes('application/json')) {
          const staticData = await staticRes.json();
          if (isMounted && staticData && staticData.appsScriptUrl && staticData.appsScriptUrl.trim()) {
            const url = staticData.appsScriptUrl.trim();
            setAppsScriptUrl(url);
            localStorage.setItem('gurulive_apps_script_url', url);
            setIsInitialSetupOpen(false); // Link terekam dari GitHub, langsung buka dashboard tanpa popup
            fetchFromAppsScript(url);
            return;
          }
        }
      } catch {
        // Abaikan jika app-config.json belum diset di repo
      }

      // 2. Coba baca dari backend Node /api/config (jika berjalan dengan server Express)
      try {
        const res = await fetch('/api/config');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (isMounted && data.success && data.scriptUrl) {
            setAppsScriptUrl(data.scriptUrl);
            localStorage.setItem('gurulive_apps_script_url', data.scriptUrl);
            setIsInitialSetupOpen(false);
            fetchFromAppsScript(data.scriptUrl);
            return;
          }
        }
      } catch {
        // Mode offline/dev tanpa API server
      }

      // 3. Fallback jika URL sudah ada di browser localStorage atau CONFIG.APPS_SCRIPT_URL
      if (isMounted && appsScriptUrl) {
        setIsInitialSetupOpen(false);
        fetchFromAppsScript(appsScriptUrl);
      }
    };

    loadServerConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-refresh berkala jika URL terpasang
  useEffect(() => {
    if (!appsScriptUrl) return;

    const interval = setInterval(() => {
      fetchFromAppsScript(appsScriptUrl);
    }, CONFIG.AUTO_REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [appsScriptUrl, fetchFromAppsScript]);

  const handleUrlUpdated = (newUrl: string) => {
    setAppsScriptUrl(newUrl);
    localStorage.setItem('gurulive_apps_script_url', newUrl);
    fetchFromAppsScript(newUrl);
  };

  // Handler simpan input/edit agenda piket manual ke state lokal dan Google Spreadsheet
  const handleSavePiketAttendanceLog = useCallback(async (newLog: AttendanceLogItem): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Optimistic Update pada state lokal React (attendanceLogs)
      setAttendanceLogs(prev => {
        const canonNewDate = canonicalDateKey(newLog.tanggal);
        const normNewClass = normalizeClassName(newLog.kelas);

        const existingIdx = prev.findIndex(item => {
          const cDate = canonicalDateKey(item.tanggal);
          const cClass = normalizeClassName(item.kelas);
          if (cDate !== canonNewDate || cClass !== normNewClass) return false;

          // Match jika periode beririsan, atau mapelKe sama, atau kodeGuru sama
          if (item.periods && newLog.periods && item.periods.length > 0 && newLog.periods.length > 0) {
            if (item.periods.some(p => newLog.periods?.includes(p))) return true;
          }
          if (item.mapelKe && newLog.mapelKe && Number(item.mapelKe) === Number(newLog.mapelKe)) return true;
          if (item.kodeGuru && newLog.kodeGuru && item.kodeGuru.toLowerCase() === newLog.kodeGuru.toLowerCase()) return true;
          return false;
        });

        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], ...newLog };
          return updated;
        } else {
          return [newLog, ...prev];
        }
      });

      // 2. Beri visual alert toast presensi masuk/diperbarui
      const teacher = masterGuru.find(g => g.kodeGuru.toLowerCase() === (newLog.kodeGuru || '').toLowerCase());
      const subject = masterMapel.find(m => m.kodeMapel.toLowerCase() === (newLog.mataPelajaran || '').toLowerCase());
      setActiveToasts(prev => [
        {
          id: `piket_${Date.now()}`,
          className: newLog.kelas,
          teacherName: teacher?.namaLengkap || newLog.namaGuru || `Guru [${newLog.kodeGuru}]`,
          teacherCode: newLog.kodeGuru,
          subjectName: subject?.namaMapel || newLog.mataPelajaran,
          waktuAbsen: newLog.statusKehadiran === 'Hadir' ? 'Agenda Siswa (Hadir)' : `Agenda (${newLog.statusKehadiran})`,
          statusKehadiran: newLog.statusKehadiran,
          pengganti: newLog.pengganti,
          namaPengganti: `Sumber: ${newLog.sumberData || 'Agenda Kelas'}${newLog.penginputData ? ` · Oleh: ${newLog.penginputData}` : ''}`,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 4)
      ]);

      // 3. Highlight kelas di matriks dashboard
      if (newLog.kelas) {
        setRecentlyUpdatedClasses(prev => [newLog.kelas, ...prev.filter(c => c !== newLog.kelas)]);
        setTimeout(() => setRecentlyUpdatedClasses([]), 6000);
      }

      // 4. Sinkronisasi ke Google Apps Script Spreadsheet jika URL terkonfigurasi
      if (appsScriptUrl && appsScriptUrl.trim()) {
        const sheetPayload = formatLogForSheetPayload(newLog);
        try {
          await fetch(appsScriptUrl.trim(), {
            method: 'POST',
            mode: 'no-cors', // Menghindari CORS blocking pada Google Apps Script Web App
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'saveAttendanceLog',
              log: sheetPayload,
            }),
          });
          return {
            success: true,
            message: `Berhasil disimpan ke Agenda Piket & dikirim ke Google Sheets (ID: ${newLog.idKiriman}).`,
          };
        } catch (err: any) {
          return {
            success: true,
            message: `Tersimpan di sistem lokal TAPAK (Koneksi Sheets: ${err.message || 'offline'}).`,
          };
        }
      }

      return {
        success: true,
        message: `Berhasil dicatat di sistem lokal TAPAK (ID: ${newLog.idKiriman}).`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal menyimpan log: ${err.message || 'Terjadi kesalahan sistem'}`,
      };
    }
  }, [appsScriptUrl, masterGuru, masterMapel]);

  // Hitung KPI Berdasarkan Schedules & AttendanceLogs Hari Ini
  const stats = useMemo(() => {
    const totalClasses = classes.length;
    // Jadwal hari ini yang mencakup jam aktif
    const activeSchedulesToday = schedules.filter(
      s => s.hari.toLowerCase() === dayNameIndo.toLowerCase() && s.periods.includes(activePeriodNumber)
    );

    const logsToday = attendanceLogs.filter(l => isSameDate(l.tanggal, selectedDate));

    let presentCount = 0;
    let substituteCount = 0;
    let permitCount = 0;
    let emptyCount = 0;

    activeSchedulesToday.forEach(sched => {
      const normSchedClass = normalizeClassName(sched.namaKelas);
      const matchedLog = logsToday.find(l => {
        const normLogClass = normalizeClassName(l.kelas);
        if (normLogClass !== normSchedClass) return false;
        
        // Multi-period overlap match
        if (l.periods && l.periods.length > 0 && sched.periods && sched.periods.length > 0) {
          if (l.periods.some(p => sched.periods.includes(p))) return true;
        }
        if (l.mapelKe && sched.mapelKe && Number(l.mapelKe) === Number(sched.mapelKe)) return true;
        if (l.kodeGuru && sched.kodeGuru && l.kodeGuru.toLowerCase() === sched.kodeGuru.toLowerCase()) return true;
        return false;
      });

      if (!matchedLog) {
        emptyCount++;
      } else {
        if (matchedLog.pengganti === 'Y') {
          substituteCount++;
        } else if (
          matchedLog.statusKehadiran === 'Izin' || 
          matchedLog.statusKehadiran === 'Sakit' || 
          matchedLog.statusKehadiran === 'Dinas Luar' ||
          matchedLog.statusKehadiran === 'Keperluan Pribadi' ||
          matchedLog.statusKehadiran === 'Instruksi Pimpinan'
        ) {
          permitCount++;
          emptyCount++; // Perlu infal
        } else if (matchedLog.statusKehadiran === 'Hadir') {
          presentCount++;
        } else {
          emptyCount++;
        }
      }
    });

    const scheduledCount = activeSchedulesToday.length;
    const guruSudahAbsenPercent = scheduledCount > 0
      ? Math.round((presentCount / scheduledCount) * 100)
      : 0;

    return {
      totalClasses,
      presentCount,
      substituteCount,
      permitCount,
      emptyCount,
      guruSudahAbsenPercent,
    };
  }, [classes, schedules, attendanceLogs, dayNameIndo, activePeriodNumber, selectedDate]);

  // Daftar tanggal KBM bulan berjalan yang dapat dipilih
  const availableDates = useMemo(() => {
    const datesMap = new Map<string, string>(); // canonicalKey -> displayDate

    // 0. Pastikan tanggal hari ini (WIB) selalu terdaftar
    const todayWIB = getTodayWIBDisplayDate();
    if (todayWIB) {
      const key = canonicalDateKey(todayWIB);
      if (key) datesMap.set(key, todayWIB);
    }

    // 1. Masukkan semua tanggal dari data attendanceLogs
    attendanceLogs.forEach(l => {
      if (l.tanggal) {
        const disp = formatToIndonesianDisplayDate(l.tanggal);
        const key = canonicalDateKey(disp);
        if (key && !datesMap.has(key)) {
          datesMap.set(key, disp);
        }
      }
    });

    // 2. Buat seluruh hari KBM (Senin s/d Jumat) di bulan berjalan
    const refKey = canonicalDateKey(selectedDate) || canonicalDateKey(getTodayWIBDisplayDate()) || '2026-10-16';
    const [yearStr, monthStr] = refKey.split('-');
    const year = parseInt(yearStr, 10) || 2026;
    const month = parseInt(monthStr, 10) || 10;

    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay();
      // Hari kerja sekolah: Senin (1) s/d Jumat (5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const disp = formatToIndonesianDisplayDate(d);
        const key = canonicalDateKey(disp);
        if (key && !datesMap.has(key)) {
          datesMap.set(key, disp);
        }
      }
    }

    // Urutkan tanggal secara kronologis
    const sortedKeys = Array.from(datesMap.keys()).sort();
    return sortedKeys.map(k => datesMap.get(k)!);
  }, [attendanceLogs, selectedDate]);

  return (
    <div className={`min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans ${isFullscreen ? 'p-0' : ''}`}>
      {/* 1. Universal Top Navigation Bar */}
      <TopNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        emptyClassCount={stats.emptyCount}
        wibTime={wibTimeStr}
        isSyncing={isSyncing}
        onManualRefresh={() => {
          if (appsScriptUrl) {
            fetchFromAppsScript(appsScriptUrl);
          } else {
            setIsSyncing(true);
            setTimeout(() => {
              setIsSyncing(false);
              setSyncMessage('Data lokal 6 sheet TAPAK diperbarui.');
            }, 300);
          }
        }}
        isLiveConnected={isLiveConnected}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        adminSession={adminSession}
        onLogout={handleLogout}
        activePeriodNumber={activePeriodNumber}
        isWeekend={isWeekend}
        timeRangeText={activePeriodScheduleInfo ? `${activePeriodScheduleInfo.startTime} - ${activePeriodScheduleInfo.endTime}` : '07:00 - 14:00'}
        kbmStatusText={isWeekend ? 'Libur Akhir Pekan' : stats.emptyCount === 0 ? 'KBM 100% Lancar' : 'Proses KBM Hari Ini'}
        kbmStatusColor={isWeekend ? 'text-amber-300 bg-amber-950/60 border-amber-700/60' : 'text-emerald-300 bg-emerald-950/60 border-emerald-700/60'}
        selectedDate={selectedDate}
        dayNameIndo={dayNameIndo}
      />


      {/* 2. Main Content Container */}
      <main className={`flex-1 w-full mx-auto ${isFullscreen ? 'p-2' : 'max-w-7xl px-3 sm:px-5 lg:px-6 py-3.5'}`}>
        {/* Secondary Control Toolbar: Date Selector + Simulator Tool (Hanya pada Tab Non-Laporan) */}
        {currentTab !== 'reports' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5 p-2 px-3 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date selection */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Tanggal KBM:</span>
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="px-2 py-0.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono cursor-pointer"
                >
                  {availableDates.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>



              {/* Sync Notification Banner */}
              {syncMessage && (
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-400" />
                  {syncMessage}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 3. Infografis Eksekutif KBM Hari Ini & 4. Kotak Kelas Terkonfirmasi (Khusus Tab Matriks 23 Kelas) */}
        {currentTab === 'matrix' && (
          <>
            <ExecutiveInfographic
              schedules={schedules}
              attendanceLogs={attendanceLogs}
              masterGuru={masterGuru}
              classes={classes}
              activePeriodNumber={activePeriodNumber}
              selectedDate={selectedDate}
              wibTimeStr={wibTimeStr}
              isWeekend={isWeekend}
              dayNameIndo={dayNameIndo}
              periodScheduleInfo={activePeriodScheduleInfo}
              onToggleUnconfirmed={() => setIsUnconfirmedExpanded(prev => !prev)}
              onFilterEmpty={() => {
                setIsUnconfirmedExpanded(true);
                setCurrentTab('matrix');
              }}
              onResetFilter={() => {
                setActiveFilter('all');
                setCurrentTab('matrix');
              }}
            />

            <UnconfirmedClassesSection
              schedules={schedules}
              attendanceLogs={attendanceLogs}
              masterGuru={masterGuru}
              masterMapel={masterMapel}
              classes={classes}
              activePeriodNumber={activePeriodNumber}
              selectedDate={selectedDate}
              isExpanded={isUnconfirmedExpanded}
              onToggleExpand={() => setIsUnconfirmedExpanded(prev => !prev)}
              onSelectClass={handleSelectUnconfirmedClass}
              selectedGrade={selectedGrade}
              onSelectGrade={setSelectedGrade}
            />
          </>
        )}

        {/* 5. Tab Views (Read-Only) */}
        {currentTab === 'matrix' && (
          <ClassroomMatrix
            classes={classes}
            schedules={schedules}
            masterGuru={masterGuru}
            masterMapel={masterMapel}
            attendanceLogs={attendanceLogs}
            activePeriodNumber={activePeriodNumber}
            selectedDate={selectedDate}
            wibTimeStr={wibTimeStr}
            isUltraCompact={isUltraCompact}
            onToggleDensity={() => setIsUltraCompact(prev => !prev)}
            onSelectSlot={slot => setSelectedSlot(slot)}
            onSelectDateFallback={setSelectedDate}
            highlightedClassName={highlightedClassName}
            recentlyUpdatedClasses={recentlyUpdatedClasses}
            selectedGrade={selectedGrade}
            onSelectGrade={setSelectedGrade}
            isFullscreen={isFullscreen}
          />
        )}

        {currentTab === 'empty-classes' && (
          <EmptyClassesView
            records={attendanceLogs}
            schedules={schedules}
            masterGuru={masterGuru}
            masterMapel={masterMapel}
            classes={classes}
            activePeriodNumber={activePeriodNumber}
            selectedDate={selectedDate}
            onSelectRecord={record => {
              // Create resolved slot fallback if clicked from empty classes view
              const sched = schedules.find(s => s.periods.includes(activePeriodNumber));
              if (sched) {
                const teachersMap = Object.fromEntries(masterGuru.map(g => [g.kodeGuru, g]));
                const subjectsMap = Object.fromEntries(masterMapel.map(m => [m.kodeMapel, m]));
                const classesMap = Object.fromEntries(classes.map(c => [c.namaKelas, c]));
                const slot: ResolvedScheduleSlot = {
                  schedule: sched,
                  teacher: teachersMap[sched.kodeGuru],
                  subject: subjectsMap[sched.kodeMapel],
                  defaultRoom: classesMap[sched.namaKelas]?.lokasiRuang || `R. ${sched.namaKelas}`,
                  activeRoom: record.ruangBelajar || classesMap[sched.namaKelas]?.lokasiRuang || `R. ${sched.namaKelas}`,
                  attendance: record,
                  statusColor: record.pengganti === 'Y' ? 'purple' : record.statusKehadiran === 'Hadir' ? 'green' : 'yellow',
                  statusLabel: record.statusKehadiran,
                  isCoveredNow: true,
                };
                setSelectedSlot(slot);
              }
            }}
          />
        )}

        {currentTab === 'feed' && (
          <AttendanceFeed
            records={attendanceLogs}
            onSelectRecord={record => {
              const sched = schedules.find(s => s.periods.includes(record.startPeriod || 1));
              if (sched) {
                const teachersMap = Object.fromEntries(masterGuru.map(g => [g.kodeGuru, g]));
                const subjectsMap = Object.fromEntries(masterMapel.map(m => [m.kodeMapel, m]));
                const classesMap = Object.fromEntries(classes.map(c => [c.namaKelas, c]));
                const slot: ResolvedScheduleSlot = {
                  schedule: sched,
                  teacher: teachersMap[record.kodeGuru] || teachersMap[sched.kodeGuru],
                  subject: subjectsMap[sched.kodeMapel],
                  defaultRoom: classesMap[record.kelas]?.lokasiRuang || `R. ${record.kelas}`,
                  activeRoom: record.ruangBelajar || classesMap[record.kelas]?.lokasiRuang || `R. ${record.kelas}`,
                  attendance: record,
                  statusColor: record.pengganti === 'Y' ? 'purple' : record.statusKehadiran === 'Hadir' ? 'green' : 'yellow',
                  statusLabel: record.statusKehadiran,
                  isCoveredNow: false,
                };
                setSelectedSlot(slot);
              }
            }}
            selectedDate={selectedDate}
          />
        )}

        {currentTab === 'piket' && adminSession && (
          <AdminPiketAgendaWorkspace
            schedules={schedules}
            attendanceLogs={attendanceLogs}
            classes={classes}
            masterGuru={masterGuru}
            masterMapel={masterMapel}
            selectedDate={selectedDate}
            adminSession={adminSession}
            onSaveLog={handleSavePiketAttendanceLog}
            hariLibur={hariLibur}
          />
        )}

        {currentTab === 'reports' && (
          <ReportWorkspace
            adminSession={adminSession}
            onOpenAdminModal={() => setIsAdminModalOpen(true)}
            schedules={schedules}
            attendanceLogs={attendanceLogs}
            masterGuru={masterGuru}
            classes={classes}
            masterMapel={masterMapel}
            masterRuangan={masterRuangan}
            hariLibur={hariLibur}
            periodeAkademik={periodeAkademik}
            selectedDate={selectedDate}
            wibTimeStr={wibTimeStr}
            onManualRefresh={() => {
              if (appsScriptUrl) {
                fetchFromAppsScript(appsScriptUrl);
              }
            }}
            isSyncing={isSyncing}
          />
        )}
      </main>

      {/* 5. Pop-up Awal Pengisian Link Backend ketika belum terekam */}
      <InitialSetupModal
        isOpen={isInitialSetupOpen}
        onClose={() => setIsInitialSetupOpen(false)}
        onSaveUrl={(newUrl) => {
          handleUrlUpdated(newUrl);
          setIsInitialSetupOpen(false);
        }}
        onUseSampleData={() => setIsInitialSetupOpen(false)}
      />

      {/* 6. Read-Only Relational Detail Modal */}
      <DetailModal
        slot={selectedSlot}
        onClose={() => setSelectedSlot(null)}
      />

      {/* 7. Admin / Pengawas Sheet MasterLogin Configuration Modal */}
      <AdminUrlModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUrl={appsScriptUrl}
        onUrlUpdated={handleUrlUpdated}
        masterLoginAccounts={masterLogin}
        adminSession={adminSession}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        schedules={schedules}
        attendanceLogs={attendanceLogs}
        masterGuru={masterGuru}
        classes={classes}
        masterMapel={masterMapel}
        selectedDate={selectedDate}
        wibTimeStr={wibTimeStr}
        onSavePiketAttendanceLog={handleSavePiketAttendanceLog}
        onOpenPiketTab={() => {
          setIsAdminModalOpen(false);
          setCurrentTab('piket');
        }}
      />
      {/* 8. Sistem Alert Visual (Toast) Presensi Masuk Real-Time */}
      <AttendanceToastContainer
        toasts={activeToasts}
        onDismiss={handleDismissToast}
        onSelectClass={handleSelectUnconfirmedClass}
      />
    </div>
  );
}


