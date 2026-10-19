import React from 'react';
import { ViewTab, AdminSession } from '../types';
import { LayoutGrid, ListFilter, RefreshCw, Tv, Wifi, ShieldCheck, LogOut, FileText } from 'lucide-react';

interface TopNavProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  emptyClassCount: number;
  wibTime: string;
  isSyncing: boolean;
  onManualRefresh: () => void;
  isLiveConnected: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenAdminModal?: () => void;
  adminSession?: AdminSession | null;
  onLogout?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  onTabChange,
  emptyClassCount,
  wibTime,
  isSyncing,
  onManualRefresh,
  isLiveConnected,
  onToggleFullscreen,
  isFullscreen,
  onOpenAdminModal,
  adminSession,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between gap-4 h-13">
          {/* Zone 1: Single text element wordmark with school identity */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              T
            </div>
            <div className="leading-tight">
              <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap block">
                TAPAK Live Monitor
              </span>
              <span className="text-[10px] text-emerald-400 font-medium block font-mono">
                Versi 3.5.2
              </span>
            </div>
          </div>

          {/* Zone 2: Single-line text navigation links / segmented tabs */}
          <nav className="hidden md:flex items-center gap-1 p-0.5 bg-slate-950/70 rounded-lg border border-slate-800">
            <button
              onClick={() => onTabChange('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentTab === 'matrix'
                  ? 'bg-slate-800 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Matriks 23 Kelas</span>
            </button>

            <button
              onClick={() => onTabChange('feed')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentTab === 'feed'
                  ? 'bg-slate-800 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Daftar Presensi</span>
            </button>

            {adminSession && (
              <button
                onClick={() => onTabChange('reports')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentTab === 'reports'
                    ? 'bg-slate-800 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>Laporan KBM</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Live clock, Connection Indicator, TV Fullscreen Mode, Admin URL Lock & Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Connection Indicator */}
            <button
              type="button"
              onClick={onOpenAdminModal}
              title={isLiveConnected ? "Database Google Spreadsheet Terhubung (Klik untuk Kelola)" : "Belum Terhubung ke Spreadsheet (Klik untuk Konfigurasi)"}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isLiveConnected
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                  : 'bg-amber-950/60 text-amber-300 border-amber-700/60 hover:bg-amber-900/60'
              }`}
            >
              <Wifi className={`w-3 h-3 ${isLiveConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="text-[11px] font-mono">
                {isLiveConnected ? 'Sheets Terhubung' : 'Belum Terhubung (Klik)'}
              </span>
            </button>

            {/* Live Clock WIB */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 tabular-nums">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{wibTime}</span>
            </div>

            {/* TV / Fullscreen Mode Toggle */}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (TV / Kiosk Mode)'}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isFullscreen 
                    ? 'bg-indigo-600 text-white border-indigo-500' 
                    : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Admin Profile Badge / Login Button */}
            {onOpenAdminModal && (
              adminSession ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={onOpenAdminModal}
                    title={`Admin Aktif: ${adminSession.nama} (${adminSession.role || adminSession.jabatan}) - Klik untuk Pengaturan`}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700/90 rounded-lg border border-emerald-500/50 shadow-xs transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="hidden xl:inline text-[11px] font-semibold max-w-[120px] truncate text-slate-100">
                      {adminSession.nama}
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-500/40">
                      {adminSession.role || 'Admin'}
                    </span>
                  </button>

                  {onLogout && (
                    <button
                      onClick={onLogout}
                      title="Keluar / Logout Sesi Admin"
                      className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenAdminModal}
                  title="Login Administrator Sheet MasterLogin"
                  className="p-1.5 sm:px-2.5 sm:py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline text-[11px] font-medium text-slate-300">Login Admin</span>
                </button>
              )
            )}

            {/* Refresh Button */}
            <button
              onClick={onManualRefresh}
              disabled={isSyncing}
              title="Refresh Data Presensi"
              className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-1.5 border-t border-slate-800 text-xs">
          <button
            onClick={() => onTabChange('matrix')}
            className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${currentTab === 'matrix' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Matriks
          </button>
          <button
            onClick={() => onTabChange('feed')}
            className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${currentTab === 'feed' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Presensi
          </button>
          {adminSession && (
            <button
              onClick={() => onTabChange('reports')}
              className={`px-2 py-1 rounded-md cursor-pointer transition-colors flex items-center gap-1 ${currentTab === 'reports' ? 'bg-slate-800 text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <FileText className="w-3 h-3 text-rose-400" />
              <span>Laporan</span>
            </button>
          )}
          {onOpenAdminModal && (
            <button
              onClick={onOpenAdminModal}
              className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${
                adminSession ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>{adminSession ? (adminSession.role || 'Admin') : 'Admin'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
