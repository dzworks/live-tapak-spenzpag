import React, { useState } from 'react';
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
  BadgeCheck
} from 'lucide-react';
import { maskAppsScriptUrl, getMaskVerificationSnippet } from '../utils/maskUrl';
import { MasterLoginAccount, AdminSession } from '../types';
import { DEFAULT_MASTER_LOGIN } from '../data/initialData';

interface AdminUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onUrlUpdated: (newUrl: string) => void;
  masterLoginAccounts?: MasterLoginAccount[];
  adminSession: AdminSession | null;
  onLoginSuccess: (session: AdminSession) => void;
  onLogout: () => void;
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

  // Tab Tampilan Admin: 'config' (URL Backend) | 'accounts' (Daftar Akun MasterLogin) | 'guide' (Panduan Spreadsheet)
  const [activeAdminTab, setActiveAdminTab] = useState<'config' | 'accounts' | 'guide'>('config');

  // Ekspor konfigurasi permanen untuk GitHub / Vercel (Multi-Device)
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const activeUrlForExport = inputUrl.trim() || currentUrl.trim();

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
      return;
    }

    // 2. Coba cek ke backend API /api/verify-login jika berjalan di Node server
    try {
      const res = await fetch('/api/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.account) {
        const session: AdminSession = {
          username: data.account.username,
          nama: data.account.nama,
          jabatan: data.account.jabatan,
          role: data.account.role,
          loginAt: new Date().toISOString(),
        };
        onLoginSuccess(session);
        setUsernameInput('');
        setPasswordInput('');
        setIsLoggingIn(false);
        return;
      }
    } catch {
      // Offline / Static platform
    }

    // 3. Fallback akun default bawaan 'admin' / '123'
    if (cleanUser.toLowerCase() === 'admin' && (cleanPass === '123' || cleanPass === '1234')) {
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
      return;
    }

    setIsLoggingIn(false);
    setLoginError('Username atau Password tidak sesuai dengan database sheet MasterLogin.');
  };

  const handleTestConnection = async () => {
    const target = inputUrl.trim() || currentUrl.trim();
    if (!target) {
      setTestResult({ success: false, message: 'Masukkan URL deployment Apps Script terlebih dahulu' });
      return;
    }

    if (!target.includes('/exec')) {
      setTestResult({ success: false, message: 'URL harus diakhiri dengan /exec (Google Web App deployment)' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.status === 404 || res.status === 405 || !contentType.includes('application/json')) {
        throw new Error('Static host: bypass proxy');
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.detectedSheets || 'Koneksi sukses! Spreadsheet merespons dengan data 6 sheet valid.',
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Gagal tersambung. Pastikan Web App disetel "Anyone" (Siapa saja).',
        });
      }
    } catch {
      // Fallback langsung fetch jika route proxy offline (Vercel)
      try {
        const directRes = await fetch(target);
        if (directRes.ok) {
          const directData = await directRes.json().catch(() => ({}));
          const bundle = directData?.data || directData;
          const hasSheets = bundle && (bundle.schedules || bundle.Schedules || bundle.masterGuru || bundle.masterLogin);
          setTestResult({
            success: true,
            message: hasSheets ? 'Koneksi langsung berhasil! Data spreadsheet TAPAK terdeteksi valid.' : 'Koneksi berhasil terhubung ke Google Apps Script.',
          });
        } else {
          setTestResult({ success: false, message: `HTTP status Apps Script: ${directRes.status}` });
        }
      } catch {
        setTestResult({ success: false, message: 'Koneksi gagal atau diblokir CORS. Periksa izin deploy Web App (Who has access: Anyone).' });
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveUrl = async () => {
    const cleanUrl = inputUrl.trim();
    if (!cleanUrl) {
      setTestResult({ success: false, message: 'Isikan URL baru sebelum menyimpan.' });
      return;
    }

    if (!cleanUrl.includes('/exec')) {
      setTestResult({ success: false, message: 'URL deployment harus mengandung /exec' });
      return;
    }

    setIsSaving(true);
    setSaveSuccessMessage('');

    try {
      const payload: any = {
        scriptUrl: cleanUrl,
        isAuthorized: true,
        adminUser: adminSession?.username,
      };

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      const isStaticPlatform = res.status === 404 || res.status === 405 || !contentType.includes('application/json');

      if (isStaticPlatform) {
        localStorage.setItem('gurulive_apps_script_url', cleanUrl);
        setSaveSuccessMessage('URL backend berhasil disimpan ke browser! Menyelaraskan data...');
        onUrlUpdated(cleanUrl);
        setInputUrl('');
        setTimeout(() => {
          onClose();
        }, 1500);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        localStorage.setItem('gurulive_apps_script_url', cleanUrl);
        setSaveSuccessMessage('URL backend berhasil disimpan permanen di server! Menyelaraskan seluruh device...');
        onUrlUpdated(cleanUrl);
        setInputUrl('');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Gagal menyimpan konfigurasi ke server.',
        });
      }
    } catch {
      localStorage.setItem('gurulive_apps_script_url', cleanUrl);
      onUrlUpdated(cleanUrl);
      setSaveSuccessMessage('URL tersimpan di memori frontend browser.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyConfig = () => {
    const jsonStr = JSON.stringify({
      appsScriptUrl: activeUrlForExport,
      updatedAt: new Date().toISOString(),
      description: "File konfigurasi statis GuruLive Monitor untuk deployment GitHub & Vercel."
    }, null, 2);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(jsonStr);
    }
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2500);
  };

  const handleDownloadConfig = () => {
    const jsonStr = JSON.stringify({
      appsScriptUrl: activeUrlForExport,
      updatedAt: new Date().toISOString(),
      description: "File konfigurasi statis GuruLive Monitor untuk deployment GitHub & Vercel."
    }, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'app-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const appsScriptSnippet = `// Cuplikan Fungsi doGet() di Code.gs Google Apps Script:
function doGet(e) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Baca sheet MasterLogin
  var sheetLogin = ss.getSheetByName("MasterLogin");
  var masterLogin = [];
  if (sheetLogin) {
    var data = sheetLogin.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][2]) { // Kolom C: Username
        masterLogin.push({
          nama: String(data[i][0] || ''),      // Kolom A: Nama
          jabatan: String(data[i][1] || ''),   // Kolom B: Jabatan
          username: String(data[i][2] || ''),  // Kolom C: Username
          password: String(data[i][3] || ''),  // Kolom D: Password
          role: String(data[i][4] || 'Admin')  // Kolom E: Role
        });
      }
    }
  }

  var bundle = {
    masterGuru: getSheetData(ss, "MasterGuru"),
    masterMapel: getSheetData(ss, "MasterMapel"),
    classes: getSheetData(ss, "Classes"),
    masterRuangan: getSheetData(ss, "MasterRuangan"),
    schedules: getSheetData(ss, "Schedules"),
    attendanceLogs: getSheetData(ss, "AttendanceLogs"),
    masterLogin: masterLogin
  };

  return ContentService.createTextOutput(JSON.stringify({ status: "success", data: bundle }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopyScript = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(appsScriptSnippet);
    }
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const currentSnippet = getMaskVerificationSnippet(currentUrl);
  const activeAccounts = (masterLoginAccounts && masterLoginAccounts.length > 0)
    ? masterLoginAccounts
    : DEFAULT_MASTER_LOGIN;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                Panel Administrator
              </h3>
              <p className="text-xs text-slate-400">
                {isAuthenticated 
                  ? 'Terautentikasi melalui Sheet MasterLogin' 
                  : 'Login Kredensial Sheet MasterLogin Spreadsheet'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">

          {/* =========================================================================
              KONDISI 1: BELUM LOGIN -> FORMULIR USERNAME & PASSWORD
             ========================================================================= */}
          {!isAuthenticated ? (
            <div className="py-2 space-y-5">
              <div className="text-center space-y-1.5">
                <div className="w-13 h-13 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Autentikasi Administrator</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Masukkan <strong>Username</strong> dan <strong>Password</strong> yang terdaftar pada tab sheet <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono font-semibold">MasterLogin</code> di Google Spreadsheet Anda.
                </p>
              </div>

              {/* Form Input Username & Password */}
              <form onSubmit={handleLoginSubmit} className="max-w-sm mx-auto space-y-3.5">
                {/* Input Username */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Username:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => {
                        setUsernameInput(e.target.value);
                        setLoginError('');
                      }}
                      placeholder="Masukkan username Anda"
                      className="w-full text-xs py-2.5 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden text-slate-800 font-medium transition"
                      autoFocus
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Input Password dengan Toggle Mata */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setLoginError('');
                      }}
                      placeholder="Masukkan password Anda"
                      className="w-full text-xs py-2.5 pl-9 pr-10 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden text-slate-800 font-medium transition"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                      title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Pesan Kesalahan Login */}
                {loginError && (
                  <div className="flex items-start space-x-2 text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span className="leading-snug">{loginError}</span>
                  </div>
                )}

                {/* Tombol Submit Login */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Masuk Administrator</span>
                    </>
                  )}
                </button>

                {/* Info Database Sheet MasterLogin Terdeteksi */}
                <div className="pt-2 text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-[11px] text-slate-600 font-medium border border-slate-200">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{activeAccounts.length} Akun MasterLogin Terdaftar</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Akun default sistem: <span className="font-mono font-semibold text-slate-600">admin</span> / <span className="font-mono font-semibold text-slate-600">123</span>
                  </p>
                </div>
              </form>
            </div>
          ) : (
            /* =========================================================================
               KONDISI 2: SUDAH LOGIN -> PANEL PENGATURAN + DAFTAR AKUN + PANDUAN
               ========================================================================= */
            <div className="space-y-4 animate-in fade-in duration-200">

              {/* Profile Card Admin Aktif */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-bold text-sm">
                    {adminSession?.nama ? adminSession.nama.slice(0, 2).toUpperCase() : 'AD'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{adminSession?.nama || 'Administrator'}</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold">
                        {adminSession?.role || 'Admin'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {adminSession?.jabatan || 'Admin Sistem'} &bull; <span className="font-mono text-slate-400">@{adminSession?.username}</span>
                    </p>
                  </div>
                </div>

                {/* Tombol Logout */}
                <button
                  type="button"
                  onClick={onLogout}
                  title="Keluar dari sesi administrator"
                  className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>

              {/* Sub-Navigasi Tab Admin */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => setActiveAdminTab('config')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    activeAdminTab === 'config'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Server className="w-3.5 h-3.5 text-emerald-600" />
                  <span>URL Backend Apps Script</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAdminTab('accounts')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    activeAdminTab === 'accounts'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sheet MasterLogin ({activeAccounts.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAdminTab('guide')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    activeAdminTab === 'guide'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Kode Apps Script</span>
                </button>
              </div>

              {/* TAB 1: KONFIGURASI URL APPS SCRIPT */}
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
                      {currentSnippet && (
                        <span className="font-mono text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-bold">
                          Karakter Cek: {currentSnippet}
                        </span>
                      )}
                    </div>

                    <div 
                      className="p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs break-all select-none border border-slate-800 relative cursor-not-allowed"
                      title="URL terlindungi"
                    >
                      <span className="text-slate-300">
                        {maskAppsScriptUrl(currentUrl)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                      Hanya 5 karakter sebelum <code className="bg-slate-200 px-1 py-0.2 rounded font-mono text-slate-700">/exec</code> yang ditampilkan demi privasi.
                    </p>
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
                        disabled={isTesting || (!inputUrl && !currentUrl)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isTesting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span>Uji Koneksi (Test Ping Spreadsheet)</span>
                      </button>
                    </div>

                    {/* Feedback Uji & Simpan */}
                    {testResult && (
                      <div className={`p-2.5 rounded-lg text-xs flex items-start space-x-2 border ${
                        testResult.success 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-rose-50 border-rose-200 text-rose-800'
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
                      <div className="p-2.5 rounded-lg text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{saveSuccessMessage}</span>
                      </div>
                    )}
                  </div>

                  {/* Ekspor Konfigurasi Permanen GitHub / Vercel */}
                  <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-indigo-600" />
                        Jadikan Permanen Multi-Perangkat (GitHub & Vercel)
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-900 leading-relaxed">
                      Download file <code className="font-mono bg-indigo-100 px-1 py-0.2 rounded font-bold">app-config.json</code> dan letakkan di folder <code className="font-mono">public/</code> repo GitHub Anda agar otomatis aktif saat di-deploy ke Vercel.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCopyConfig}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-300 flex items-center gap-1 cursor-pointer transition"
                      >
                        {copiedConfig ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                        <span>{copiedConfig ? 'Tersalin!' : 'Salin JSON'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadConfig}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh app-config.json</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DAFTAR AKUN SHEET MASTERLOGIN */}
              {activeAdminTab === 'accounts' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Akun Terdaftar di Sheet MasterLogin</h5>
                      <p className="text-[11px] text-slate-500">
                        Data otomatis disinkronkan langsung dari tab <span className="font-mono font-semibold">MasterLogin</span> Google Spreadsheet.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                      {activeAccounts.length} Akun
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px]">
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

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-amber-950">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      Cara Menambah atau Mengubah Akun:
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      Buka Google Spreadsheet sekolah Anda, lalu buka tab sheet <strong>MasterLogin</strong>. Tambahkan baris baru dengan mengisi kolom: <em>Nama</em>, <em>Jabatan</em>, <em>Username</em>, <em>Password</em>, dan <em>Role</em>. Data akan otomatis terbaca saat sinkronisasi berikutnya!
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: PANDUAN DAN KODE APPS SCRIPT */}
              {activeAdminTab === 'guide' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Struktur Sheet MasterLogin & Kode Apps Script</h5>
                      <p className="text-[11px] text-slate-500">
                        Pastikan Google Apps Script Anda membaca sheet MasterLogin untuk autentikasi otomatis.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer transition"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
                      <span>{copiedScript ? 'Tersalin!' : 'Salin Cuplikan Script'}</span>
                    </button>
                  </div>

                  {/* Tabel Struktur Kolom Sheet */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <span className="font-bold text-slate-800 block">
                      Susunan Kolom pada Tab Sheet <code className="bg-slate-200 text-slate-900 px-1 py-0.5 rounded font-mono">MasterLogin</code>:
                    </span>
                    <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[11px]">
                      <div className="p-1.5 bg-white rounded border border-slate-300 font-bold text-slate-800">
                        Kolom A<br/><span className="text-emerald-700 font-sans font-semibold">Nama</span>
                      </div>
                      <div className="p-1.5 bg-white rounded border border-slate-300 font-bold text-slate-800">
                        Kolom B<br/><span className="text-emerald-700 font-sans font-semibold">Jabatan</span>
                      </div>
                      <div className="p-1.5 bg-white rounded border border-slate-300 font-bold text-slate-800">
                        Kolom C<br/><span className="text-indigo-700 font-sans font-semibold">Username</span>
                      </div>
                      <div className="p-1.5 bg-white rounded border border-slate-300 font-bold text-slate-800">
                        Kolom D<br/><span className="text-rose-700 font-sans font-semibold">Password</span>
                      </div>
                      <div className="p-1.5 bg-white rounded border border-slate-300 font-bold text-slate-800">
                        Kolom E<br/><span className="text-amber-700 font-sans font-semibold">Role</span>
                      </div>
                    </div>
                  </div>

                  {/* Kode Apps Script Viewer */}
                  <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 border border-slate-800">
                    <pre>{appsScriptSnippet}</pre>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer Tombol Aksi */}
        {isAuthenticated && activeAdminTab === 'config' && (
          <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handleSaveUrl}
              disabled={isSaving || !inputUrl.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan ke Server...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Permanen ke Server</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
