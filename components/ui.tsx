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
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
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
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
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
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-line" />;
  return (
    <div className="flex items-center gap-3">
      <hr className="flex-1 border-line" />
      <span className="text-xs font-medium text-gray-400">{label}</span>
      <hr className="flex-1 border-line" />
    </div>
  );
}

