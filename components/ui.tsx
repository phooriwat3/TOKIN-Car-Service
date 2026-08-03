'use client';

import React from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:ring-offset-2';

/* ─── Button ─── */
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
  }
>(({ className, variant = 'primary', size = 'md', ...p }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 select-none',
        buttonFocusRing,
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-9 px-4 text-sm',
        size === 'lg' && 'h-10 px-5 text-sm',
        variant === 'primary' &&
          'bg-brand-500 text-white shadow-btn hover:bg-brand-600 active:bg-brand-700',
        variant === 'secondary' &&
          'border border-slate-200 bg-white text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50',
        variant === 'outline' &&
          'border border-brand-400 text-brand-500 hover:bg-brand-50',
        variant === 'danger' &&
          'bg-danger text-white shadow-xs hover:bg-red-700',
        variant === 'ghost' &&
          'text-slate-600 hover:bg-slate-100 hover:text-ink',
        className,
      )}
      {...p}
    />
  );
});
Button.displayName = 'Button';

/* ─── Card ─── */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...p }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-slate-200/80 bg-white shadow-card transition-shadow duration-200',
        className,
      )}
      {...p}
    />
  ),
);
Card.displayName = 'Card';

export const CardHover = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...p }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-slate-200/80 bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover',
        className,
      )}
      {...p}
    />
  ),
);
CardHover.displayName = 'CardHover';

/* ─── Input ─── */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink placeholder:text-slate-400',
        'outline-none transition-all duration-150',
        'focus:border-brand-400 focus:ring-[3px] focus:ring-brand-400/12',
        'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
        className,
      )}
      {...p}
    />
  ),
);
Input.displayName = 'Input';

/* ─── Select ─── */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...p }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink',
      'outline-none transition-all duration-150',
      'focus:border-brand-400 focus:ring-[3px] focus:ring-brand-400/12',
      'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
      className,
    )}
    {...p}
  />
));
Select.displayName = 'Select';

/* ─── Textarea ─── */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...p }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate-400',
      'outline-none transition-all duration-150',
      'focus:border-brand-400 focus:ring-[3px] focus:ring-brand-400/12',
      'disabled:cursor-not-allowed disabled:bg-slate-50',
      className,
    )}
    {...p}
  />
));
Textarea.displayName = 'Textarea';

/* ─── Field ─── */
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-semibold text-gray-700">{label}</span>
      {children}
      {error && (
        <span className="flex items-center gap-1 text-xs text-danger">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1Zm.5 7.5h-1v-1h1v1Zm0-2h-1V3.5h1V6.5Z" />
          </svg>
          {error}
        </span>
      )}
    </label>
  );
}

/* ─── Badge ─── */
const badgeVariants: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
  rejected: 'bg-red-50 text-red-700 border-red-200/70',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200/70',
  pending_approval: 'bg-amber-50 text-amber-700 border-amber-200/70',
  changes_requested: 'bg-orange-50 text-orange-700 border-orange-200/70',
  approved: 'bg-brand-50 text-brand-600 border-brand-200/70',
  assigned: 'bg-violet-50 text-violet-700 border-violet-200/70',
  in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
};

const badgeDotColors: Record<string, string> = {
  completed: 'bg-emerald-500',
  rejected: 'bg-red-500',
  cancelled: 'bg-slate-400',
  pending_approval: 'bg-amber-500',
  changes_requested: 'bg-orange-500',
  approved: 'bg-brand-500',
  assigned: 'bg-violet-500',
  in_progress: 'bg-indigo-500',
};

const pulseStatuses = new Set(['in_progress', 'pending_approval']);

export function Badge({
  children,
  status,
}: {
  children: React.ReactNode;
  status?: string;
}) {
  const cls =
    (status && badgeVariants[status]) || 'bg-slate-100 text-slate-600 border-slate-200/70';
  const dotColor = (status && badgeDotColors[status]) || 'bg-slate-400';
  const pulse = status ? pulseStatuses.has(status) : false;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none',
        cls,
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotColor, pulse && 'animate-pulse')}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

/* ─── Section Label ─── */
export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400',
        className,
      )}
    >
      {children}
    </p>
  );
}

/* ─── Stat (KPI metric card) ─── */
const statToneStyles = {
  blue: {
    gradient: 'linear-gradient(135deg, #f0f7fd 0%, #dbeafe 100%)',
    iconBg: 'bg-brand-500 text-white',
  },
  amber: {
    gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    iconBg: 'bg-amber-500 text-white',
  },
  green: {
    gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    iconBg: 'bg-emerald-500 text-white',
  },
  violet: {
    gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    iconBg: 'bg-violet-500 text-white',
  },
  red: {
    gradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
    iconBg: 'bg-red-500 text-white',
  },
} as const;

export type StatTone = keyof typeof statToneStyles;

export function Stat({
  label,
  value,
  icon,
  tone,
  trend,
  href,
  className,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: StatTone;
  trend?: { value: number; label: string };
  href?: string;
  className?: string;
}) {
  const styles = statToneStyles[tone];
  const trendPositive = trend ? trend.value >= 0 : false;

  const card = (
    <div
      className={cn(
        'rounded-xl border border-slate-200/60 p-5 shadow-card transition-shadow duration-200',
        href && 'hover:shadow-card-hover',
        className,
      )}
      style={{ background: styles.gradient }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn('rounded-xl p-2.5', styles.iconBg)}>{icon}</div>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              trendPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700',
            )}
          >
            {trendPositive ? (
              <TrendingUp size={12} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={12} strokeWidth={2.5} />
            )}
            {trendPositive ? '+' : ''}
            {trend.value}%
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-bold font-display tracking-tight text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
      {trend?.label && (
        <p className="mt-2 text-xs text-slate-500">{trend.label}</p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:ring-offset-2 rounded-xl">
        {card}
      </Link>
    );
  }

  return card;
}

/* ─── Empty State ─── */
export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 p-4">
        <svg
          className="text-brand-400"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <p className="text-base font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}

/* ─── Weekly Hours Input – left-to-right positional masked entry (Max 60.00) ─── */
/*
 * Positions:  [0][1].[2][3]  →  display "XX.XX"
 * Pressing a digit fills the current position then advances cursor.
 * Example:  3 → "30.00"  then  4 → "34.00"  then  6 → "34.60"  then  7 → "34.67"
 * Focus resets cursor to position 0 so user can re-enter the value.
 * Backspace moves cursor back one position and clears it.
 */
export function WeeklyHoursInput({
  value,
  id,
  onChange,
  disabled,
  required,
  className,
}: {
  value: number;
  id?: string;
  onChange: (val: number) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  type Digits = [number, number, number, number];

  const valueToDigits = (v: number): Digits => {
    const h = Math.min(6000, Math.max(0, Math.round((Number.isFinite(v) ? v : 0) * 100)));
    return [Math.floor(h / 1000), Math.floor(h / 100) % 10, Math.floor(h / 10) % 10, h % 10];
  };
  const digitsToH = (d: Digits) => d[0] * 1000 + d[1] * 100 + d[2] * 10 + d[3];

  const [digits, setDigits] = React.useState<Digits>(() => valueToDigits(value));
  // cursor = which position will be filled next (0-3); 4 = "full / not editing"
  const [cursor, setCursor] = React.useState(4);
  const lastExternal = React.useRef(value);

  // Sync when parent resets value externally (e.g. form reset)
  React.useEffect(() => {
    if (lastExternal.current !== value) {
      lastExternal.current = value;
      setDigits(valueToDigits(value));
      setCursor(4);
    }
  }, [value]);

  const commit = (d: Digits, newCursor: number) => {
    const h = digitsToH(d);
    setDigits(d);
    setCursor(newCursor);
    lastExternal.current = h / 100;
    onChange(h / 100);
  };

  const handleFocus = () => {
    // Reset cursor to start so user overwrites from position 0
    setCursor(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      if (cursor >= 4) return; // already full — Tab out & back to re-enter
      const digit = parseInt(e.key, 10);
      const d = [...digits] as Digits;

      if (cursor === 0 && digit === 6) {
        // Special case: first digit is 6 → auto-fill rest with 0 = exactly 60.00
        commit([6, 0, 0, 0], 4);
        return;
      }

      d[cursor] = digit;
      const h = digitsToH(d);
      if (h > 6000) return; // would exceed 60.00 — reject
      commit(d, Math.min(4, cursor + 1));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      // Special case: locked at 60.00 → one backspace wipes everything back to 00.00
      if (digitsToH(digits) === 6000) {
        commit([0, 0, 0, 0], 0);
        return;
      }
      if (cursor === 0) return;
      const newCursor = cursor - 1;
      const d = [...digits] as Digits;
      d[newCursor] = 0;
      commit(d, newCursor);
    }
    // Tab / Shift+Tab / arrows bubble naturally
  };

  const h = digitsToH(digits);
  const display = `${digits[0]}${digits[1]}.${digits[2]}${digits[3]}`;
  const isMax = h >= 6000;       // exactly 60.00 → red border
  const isWarning = h >= 5500 && h < 6000; // approaching limit → amber


  return (
    <div className={cn('relative', className)}>
      {/* Hidden number for native required validation */}
      {required && (
        <input
          type="number"
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
          value={h === 0 ? '' : h}
          required
          onChange={() => {}}
        />
      )}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        readOnly
        value={display}
        disabled={disabled}
        aria-label="Total weekly hours (XX.XX)"
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        className={cn(
          'h-10 w-full rounded-lg border border-line bg-white px-3 pr-12 text-sm text-ink',
          'outline-none transition-all duration-150 tabular-nums cursor-text select-none',
          'focus:border-brand focus:ring-[3px] focus:ring-brand/10',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
          isMax && 'border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500/15',
          isWarning && 'border-amber-400 bg-amber-50 text-amber-800 focus:border-amber-500 focus:ring-amber-500/15',
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium',
          isMax ? 'text-red-400' : isWarning ? 'text-amber-500' : 'text-gray-400',
        )}
      >
        hrs
      </span>
    </div>
  );
}



/* ─── 12-Hour Time Helpers ─── */
const convert24to12 = (time24: string): [string, string, string] => {
  if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) return ['--', '--', 'PM'];
  const [hStr, mStr] = time24.split(':');
  const hNum = parseInt(hStr, 10);
  const ampm = hNum >= 12 ? 'PM' : 'AM';
  let h12 = hNum % 12;
  if (h12 === 0) h12 = 12;
  return [h12.toString().padStart(2, '0'), mStr.padStart(2, '0'), ampm];
};

const convert12to24 = (hh: string, mm: string, ampm: string): string => {
  if (hh === '--' || mm === '--') return '';
  let hNum = parseInt(hh, 10);
  if (ampm === 'PM' && hNum < 12) hNum += 12;
  if (ampm === 'AM' && hNum === 12) hNum = 0;
  return `${hNum.toString().padStart(2, '0')}:${mm.padStart(2, '0')}`;
};

export function TimeMaskInput({
  value,
  id,
  onChange,
  disabled,
  required,
  className,
  quickTimes,
}: {
  value: string;
  id?: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  quickTimes?: string[];
}) {
  const [hh, setHh] = React.useState<string>(() => convert24to12(value)[0]);
  const [mm, setMm] = React.useState<string>(() => convert24to12(value)[1]);
  const [ampm, setAmpm] = React.useState<string>(() => convert24to12(value)[2]);
  const [activeSegment, setActiveSegment] = React.useState<'hh' | 'mm' | 'ampm'>('hh');
  const [digitCount, setDigitCount] = React.useState<number>(0);
  const [showPicker, setShowPicker] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pickerRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    const updatePosition = () => {
      if (showPicker && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        });
      }
    };
    if (showPicker) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showPicker]);

  React.useEffect(() => {
    const current24 = convert12to24(hh, mm, ampm);
    if (value !== current24) {
      const [h, m, ap] = convert24to12(value);
      setHh(h);
      setMm(m);
      setAmpm(ap);
    }
  }, [value]);

  React.useEffect(() => {
    if (inputRef.current) {
      const isComplete = hh !== '--' && mm !== '--';
      if (required && !isComplete) {
        inputRef.current.setCustomValidity('Please fill out this field.');
      } else {
        inputRef.current.setCustomValidity('');
      }
    }
  }, [hh, mm, required]);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showPicker]);

  const displayString = `${hh}:${mm} ${ampm}`;

  const selectSegment = (segment: 'hh' | 'mm' | 'ampm') => {
    setTimeout(() => {
      if (inputRef.current) {
        if (segment === 'hh') {
          inputRef.current.setSelectionRange(0, 2);
        } else if (segment === 'mm') {
          inputRef.current.setSelectionRange(3, 5);
        } else {
          inputRef.current.setSelectionRange(6, 8);
        }
      }
    }, 0);
  };

  const updateVal = (newHh: string, newMm: string, newAmpm: string) => {
    setHh(newHh);
    setMm(newMm);
    setAmpm(newAmpm);
    const new24 = convert12to24(newHh, newMm, newAmpm);
    onChange(new24);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    setTimeout(() => {
      setActiveSegment('hh');
      setDigitCount(0);
      target.setSelectionRange(0, 2);
    }, 0);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    if (start <= 2) {
      setActiveSegment('hh');
      setDigitCount(0);
      target.setSelectionRange(0, 2);
    } else if (start <= 5) {
      setActiveSegment('mm');
      setDigitCount(0);
      target.setSelectionRange(3, 5);
    } else {
      setActiveSegment('ampm');
      setDigitCount(0);
      target.setSelectionRange(6, 8);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === 'Tab' ||
      e.key === 'Shift' ||
      e.key === 'Control' ||
      e.key === 'Alt' ||
      e.key === 'Meta' ||
      e.key === 'Enter' ||
      e.key === 'Escape'
    ) {
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (activeSegment === 'mm') {
        setActiveSegment('hh');
        setDigitCount(0);
        selectSegment('hh');
      } else if (activeSegment === 'ampm') {
        setActiveSegment('mm');
        setDigitCount(0);
        selectSegment('mm');
      }
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (activeSegment === 'hh') {
        setActiveSegment('mm');
        setDigitCount(0);
        selectSegment('mm');
      } else if (activeSegment === 'mm') {
        setActiveSegment('ampm');
        setDigitCount(0);
        selectSegment('ampm');
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeSegment === 'hh') {
        const current = hh === '--' ? 12 : parseInt(hh, 10);
        let next = current + 1;
        if (next > 12) next = 1;
        updateVal(next.toString().padStart(2, '0'), mm, ampm);
        selectSegment('hh');
      } else if (activeSegment === 'mm') {
        const current = mm === '--' ? 59 : parseInt(mm, 10);
        let next = (current + 1) % 60;
        updateVal(hh, next.toString().padStart(2, '0'), ampm);
        selectSegment('mm');
      } else {
        const nextAmpm = ampm === 'AM' ? 'PM' : 'AM';
        updateVal(hh, mm, nextAmpm);
        selectSegment('ampm');
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeSegment === 'hh') {
        const current = hh === '--' ? 1 : parseInt(hh, 10);
        let next = current - 1;
        if (next < 1) next = 12;
        updateVal(next.toString().padStart(2, '0'), mm, ampm);
        selectSegment('hh');
      } else if (activeSegment === 'mm') {
        const current = mm === '--' ? 0 : parseInt(mm, 10);
        let next = current - 1;
        if (next < 0) next = 59;
        updateVal(hh, next.toString().padStart(2, '0'), ampm);
        selectSegment('mm');
      } else {
        const nextAmpm = ampm === 'AM' ? 'PM' : 'AM';
        updateVal(hh, mm, nextAmpm);
        selectSegment('ampm');
      }
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      if (activeSegment === 'hh') {
        updateVal('--', mm, ampm);
        setDigitCount(0);
        selectSegment('hh');
      } else if (activeSegment === 'mm') {
        if (mm !== '--') {
          updateVal(hh, '--', ampm);
          setDigitCount(0);
          setActiveSegment('hh');
          selectSegment('hh');
        } else {
          setActiveSegment('hh');
          setDigitCount(0);
          selectSegment('hh');
        }
      } else {
        setActiveSegment('mm');
        setDigitCount(0);
        selectSegment('mm');
      }
      return;
    }

    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      updateVal(hh, mm, 'AM');
      setActiveSegment('ampm');
      selectSegment('ampm');
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      updateVal(hh, mm, 'PM');
      setActiveSegment('ampm');
      selectSegment('ampm');
      return;
    }

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const digit = e.key;

      if (activeSegment === 'hh') {
        if (digitCount === 0 || hh === '--') {
          const valNum = parseInt(digit, 10);
          if (valNum >= 2) {
            const newHh = `0${digit}`;
            const newMm = mm === '--' ? '00' : mm;
            updateVal(newHh, newMm, ampm);
            setActiveSegment('mm');
            setDigitCount(0);
            selectSegment('mm');
          } else {
            const newHh = `0${digit}`;
            updateVal(newHh, mm, ampm);
            setDigitCount(1);
            selectSegment('hh');
          }
        } else {
          const firstDigit = hh[1];
          const combined = firstDigit + digit;
          let newHh = combined;
          let newMm = mm;
          const valNum = parseInt(combined, 10);
          if (valNum > 12 || valNum === 0) {
            newHh = '12';
          }
          if (newMm === '--') {
            newMm = '00';
          }
          updateVal(newHh, newMm, ampm);
          setActiveSegment('mm');
          setDigitCount(0);
          selectSegment('mm');
        }
      } else if (activeSegment === 'mm') {
        if (hh === '--') {
          const newHh = '12';
          if (digitCount === 0 || mm === '--') {
            const newMm = `0${digit}`;
            updateVal(newHh, newMm, ampm);
            setDigitCount(1);
            selectSegment('mm');
          } else {
            const firstDigit = mm[1];
            const combined = firstDigit + digit;
            updateVal(newHh, combined, ampm);
            setDigitCount(0);
            selectSegment('mm');
          }
          return;
        }
        if (digitCount === 0 || mm === '--') {
          const valNum = parseInt(digit, 10);
          if (valNum >= 6) {
            const newMm = `0${digit}`;
            updateVal(hh, newMm, ampm);
            setActiveSegment('ampm');
            setDigitCount(0);
            selectSegment('ampm');
          } else {
            const newMm = `0${digit}`;
            updateVal(hh, newMm, ampm);
            setDigitCount(1);
            selectSegment('mm');
          }
        } else {
          const firstDigit = mm[1];
          const combined = firstDigit + digit;
          let newMm = combined;
          if (parseInt(combined, 10) > 59) {
            newMm = '59';
          }
          updateVal(hh, newMm, ampm);
          setActiveSegment('ampm');
          setDigitCount(0);
          selectSegment('ampm');
        }
      }
    }
  };

  return (
    <div className="relative w-full">
      <Input
        id={id}
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={8}
        required={required}
        disabled={disabled}
        className={cn('pr-10', className)}
        value={displayString}
        onFocus={handleFocus}
        onMouseUp={handleMouseUp}
        onKeyDown={handleKeyDown}
        onChange={() => {}}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker(!showPicker);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
      >
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>

      {showPicker && typeof document !== 'undefined' && createPortal(
        <div
          ref={pickerRef}
          style={{
            position: 'absolute',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
          }}
          className="w-64 rounded-xl border border-line bg-white p-3 shadow-xl z-[9999] animate-scale-in"
        >
          <div className="mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Quick OT Times</p>
            <div className="grid grid-cols-3 gap-1">
              {(quickTimes || ['17:20', '19:00', '20:00']).map((t24) => {
                const [hStr, mStr, ap] = convert24to12(t24);
                return (
                  <button
                    key={t24}
                    type="button"
                    onClick={() => {
                      updateVal(hStr, mStr, ap);
                      setShowPicker(false);
                    }}
                    className="rounded bg-gray-50 border border-line py-1 text-xs text-ink hover:bg-brand-light hover:border-brand/30 hover:text-brand transition-all"
                  >
                    {hStr}:{mStr} {ap}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-line my-2" />

          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 text-center">Hour</p>
              <div className="h-28 overflow-y-auto border border-line rounded bg-gray-50 text-center select-none py-0.5 space-y-0.5 scrollbar-thin">
                {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => updateVal(h, mm === '--' ? '00' : mm, ampm)}
                    className={cn(
                      'block w-full py-0.5 text-xs rounded transition-colors',
                      hh === h ? 'bg-brand text-white font-semibold' : 'text-ink hover:bg-brand-light hover:text-brand'
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 text-center">Min</p>
              <div className="h-28 overflow-y-auto border border-line rounded bg-gray-50 text-center select-none py-0.5 space-y-0.5 scrollbar-thin">
                {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateVal(hh === '--' ? '12' : hh, m, ampm)}
                    className={cn(
                      'block w-full py-0.5 text-xs rounded transition-colors',
                      mm === m ? 'bg-brand text-white font-semibold' : 'text-ink hover:bg-brand-light hover:text-brand'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 text-center">AM/PM</p>
              <div className="h-28 border border-line rounded bg-gray-50 flex flex-col justify-center p-1 gap-1">
                {['AM', 'PM'].map((ap) => (
                  <button
                    key={ap}
                    type="button"
                    onClick={() => updateVal(hh, mm, ap)}
                    className={cn(
                      'w-full py-2 text-xs rounded font-semibold transition-colors',
                      ampm === ap ? 'bg-brand text-white' : 'bg-white text-ink border border-line hover:bg-brand-light hover:text-brand'
                    )}
                  >
                    {ap}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex justify-end">
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="rounded bg-brand text-white px-3 py-1 text-xs font-semibold hover:bg-brand-dark transition-all"
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
