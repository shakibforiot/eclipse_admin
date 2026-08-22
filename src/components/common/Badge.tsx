import React from 'react';

interface BadgeProps {
  status: 'active' | 'inactive' | 'expired' | 'banned' | 'success' | 'failed' | 'blocked' | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: BadgeProps) {
  const norm = status.toLowerCase();

  let styles = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';

  if (norm === 'active' || norm === 'success') {
    styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    dotColor = 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
  } else if (norm === 'banned' || norm === 'blocked' || norm === 'failed') {
    styles = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    dotColor = 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]';
  } else if (norm === 'expired') {
    styles = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    dotColor = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
  } else if (norm === 'inactive' || norm === 'unbound') {
    styles = 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    dotColor = 'bg-slate-400';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${styles} ${padding} uppercase tracking-wider select-none`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {status}
    </span>
  );
}
