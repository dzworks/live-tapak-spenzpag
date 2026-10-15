import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Save, 
  Server, 
  EyeOff, 
  ShieldAlert,
  X,
  FileCode2
} from 'lucide-react';
import { maskAppsScriptUrl, getMaskVerificationSnippet } from '../utils/maskUrl';

interface AdminUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onUrlUpdated: (newUrl: string) => void;
}

export const AdminUrlModal: React.FC<AdminUrlModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onUrlUpdated,
}) => {
  // Autentikasi PIN
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Form URL
  const [inputUrl, setInputUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // Ganti PIN
  const [showChangePin, setShowChangePin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinChangeMessage, setPinChangeMessage] = useState('');

  if (!isOpen) return null;

  const handleVerifyPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('Masukkan PIN Pengawas');
      return;
    }

    setIsVerifyingPin(true);
    setPinError('');

    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
        setPinError('');
      } else {
        const data = await res.json().catch(() => ({}));
        setPinError(data.message || 'PIN salah. Silakan coba lagi.');
      }
    } catch {
      // Fallback jika offline/dev tanpa API server
      if (pinInput.trim() === '1234') {
        setIsAuthenticated(true);
        setPinError('');
      } else {
        setPinError('PIN salah (Bawaan: 1234)');
      }
    } finally {
      setIsVerifyingPin(false);
    }
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
    } catch (err: any) {
      // Fallback langsung fetch jika route proxy offline
      try {
        const directRes = await fetch(target);
        if (directRes.ok) {
          setTestResult({ success: true, message: 'Koneksi langsung berhasil! Data sheet terbaca.' });
        } else {
          setTestResult({ success: false, message: `HTTP status: ${directRes.status}` });
        }
      } catch {
        setTestResult({ success: false, message: 'Koneksi gagal atau diblokir CORS. Periksa izin deploy Apps Script.' });
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
        pin: pinInput.trim() || '1234',
      };
      if (showChangePin && newPin.trim().length >= 4) {
        payload.newPin = newPin.trim();
      }

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSaveSuccessMessage('URL backend berhasil disimpan permanen di server! Menyelaraskan seluruh device...');
        onUrlUpdated(cleanUrl);
        setInputUrl('');
        if (payload.newPin) {
          setPinChangeMessage('PIN berhasil diperbarui.');
          setPinInput(payload.newPin);
        }
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
      // Fallback update state client-side jika server offline
      onUrlUpdated(cleanUrl);
      setSaveSuccessMessage('URL tersimpan di memori frontend browser.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } finally {
      setIsSaving(false);
    }
  };

  const currentSnippet = getMaskVerificationSnippet(currentUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                Konfigurasi URL Backend Apps Script
              </h3>
              <p className="text-xs text-slate-400">
                Penyimpanan Permanen Server & Proteksi Akses Pengawas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten Modal */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Tahap 1: Verifikasi PIN Keamanan */}
          {!isAuthenticated ? (
            <div className="py-4 space-y-5">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                  <Lock className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Akses Dilindungi PIN</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Untuk mencegah perubahan sembarang orang di layar monitor atau perangkat umum, masukkan PIN Pengawas / Admin.
                </p>
              </div>

              <form onSubmit={handleVerifyPin} className="max-w-xs mx-auto space-y-3">
                <div className="relative">
                  <input
                    type="password"
                    maxLength={8}
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPinError('');
                    }}
                    placeholder="Masukkan 4-digit PIN"
                    className="w-full text-center text-2xl tracking-[0.4em] font-mono py-2.5 px-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold text-slate-800"
                    autoFocus
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>

                {pinError && (
                  <div className="flex items-center justify-center space-x-1.5 text-xs text-rose-600 bg-rose-50 py-1.5 px-3 rounded-lg border border-rose-200">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifyingPin}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
                >
                  {isVerifyingPin ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Buka Pengaturan</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-400 italic">
                  PIN bawaan sistem: <span className="font-mono font-semibold text-slate-600">1234</span>
                </p>
              </form>
            </div>
          ) : (
            /* Tahap 2: Manajemen URL & Masking */
            <div className="space-y-5 animate-in fade-in duration-200">

              {/* Banner Info Server-side Storage */}
              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-start space-x-3 text-xs text-emerald-900">
                <Server className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Tersimpan Permanen di Server Frontend</span>
                  Link yang dimasukkan di sini akan tertanam di konfigurasi server aplikasi (`app-config.json`). Ketika aplikasi dibuka di perangkat lain (TV koridor, tablet piket, PC), link ini otomatis aktif tanpa perlu input ulang.
                </div>
              </div>

              {/* Card 1: URL Aktif Saat Ini dengan Penyamaran (Masking 5 Karakter) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <EyeOff className="w-4 h-4 text-slate-500" />
                    URL Aktif Saat Ini (Tersamar / Anti Copy-Paste):
                  </span>
                  {currentSnippet && (
                    <span className="font-mono text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-bold">
                      Karakter Cek: {currentSnippet}
                    </span>
                  )}
                </div>

                {/* Box Masking Monospace */}
                <div 
                  className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs break-all select-none border border-slate-800 relative group cursor-not-allowed"
                  onCopy={(e) => {
                    e.preventDefault();
                  }}
                  title="Teks URL dilindungi dari copy-paste langsung"
                >
                  <span className="text-slate-400">
                    {maskAppsScriptUrl(currentUrl)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1 text-slate-500">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    Hanya 5 karakter sebelum <code className="bg-slate-200 px-1 py-0.2 rounded font-mono text-slate-700">/exec</code> yang ditampilkan demi keamanan.
                  </span>
                </div>
              </div>

              {/* Card 2: Input URL Baru */}
              <div className="space-y-2.5">
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
                <p className="text-[11px] text-slate-500">
                  Salin Web App URL dari dialog <span className="font-semibold text-slate-700">Deploy &gt; Manage deployments &gt; Web app URL</span> di Google Apps Script.
                </p>

                {/* Tombol Uji Koneksi */}
                <div className="flex items-center gap-2 pt-1">
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
                    <span>Uji Koneksi (Test Ping 6 Sheet)</span>
                  </button>
                </div>

                {/* Hasil Uji Koneksi */}
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

                {/* Pesan Sukses Simpan */}
                {saveSuccessMessage && (
                  <div className="p-2.5 rounded-lg text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saveSuccessMessage}</span>
                  </div>
                )}
              </div>

              {/* Card 3: Ganti PIN Pengawas (Opsional) */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowChangePin(!showChangePin)}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  <span>{showChangePin ? 'Tutup Pengaturan PIN' : 'Ingin Mengubah PIN Pengawas?'}</span>
                </button>

                {showChangePin && (
                  <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <label className="block text-slate-600 font-medium">
                      PIN Baru (Minimal 4 Angka):
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="Masukkan PIN baru"
                      className="w-48 py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono tracking-wider"
                    />
                    {pinChangeMessage && (
                      <p className="text-[11px] text-emerald-600 font-medium">{pinChangeMessage}</p>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer Tombol Aksi */}
        {isAuthenticated && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
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
