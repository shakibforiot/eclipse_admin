import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  Copy,
  Check,
  Smartphone,
  KeyRound,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Zap,
  Eye,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { LicenseItem } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusBadge } from '../common/Badge.tsx';

export function ApiSandboxView() {
  const { showToast } = useAuth();
  const [endpoint, setEndpoint] = useState<'login' | 'user-details' | 'validate' | 'logout' | 'version'>('login');

  // Input states
  const [licenseKey, setLicenseKey] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [deviceId, setDeviceId] = useState('android_device_pixel7_a82b9c');
  const [deviceModel, setDeviceModel] = useState('Google Pixel 7 Pro');
  const [androidVersion, setAndroidVersion] = useState('Android 14 (API 34)');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [sessionToken, setSessionToken] = useState('');

  // Execution states
  const [loading, setLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseDuration, setResponseDuration] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Available active keys to test with
  const [availableKeys, setAvailableKeys] = useState<LicenseItem[]>([]);

  useEffect(() => {
    // Load top active keys for quick testing
    api.getLicenses({ limit: 5, status: 'active' }).then((res) => {
      if (res.success && res.licenses.length > 0) {
        setAvailableKeys(res.licenses);
        if (!licenseKey) {
          setLicenseKey(res.licenses[0].plain_key || res.licenses[0].key_display);
          setUser(res.licenses[0].custom_user || res.licenses[0].key_display);
          setPass(res.licenses[0].custom_password || res.licenses[0].plain_key || res.licenses[0].key_display);
        }
      }
    });
  }, []);

  const handleSelectKey = (key: LicenseItem) => {
    const rawKey = key.plain_key || key.key_display;
    setLicenseKey(rawKey);
    setUser(key.custom_user || key.key_display);
    setPass(key.custom_password || rawKey);
    showToast('Key Loaded', `Loaded key: ${rawKey}`, 'info');
  };

  const handleExecute = async () => {
    setLoading(true);
    setResponseStatus(null);
    setResponseBody(null);
    const start = performance.now();

    try {
      let resData: any;
      let status = 200;

      if (endpoint === 'login') {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            license_key: licenseKey.trim(),
            user: user.trim(),
            pass: pass.trim(),
            device_id: deviceId.trim(),
            device_model: deviceModel.trim(),
            android_version: androidVersion.trim(),
            app_version: appVersion.trim(),
          }),
        });
        status = res.status;
        resData = await res.json();
        if (resData.session_token) {
          setSessionToken(resData.session_token);
        }
      } else if (endpoint === 'user-details') {
        const res = await fetch('/api/v1/auth/user-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            license_key: licenseKey.trim(),
            session_token: sessionToken.trim(),
            user: user.trim(),
            pass: pass.trim(),
            device_model: deviceModel.trim(),
            android_version: androidVersion.trim(),
          }),
        });
        status = res.status;
        resData = await res.json();
      } else if (endpoint === 'validate') {
        const res = await fetch('/api/v1/auth/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_token: sessionToken.trim(),
            device_id: deviceId.trim(),
            device_model: deviceModel.trim(),
            android_version: androidVersion.trim(),
            app_version: appVersion.trim(),
          }),
        });
        status = res.status;
        resData = await res.json();
      } else if (endpoint === 'logout') {
        const res = await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_token: sessionToken.trim(),
          }),
        });
        status = res.status;
        resData = await res.json();
      } else if (endpoint === 'version') {
        const res = await fetch('/api/v1/app/version');
        status = res.status;
        resData = await res.json();
      }

      setResponseStatus(status);
      setResponseBody(resData);
    } catch (err: any) {
      setResponseStatus(500);
      setResponseBody({ error: err.message || 'Internal Network Failure' });
    } finally {
      setResponseDuration(Math.round(performance.now() - start));
      setLoading(false);
    }
  };

  const copyResponse = () => {
    if (!responseBody) return;
    navigator.clipboard.writeText(JSON.stringify(responseBody, null, 2));
    setCopied(true);
    showToast('Copied', 'JSON response copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Interactive API Testing Sandbox</h1>
        <p className="text-sm text-slate-400">
          Simulate Android client requests directly against live PostgreSQL backend endpoints
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Request Configuration Panel */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-red-400" />
              <span>Request Parameters</span>
            </h2>

            {/* Quick Key Preset Picker */}
            {availableKeys.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-black/40 border border-white/5">
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-2">
                  Quick Select Active License:
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableKeys.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => handleSelectKey(k)}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all border ${
                        licenseKey === (k.plain_key || k.key_display)
                          ? 'bg-red-600/30 text-red-200 border-red-500'
                          : 'bg-black/50 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {k.plain_key || k.key_display}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Endpoint Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
              {[
                { id: 'login', method: 'POST', path: '/api/v1/auth/login', desc: 'Login & Get 5 Fields' },
                { id: 'user-details', method: 'POST', path: '/api/v1/auth/user-details', desc: 'User Details' },
                { id: 'validate', method: 'POST', path: '/api/v1/auth/validate', desc: 'Validate Token' },
                { id: 'version', method: 'GET', path: '/api/v1/app/version', desc: 'App Update Check' },
                { id: 'logout', method: 'POST', path: '/api/v1/auth/logout', desc: 'Revoke Session' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setEndpoint(item.id as any)}
                  className={`p-2.5 rounded-xl text-left transition-all border ${
                    endpoint === item.id
                      ? 'bg-red-600/20 text-red-200 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                      : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/15'
                  }`}
                >
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold mb-1 ${
                      item.method === 'POST' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {item.method}
                  </span>
                  <p className="text-xs font-bold text-white truncate">{item.desc}</p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">{item.path}</p>
                </button>
              ))}
            </div>

            {/* Dynamic Form Inputs based on Endpoint */}
            <div className="space-y-4 text-xs">
              {(endpoint === 'login' || endpoint === 'user-details') && (
                <>
                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                      License Key
                    </label>
                    <input
                      type="text"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      placeholder="ECLP-XXXX-XXXX-XXXX"
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-white focus:border-red-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                        Username (Optional)
                      </label>
                      <input
                        type="text"
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                        placeholder="User_123"
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-white focus:border-red-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                        Password (Optional)
                      </label>
                      <input
                        type="text"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                        placeholder="Pass_123"
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-white focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                        Device ID
                      </label>
                      <input
                        type="text"
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-white focus:border-red-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                        Android Version
                      </label>
                      <input
                        type="text"
                        value={androidVersion}
                        onChange={(e) => setAndroidVersion(e.target.value)}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-white focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {endpoint === 'validate' && (
                <>
                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                      Session Token (Bearer Token from /login)
                    </label>
                    <input
                      type="text"
                      value={sessionToken}
                      onChange={(e) => setSessionToken(e.target.value)}
                      placeholder="s_..."
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-white focus:border-red-500 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Run <code className="text-red-300">POST /login</code> first to auto-fill this token.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                        Device ID
                      </label>
                      <input
                        type="text"
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-white focus:border-red-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                        App Version
                      </label>
                      <input
                        type="text"
                        value={appVersion}
                        onChange={(e) => setAppVersion(e.target.value)}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-white focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {endpoint === 'logout' && (
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Session Token to Invalidate
                  </label>
                  <input
                    type="text"
                    value={sessionToken}
                    onChange={(e) => setSessionToken(e.target.value)}
                    placeholder="s_..."
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-white focus:border-red-500 outline-none"
                  />
                </div>
              )}

              {endpoint === 'version' && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-slate-400 text-xs">
                  <p className="font-bold text-slate-300 mb-1">Public Endpoint</p>
                  <p>No request body or authentication headers required. Checks the latest published app version policy.</p>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleExecute}
                disabled={loading}
                className="w-full mt-4 py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Send Request to Server</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Live Response & Android View Preview */}
        <div className="lg:col-span-6 space-y-6">
          {/* Simulated Android Layout Box */}
          {responseBody && responseBody.success && (responseBody.version || responseBody.user) && (
            <div className="bg-black/60 border border-red-500/40 rounded-2xl p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-red-500/20">
                <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-red-500" />
                  <span>Simulated Android TextView Render (#F00000)</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  MATCHES XML ID
                </span>
              </div>

              {/* Exact XML Simulation */}
              <div className="p-4 bg-[#121212] rounded-xl border border-white/10 font-sans space-y-2">
                <p className="text-[12px] font-bold text-[#F00000] leading-snug">
                  Android Version ⬇<br />
                  <span className="font-normal text-white">┗ {responseBody.version || 'device version'}</span>
                </p>

                <p className="text-[12px] font-bold text-[#F00000] leading-snug">
                  Username ⬇<br />
                  <span className="font-normal text-white">┗ {responseBody.user || 'User'}</span>
                </p>

                <p className="text-[12px] font-bold text-[#F00000] leading-snug">
                  Password ⬇<br />
                  <span className="font-normal text-white">┗ {responseBody.pass || 'Pass'}</span>
                </p>

                <p className="text-[12px] font-bold text-[#F00000] leading-snug">
                  Registered ⬇<br />
                  <span className="font-normal text-white">┗ {responseBody.rgtime || '00/00/0000'}</span>
                </p>

                <p className="text-[12px] font-bold text-[#F00000] leading-snug">
                  Expiry ⬇<br />
                  <span className="font-normal text-white">┗ {responseBody.valid || '00/00/0000'}</span>
                </p>
              </div>
            </div>
          )}

          {/* Raw Server Response Box */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-white">Server Response</h2>
                {responseStatus !== null && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                      responseStatus < 300
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    HTTP {responseStatus}
                  </span>
                )}
                {responseDuration !== null && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {responseDuration}ms
                  </span>
                )}
              </div>

              {responseBody && (
                <button
                  onClick={copyResponse}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {/* Output code block */}
            <div className="flex-1 min-h-[250px] p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-slate-200 overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="text-center">
                    <span className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin inline-block mb-2" />
                    <p>Dispatching secure HTTPS payload...</p>
                  </div>
                </div>
              ) : responseBody ? (
                <pre className="text-red-200 leading-relaxed">{JSON.stringify(responseBody, null, 2)}</pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-600">
                  <Zap className="w-8 h-8 mb-2 text-slate-700" />
                  <p className="font-bold text-slate-400">No Request Sent Yet</p>
                  <p className="text-[11px] text-slate-600 max-w-xs mt-1">
                    Select an endpoint on the left and click Send Request to inspect the API JSON response.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
