import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export const AnimatedNumber: React.FC<{
  value: number;
  formatter?: (n: number) => string;
}> = ({ value, formatter }) => {
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    const start = display;
    const diff = value - start;
    if (diff === 0) return;

    const duration = 450;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, prefersReduced]);

  const rounded = Number.isInteger(value) ? Math.round(display) : display;
  return <>{formatter ? formatter(rounded) : rounded.toLocaleString('en-US')}</>;
};

export const PageTransition: React.FC<{
  pageKey: string;
  children: React.ReactNode;
}> = ({ pageKey, children }) => {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      key={pageKey}
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReduced ? { opacity: 1 } : { opacity: 0, y: -4 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="print-page-transition"
    >
      {children}
    </motion.div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden p-4 space-y-3">
    <div className="h-8 w-full rounded-md skeleton-shimmer" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-11 w-full rounded-md skeleton-shimmer" />
    ))}
  </div>
);
