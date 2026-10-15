import React from 'react';
import { ViewTab } from '../types';
import { LayoutGrid, ListFilter, RefreshCw, Tv, Wifi, ShieldCheck } from 'lucide-react';

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
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between gap-4 h-13">
          {/* Zone 1: Single text element wordmark with school identity */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              G
            </div>
            <div className="leading-tight">
              <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap block">
                GuruLive Monitor
              </span>
              <span className="text-[10px] text-slate-400 font-normal block font-mono">
                Monitoring 23 Rombel
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
          </nav>

          {/* Zone 3: Live clock, Connection Indicator, TV Fullscreen Mode, Admin URL Lock & Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Connection Indicator */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              isLiveConnected
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                : 'bg-slate-800/80 text-slate-300 border-slate-700/60'
            }`}>
              <Wifi className={`w-3 h-3 ${isLiveConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="text-[11px] font-mono">
                {isLiveConnected ? 'Sheets Terhubung' : 'Data Lokal (Aktif)'}
              </span>
            </div>

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

            {/* Admin PIN-Protected URL Config Button */}
            {onOpenAdminModal && (
              <button
                onClick={onOpenAdminModal}
                title="Konfigurasi URL Backend Apps Script (Dilindungi PIN Pengawas)"
                className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline text-[11px] font-medium text-slate-300">Admin</span>
              </button>
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
            className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${currentTab === 'matrix' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Matriks 23 Kelas
          </button>
          <button
            onClick={() => onTabChange('feed')}
            className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${currentTab === 'feed' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Daftar Presensi
          </button>
          {onOpenAdminModal && (
            <button
              onClick={onOpenAdminModal}
              className="px-2 py-0.5 rounded text-emerald-400 flex items-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
