import React, { useState } from 'react';
import {
  KeyRound,
  PlusCircle,
  Copy,
  Check,
  Download,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { LicenseItem } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusBadge } from '../common/Badge.tsx';

export function GenerateKeyView() {
  const { showToast } = useAuth();

  // Generator Form State
  const [prefix, setPrefix] = useState('ECLP');
  const [count, setCount] = useState(5);
  const [expirationType, setExpirationType] = useState<'days' | 'lifetime' | 'custom'>('days');
  const [expirationDays, setExpirationDays] = useState(30);
  const [customExpiry, setCustomExpiry] = useState('');
  const [deviceLimit, setDeviceLimit] = useState(1);
  const [initialStatus, setInitialStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [generatedLicenses, setGeneratedLicenses] = useState<LicenseItem[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.generateLicenses({
        prefix: prefix.trim().toUpperCase() || 'ECLP',
        count,
        expiration_type: expirationType,
        expiration_days: expirationDays,
        custom_expiry: expirationType === 'custom' ? customExpiry : null,
        device_limit: deviceLimit,
        status: initialStatus,
        notes: notes.trim(),
      });

      if (res.success && res.licenses) {
        setGeneratedLicenses(res.licenses);
        showToast('Generation Successful', res.message, 'success');
      } else {
        showToast('Generation Failed', res.error || 'Failed to create licenses', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyIndividual = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    showToast('Copied', key, 'info');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const copyAllKeys = () => {
    const keysText = generatedLicenses.map((l) => l.plain_key || l.key_display).join('\n');
    navigator.clipboard.writeText(keysText);
    setAllCopied(true);
    showToast('All Keys Copied', `${generatedLicenses.length} keys copied to clipboard`, 'success');
    setTimeout(() => setAllCopied(false), 2500);
  };

  const exportBatchCSV = () => {
    const rows = [
      ['License Key', 'Status', 'Device Limit', 'Expires At', 'Notes', 'Created At'],
      ...generatedLicenses.map((l) => [
        l.plain_key || l.key_display,
        l.status,
        l.device_limit,
        l.expires_at || 'Lifetime',
        `"${(l.notes || '').replace(/"/g, '""')}"`,
        l.created_at,
      ]),
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `eclipsedump-generated-keys-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">License Key Generator</h1>
        <p className="text-sm text-slate-400">
          Generate cryptographically secure randomized activation keys for ECLPISE DUMP
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              Configure Batch Parameters
            </h2>

            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              {/* Prefix & Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    Key Prefix
                  </label>
                  <input
                    type="text"
                    required
                    value={prefix}
                    maxLength={6}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                    placeholder="ECLP"
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-sm text-white focus:border-indigo-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">e.g. ECLP, PRO, VIP</p>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    Quantity (1 - 100)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm font-semibold text-white focus:border-indigo-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Batch count</p>
                </div>
              </div>

              {/* Expiry selector */}
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Expiration Policy
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setExpirationType('days')}
                    className={`py-2 px-2 rounded-lg font-bold border transition-all text-center ${
                      expirationType === 'days'
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]'
                        : 'bg-black/50 text-slate-400 border-white/10 hover:text-slate-200'
                    }`}
                  >
                    Preset Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpirationType('lifetime')}
                    className={`py-2 px-2 rounded-lg font-bold border transition-all text-center ${
                      expirationType === 'lifetime'
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]'
                        : 'bg-black/50 text-slate-400 border-white/10 hover:text-slate-200'
                    }`}
                  >
                    Lifetime (Forever)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpirationType('custom')}
                    className={`py-2 px-2 rounded-lg font-bold border transition-all text-center ${
                      expirationType === 'custom'
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]'
                        : 'bg-black/50 text-slate-400 border-white/10 hover:text-slate-200'
                    }`}
                  >
                    Custom Date
                  </button>
                </div>

                {expirationType === 'days' && (
                  <select
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-indigo-500"
                  >
                    <option value={7}>7 Days (Trial Key)</option>
                    <option value={14}>14 Days (2 Weeks)</option>
                    <option value={30}>30 Days (1 Month)</option>
                    <option value={90}>90 Days (Quarterly / 3 Months)</option>
                    <option value={180}>180 Days (Half-Year / 6 Months)</option>
                    <option value={365}>365 Days (1 Year / Annual)</option>
                  </select>
                )}

                {expirationType === 'custom' && (
                  <input
                    type="date"
                    required
                    value={customExpiry}
                    onChange={(e) => setCustomExpiry(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-indigo-500"
                  />
                )}
              </div>

              {/* Device Limit & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                    Device Limit
                  </label>
                  <select
                    value={deviceLimit}
                    onChange={(e) => setDeviceLimit(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-indigo-500"
                  >
                    <option value={1}>1 Device (Standard)</option>
                    <option value={2}>2 Devices (Dual)</option>
                    <option value={3}>3 Devices</option>
                    <option value={5}>5 Devices (Multi-Device)</option>
                    <option value={10}>10 Devices (Team)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Initial Status
                  </label>
                  <select
                    value={initialStatus}
                    onChange={(e) => setInitialStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active (Ready to Use)</option>
                    <option value="inactive">Inactive (Disabled)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  Internal Tag / Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Reseller Order #481, Discord VIP Buyer..."
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Format Preview Info */}
              <div className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] text-slate-400">
                <span className="text-slate-500 block mb-0.5">Sample Key Format:</span>
                <span className="font-mono text-indigo-300 font-bold tracking-wider">
                  {prefix || 'ECLP'}-7K9D-X2MQ-8P4A
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate {count} Cryptographic {count === 1 ? 'Key' : 'Keys'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-white/5">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Generated Key Output
                </h2>
                <p className="text-xs text-slate-400">
                  {generatedLicenses.length > 0
                    ? `${generatedLicenses.length} license keys created and stored in database`
                    : 'Generated keys will be shown here ready for export and distribution'}
                </p>
              </div>

              {generatedLicenses.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyAllKeys}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 hover:bg-indigo-600/50 flex items-center gap-1.5 transition-colors"
                  >
                    {allCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{allCopied ? 'All Copied' : 'Copy All'}</span>
                  </button>

                  <button
                    onClick={exportBatchCSV}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                </div>
              )}
            </div>

            {/* Generated Items List */}
            {generatedLicenses.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">
                <KeyRound className="w-12 h-12 text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-400">No batch generated yet</p>
                <p className="text-xs text-slate-600 max-w-sm mt-1">
                  Configure the key parameters on the left and click Generate to create randomized license keys.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[500px] pr-1">
                {generatedLicenses.map((lic, index) => {
                  const keyStr = lic.plain_key || lic.key_display;
                  return (
                    <div
                      key={lic.id || index}
                      className="p-3.5 rounded-xl bg-black/50 border border-white/5 hover:border-indigo-500/40 flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-[10px] text-slate-400">
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-indigo-300 tracking-wider">
                              {keyStr}
                            </span>
                            <StatusBadge status={lic.status} size="sm" />
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                            <span>
                              {lic.expires_at
                                ? `Expires: ${new Date(lic.expires_at).toLocaleDateString()}`
                                : 'Lifetime'}
                            </span>
                            <span>&bull;</span>
                            <span>Device Limit: {lic.device_limit}</span>
                            {lic.notes && (
                              <>
                                <span>&bull;</span>
                                <span className="italic truncate max-w-xs">{lic.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => copyIndividual(keyStr)}
                        className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors shrink-0"
                        title="Copy key"
                      >
                        {copiedKey === keyStr ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
