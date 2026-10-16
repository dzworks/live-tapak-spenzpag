import React, { useState } from 'react';
import { 
  Database, 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Sparkles, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  FileCode2,
  Copy,
  Check
} from 'lucide-react';

interface InitialSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveUrl: (url: string) => void;
  onUseSampleData: () => void;
}

export const InitialSetupModal: React.FC<InitialSetupModalProps> = ({
  isOpen,
  onClose,
  onSaveUrl,
  onUseSampleData,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [isCopiedCode, setIsCopiedCode] = useState(false);

  if (!isOpen) return null;

  const trimmedUrl = urlInput.trim();
  const isExecUrl = trimmedUrl.includes('/exec');

  const handleTestConnection = async () => {
    if (!trimmedUrl) {
      setTestResult({
        success: false,
        message: 'Silakan tempelkan URL deployment Google Apps Script terlebih dahulu.',
      });
      return;
    }

    if (!isExecUrl) {
      setTestResult({
        success: false,
        message: 'URL harus berupa deployment Web App yang berakhiran /exec (bukan /edit).',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // 1. Coba lewat proxy backend lokal jika tersedia
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.status === 404 || res.status === 405 || !contentType.includes('application/json')) {
        throw new Error('Static host bypass');
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.detectedSheets || 'Koneksi berhasil! Database 6 sheet TAPAK terdeteksi aktif.',
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Gagal tersambung. Pastikan Web App disetel "Anyone" (Siapa saja).',
        });
      }
    } catch {
      // 2. Fallback fetch langsung jika di hosting statis (Vercel)
      try {
        const directRes = await fetch(trimmedUrl);
        if (directRes.ok) {
          const directData = await directRes.json().catch(() => ({}));
          const bundle = directData?.data || directData;
          const hasSheets = bundle && (bundle.schedules || bundle.Schedules || bundle.classes || bundle.masterGuru);
          setTestResult({
            success: true,
            message: hasSheets 
              ? 'Koneksi langsung sukses! Data 6 sheet TAPAK berhasil dibaca.' 
              : 'Koneksi berhasil terhubung ke Google Apps Script Web App.',
          });
        } else {
          setTestResult({
            success: false,
            message: `Server merespons status HTTP ${directRes.status}. Periksa deployment Apps Script Anda.`,
          });
        }
      } catch (err: any) {
        setTestResult({
          success: false,
          message: 'Koneksi gagal atau terblokir CORS. Pastikan "Who has access" disetel ke "Anyone" saat deploy.',
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndConnect = async () => {
    if (!trimmedUrl) {
      setTestResult({
        success: false,
        message: 'Masukkan URL deployment Apps Script sebelum menyimpan.',
      });
      return;
    }

    if (!isExecUrl) {
      setTestResult({
        success: false,
        message: 'URL deployment harus berakhiran /exec.',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Simpan ke server jika berjalan dengan server Node Express
      await fetch('/api/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptUrl: trimmedUrl, pin: '1234' }),
      }).catch(() => {});
    } catch {
      // Abaikan jika di hosting statis Vercel
    }

    // Simpan di browser localStorage
    localStorage.setItem('gurulive_apps_script_url', trimmedUrl);
    
    // Panggil handler di App.tsx untuk memperbarui state dan memulai fetch
    onSaveUrl(trimmedUrl);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto overflow-hidden text-slate-900 transition-all">
        {/* Header / Hero */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 sm:p-6 text-white relative">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <Database className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1.5">
                <Sparkles className="w-3 h-3" />
                Setup Awal GuruLive Monitor
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Hubungkan Backend Google Apps Script
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                Aplikasi belum terhubung ke database spreadsheet KBM. Tempelkan link Web App Google Apps Script Anda untuk sinkronisasi live 23 kelas.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Input Box */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-emerald-600" />
                Link Deployment Web App (Apps Script)
              </span>
              <span className="text-[11px] text-slate-600 font-normal">
                Wajib berakhiran <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">/exec</code>
              </span>
            </label>

            <div className="relative">
              <input
                type="url"
                value={urlInput}
                onChange={e => {
                  setUrlInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono rounded-xl border bg-slate-50 transition-all focus:outline-none focus:ring-2 ${
                  isExecUrl 
                    ? 'border-emerald-400 ring-emerald-500/20 bg-emerald-50/30 text-emerald-950'
                    : trimmedUrl
                    ? 'border-amber-400 ring-amber-500/20 bg-amber-50/20 text-slate-900'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-900'
                }`}
              />
              {isExecUrl && (
                <div className="absolute right-3 top-2.5 text-emerald-600 flex items-center gap-1 text-xs font-sans font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Format /exec Valid</span>
                </div>
              )}
            </div>

            {/* Test result message */}
            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed font-medium">
                  {testResult.message}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: Uji Koneksi & Simpan */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !trimmedUrl}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                trimmedUrl
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isTesting ? 'Menguji Koneksi...' : 'Uji Koneksi'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndConnect}
              disabled={isSaving || !trimmedUrl}
              className={`px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                trimmedUrl
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 hover:shadow-lg'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan & Hubungkan Dashboard'}</span>
            </button>
          </div>

          {/* Panduan Singkat Deploy Apps Script (Collapsible) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/70">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100/80 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                Panduan Singkat: Cara Deploy Apps Script (1 Menit)
              </span>
              {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showGuide && (
              <div className="p-4 pt-2 text-xs text-slate-600 space-y-2.5 border-t border-slate-200/80 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-0.5">1. Buka Apps Script</span>
                    Buka <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">script.google.com</a> dan buka proyek skrip Anda.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-0.5">2. Cek Spreadsheet ID</span>
                    Pastikan konstanta <code className="text-indigo-600 font-mono">SPREADSHEET_ID</code> pada <code className="font-mono">Code.gs</code> sudah diisi ID Spreadsheet Anda.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-0.5">3. Klik Deploy</span>
                    Klik tombol biru <strong>Deploy</strong> &gt; <strong>New deployment</strong> (Penerapan baru).
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-0.5">4. Pilih Jenis Web App</span>
                    Pilih ikon roda gigi &gt; <strong>Web app</strong>.
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 sm:col-span-2">
                    <span className="font-bold text-emerald-900 block mb-0.5">5. Pengaturan Akses (PENTING)</span>
                    Atur <strong>Execute as:</strong> <em>Me (Saya)</em> dan <strong>Who has access:</strong> <em>Anyone (Siapa saja)</em> agar data dapat dibaca oleh monitor tanpa login berulang.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
                    <span className="font-bold text-slate-800 block mb-0.5">6. Salin Web App URL</span>
                    Klik tombol <strong>Deploy</strong>, lalu salin URL yang berakhiran <code className="text-indigo-600 font-mono">/exec</code> dan tempelkan pada kolom di atas.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Opsi Lewati / Demo Mode */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Belum memiliki link deployment saat ini?</span>
            <button
              type="button"
              onClick={onUseSampleData}
              className="text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
            >
              Gunakan Data Contoh (Mode Demo) &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
