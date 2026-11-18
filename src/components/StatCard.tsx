import React from 'react';
import { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from './MotionPrimitives';

interface StatCardProps {
  label: string;
  value: string | number;
  numericValue?: number;
  formatter?: (n: number) => string;
  suffix?: string;
  detail: string;
  icon: LucideIcon;
  tone?: 'navy' | 'blue' | 'teal' | 'amber' | 'rose';
  onClick?: () => void;
}

const TONE_CLASSES: Record<NonNullable<StatCardProps['tone']>, string> = {
  navy: 'bg-[#142D4E]/10 text-[#142D4E] dark:bg-slate-800 dark:text-slate-200',
  blue: 'bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#2563EB]/20 dark:text-blue-400',
  teal: 'bg-[#16B8A6]/12 text-[#0D9488] dark:bg-[#16B8A6]/20 dark:text-[#16B8A6]',
  amber: 'bg-amber-500/12 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  rose: 'bg-rose-500/12 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  numericValue,
  formatter,
  suffix,
  detail,
  icon: Icon,
  tone = 'blue',
  onClick,
}) => {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <div className="perspective-1000">
      <Wrapper
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={`group relative w-full text-left rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 card-3d-hover ${
          onClick ? 'hover:border-[#2563EB]/50 dark:hover:border-[#2563EB]/60 cursor-pointer' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight text-[#142D4E] dark:text-white tabular-nums">
              {typeof numericValue === 'number' ? (
                <>
                  <AnimatedNumber value={numericValue} formatter={formatter} />
                  {suffix && <span className="text-base font-semibold text-slate-400">{suffix}</span>}
                </>
              ) : (
                value
              )}
            </p>
          </div>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${TONE_CLASSES[tone]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 truncate">{detail}</p>
      </Wrapper>
    </div>
  );
};
