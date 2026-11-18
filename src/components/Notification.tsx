import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useHospital();

  return (
    <div
      aria-live="polite"
      className="no-print fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const icon =
            toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-[#2563EB] shrink-0" />
            );

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 shadow-lg"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5">{icon}</div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#142D4E] dark:text-white">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{toast.description}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
