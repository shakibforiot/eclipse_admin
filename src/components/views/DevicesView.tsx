import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Search,
  RefreshCw,
  RotateCcw,
  KeyRound,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle,
  Laptop,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { DeviceItem } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusBadge } from '../common/Badge.tsx';
import { ConfirmDialog } from '../common/Modal.tsx';

export function DevicesView() {
  const { showToast } = useAuth();
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unbindCandidate, setUnbindCandidate] = useState<DeviceItem | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await api.getDevices();
      if (res.success) {
        setDevices(res.devices);
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const confirmUnbind = async () => {
    if (!unbindCandidate) return;
    try {
      const res = await api.unbindDevice(unbindCandidate.id);
      if (res.success) {
        showToast('Device Unbound', 'Device binding has been removed from this license', 'success');
        fetchDevices();
        setUnbindCandidate(null);
      }
    } catch (err: any) {
      showToast('Unbind Failed', err.message, 'error');
    }
  };

  const filteredDevices = devices.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      (d.license_display && d.license_display.toLowerCase().includes(q)) ||
      (d.device_binding && d.device_binding.toLowerCase().includes(q)) ||
      (d.device_model && d.device_model.toLowerCase().includes(q)) ||
      (d.ip_address && d.ip_address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Active Devices & Bindings</h1>
          <p className="text-sm text-slate-400">
            Audit hardware bindings, inspect Android device connections, and unbind devices
          </p>
        </div>

        <button
          onClick={fetchDevices}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-300 bg-black/40 hover:bg-white/5 border border-white/10 rounded-lg backdrop-blur-md transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search & Overview */}
      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by license key, device hash, or IP..."
            className="w-full pl-10 pr-4 py-2 bg-black/50 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-semibold">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            Total Bound Devices: <strong className="text-white font-bold">{devices.length}</strong>
          </span>
        </div>
      </div>

      {/* Devices List Table */}
      <div className="bg-black/40 border border-white/5 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-black/20 text-slate-500 uppercase tracking-widest text-[10px] font-black">
                <th className="py-3.5 px-4">Device / Hardware</th>
                <th className="py-3.5 px-4">Associated License</th>
                <th className="py-3.5 px-4">Device Binding Hash</th>
                <th className="py-3.5 px-4">App Version</th>
                <th className="py-3.5 px-4">First Seen</th>
                <th className="py-3.5 px-4">Last Active</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
                    <span>Loading registered devices...</span>
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Smartphone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-400">No registered devices</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Devices will automatically register here upon first Android application login.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-white/5 transition-colors">
                    {/* Device info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{dev.device_model || 'Android Device'}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{dev.ip_address || 'Unknown IP'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Associated License */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-mono font-bold text-indigo-300">
                          {dev.license_display || 'License #' + dev.license_id}
                        </span>
                      </div>
                    </td>

                    {/* Device Binding Hash */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] text-slate-400 bg-black/60 px-2 py-1 rounded border border-white/10 select-all block truncate max-w-[200px]" title={dev.device_binding}>
                        {dev.device_binding}
                      </span>
                    </td>

                    {/* App Version */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-slate-300 bg-black/60 px-2 py-0.5 rounded text-[11px] border border-white/10">
                        v{dev.app_version || '1.0.0'}
                      </span>
                    </td>

                    {/* First Seen */}
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(dev.first_seen).toLocaleDateString()}
                    </td>

                    {/* Last Seen */}
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {new Date(dev.last_seen).toLocaleString()}
                    </td>

                    {/* Actions: Unbind / Reset */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setUnbindCandidate(dev)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 inline-flex items-center gap-1.5 transition-colors"
                        title="Unbind this device slot"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Unbind</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Unbind Dialog */}
      <ConfirmDialog
        isOpen={!!unbindCandidate}
        onClose={() => setUnbindCandidate(null)}
        onConfirm={confirmUnbind}
        title="Unbind Android Device"
        message={`Are you sure you want to unbind device ${unbindCandidate?.device_model || 'Android'} (${unbindCandidate?.device_binding.substring(0, 12)}...)? This frees up 1 device slot on license ${unbindCandidate?.license_display}.`}
        confirmLabel="Unbind Device"
      />
    </div>
  );
}
