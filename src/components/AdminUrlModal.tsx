import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User,
  Eye,
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Save, 
  Server, 
  X,
  FileCode2,
  Copy,
  Check,
  Download,
  Globe,
  LogOut,
  Users,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  BadgeCheck,
  Printer,
  FileText,
  Send,
  Calendar,
  UserCheck,
  UserX,
  Sparkles,
  ClipboardCheck
} from 'lucide-react';
import { maskAppsScriptUrl } from '../utils/maskUrl';
import { MasterLoginAccount, AdminSession, ScheduleItem, AttendanceLogItem, MasterGuru, ClassMaster, MasterMapel } from '../types';
import { DEFAULT_MASTER_LOGIN } from '../data/initialData';
import { isSameDate, getDayNameIndonesian, isSampleEntity, generateGoogleAppsScriptCode } from '../utils/appsScriptCode';
import { AdminPiketAgendaWorkspace } from './AdminPiketAgendaWorkspace';

interface AdminUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onUrlUpdated: (newUrl: string) => void;
  masterLoginAccounts?: MasterLoginAccount[];
  adminSession: AdminSession | null;
  onLoginSuccess: (session: AdminSession) => void;
  onLogout: () => void;
  schedules?: ScheduleItem[];
  attendanceLogs?: AttendanceLogItem[];
  masterGuru?: MasterGuru[];
  classes?: ClassMaster[];
  masterMapel?: MasterMapel[];
  selectedDate?: string;
  wibTimeStr?: string;
  onSavePiketAttendanceLog?: (log: AttendanceLogItem) => Promise<{ success: boolean; message: string }>;
  onOpenPiketTab?: () => void;
}

export const AdminUrlModal: React.FC<AdminUrlModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onUrlUpdated,
  masterLoginAccounts = DEFAULT_MASTER_LOGIN,
  adminSession,
  onLoginSuccess,
  onLogout,
  schedules = [],
  attendanceLogs = [],
  masterGuru = [],
  classes = [],
  masterMapel = [],
  selectedDate = '09-Okt-2026',
  wibTimeStr = '10:14:00 WIB',
  onSavePiketAttendanceLog,
  onOpenPiketTab,
}) => {
  // Status login: Terautentikasi jika sudah ada adminSession aktif
  const isAuthenticated = Boolean(adminSession);

  // Form Login (Username & Password)
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Form URL Apps Script
  const [inputUrl, setInputUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // Tab Sub-Menu Admin: 'profile' (Profil) | 'piket' (Input Agenda Piket) | 'config' (URL Backend) | 'accounts' (Daftar Username) | 'report' (Generate Laporan)
  const [activeAdminTab, setActiveAdminTab] = useState<'profile' | 'piket' | 'config' | 'accounts' | 'report'>('profile');

  // State untuk Generate Laporan & Salin Skrip Backend
  const [reportDate, setReportDate] = useState<string>(selectedDate);
  const [copiedWaText, setCopiedWaText] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const handleCopyScript = () => {
    const code = generateGoogleAppsScriptCode();
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Ekspor konfigurasi permanen untuk GitHub / Vercel (Multi-Device)
  const [copiedConfig, setCopiedConfig] = useState(false);
  const activeUrlForExport = inputUrl.trim() || currentUrl.trim();

  // Kalkulasi data statistik untuk laporan pada reportDate
  const reportData = useMemo(() => {
    const dayName = getDayNameIndonesian(reportDate);
    const dayScheds = (schedules || []).filter(s => s.hari.toLowerCase() === dayName.toLowerCase());
    const dayLogs = (attendanceLogs || []).filter(l => isSameDate(l.tanggal, reportDate));

    const teachersMap: Record<string, MasterGuru> = {};
    (masterGuru || []).forEach(g => { if (g.kodeGuru) teachersMap[g.kodeGuru] = g; });

    let totalSessions = dayScheds.length;
    let presentCount = 0;
    let leaveCount = 0;
    let unconfirmedCount = 0;

    const leaveTeachersList: Array<{ nama: string; status: string; info: string }> = [];

    dayScheds.forEach(sched => {
      const isSample = isSampleEntity({ kodeGuru: sched.kodeGuru, kodeMapel: sched.kodeMapel });
      if (isSample) return;

      const matchedLog = dayLogs.find(l => 
        l.kelas.toLowerCase() === sched.namaKelas.toLowerCase() &&
        (l.kodeGuru.toLowerCase() === sched.kodeGuru.toLowerCase() || l.mapelKe === sched.mapelKe)
      );

      if (!matchedLog) {
        unconfirmedCount++;
      } else if (matchedLog.statusKehadiran === 'Hadir' || matchedLog.pengganti === 'Y') {
        presentCount++;
      } else {
        leaveCount++;
        const tObj = teachersMap[sched.kodeGuru];
        const teacherName = tObj?.namaLengkap || matchedLog.namaGuru || sched.kodeGuru;
        leaveTeachersList.push({
          nama: teacherName,
          status: matchedLog.statusKehadiran,
          info: matchedLog.infoKetidakhadiran || 'Izin/Sakit'
        });
      }
    });

    const percent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

    return {
      dayName,
      totalSessions,
      presentCount,
      leaveCount,
      unconfirmedCount,
      percent,
      leaveTeachersList
    };
  }, [reportDate, schedules, attendanceLogs, masterGuru]);

  if (!isOpen) return null;

  // Verifikasi Login Username & Password terhadap Database MasterLogin
  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = usernameInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanUser) {
      setLoginError('Masukkan username akun admin');
      return;
    }
    if (!cleanPass) {
      setLoginError('Masukkan password akun admin');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    // 1. Cek terhadap daftar akun MasterLogin dari Spreadsheet (atau default lokal)
    const activeAccounts = (masterLoginAccounts && masterLoginAccounts.length > 0)
      ? masterLoginAccounts
      : DEFAULT_MASTER_LOGIN;

    const matchedAccount = activeAccounts.find(
      acc => acc.username.trim().toLowerCase() === cleanUser.toLowerCase() && 
             String(acc.password).trim() === cleanPass
    );

    if (matchedAccount) {
      const session: AdminSession = {
        username: matchedAccount.username,
        nama: matchedAccount.nama,
        jabatan: matchedAccount.jabatan,
        role: matchedAccount.role,
        loginAt: new Date().toISOString(),
      };
      onLoginSuccess(session);
      setUsernameInput('');
      setPasswordInput('');
      setIsLoggingIn(false);
      setActiveAdminTab('profile');
      return;
    }

    // 2. Fallback akun default bawaan 'admin' / '123'
    if (cleanUser.toLowerCase() === 'admin' && (cleanPass === '123' || cleanPass === '1234' || cleanPass === 'admin123')) {
      const session: AdminSession = {
        username: 'admin',
        nama: 'Administrator TAPAK',
        jabatan: 'Admin Sistem',
        role: 'Superadmin',
        loginAt: new Date().toISOString(),
      };
      onLoginSuccess(session);
      setUsernameInput('');
      setPasswordInput('');
      setIsLoggingIn(false);
      setActiveAdminTab('profile');
      return;
    }

    setIsLoggingIn(false);
    if (activeAccounts.length <= 1 && activeAccounts[0].username === 'admin') {
      setLoginError('Kredensial tidak ditemukan. Pastikan Anda telah memperbarui dan men-deploy Versi Baru pada Google Apps Script di Spreadsheet agar sheet MasterLogin terhubung.');
    } else {
      setLoginError('Username atau Password tidak sesuai dengan database sheet MasterLogin.');
    }
  };

  // Pengujian URL Apps Script
  const handleTestConnection = async () => {
    const urlToTest = inputUrl.trim() || currentUrl.trim();
    if (!urlToTest) {
      setTestResult({ success: false, message: 'Masukkan URL Deployment Google Apps Script terlebih dahulu.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(urlToTest, { method: 'GET', mode: 'cors' });
      const data = await res.json().catch(() => null);

      if (res.ok && data && (data.status === 'success' || data.data)) {
        const counts = data.counts || {};
        setTestResult({
          success: true,
          message: `Koneksi Berhasil! Terhubung ke '${data.spreadsheetName || 'Spreadsheet'}' (${counts.masterGuru || 0} Guru, ${counts.attendanceLogs || 0} Log Absen, ${counts.hariLibur || 0} Hari Libur, ${counts.masterLogin || 0} Akun Login).`
        });
      } else {
        setTestResult({
          success: false,
          message: `Gagal membaca data dari Apps Script. Pastikan URL diawali dengan 'https://script.google.com/macros/s/.../exec' dan Pengaksesan disetel ke 'Siapa Saja (Anyone)'.`
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Gagal terhubung ke Apps Script: ${err.message || 'Cek koneksi internet Anda atau pastikan URL Apps Script sudah benar.'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Simpan URL Baru
  const handleSaveUrl = async () => {
    const newUrl = inputUrl.trim();
    if (!newUrl) return;

    setIsSaving(true);
    setSaveSuccessMessage('');

    try {
      onUrlUpdated(newUrl);
      setInputUrl('');
      setSaveSuccessMessage('URL Backend Apps Script berhasil diperbarui dan tersimpan permanen!');
      setTimeout(() => setSaveSuccessMessage(''), 3500);
    } catch {
      setSaveSuccessMessage('Terjadi kesalahan saat menyimpan URL.');
    } finally {
      setIsSaving(false);
    }
  };

  // Salin ringkasan laporan ke WhatsApp
  const handleCopyWaText = () => {
    const waText = `📊 *LAPORAN REKAPITULASI KBM TAPAK LIVE*
🗓 *Hari/Tanggal*: ${reportData.dayName}, ${reportDate}
----------------------------------------
✅ *Sesi Hadir/Mengajar*: ${reportData.presentCount} / ${reportData.totalSessions} Sesi (${reportData.percent}%)
⚠️ *Guru Izin / Sakit / Dinas*: ${reportData.leaveCount} Sesi
🔴 *Belum Absen / Kosong*: ${reportData.unconfirmedCount} Sesi
----------------------------------------
📋 *CATATAN GURU IZIN/SAKIT HARI INI*:
${reportData.leaveTeachersList.length > 0 
  ? reportData.leaveTeachersList.map(t => `- ${t.nama} (${t.status}: ${t.info})`).join('\n')
  : '- Nihil (Seluruh guru KBM mengajar penuh)'}
----------------------------------------
_Diunduh & disinkronkan otomatis dari Sistem TAPAK Live Monitoring_`;

    navigator.clipboard.writeText(waText);
    setCopiedWaText(true);
    setTimeout(() => setCopiedWaText(false), 2500);
  };

  // Cetak Laporan PDF Resmi
  const handlePrintReport = () => {
    window.print();
  };

  const activeAccounts = (masterLoginAccounts && masterLoginAccounts.length > 0)
    ? masterLoginAccounts
    : DEFAULT_MASTER_LOGIN;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      
      {/* Printable Section for Official PDF Report */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8 print:z-[9999] text-slate-900 font-sans">
        <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wider text-slate-800">PEMERINTAH KABUPATEN / DINAS PENDIDIKAN</h1>
          <h2 className="text-2xl font-black uppercase text-indigo-950">LAPORAN MONITORING PRESENSI KBM GURU</h2>
          <p className="text-xs font-mono text-slate-600 mt-1">Sistem Informasi TAPAK Live Monitoring · Hari/Tanggal: {reportData.dayName}, {reportDate}</p>
        </div>

        {/* Ringkasan Statistik */}
        <div className="grid grid-cols-4 gap-4 mb-6 border border-slate-300 p-4 rounded-lg bg-slate-50 text-center">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Total Sesi KBM</div>
            <div className="text-xl font-bold font-mono">{reportData.totalSessions} Sesi</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Sesi Hadir</div>
            <div className="text-xl font-bold font-mono text-emerald-700">{reportData.presentCount} ({reportData.percent}%)</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Izin / Sakit</div>
            <div className="text-xl font-bold font-mono text-amber-700">{reportData.leaveCount} Sesi</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Belum Absen</div>
            <div className="text-xl font-bold font-mono text-rose-700">{reportData.unconfirmedCount} Sesi</div>
          </div>
        </div>

        {/* Daftar Keterangan Guru Izin */}
        <div className="mb-8">
          <h3 className="text-sm font-bold border-b border-slate-300 pb-1 mb-2 text-slate-800">Daftar Guru Ketidakhadiran / Izin Hari Ini</h3>
          {reportData.leaveTeachersList.length === 0 ? (
            <p className="text-xs italic text-slate-500">Nihil - Seluruh guru mengajar sesuai jadwal KBM.</p>
          ) : (
            <table className="w-full text-xs text-left border border-slate-300 border-collapse">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-slate-300 p-2">No</th>
                  <th className="border border-slate-300 p-2">Nama Guru Pengampu</th>
                  <th className="border border-slate-300 p-2">Status Presensi</th>
                  <th className="border border-slate-300 p-2">Keterangan Izin</th>
                </tr>
              </thead>
              <tbody>
                {reportData.leaveTeachersList.map((t, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-300 p-2 font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 font-bold">{t.nama}</td>
                    <td className="border border-slate-300 p-2">{t.status}</td>
                    <td className="border border-slate-300 p-2">{t.info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Kolom Tanda Tangan */}
        <div className="grid grid-cols-2 gap-12 mt-12 text-center text-xs">
          <div>
            <div>Mengetahui,</div>
            <div className="font-bold text-slate-900 mt-1">Kepala Sekolah</div>
            <div className="h-16"></div>
            <div className="font-bold underline">( ___________________________ )</div>
            <div className="text-[11px] text-slate-500">NIP. ________________________</div>
          </div>
          <div>
            <div>Petugas / Guru Piket,</div>
            <div className="font-bold text-slate-900 mt-1">Admin TAPAK Live</div>
            <div className="h-16"></div>
            <div className="font-bold underline">( {adminSession?.nama || 'Administrator'} )</div>
            <div className="text-[11px] text-slate-500">Jabatan: {adminSession?.jabatan || 'Admin Sistem'}</div>
          </div>
        </div>
      </div>

      <div className={`relative w-full ${activeAdminTab === 'piket' ? 'max-w-5xl' : 'max-w-2xl'} bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col transition-all duration-200`}>
        
        {/* Header Modal */}
        <div className="px-5 sm:px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Panel Administrator TAPAK</span>
                {isAuthenticated && (
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3 text-emerald-400" />
                    <span>Terverifikasi</span>
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {isAuthenticated 
                  ? `Sesi Aktif: ${adminSession?.nama} (@${adminSession?.username})`
                  : 'Autentikasi akun admin dari database sheet MasterLogin'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-800">
          
          {/* TAMPILAN 1: FORM LOGIN JIKA BELUM TERAUTENTIKASI */}
          {!isAuthenticated ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-100 flex items-start space-x-3 text-xs text-indigo-950">
                <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-indigo-900">Akses Terkunci</span>
                  Silakan login dengan Username dan Password akun admin yang terdaftar pada tab sheet <strong>MasterLogin</strong> Google Spreadsheet Anda.
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username Admin:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Masukkan username (misal: dz atau admin)"
                      className="w-full text-xs py-2.5 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden text-slate-800 font-medium"
                      autoFocus
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password Admin:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Masukkan password"
                      className="w-full text-xs py-2.5 pl-9 pr-9 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden text-slate-800 font-medium"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-2 shadow-xs cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Login Ke Panel Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* TAMPILAN 2: ADMIN PANEL SETELAH LOGIN (4 SUB-MENU SIMPEL) */
            <div className="space-y-4">
              
              {/* Header Tab Sub-Navigasi Horizontal 4 Menu */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => setActiveAdminTab('profile')}
                  className={`py-2 px-2 rounded-lg transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    activeAdminTab === 'profile'
                      ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200'
                      : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Profil</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenPiketTab) {
                      onOpenPiketTab();
                    } else {
                      setActiveAdminTab('piket');
                    }
                  }}
                  className={`py-2 px-2 rounded-lg transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    activeAdminTab === 'piket'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold ring-1 ring-indigo-500'
                      : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardCheck className={`w-3.5 h-3.5 ${activeAdminTab === 'piket' ? 'text-white' : 'text-indigo-600'}`} />
                  <span>Agenda Piket</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAdminTab('config')}
                  className={`py-2 px-2 rounded-lg transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    activeAdminTab === 'config'
                      ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200'
                      : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Server className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Backend URL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAdminTab('accounts')}
                  className={`py-2 px-2 rounded-lg transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    activeAdminTab === 'accounts'
                      ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200'
                      : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Daftar Akun</span>
                </button>
              </div>

              {/* SUB-MENU KHUSUS: INPUT AGENDA PIKET KBM SISWA */}
              {activeAdminTab === 'piket' && (
                <AdminPiketAgendaWorkspace
                  schedules={schedules}
                  attendanceLogs={attendanceLogs}
                  classes={classes}
                  masterGuru={masterGuru}
                  masterMapel={masterMapel}
                  selectedDate={selectedDate}
                  adminSession={adminSession}
                  onSaveLog={onSavePiketAttendanceLog || (async () => ({ success: true, message: 'Disimpan secara lokal.' }))}
                />
              )}

              {/* SUB-MENU 1: PROFIL ADMIN */}
              {activeAdminTab === 'profile' && (
                <div className="space-y-4">
                  {/* Kartu Identitas Admin */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white border border-slate-800 shadow-md">
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md border border-indigo-400/40 shrink-0">
                          {adminSession?.nama ? adminSession.nama.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-white leading-tight">
                              {adminSession?.nama || 'Administrator'}
                            </h3>
                            <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full font-mono">
                              @{adminSession?.username || 'admin'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {adminSession?.jabatan || 'Admin Sistem'} · <strong className="text-emerald-400 font-semibold">{adminSession?.role || 'Superadmin'}</strong>
                          </p>
                        </div>
                      </div>

                      <span className="text-[10.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 self-start">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Sesi Aktif</span>
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10.5px] block">Waktu Login Sesi:</span>
                        <span className="font-mono text-slate-200 font-semibold text-[11px]">
                          {adminSession?.loginAt ? new Date(adminSession.loginAt).toLocaleTimeString('id-ID') + ' WIB' : 'Baru saja'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10.5px] block">Hak Akses Sistem:</span>
                        <span className="text-emerald-400 font-bold text-[11px]">
                          Akses Penuh Master Data & API
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pintasan Lembar Kerja Agenda Piket Siswa */}
                  {onOpenPiketTab && (
                    <div className="p-4 bg-indigo-50/80 rounded-xl border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-950">
                          <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                          <span>Lembar Kerja Agenda Piket KBM Siswa</span>
                        </div>
                        <span className="text-[11px] text-indigo-800/80 block mt-0.5">
                          Buka tampilan penuh di samping tab Laporan KBM untuk menginput agenda manual kelas dengan nyaman dan leluasa.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenPiketTab}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka Halaman Penuh</span>
                      </button>
                    </div>
                  )}

                  {/* Tombol Logout Sesi Admin */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Akhiri Sesi Admin</span>
                      <span className="text-[11px] text-slate-500">Keluar dari mode admin untuk mengamankan akses sistem.</span>
                    </div>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SUB-MENU 2: KONFIGURASI URL APPS SCRIPT */}
              {activeAdminTab === 'config' && (
                <div className="space-y-4">
                  {/* Banner Server Storage */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-start space-x-3 text-xs text-emerald-900">
                    <Server className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Penyimpanan URL Terpusat</span>
                      URL tersimpan di server (<code className="font-mono text-emerald-800 bg-emerald-100 px-1 rounded">app-config.json</code>). Ketika monitor dibuka di perangkat lain (TV koridor, tablet piket, PC), link ini otomatis tersambung tanpa perlu input ulang.
                    </div>
                  </div>

                  {/* URL Aktif Saat Ini (Masking) */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <EyeOff className="w-4 h-4 text-slate-500" />
                        URL Aktif Saat Ini (Tersamar):
                      </span>
                    </div>

                    <div 
                      className="p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs break-all select-none border border-slate-800 relative cursor-not-allowed"
                      title="URL terlindungi"
                    >
                      <span className="text-slate-300">
                        {maskAppsScriptUrl(currentUrl)}
                      </span>
                    </div>
                  </div>

                  {/* Input Tempel URL Baru */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Tempel URL Deployment Baru Google Apps Script:
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                        className="w-full text-xs font-mono py-2.5 pl-3 pr-9 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-800"
                      />
                      <FileCode2 className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    </div>

                    {/* Tombol Uji Koneksi */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting || (!inputUrl.trim() && !currentUrl.trim())}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-800 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isTesting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600" />
                            <span>Menguji Koneksi...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                            <span>Uji Koneksi Data</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Hasil Uji Koneksi */}
                    {testResult && (
                      <div className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
                        testResult.success 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}>
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                    )}

                    {saveSuccessMessage && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center space-x-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{saveSuccessMessage}</span>
                      </div>
                    )}
                  </div>

                  {/* Salin Kode Apps Script Code.gs Terbaru */}
                  <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                        <FileCode2 className="w-4 h-4 text-indigo-400" />
                        <span>Kode Google Apps Script (Code.gs):</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyScript}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                      >
                        {copiedScript ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Skrip Code.gs</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-normal">
                      Salin kode di atas lalu tempelkan ke <strong>Apps Script Editor</strong> pada Google Spreadsheet Anda untuk mendukung penyimpanan data presensi ke sheet <code className="font-mono text-amber-300 bg-slate-800 px-1 py-0.5 rounded">attendancelogs</code>.
                    </p>
                  </div>
                </div>
              )}

              {/* SUB-MENU 3: DAFTAR USERNAME MASTERLOGIN */}
              {activeAdminTab === 'accounts' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-600" />
                        Daftar Akun Petugas & Admin (MasterLogin)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Data otomatis disinkronkan langsung dari tab <span className="font-mono font-semibold">MasterLogin</span> Google Spreadsheet.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full shrink-0">
                      {activeAccounts.length} Akun
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-[320px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px] sticky top-0">
                        <tr>
                          <th className="py-2 px-3">No</th>
                          <th className="py-2 px-3">Nama Petugas</th>
                          <th className="py-2 px-3">Jabatan</th>
                          <th className="py-2 px-3">Username</th>
                          <th className="py-2 px-3 text-center">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {activeAccounts.map((acc, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{acc.nama || '-'}</td>
                            <td className="py-2 px-3 text-slate-600">{acc.jabatan || '-'}</td>
                            <td className="py-2 px-3 font-mono font-bold text-indigo-600">{acc.username}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                acc.role?.toLowerCase().includes('super') 
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                  : acc.role?.toLowerCase().includes('piket')
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {acc.role || 'Admin'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer Tombol Tutup */}
        {isAuthenticated && (
          <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-500 font-mono">
              Status Server: Online (WIB)
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
            >
              Tutup Panel
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
