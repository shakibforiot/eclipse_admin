import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Save,
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Terminal,
  FileCode,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { AppVersionConfig } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export function AppVersionView() {
  const { showToast } = useAuth();
  const [config, setConfig] = useState<AppVersionConfig>({
    latest_version: '1.0.0',
    minimum_version: '1.0.0',
    update_required: false,
    download_url: 'https://eclipsedump.app/download',
    changelog: 'Initial stable release with secure license activation',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Live test result
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const fetchVersion = async () => {
    setLoading(true);
    try {
      const res = await api.getAppVersionConfig();
      if (res.success) {
        setConfig(res.config);
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersion();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateAppVersionConfig(config);
      if (res.success) {
        setConfig(res.config);
        showToast('App Version Updated', 'Version parameters and update rules saved', 'success');
      }
    } catch (err: any) {
      showToast('Update Failed', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLiveTest = async () => {
    setTesting(true);
    try {
      const res = await api.testAppVersion();
      setTestResult(res);
      showToast('Endpoint Queried', 'GET /api/v1/app/version response received', 'info');
    } catch (err: any) {
      showToast('Test Failed', err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Android App Version Control</h1>
        <p className="text-sm text-slate-400">
          Configure app release versioning, enforce mandatory minimum version updates, and update APK download links
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Configuration Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-black/40 border border-indigo-500/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-400" />
                Version & Distribution Policy
              </h2>
              {loading && <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />}
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    Latest App Version
                  </label>
                  <input
                    type="text"
                    required
                    value={config.latest_version}
                    onChange={(e) => setConfig({ ...config, latest_version: e.target.value })}
                    placeholder="1.0.0"
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-sm text-white focus:border-indigo-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Current published APK version</p>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    Minimum Allowed Version
                  </label>
                  <input
                    type="text"
                    required
                    value={config.minimum_version}
                    onChange={(e) => setConfig({ ...config, minimum_version: e.target.value })}
                    placeholder="1.0.0"
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-sm text-white focus:border-indigo-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Versions below this will be rejected</p>
                </div>
              </div>

              {/* Force update toggle */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-4">
                <div>
                  <label className="font-bold text-white text-xs block">
                    Enforce Mandatory Update (`update_required`)
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    When enabled, Android clients running older versions will receive code <code className="text-amber-300">UPDATE_REQUIRED</code> (HTTP 426) on login.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={config.update_required}
                    onChange={(e) => setConfig({ ...config, update_required: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Download URL */}
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Update Download URL
                </label>
                <input
                  type="url"
                  required
                  value={config.download_url}
                  onChange={(e) => setConfig({ ...config, download_url: e.target.value })}
                  placeholder="https://eclipsedump.app/download/eclipsedump.apk"
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Changelog */}
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Release Notes / Changelog
                </label>
                <textarea
                  rows={3}
                  value={config.changelog}
                  onChange={(e) => setConfig({ ...config, changelog: e.target.value })}
                  placeholder="Describe new features or security updates..."
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white focus:border-indigo-500 outline-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-[0_0_15px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save App Version Policy</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Live Public Endpoint Inspector */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                Live API Response Test
              </h2>
              <button
                onClick={handleLiveTest}
                disabled={testing}
                className="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-500/10 text-indigo-200 border border-indigo-500/30 hover:bg-indigo-500/20 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                <span>Test Live GET</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-slate-300">
                <span className="text-emerald-400 font-bold">GET</span>{' '}
                <span className="text-indigo-300 font-bold">/api/v1/app/version</span>
              </div>

              <div className="p-3.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] overflow-x-auto text-indigo-300">
                <pre className="leading-relaxed">
                  {testResult
                    ? JSON.stringify(testResult.data, null, 2)
                    : JSON.stringify(
                        {
                          latest_version: config.latest_version,
                          minimum_version: config.minimum_version,
                          update_required: config.update_required,
                          download_url: config.download_url,
                          changelog: config.changelog,
                        },
                        null,
                        2
                      )}
                </pre>
              </div>

              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-200">
                <p className="font-bold mb-1">Android Client Behavior:</p>
                <p className="text-slate-400">
                  On startup, ECLPISE DUMP Android app calls this endpoint to check if an update modal should be displayed to the user before prompting for license key.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
