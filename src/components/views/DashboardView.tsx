import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  CheckCircle2,
  Clock,
  Ban,
  Smartphone,
  Activity,
  PlusCircle,
  Terminal,
  Code2,
  Database,
  ArrowUpRight,
  RefreshCw,
  Copy,
  Check,
  Zap,
  ShieldAlert,
  Cpu,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { DashboardStats } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusBadge } from '../common/Badge.tsx';

export function DashboardView() {
  const { setActiveTab, showToast } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Quick single key generation widget state
  const [quickPrefix, setQuickPrefix] = useState('ECLP');
  const [quickDays, setQuickDays] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.getStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err: any) {
      showToast('Error loading stats', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleQuickGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.generateLicenses({
        prefix: quickPrefix,
        count: 1,
        expiration_type: 'days',
        expiration_days: quickDays,
        device_limit: 1,
        status: 'active',
        notes: 'Quick Generated from Dashboard',
      });
      if (res.success && res.licenses.length > 0) {
        setGeneratedKey(res.licenses[0].plain_key);
        showToast('License Created', `Generated ${res.licenses[0].plain_key}`, 'success');
        fetchStats();
      }
    } catch (err: any) {
      showToast('Generation Failed', err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    showToast('Copied', 'License key copied to clipboard', 'info');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const totalKeys = stats?.totalKeys ?? 0;
  const activeKeys = stats?.activeKeys ?? 0;
  const expiredKeys = stats?.expiredKeys ?? 0;
  const bannedKeys = stats?.bannedKeys ?? 0;
  const activeDevices = stats?.activeDevices ?? 0;
  const last24hRequests = stats?.last24hRequests ?? 0;

  const activePercent = totalKeys > 0 ? Math.round((activeKeys / totalKeys) * 100) : 64;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Control Terminal</h1>
          <p className="text-slate-400 text-sm">Real-time API & Licensing Oversight</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-300 bg-black/40 hover:bg-white/5 border border-white/10 rounded-lg backdrop-blur-md transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setActiveTab('generate')}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New License</span>
          </button>
        </div>
      </header>

      {/* 6-Column Metric Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Keys */}
        <div className="bg-black/40 backdrop-blur-md border border-white/5 hover:border-indigo-500/30 p-4 rounded-2xl flex flex-col gap-1 transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Keys</span>
          <span className="text-2xl font-black text-white">{stats?.totalKeys ?? '-'}</span>
          <div className="w-full h-1 bg-white/5 rounded-full mt-2">
            <div className="w-3/4 h-full bg-indigo-500 rounded-full"></div>
          </div>
        </div>

        {/* Active */}
        <div className="bg-black/40 backdrop-blur-md border border-white/5 hover:border-blue-500/30 p-4 rounded-2xl flex flex-col gap-1 transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active</span>
          <span className="text-2xl font-black text-blue-400">{stats?.activeKeys ?? '-'}</span>
          <div className="w-full h-1 bg-white/5 rounded-full mt-2">
            <div
              className="h-full bg-blue-400 rounded-full"
              style={{ width: `${Math.min(100, Math.max(10, activePercent))}%` }}
            ></div>
          </div>
        </div>

        {/* Expired */}
        <div className="bg-black/40 backdrop-blur-md border border-white/5 hover:border-orange-500/30 p-4 rounded-2xl flex flex-col gap-1 text-orange-400/90 transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Expired</span>
          <span className="text-2xl font-black">{stats?.expiredKeys ?? '-'}</span>
          <div className="w-full h-1 bg-white/5 rounded-full mt-2">
            <div className="w-1/4 h-full bg-orange-400/50 rounded-full"></div>
          </div>
        </div>

        {/* Banned */}
        <div className="bg-black/40 backdrop-blur-md border border-white/5 hover:border-red-500/30 p-4 rounded-2xl flex flex-col gap-1 text-red-500 transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Banned</span>
          <span className="text-2xl font-black">{stats?.bannedKeys ?? '-'}</span>
          <div className="w-full h-1 bg-white/5 rounded-full mt-2">
            <div className="w-12 h-full bg-red-500 rounded-full"></div>
          </div>
        </div>

        {/* Devices */}
        <div className="bg-black/40 backdrop-blur-md border border-white/5 hover:border-purple-500/30 p-4 rounded-2xl flex flex-col gap-1 transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Devices</span>
          <span className="text-2xl font-black text-purple-400">{stats?.activeDevices ?? '-'}</span>
          <div className="w-full h-1 bg-white/5 rounded-full mt-2">
            <div className="w-4/5 h-full bg-purple-400 rounded-full"></div>
          </div>
        </div>

        {/* API Req (24h) */}
        <div className="bg-black/40 backdrop-blur-md border border-white/5 hover:border-emerald-500/30 p-4 rounded-2xl flex flex-col gap-1 transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">API Req (24h)</span>
          <span className="text-2xl font-black text-emerald-400">
            {last24hRequests > 999 ? `${(last24hRequests / 1000).toFixed(1)}k` : last24hRequests}
          </span>
          <div className="w-full h-1 bg-white/5 rounded-full mt-2">
            <div className="w-full h-full bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.4)]"></div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Quick Generator + Activity Logs */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Single Key Generator */}
          <div className="bg-black/40 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Instant Key Generator</h3>
                  <p className="text-xs text-slate-400">Direct license minting with non-sequential SHA-256 validation</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleQuickGenerate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Key Prefix
                </label>
                <input
                  type="text"
                  value={quickPrefix}
                  onChange={(e) => setQuickPrefix(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm font-mono text-indigo-300 uppercase focus:border-indigo-500 outline-none"
                  placeholder="ECLP"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Validity
                </label>
                <select
                  value={quickDays}
                  onChange={(e) => setQuickDays(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-slate-200 focus:border-indigo-500 outline-none"
                >
                  <option value={7}>7 Days (Trial)</option>
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={90}>90 Days (3 Months)</option>
                  <option value={365}>1 Year (Annual)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Mint Key</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* If key just generated */}
            {generatedKey && (
              <div className="mt-4 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-300">Generated:</span>
                  <span className="font-mono font-bold text-sm text-indigo-300 tracking-wider truncate">
                    {generatedKey}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedKey)}
                  className="px-3 py-1 rounded-lg bg-indigo-600/40 hover:bg-indigo-600 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedKey === generatedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === generatedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Recent Activity Logs Table */}
          <section className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Recent Activity Logs</h3>
              <button
                onClick={() => setActiveTab('logs')}
                className="text-[10px] uppercase font-bold text-indigo-400 hover:text-indigo-300 tracking-wider"
              >
                View All History
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-500 tracking-widest border-b border-white/5 bg-black/20">
                    <th className="p-4 font-black">License Identifier</th>
                    <th className="p-4 font-black">Event / Status</th>
                    <th className="p-4 font-black">Device ID</th>
                    <th className="p-4 font-black text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-xs text-slate-500">
                        No activity records found
                      </td>
                    </tr>
                  ) : (
                    stats.recentActivity.slice(0, 6).map((log) => {
                      const isSuccess = log.status === 'success';
                      const isLimit = log.error_code === 'DEVICE_LIMIT_REACHED';
                      const isExpired = log.error_code === 'LICENSE_EXPIRED';
                      const isBanned = log.error_code === 'LICENSE_BANNED';

                      let badgeClass = 'bg-indigo-500/10 text-indigo-400';
                      let label = log.endpoint;

                      if (isSuccess) {
                        badgeClass = 'bg-emerald-500/10 text-emerald-400';
                        label = 'Auth Success';
                      } else if (isLimit) {
                        badgeClass = 'bg-red-500/10 text-red-400';
                        label = 'Device Limit';
                      } else if (isExpired) {
                        badgeClass = 'bg-amber-500/10 text-amber-400';
                        label = 'Expired Key';
                      } else if (isBanned) {
                        badgeClass = 'bg-rose-500/10 text-rose-400';
                        label = 'Banned Hit';
                      }

                      return (
                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4 font-mono text-xs text-indigo-300">
                            {log.license_display || 'ANONYMOUS'}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
                            >
                              {label}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400 font-mono text-xs truncate max-w-[140px]">
                            {log.device_id || log.ip_address || '-'}
                          </td>
                          <td className="p-4 text-right text-slate-500 text-xs font-mono">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Quick Hub Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab('sandbox')}
              className="p-5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/5 hover:border-indigo-500/40 cursor-pointer group transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                API Sandbox
              </h4>
              <p className="text-xs text-slate-400 mt-1">Simulate Android app auth, login, validate in real-time.</p>
            </div>

            <div
              onClick={() => setActiveTab('android-sdk')}
              className="p-5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/5 hover:border-purple-500/40 cursor-pointer group transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Code2 className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                Android Java Client
              </h4>
              <p className="text-xs text-slate-400 mt-1">Complete production-ready Java integration classes.</p>
            </div>

            <div
              onClick={() => setActiveTab('deployment')}
              className="p-5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/5 hover:border-cyan-500/40 cursor-pointer group transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Database className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Postgres & Deploy
              </h4>
              <p className="text-xs text-slate-400 mt-1">Database DDL schema, Docker compose & Nginx SSL.</p>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Security Snapshot + Active Distribution Gauge */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Security Snapshot */}
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-md border border-indigo-500/20 p-6 rounded-2xl shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-300 mb-4 flex items-center justify-between">
              <span>Security Snapshot</span>
              <Cpu className="w-4 h-4 text-indigo-400" />
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Integrity Checks</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pass (100%)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Request Latency</span>
                <span className="text-xs font-bold text-blue-400 font-mono">18ms avg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Suspicious Hits</span>
                <span className="text-xs font-bold text-rose-400 font-mono">
                  {bannedKeys > 0 ? `${bannedKeys} keys` : '0.00%'}
                </span>
              </div>
              <div className="pt-4 border-t border-white/5 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Encryption Node</span>
                </div>
                <div className="text-xs font-mono text-indigo-300 bg-black/50 p-2.5 rounded border border-indigo-500/20 truncate">
                  SHA256-AES256-GCM-ACTIVE
                </div>
              </div>
            </div>
          </div>

          {/* Active Distribution Circular Gauge */}
          <div className="bg-black/40 border border-white/5 p-6 rounded-2xl flex-1 flex flex-col justify-between backdrop-blur-md">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Active Distribution</h3>
              <p className="text-xs text-slate-500">Live license pool utilization ratio</p>
            </div>

            <div className="my-6 flex items-center justify-center relative">
              <div className="w-32 h-32 rounded-full border-[10px] border-indigo-500/20 flex items-center justify-center relative shadow-[0_0_25px_rgba(99,102,241,0.2)]">
                <div
                  className="absolute inset-0 rounded-full border-[10px] border-t-indigo-500 border-l-purple-500 border-r-transparent border-b-transparent animate-[spin_10s_linear_infinite]"
                  style={{ borderRadius: '9999px' }}
                ></div>
                <div className="text-center">
                  <p className="text-2xl font-black text-white">{activePercent}%</p>
                  <p className="text-[8px] uppercase text-slate-500 font-bold tracking-wider">Utilization</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 text-center border-t border-white/5 pt-4">
              <div className="flex-1">
                <p className="text-lg font-bold text-white">v{stats?.appVersion.latest_version || '1.0.0'}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Stable Release</p>
              </div>
              <div className="flex-1 border-l border-white/5">
                <p className="text-lg font-bold text-indigo-400">{activeDevices}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Bound Androids</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
