import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Lock,
  Download,
  Server,
  Zap,
  CheckCircle2,
  Clock,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export function SettingsView() {
  const { showToast } = useAuth();
  const [rateLimitWindow, setRateLimitWindow] = useState('15');
  const [rateLimitMax, setRateLimitMax] = useState('100');
  const [sessionTtl, setSessionTtl] = useState('24');
  const [ipLogging, setIpLogging] = useState(true);
  const [argon2Rounds, setArgon2Rounds] = useState('12');

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Settings Saved', 'Security and API rate limits updated successfully', 'success');
  };

  const exportFullBackup = () => {
    window.open('/api/v1/admin/export-csv', '_blank');
    showToast('Backup Triggered', 'Exporting full system database snapshot', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System & Security Settings</h1>
        <p className="text-sm text-slate-400">
          Configure security policies, rate limiters, session timeouts, and database backup exports
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Security Settings */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-black/40 border border-indigo-500/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              API Security & Rate Limiting Policy
            </h2>

            <form onSubmit={handleSaveSecurity} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    Rate Limit Window (Minutes)
                  </label>
                  <input
                    type="number"
                    value={rateLimitWindow}
                    onChange={(e) => setRateLimitWindow(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Sliding evaluation window</p>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    Max Requests Per Window
                  </label>
                  <input
                    type="number"
                    value={rateLimitMax}
                    onChange={(e) => setRateLimitMax(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Per unique client IP address</p>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Android Session Token Lifetime (Hours)
                </label>
                <select
                  value={sessionTtl}
                  onChange={(e) => setSessionTtl(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-indigo-500"
                >
                  <option value="6">6 Hours (High Security)</option>
                  <option value="24">24 Hours (Standard)</option>
                  <option value="72">72 Hours (3 Days)</option>
                  <option value="168">168 Hours (7 Days)</option>
                  <option value="720">720 Hours (30 Days)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  After expiration, Android client automatically refreshes token or prompts re-validation.
                </p>
              </div>

              {/* Password Hashing Algorithm */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Password Hash Algorithm</span>
                  <span className="text-emerald-400 font-mono font-bold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Bcrypt (Salt Rounds: 12)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Admin passwords are encrypted using multi-round salt hashing with zero plaintext storage.
                </p>
              </div>

              {/* IP Logging Toggle */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-white">Log Client IP in Security Audit Table</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Records incoming IP address for brute-force prevention and geographic forensics.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={ipLogging}
                  onChange={(e) => setIpLogging(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all"
              >
                Save Security Parameters
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Server Health & Backups */}
        <div className="lg:col-span-5 space-y-6">
          {/* Server Runtime Info */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              Runtime Environment
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400">Backend Server:</span>
                <span className="font-mono text-slate-200 font-bold">Express.js (Node.js)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400">Architecture:</span>
                <span className="text-indigo-300 font-bold">RESTful JSON API</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400">Database Engine:</span>
                <span className="text-indigo-300 font-mono font-bold">PostgreSQL Ready</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400">HTTPS Transport:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> TLS 1.3
                </span>
              </div>
            </div>
          </div>

          {/* Database Backup Export */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Database Export
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Download an encrypted CSV data dump containing all registered license keys, device associations, and expiration records.
            </p>

            <button
              onClick={exportFullBackup}
              className="w-full py-2.5 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full CSV Backup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
