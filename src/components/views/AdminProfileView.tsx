import React, { useState } from 'react';
import { User, Lock, KeyRound, Shield, CheckCircle2, Save, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../lib/api.ts';

export function AdminProfileView() {
  const { admin, showToast, refreshAdmin } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState(admin?.username || 'admin');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showToast('Validation Error', 'Current password is required to authorize changes', 'error');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      showToast('Validation Error', 'New password and confirmation do not match', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateProfile({
        current_password: currentPassword,
        username: newUsername.trim() || undefined,
        new_password: newPassword || undefined,
      });

      if (res.success) {
        showToast('Profile Updated', 'Admin credentials updated successfully', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        await refreshAdmin();
      } else {
        showToast('Update Failed', res.error || 'Failed to update credentials', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Admin Profile & Security</h1>
        <p className="text-sm text-slate-400">
          Manage your master administrator account credentials and password hashing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-black/40 border border-indigo-500/20 rounded-2xl p-6 shadow-xl backdrop-blur-md text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 border border-indigo-400/40 mx-auto flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] mb-4">
              {admin?.username ? admin.username.substring(0, 2).toUpperCase() : 'AD'}
            </div>

            <h2 className="text-lg font-bold text-white">{admin?.username || 'Administrator'}</h2>
            <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mt-0.5">
              {admin?.role || 'Superadmin'}
            </p>

            <div className="mt-6 pt-6 border-t border-white/5 space-y-2.5 text-xs text-left">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400">Role Authority:</span>
                <span className="font-bold text-emerald-400">Full Access (RW)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400">Security Standard:</span>
                <span className="font-bold text-indigo-300">Bcrypt Salt 12 Rounds</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400">Account Created:</span>
                <span className="text-slate-300 font-medium">
                  {admin?.created_at ? new Date(admin.created_at).toLocaleDateString() : 'Initial Boot'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Credentials Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              Update Account Credentials
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Current Master Password <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password to authorize changes"
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  New Admin Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    New Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave empty to keep current"
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white outline-none focus:border-indigo-500"
                  />
                </div>
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
                    <span>Save Account Credentials</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
