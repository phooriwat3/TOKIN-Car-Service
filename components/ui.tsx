'use client';

import React from 'react';
import { cn } from '@/lib/utils';

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
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 select-none',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-9 px-4 text-sm',
        size === 'lg' && 'h-11 px-6 text-sm',
        variant === 'primary' &&
          'bg-brand text-white shadow-btn hover:bg-brand-dark active:scale-[.98] active:shadow-none',
        variant === 'secondary' &&
          'border border-line bg-white text-ink shadow-panel hover:bg-brand-light hover:border-brand/30 active:scale-[.98]',
        variant === 'outline' &&
          'border border-brand text-brand hover:bg-brand-light active:scale-[.98]',
        variant === 'danger' &&
          'bg-danger text-white shadow-btn hover:bg-red-700 active:scale-[.98]',
        variant === 'ghost' &&
          'text-gray-500 hover:bg-gray-100 hover:text-ink active:scale-[.98]',
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
        'rounded-xl border border-line bg-white shadow-card transition-shadow duration-200',
        className,
      )}
      {...p}
    />
  ),
);
Card.displayName = 'Card';

/* ─── Input ─── */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder-gray-400',
        'outline-none transition-all duration-150',
        'focus:border-brand focus:ring-2 focus:ring-brand/15',
        'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
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
      'h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink',
      'outline-none transition-all duration-150',
      'focus:border-brand focus:ring-2 focus:ring-brand/15',
      'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
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
      'min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder-gray-400',
      'outline-none transition-all duration-150',
      'focus:border-brand focus:ring-2 focus:ring-brand/15',
      'disabled:cursor-not-allowed disabled:bg-gray-50',
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
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
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
  completed: 'bg-success-light text-success border-success/20',
  rejected: 'bg-danger-light text-danger border-danger/20',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  pending_approval: 'bg-accent-light text-amber-700 border-accent/25',
  changes_requested: 'bg-orange-50 text-orange-700 border-orange-200',
  approved: 'bg-brand-light text-brand border-brand/20',
  assigned: 'bg-violet-50 text-violet-700 border-violet-200',
  in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export function Badge({
  children,
  status,
}: {
  children: React.ReactNode;
  status?: string;
}) {
  const cls = (status && badgeVariants[status]) || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-0.5 text-xs font-semibold tracking-wide',
        cls,
      )}
    >
      {children}
    </span>
  );
}

/* ─── Empty State ─── */
export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center bg-brand-light">
        <svg
          className="text-brand"
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
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{body}</p>
    </div>
  );
}

/* ─── Divider ─── */
/* ─── Weekly Hours Mask Input (00.00, Max 60.00) ─── */
/* ─── Weekly Hours Mask Input (00.00, Max 60.00) ─── */
/* ─── Weekly Hours Mask Input (00.00, Max 60.00) ─── */
export function WeeklyHoursInput({
  value,
  onChange,
  disabled,
  required,
  className,
}: {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  const getPartsFromNum = (num: number): [string, string] => {
    if (!num || isNaN(num) || num <= 0) return ['00', '00'];
    const clamped = Math.min(60, Math.max(0, num));
    const [h, m] = clamped.toFixed(2).split('.');
    return [h.padStart(2, '0'), m.padStart(2, '0')];
  };

  const [hh, setHh] = React.useState<string>(() => getPartsFromNum(value)[0]);
  const [mm, setMm] = React.useState<string>(() => getPartsFromNum(value)[1]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const [h, m] = getPartsFromNum(value);
    setHh(h);
    setMm(m);
  }, [value]);

  const displayString = `${hh}.${mm}`;

  const setCursorPos = (pos: number) => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const updateVal = (newH: string, newM: string, targetCursorPos?: number) => {
    setHh(newH);
    setMm(newM);
    const num = parseFloat(`${newH}.${newM}`);
    onChange(isNaN(num) ? 0 : num);
    if (targetCursorPos !== undefined) {
      setCursorPos(targetCursorPos);
    }
  };

  const handleFocus = () => {
    if (mm === '00') {
      setCursorPos(2);
    } else {
      setCursorPos(5);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      if (mm !== '00') {
        updateVal(hh, '00', 2);
      } else if (hh !== '00') {
        updateVal('00', '00', 2);
      } else {
        setCursorPos(2);
      }
      return;
    }

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const digit = e.key;

      if (hh === '00' && mm === '00') {
        const newH = `0${digit}`;
        if (parseInt(newH, 10) > 60) {
          updateVal('60', '00', 2);
        } else {
          updateVal(newH, '00', 2);
        }
      } else if (hh !== '00' && hh.startsWith('0') && mm === '00' && parseInt(hh, 10) < 10) {
        const combined = `${hh[1]}${digit}`;
        const valNum = parseInt(combined, 10);
        if (valNum > 60) {
          updateVal('60', '00', 5);
        } else {
          updateVal(combined.padStart(2, '0'), '00', 5);
        }
      } else if (mm === '00') {
        const newM = `${digit}0`;
        updateVal(hh, newM, 5);
      } else if (mm.endsWith('0')) {
        const newM = `${mm[0]}${digit}`;
        updateVal(hh, newM, 5);
      } else {
        const newM = `${mm[1]}${digit}`;
        updateVal(hh, newM, 5);
      }
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      maxLength={5}
      required={required}
      disabled={disabled}
      className={cn(className)}
      value={displayString}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onChange={() => {}}
    />
  );
}

