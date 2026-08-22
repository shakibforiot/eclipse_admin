import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Trash2,
  Filter,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Activity,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { ApiLogItem } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusBadge } from '../common/Badge.tsx';
import { ConfirmDialog } from '../common/Modal.tsx';

export function ApiLogsView() {
  const { showToast } = useAuth();
  const [logs, setLogs] = useState<ApiLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getLogs({
        search,
        status: statusFilter,
        limit: 150,
      });
      if (res.success) {
        setLogs(res.logs);
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const confirmClearLogs = async () => {
    try {
      const res = await api.clearLogs();
      if (res.success) {
        showToast('Logs Cleared', res.message, 'success');
        setLogs([]);
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Security & API Audit Logs</h1>
          <p className="text-sm text-slate-400">
            Real-time audit log of all license authentication, session validation, and failure attempts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsClearDialogOpen(true)}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg backdrop-blur-md transition-all disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Logs
          </button>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-300 bg-black/40 hover:bg-white/5 border border-white/10 rounded-lg backdrop-blur-md transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col sm:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search endpoint, error code, key, or IP..."
            className="w-full pl-10 pr-4 py-2 bg-black/50 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {['all', 'success', 'failed', 'blocked'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border border-indigo-400/30'
                  : 'bg-black/40 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-black/40 border border-white/5 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-black/20 text-slate-500 uppercase tracking-widest text-[10px] font-black">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Endpoint</th>
                <th className="py-3.5 px-4">Outcome</th>
                <th className="py-3.5 px-4">License Identifier</th>
                <th className="py-3.5 px-4">Device ID / IP</th>
                <th className="py-3.5 px-4">App Version</th>
                <th className="py-3.5 px-4">Error / Reason</th>
                <th className="py-3.5 px-4 text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
                    <span>Loading security logs...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-400">No logs found</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      API requests to authentication endpoints will be recorded here automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    {/* Endpoint */}
                    <td className="py-3 px-4 text-indigo-300 font-bold text-[11px]">
                      {log.endpoint}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 font-sans">
                      <StatusBadge status={log.status} size="sm" />
                    </td>

                    {/* License display */}
                    <td className="py-3 px-4 text-slate-200">
                      {log.license_display ? (
                        <span className="bg-black/60 px-2 py-0.5 rounded border border-white/10 text-indigo-300 font-bold">
                          {log.license_display}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-sans italic text-[11px]">N/A</span>
                      )}
                    </td>

                    {/* Device / IP */}
                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      <div>
                        {log.device_id && <p className="text-slate-300 truncate max-w-[140px]">{log.device_id}</p>}
                        <p className="text-[10px] text-slate-500">{log.ip_address || '127.0.0.1'}</p>
                      </div>
                    </td>

                    {/* App Version */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {log.app_version ? `v${log.app_version}` : 'N/A'}
                    </td>

                    {/* Error Code */}
                    <td className="py-3 px-4">
                      {log.error_code ? (
                        <span className="text-rose-400 font-bold text-[10px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                          {log.error_code}
                        </span>
                      ) : (
                        <span className="text-emerald-400/80 text-[10px]">AUTH_OK</span>
                      )}
                    </td>

                    {/* Latency */}
                    <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                      {log.response_time_ms !== undefined ? `${log.response_time_ms}ms` : '<1ms'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear Logs Confirm Dialog */}
      <ConfirmDialog
        isOpen={isClearDialogOpen}
        onClose={() => setIsClearDialogOpen(false)}
        onConfirm={confirmClearLogs}
        title="Clear Security Logs"
        message="Are you sure you want to delete all historical API audit logs? This action cannot be undone."
        confirmLabel="Clear All Logs"
        isDangerous
      />
    </div>
  );
}
