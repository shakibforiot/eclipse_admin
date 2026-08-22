import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export function ToastContainer() {
  const { toasts, removeToast } = useAuth();

  return (
    <div
      id="toast-container"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-2xl ${
                isSuccess
                  ? 'bg-black/90 border-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : isError
                  ? 'bg-black/90 border-rose-500/30 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                  : isWarning
                  ? 'bg-black/90 border-amber-500/30 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'bg-black/90 border-indigo-500/30 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <XCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-cyan-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white tracking-wide">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words">{toast.message}</p>
                )}
              </div>

              <button
                id={`toast-close-${toast.id}`}
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-md"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
