import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  Eye,
  Trash2,
  RefreshCw,
  Clock,
  RotateCcw,
  CheckCircle,
  XCircle,
  Ban,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Smartphone,
  Calendar,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { LicenseItem } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusBadge } from '../common/Badge.tsx';
import { Modal, ConfirmDialog } from '../common/Modal.tsx';

export function LicensesView() {
  const { setActiveTab, showToast } = useAuth();
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Actions / Modals State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<LicenseItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [extendType, setExtendType] = useState<'days' | 'lifetime' | 'custom'>('days');
  const [customExtendDate, setCustomExtendDate] = useState('');

  const [deleteCandidate, setDeleteCandidate] = useState<LicenseItem | null>(null);
  const [resetCandidate, setResetCandidate] = useState<LicenseItem | null>(null);

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const res = await api.getLicenses({
        search,
        status: statusFilter,
        page,
        limit,
      });
      if (res.success) {
        setLicenses(res.licenses);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      }
    } catch (err: any) {
      showToast('Error loading licenses', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLicenses();
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    showToast('Copied', `License key ${key} copied`, 'info');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleAction = async (
    id: number,
    action: 'activate' | 'deactivate' | 'ban' | 'unban' | 'reset_devices' | 'extend_expiry',
    extra?: any
  ) => {
    try {
      const res = await api.executeLicenseAction(id, action, extra);
      if (res.success) {
        showToast('Action Successful', res.message, 'success');
        fetchLicenses();
        if (selectedLicense && selectedLicense.id === id) {
          setSelectedLicense(res.license);
        }
      }
    } catch (err: any) {
      showToast('Action Failed', err.message, 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      const res = await api.deleteLicense(deleteCandidate.id);
      if (res.success) {
        showToast('License Deleted', 'License and all associated devices removed', 'success');
        fetchLicenses();
        setDeleteCandidate(null);
      }
    } catch (err: any) {
      showToast('Delete Failed', err.message, 'error');
    }
  };

  const confirmResetDevices = async () => {
    if (!resetCandidate) return;
    await handleAction(resetCandidate.id, 'reset_devices');
    setResetCandidate(null);
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicense) return;

    if (extendType === 'lifetime') {
      await handleAction(selectedLicense.id, 'extend_expiry', { days: null });
    } else if (extendType === 'custom' && customExtendDate) {
      await handleAction(selectedLicense.id, 'extend_expiry', { new_expiry: customExtendDate });
    } else {
      await handleAction(selectedLicense.id, 'extend_expiry', { days: extendDays });
    }
    setIsExtendModalOpen(false);
  };

  const handleExportCSV = () => {
    window.open('/api/v1/admin/export-csv', '_blank');
    showToast('Export Started', 'Downloading all license keys as CSV', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">License Key Management</h1>
          <p className="text-sm text-slate-400">
            Control, audit, extend, and ban licenses for ECLPISE DUMP Android client
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-300 bg-black/40 hover:bg-white/5 border border-white/10 rounded-lg backdrop-blur-md transition-all"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('generate')}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Generate New Keys</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search key or notes..."
            className="w-full pl-10 pr-4 py-2 bg-black/50 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
          />
        </form>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {['all', 'active', 'inactive', 'expired', 'banned'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border border-indigo-400/30'
                  : 'bg-black/40 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {st}
            </button>
          ))}

          <button
            onClick={fetchLicenses}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-black/40 border border-white/10 hover:bg-white/5 transition-colors ml-1"
            title="Reload table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Licenses Table */}
      <div className="bg-black/40 border border-white/5 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-black/20 text-slate-500 uppercase tracking-widest text-[10px] font-black">
                <th className="py-3.5 px-4">License Key</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created At</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4">Device Bound</th>
                <th className="py-3.5 px-4">Last Login</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
                    <span>Loading license repository...</span>
                  </td>
                </tr>
              ) : licenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <KeyRound className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-400">No licenses found</p>
                    <p className="text-[11px] text-slate-600 mt-1">Try changing filters or generate new keys</p>
                  </td>
                </tr>
              ) : (
                licenses.map((lic) => (
                  <tr key={lic.id} className="hover:bg-white/5 transition-colors group">
                    {/* Key with copy */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-100 tracking-wider">
                          {lic.plain_key || lic.key_display}
                        </span>
                        <button
                          onClick={() => copyToClipboard(lic.plain_key || lic.key_display)}
                          className="p-1 text-slate-500 hover:text-purple-400 rounded transition-colors"
                          title="Copy license key"
                        >
                          {copiedKey === (lic.plain_key || lic.key_display) ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {lic.notes && (
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">{lic.notes}</p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={lic.status} size="sm" />
                    </td>

                    {/* Created */}
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(lic.created_at).toLocaleDateString()}
                    </td>

                    {/* Expiry */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {lic.expires_at ? (
                        <span
                          className={`flex items-center gap-1 ${
                            new Date(lic.expires_at).getTime() < Date.now()
                              ? 'text-amber-400 font-semibold'
                              : 'text-slate-300'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {new Date(lic.expires_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-purple-400 font-semibold uppercase text-[11px] bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          Lifetime
                        </span>
                      )}
                    </td>

                    {/* Devices */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-semibold text-slate-200">
                          {lic.devices_used} / {lic.device_limit}
                        </span>
                      </div>
                    </td>

                    {/* Last Login */}
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {lic.last_login ? new Date(lic.last_login).toLocaleString() : 'Never'}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View details */}
                        <button
                          onClick={() => {
                            setSelectedLicense(lic);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Status Toggle (Activate / Deactivate) */}
                        {lic.status === 'active' ? (
                          <button
                            onClick={() => handleAction(lic.id, 'deactivate')}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-950/30 rounded-lg transition-colors"
                            title="Deactivate License"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : lic.status === 'inactive' ? (
                          <button
                            onClick={() => handleAction(lic.id, 'activate')}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30 rounded-lg transition-colors"
                            title="Activate License"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : null}

                        {/* Ban / Unban */}
                        {lic.status === 'banned' ? (
                          <button
                            onClick={() => handleAction(lic.id, 'unban')}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30 rounded-lg transition-colors"
                            title="Unban License"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(lic.id, 'ban')}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                            title="Ban License"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        {/* Reset Device Bindings */}
                        <button
                          onClick={() => setResetCandidate(lic)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-lg transition-colors"
                          title="Reset Device Bindings"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        {/* Extend Expiry */}
                        <button
                          onClick={() => {
                            setSelectedLicense(lic);
                            setIsExtendModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-950/30 rounded-lg transition-colors"
                          title="Extend Expiration"
                        >
                          <Clock className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteCandidate(lic)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Delete License"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs text-slate-400 bg-slate-950/40">
          <span>
            Showing <strong className="text-white">{licenses.length}</strong> of{' '}
            <strong className="text-white">{total}</strong> total licenses
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-slate-200">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* License Detail Modal */}
      {selectedLicense && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="License Key Details"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Key header card */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">License Identifier</p>
                <p className="font-mono text-base font-black text-purple-300 tracking-wider">
                  {selectedLicense.plain_key || selectedLicense.key_display}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(selectedLicense.plain_key || selectedLicense.key_display)}
                className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 font-semibold transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Key
              </button>
            </div>

            {/* Grid properties */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/60 border border-white/10">
                <span className="text-slate-500 block mb-1">Status:</span>
                <StatusBadge status={selectedLicense.status} />
              </div>

              <div className="p-3 rounded-xl bg-black/60 border border-white/10">
                <span className="text-slate-500 block mb-1">Device Limit:</span>
                <span className="font-bold text-white text-sm">
                  {selectedLicense.devices_used} / {selectedLicense.device_limit} Allowed
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/60 border border-white/10">
                <span className="text-slate-500 block mb-1">Expires On:</span>
                <span className="font-semibold text-slate-200">
                  {selectedLicense.expires_at
                    ? new Date(selectedLicense.expires_at).toLocaleString()
                    : 'Lifetime (Never Expires)'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/60 border border-white/10">
                <span className="text-slate-500 block mb-1">Last Validated:</span>
                <span className="font-semibold text-slate-200">
                  {selectedLicense.last_login
                    ? new Date(selectedLicense.last_login).toLocaleString()
                    : 'Never used'}
                </span>
              </div>
            </div>

            {/* Key Hash */}
            <div className="p-3 rounded-xl bg-black/60 border border-white/10">
              <span className="text-slate-500 block mb-1">SHA-256 Key Hash (Database Index):</span>
              <span className="font-mono text-[10px] text-indigo-300 break-all select-all">
                {selectedLicense.key_hash}
              </span>
            </div>

            {/* Notes */}
            {selectedLicense.notes && (
              <div className="p-3 rounded-xl bg-black/60 border border-white/10">
                <span className="text-slate-500 block mb-1">Administrator Notes:</span>
                <p className="text-slate-300 italic">{selectedLicense.notes}</p>
              </div>
            )}

            {/* Modal actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Extend Expiry Modal */}
      {selectedLicense && (
        <Modal
          isOpen={isExtendModalOpen}
          onClose={() => setIsExtendModalOpen(false)}
          title="Extend License Duration"
          maxWidth="md"
        >
          <form onSubmit={handleExtendSubmit} className="space-y-4 text-xs">
            <p className="text-slate-400">
              Extend validity for key <strong className="font-mono text-indigo-300">{selectedLicense.plain_key}</strong>
            </p>

            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Extension Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExtendType('days')}
                  className={`py-2 px-3 rounded-lg font-bold border transition-all ${
                    extendType === 'days'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]'
                      : 'bg-black/50 text-slate-400 border-white/10'
                  }`}
                >
                  Add Days
                </button>
                <button
                  type="button"
                  onClick={() => setExtendType('lifetime')}
                  className={`py-2 px-3 rounded-lg font-bold border transition-all ${
                    extendType === 'lifetime'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]'
                      : 'bg-black/50 text-slate-400 border-white/10'
                  }`}
                >
                  Make Lifetime
                </button>
                <button
                  type="button"
                  onClick={() => setExtendType('custom')}
                  className={`py-2 px-3 rounded-lg font-bold border transition-all ${
                    extendType === 'custom'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]'
                      : 'bg-black/50 text-slate-400 border-white/10'
                  }`}
                >
                  Custom Date
                </button>
              </div>
            </div>

            {extendType === 'days' && (
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Additional Days</label>
                <select
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-indigo-500"
                >
                  <option value={7}>+7 Days (1 Week)</option>
                  <option value={30}>+30 Days (1 Month)</option>
                  <option value={90}>+90 Days (3 Months)</option>
                  <option value={180}>+180 Days (6 Months)</option>
                  <option value={365}>+365 Days (1 Year)</option>
                </select>
              </div>
            )}

            {extendType === 'custom' && (
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">New Expiry Date</label>
                <input
                  type="date"
                  required
                  value={customExtendDate}
                  onChange={(e) => setCustomExtendDate(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsExtendModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-[0_0_15px_rgba(79,70,229,0.4)]"
              >
                Apply Extension
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={confirmDelete}
        title="Delete License Key"
        message={`Are you sure you want to permanently delete license ${deleteCandidate?.plain_key}? All associated Android device bindings and active sessions will be terminated.`}
        confirmLabel="Delete Key"
        isDangerous
      />

      {/* Confirm Reset Devices Dialog */}
      <ConfirmDialog
        isOpen={!!resetCandidate}
        onClose={() => setResetCandidate(null)}
        onConfirm={confirmResetDevices}
        title="Reset Device Bindings"
        message={`Reset all device bindings for key ${resetCandidate?.plain_key}? The user will be able to bind their new Android device on next login.`}
        confirmLabel="Reset Devices"
      />
    </div>
  );
}
