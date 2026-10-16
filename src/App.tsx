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
  ViewTab 
} from './types';
import { CONFIG } from './config';
import { 
  DEFAULT_MASTER_GURU,
  DEFAULT_MASTER_MAPEL,
  DEFAULT_CLASSES,
  DEFAULT_MASTER_RUANGAN,
  DEFAULT_SCHEDULES,
  DEFAULT_ATTENDANCE_LOGS,
  getScheduleForDate, 
  getDayLabel, 
  getDayType 
} from './data/initialData';
import { 
  processTapakBundle, 
  getCurrentPeriodInfo,
  getDayNameIndonesian,
  normalizeClassName
} from './utils/appsScriptCode';
import { TopNav } from './components/TopNav';
import { UnconfirmedClassesSection } from './components/UnconfirmedClassesSection';
import { ExecutiveInfographic } from './components/ExecutiveInfographic';
import { ClassroomMatrix } from './components/ClassroomMatrix';
import { EmptyClassesView } from './components/EmptyClassesView';
import { AttendanceFeed } from './components/AttendanceFeed';
import { DetailModal } from './components/DetailModal';
import { AdminUrlModal } from './components/AdminUrlModal';
import { 
  Calendar, 
  SlidersHorizontal, 
  Info,
  RefreshCw
} from 'lucide-react';

export default function App() {
  // 1. DATA STORE: 6 Sheet Database TAPAK (dengan fallback offline data yang presisi)
  const [masterGuru, setMasterGuru] = useState<MasterGuru[]>(() => {
    const saved = localStorage.getItem('gurulive_tapak_guru_v1');
    return saved ? JSON.parse(saved) : DEFAULT_MASTER_GURU;
  });

  const [masterMapel, setMasterMapel] = useState<MasterMapel[]>(() => {
    const saved = localStorage.getItem('gurulive_tapak_mapel_v1');
    return saved ? JSON.parse(saved) : DEFAULT_MASTER_MAPEL;
  });

  const [classes, setClasses] = useState<ClassMaster[]>(() => {
    const saved = localStorage.getItem('gurulive_tapak_classes_v1');
    return saved ? JSON.parse(saved) : DEFAULT_CLASSES;
  });

  const [masterRuangan, setMasterRuangan] = useState<MasterRuangan[]>(() => {
    const saved = localStorage.getItem('gurulive_tapak_ruangan_v1');
    return saved ? JSON.parse(saved) : DEFAULT_MASTER_RUANGAN;
  });

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem('gurulive_tapak_schedules_v1');
    return saved ? JSON.parse(saved) : DEFAULT_SCHEDULES;
  });

  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogItem[]>(() => {
    const saved = localStorage.getItem('gurulive_tapak_logs_v1');
    return saved ? JSON.parse(saved) : DEFAULT_ATTENDANCE_LOGS;
  });

  // 2. UI State & Density Mode (Ultra-Compact 23 Kelas default)
  const [currentTab, setCurrentTab] = useState<ViewTab>('matrix');
  const [selectedDate, setSelectedDate] = useState<string>('09-Okt-2026'); // Tanggal default Jumat KBM
  const [activeFilter, setActiveFilter] = useState<string>('all');
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

  // Jam Real-time & Simulator Jam
  const [wibTimeStr, setWibTimeStr] = useState<string>('10:14:00 WIB');
  const [simulatedPeriod, setSimulatedPeriod] = useState<number | null>(4); // default Jam 4 aktif
  const [isSimulatingPeriod, setIsSimulatingPeriod] = useState<boolean>(true);

  // Read-Only Detail Modal Slot
  const [selectedSlot, setSelectedSlot] = useState<ResolvedScheduleSlot | null>(null);

  // Integration state (Configured via Server / localStorage / config.ts)
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    return localStorage.getItem('gurulive_apps_script_url') || CONFIG.APPS_SCRIPT_URL || '';
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Persist ke localStorage saat data berubah
  useEffect(() => {
    localStorage.setItem('gurulive_tapak_guru_v1', JSON.stringify(masterGuru));
    localStorage.setItem('gurulive_tapak_mapel_v1', JSON.stringify(masterMapel));
    localStorage.setItem('gurulive_tapak_classes_v1', JSON.stringify(classes));
    localStorage.setItem('gurulive_tapak_ruangan_v1', JSON.stringify(masterRuangan));
    localStorage.setItem('gurulive_tapak_schedules_v1', JSON.stringify(schedules));
    localStorage.setItem('gurulive_tapak_logs_v1', JSON.stringify(attendanceLogs));
  }, [masterGuru, masterMapel, classes, masterRuangan, schedules, attendanceLogs]);

  // Live Clock updater
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const utcHours = now.getUTCHours();
      const wibHours = (utcHours + 7) % 24;
      const min = String(now.getUTCMinutes()).padStart(2, '0');
      const sec = String(now.getUTCSeconds()).padStart(2, '0');
      setWibTimeStr(`${String(wibHours).padStart(2, '0')}:${min}:${sec} WIB`);

      if (!isSimulatingPeriod) {
        const info = getCurrentPeriodInfo(currentSchedules);
        setSimulatedPeriod(info.activePeriod);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isSimulatingPeriod, currentSchedules]);

  // Adjust simulated period if outside bounds of the selected day's schedules
  useEffect(() => {
    if (currentSchedules.length > 0 && simulatedPeriod !== null) {
      const maxPeriod = currentSchedules[currentSchedules.length - 1].period;
      if (simulatedPeriod > maxPeriod) {
        setSimulatedPeriod(maxPeriod);
      }
    }
  }, [currentSchedules, simulatedPeriod]);

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

  // Current active period calculation
  const activePeriodNumber = useMemo(() => {
    if (simulatedPeriod !== null) return simulatedPeriod;
    return getCurrentPeriodInfo(currentSchedules).activePeriod;
  }, [simulatedPeriod, currentSchedules]);

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
        if (bundle.attendanceLogs.length > 0) setAttendanceLogs(bundle.attendanceLogs);

        setIsLiveConnected(true);
        setSyncMessage(`Sinkronisasi 6 Sheet Sukses: ${bundle.classes.length} Kelas, ${bundle.schedules.length} Jadwal, ${bundle.attendanceLogs.length} Log Presensi.`);
      } else {
        throw new Error(json.message || 'Format data dari Apps Script tidak sesuai skema TAPAK.');
      }
    } catch (err: any) {
      setIsLiveConnected(false);
      setSyncMessage(`Koneksi: Menggunakan data lokal TAPAK (${err.message})`);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Load initial backend URL dari konfigurasi permanen server (/api/config)
  useEffect(() => {
    let isMounted = true;
    const loadServerConfig = async () => {
      try {
        const res = await fetch('/api/config');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (isMounted && data.success && data.scriptUrl) {
            setAppsScriptUrl(data.scriptUrl);
            localStorage.setItem('gurulive_apps_script_url', data.scriptUrl);
            fetchFromAppsScript(data.scriptUrl);
            return;
          }
        }
      } catch {
        // Mode offline/dev tanpa API server (atau deployment statis Vercel)
      }
      if (isMounted && appsScriptUrl) {
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

  // Hitung KPI Berdasarkan Schedules & AttendanceLogs Hari Ini
  const stats = useMemo(() => {
    const totalClasses = classes.length;
    // Jadwal hari ini yang mencakup jam aktif
    const activeSchedulesToday = schedules.filter(
      s => s.hari.toLowerCase() === dayNameIndo.toLowerCase() && s.periods.includes(activePeriodNumber)
    );

    const logsToday = attendanceLogs.filter(l => l.tanggal === selectedDate);

    let presentCount = 0;
    let substituteCount = 0;
    let permitCount = 0;
    let emptyCount = 0;

    activeSchedulesToday.forEach(sched => {
      const normSchedClass = normalizeClassName(sched.namaKelas);
      const matchedLog = logsToday.find(l => {
        const normLogClass = normalizeClassName(l.kelas);
        return normLogClass === normSchedClass && (l.mapelKe === sched.mapelKe || (l.periods && l.periods.includes(activePeriodNumber)));
      });

      if (!matchedLog) {
        emptyCount++;
      } else {
        if (matchedLog.pengganti === 'Y') {
          substituteCount++;
        } else if (
          matchedLog.statusKehadiran === 'Izin' || 
          matchedLog.statusKehadiran === 'Sakit' || 
          matchedLog.statusKehadiran === 'Dinas Luar'
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

  // Available unique dates in the dataset + fallback
  const availableDates = useMemo(() => {
    const set = new Set(attendanceLogs.map(r => r.tanggal));
    if (!set.has('09-Okt-2026')) set.add('09-Okt-2026'); // Jumat
    return Array.from(set);
  }, [attendanceLogs]);

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
      />

      {/* 2. Main Content Container */}
      <main className={`flex-1 w-full mx-auto ${isFullscreen ? 'p-2' : 'max-w-7xl px-3 sm:px-5 lg:px-6 py-3.5'}`}>
        {/* Secondary Control Toolbar: Date Selector + Simulator Tool */}
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

            {/* Day Type Badge */}
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${
              isWeekend 
                ? 'bg-amber-50 text-amber-800 border-amber-200' 
                : dayType === 'friday'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
            }`}>
              {dayNameIndo} · {dayInfo.label}
            </span>

            {/* Sync Notification Banner */}
            {syncMessage && (
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                <Info className="w-3 h-3 text-slate-400" />
                {syncMessage}
              </span>
            )}
          </div>

          {/* Sesi Jam Simulator for Testing */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 text-xs">
            <SlidersHorizontal className="w-3 h-3 text-slate-500" />
            <span className="text-slate-600 text-[11px] font-medium">Simulasi Jam:</span>
            {isWeekend ? (
              <span className="text-[11px] text-amber-700 font-semibold px-1.5">
                Libur Akhir Pekan
              </span>
            ) : (
              <div className="flex items-center gap-0.5">
                {currentSchedules.map(s => (
                  <button
                    key={s.period}
                    onClick={() => {
                      setIsSimulatingPeriod(true);
                      setSimulatedPeriod(s.period);
                    }}
                    className={`w-5 h-5 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                      activePeriodNumber === s.period
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title={`Lihat status saat ${s.label} (${s.startTime} - ${s.endTime})`}
                  >
                    {s.period}
                  </button>
                ))}
              </div>
            )}
            {isSimulatingPeriod && !isWeekend && (
              <button
                onClick={() => setIsSimulatingPeriod(false)}
                className="text-[10px] text-indigo-600 hover:underline font-semibold ml-1 cursor-pointer"
                title="Kembali ke jam otomatis sesuai waktu WIB nyata"
              >
                Otomatis
              </button>
            )}
          </div>
        </div>

        {/* 3. Infografis Eksekutif KBM Hari Ini (Kepala Sekolah & Guru Piket) */}
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

        {/* 4. Kotak Kelas Belum Terkonfirmasi (Ringkas, Collapsible, Klik untuk Sorot di Matriks) */}
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
        />

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
      </main>

      {/* 5. Read-Only Relational Detail Modal */}
      <DetailModal
        slot={selectedSlot}
        onClose={() => setSelectedSlot(null)}
      />

      {/* 6. Admin / Pengawas PIN-Protected Apps Script URL Configuration Modal */}
      <AdminUrlModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUrl={appsScriptUrl}
        onUrlUpdated={handleUrlUpdated}
      />
    </div>
  );
}
