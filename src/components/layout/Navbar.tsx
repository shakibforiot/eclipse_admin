import React from 'react';
import { Shield, Radio, Terminal, Server, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export function Navbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { admin, logout, setActiveTab } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-indigo-500/20 bg-black/40 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Toggle sidebar menu"
          >
            <Terminal className="w-5 h-5" />
          </button>

          {/* Logo & Branding */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded bg-gradient-to-br from-purple-600 to-blue-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-transform">
              <span className="font-black text-white text-xs">ED</span>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#22c55e]"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 text-lg">
                  ECLIPSE DUMP
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Control
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Real-time API & Licensing Oversight</p>
            </div>
          </div>
        </div>

        {/* Status indicator & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="px-3.5 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
            <span className="text-[10px] uppercase font-black text-green-500 tracking-wider">
              API Status: Operational
            </span>
          </div>

          <button
            onClick={() => setActiveTab('sandbox')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all"
          >
            <Terminal className="w-3.5 h-3.5" />
            API Sandbox
          </button>

          {/* Admin User Badge */}
          <div className="flex items-center gap-3 pl-3 border-l border-indigo-500/10">
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2.5 text-left p-1.5 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-indigo-500/20"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-900/80 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shadow-inner">
                {admin?.username ? admin.username.substring(0, 1).toUpperCase() : 'A'}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-bold text-white leading-tight">{admin?.username || 'Admin Shell'}</p>
                <p className="text-[10px] text-indigo-400/70 uppercase tracking-widest">{admin?.role || 'Superuser'}</p>
              </div>
            </button>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl border border-transparent hover:border-rose-900/40 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
