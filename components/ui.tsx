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
    if (!num || isNaN(num) || num <= 0) return ['--', '--'];
    const clamped = Math.min(60, Math.max(0, num));
    const [h, m] = clamped.toFixed(2).split('.');
    return [h.padStart(2, '0'), m.padStart(2, '0')];
  };

  const [hh, setHh] = React.useState<string>(() => getPartsFromNum(value)[0]);
  const [mm, setMm] = React.useState<string>(() => getPartsFromNum(value)[1]);
  const [activeSegment, setActiveSegment] = React.useState<'hh' | 'mm'>('hh');
  const [digitCount, setDigitCount] = React.useState<number>(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const floatVal = (hh === '--' || mm === '--') ? 0 : parseFloat(`${hh}.${mm}`);
    if (value !== floatVal) {
      const [h, m] = getPartsFromNum(value);
      setHh(h);
      setMm(m);
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

  const displayString = `${hh}:${mm} Hrs`;

  const selectSegment = (segment: 'hh' | 'mm') => {
    setTimeout(() => {
      if (inputRef.current) {
        if (segment === 'hh') {
          inputRef.current.setSelectionRange(0, 2);
        } else {
          inputRef.current.setSelectionRange(3, 5);
        }
      }
    }, 0);
  };

  const updateVal = (newHh: string, newMm: string) => {
    setHh(newHh);
    setMm(newMm);
    const hasDashes = newHh === '--' || newMm === '--';
    const floatVal = hasDashes ? 0 : parseFloat(`${newHh}.${newMm}`);
    onChange(isNaN(floatVal) ? 0 : floatVal);
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
    } else {
      setActiveSegment('mm');
      setDigitCount(0);
      target.setSelectionRange(3, 5);
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
      setActiveSegment('hh');
      setDigitCount(0);
      selectSegment('hh');
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveSegment('mm');
      setDigitCount(0);
      selectSegment('mm');
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      if (activeSegment === 'hh') {
        updateVal('--', mm);
        setDigitCount(0);
        selectSegment('hh');
      } else {
        if (mm !== '--') {
          updateVal(hh, '--');
          setDigitCount(0);
          setActiveSegment('hh');
          selectSegment('hh');
        } else {
          setActiveSegment('hh');
          setDigitCount(0);
          selectSegment('hh');
        }
      }
      return;
    }

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const digit = e.key;

      if (activeSegment === 'hh') {
        if (digitCount === 0 || hh === '--') {
          const valNum = parseInt(digit, 10);
          if (valNum >= 7) {
            const newHh = `0${digit}`;
            const newMm = mm === '--' ? '00' : mm;
            updateVal(newHh, newMm);
            setActiveSegment('mm');
            setDigitCount(0);
            selectSegment('mm');
          } else {
            const newHh = `0${digit}`;
            updateVal(newHh, mm);
            setDigitCount(1);
            selectSegment('hh');
          }
        } else {
          const firstDigit = hh[1];
          const combined = firstDigit + digit;
          let newHh = combined;
          let newMm = mm;
          if (parseInt(combined, 10) > 60) {
            newHh = '60';
            newMm = '00';
          } else if (newHh === '60') {
            newMm = '00';
          } else if (newMm === '--') {
            newMm = '00';
          }
          updateVal(newHh, newMm);
          setActiveSegment('mm');
          setDigitCount(0);
          selectSegment('mm');
        }
      } else {
        if (hh === '--') {
          const newHh = '00';
          if (digitCount === 0 || mm === '--') {
            const newMm = `0${digit}`;
            updateVal(newHh, newMm);
            setDigitCount(1);
            selectSegment('mm');
          } else {
            const firstDigit = mm[1];
            const combined = firstDigit + digit;
            updateVal(newHh, combined);
            setDigitCount(0);
            selectSegment('mm');
          }
          return;
        }
        if (hh === '60') {
          return;
        }
        if (digitCount === 0 || mm === '--') {
          const newMm = `0${digit}`;
          updateVal(hh, newMm);
          setDigitCount(1);
          selectSegment('mm');
        } else {
          const firstDigit = mm[1];
          const combined = firstDigit + digit;
          updateVal(hh, combined);
          setDigitCount(0);
          selectSegment('mm');
        }
      }
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      maxLength={9}
      required={required}
      disabled={disabled}
      className={cn(className)}
      value={displayString}
      onFocus={handleFocus}
      onMouseUp={handleMouseUp}
      onKeyDown={handleKeyDown}
      onChange={() => {}}
    />
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
  onChange,
  disabled,
  required,
  className,
  quickTimes,
}: {
  value: string;
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

      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute left-0 mt-1 w-64 rounded-xl border border-line bg-white p-3 shadow-xl z-50 animate-scale-in"
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
        </div>
      )}
    </div>
  );
}

