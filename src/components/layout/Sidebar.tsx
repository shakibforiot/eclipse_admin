import React from 'react';
import {
  LayoutDashboard,
  KeyRound,
  PlusCircle,
  Smartphone,
  FileText,
  GitBranch,
  Terminal,
  Code2,
  Database,
  Settings,
  User,
  LogOut,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { NavigationTab } from '../../types.ts';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { activeTab, setActiveTab, logout, admin } = useAuth();

  const navItems: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'licenses', label: 'License Keys', icon: KeyRound },
    { id: 'generate', label: 'Generate Key', icon: PlusCircle, badge: 'New' },
    { id: 'devices', label: 'Devices', icon: Smartphone },
    { id: 'logs', label: 'API Logs', icon: FileText },
    { id: 'app-version', label: 'App Versions', icon: GitBranch },
    { id: 'sandbox', label: 'API Sandbox', icon: Terminal, badge: 'Live' },
    { id: 'android-sdk', label: 'Android Java Client', icon: Code2 },
    { id: 'deployment', label: 'Postgres & Deploy', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'profile', label: 'Admin Profile', icon: User },
  ];

  const handleSelect = (id: NavigationTab) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md lg:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 border-r border-indigo-500/20 bg-black/40 backdrop-blur-xl flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Management & Security
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isActive ? (
                    <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8] animate-pulse" />
                  ) : (
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                  )}
                  <span className={isActive ? 'font-semibold text-indigo-200' : ''}>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                        isActive
                          ? 'bg-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Security Badge & Admin Shell */}
        <div className="p-4 border-t border-indigo-500/10 space-y-3 bg-black/20">
          <div
            onClick={() => handleSelect('profile')}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-indigo-500/20 cursor-pointer hover:bg-white/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-900/80 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm shadow-inner">
              {admin?.username ? admin.username.substring(0, 1).toUpperCase() : 'A'}
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-bold text-white truncate">{admin?.username || 'Admin Shell'}</p>
              <p className="text-[10px] text-indigo-400/70 uppercase tracking-widest truncate">
                {admin?.role || 'Superuser'}
              </p>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
          </div>

          <button
            id="sidebar-logout-button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>End Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
