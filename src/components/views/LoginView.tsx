import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, KeyRound, Sparkles, AlertCircle, ShieldCheck, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export function LoginView() {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(username, password);
    if (!success) {
      setError('Invalid username or password. Please verify your credentials.');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-200"
      style={{
        backgroundColor: '#020205',
        backgroundImage: 'radial-gradient(circle at 50% 50%, #0a0b1e 0%, #020205 100%)',
      }}
    >
      {/* Cyber Grid Overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Ambient glow nodes */}
      <div className="fixed top-1/4 -left-20 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 -right-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card */}
        <div className="bg-black/50 backdrop-blur-2xl border border-indigo-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
          {/* Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 shadow-[0_0_30px_rgba(168,85,247,0.6)] border border-indigo-400/30 mx-auto">
              <span className="font-black text-white text-xl tracking-wider">ED</span>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_8px_#22c55e]"></span>
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-purple-300 tracking-wide">
                ECLPISE DUMP
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mt-1">
                License Server Control Terminal
              </p>
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Secure authentication gateway & device licensing for ECLPISE DUMP Android application.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Admin Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-username-input"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/10 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/10 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>
            </div>

            <button
              id="admin-login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Verifying Session...
                </span>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Security Badges */}
        <div className="mt-6 flex items-center justify-center gap-6 text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>HTTPS REST</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            <span>Device Binding</span>
          </div>
          <div className="flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-purple-400" />
            <span>SHA-256 Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
