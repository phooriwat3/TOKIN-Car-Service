"use client";

import React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Clock, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:ring-offset-2";

/* ─── Button ─── */
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
  }
>(({ className, variant = "primary", size = "md", ...p }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 disabled:cursor-not-allowed disabled:opacity-50 select-none active:translate-y-px",
        buttonFocusRing,
        size === "sm" && "h-9 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-11 px-5 text-sm",
        variant === "primary" &&
          "bg-brand-500 text-white shadow-btn hover:bg-brand-600 active:bg-brand-700",
        variant === "secondary" &&
          "border border-slate-200 bg-white text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50",
        variant === "outline" &&
          "border border-brand-400 text-brand-500 hover:bg-brand-50",
        variant === "danger" &&
          "bg-danger text-white shadow-xs hover:bg-red-700",
        variant === "ghost" &&
          "text-slate-600 hover:bg-slate-100 hover:text-ink",
        className,
      )}
      {...p}
    />
  );
});
Button.displayName = "Button";

/* ─── Card ─── */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...p }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-slate-200 bg-white shadow-card transition-shadow duration-200",
      className,
    )}
    {...p}
  />
));
Card.displayName = "Card";

export const CardHover = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...p }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-slate-200 bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover",
      className,
    )}
    {...p}
  />
));
CardHover.displayName = "CardHover";

/* ─── Input ─── */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...p }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 text-sm text-ink placeholder:text-slate-400",
      "outline-none transition-all duration-150",
      "focus:border-brand-400 focus:ring-[3px] focus:ring-brand-400/12",
      "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
      className,
    )}
    {...p}
  />
));
Input.displayName = "Input";

/* ─── Select ─── */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...p }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 text-sm text-ink",
      "outline-none transition-all duration-150",
      "focus:border-brand-400 focus:ring-[3px] focus:ring-brand-400/12",
      "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
      className,
    )}
    {...p}
  />
));
Select.displayName = "Select";

/* ─── Textarea ─── */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...p }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full rounded-md border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-ink placeholder:text-slate-400",
      "outline-none transition-all duration-150",
      "focus:border-brand-400 focus:ring-[3px] focus:ring-brand-400/12",
      "disabled:cursor-not-allowed disabled:bg-slate-50",
      className,
    )}
    {...p}
  />
));
Textarea.displayName = "Textarea";

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
    <label className="block space-y-2">
      <span className="text-[13px] font-semibold text-slate-700">{label}</span>
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
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  rejected: "bg-red-50 text-red-700 border-red-200/70",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200/70",
  pending_approval: "bg-amber-50 text-amber-700 border-amber-200/70",
  pending_ot_verification: "bg-sky-50 text-sky-700 border-sky-200/70",
  changes_requested: "bg-orange-50 text-orange-700 border-orange-200/70",
  approved: "bg-brand-50 text-brand-600 border-brand-200/70",
  assigned: "bg-violet-50 text-violet-700 border-violet-200/70",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200/70",
};

const badgeDotColors: Record<string, string> = {
  completed: "bg-emerald-500",
  rejected: "bg-red-500",
  cancelled: "bg-slate-400",
  pending_approval: "bg-amber-500",
  pending_ot_verification: "bg-sky-500",
  changes_requested: "bg-orange-500",
  approved: "bg-brand-500",
  assigned: "bg-violet-500",
  in_progress: "bg-indigo-500",
};

const pulseStatuses = new Set([
  "in_progress",
  "pending_approval",
  "pending_ot_verification",
]);

export function Badge({
  children,
  status,
}: {
  children: React.ReactNode;
  status?: string;
}) {
  const cls =
    (status && badgeVariants[status]) ||
    "bg-slate-100 text-slate-600 border-slate-200/70";
  const dotColor = (status && badgeDotColors[status]) || "bg-slate-400";
  const pulse = status ? pulseStatuses.has(status) : false;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        cls,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          dotColor,
          pulse && "animate-pulse",
        )}
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
        "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400",
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
    gradient: "#ffffff",
    iconBg: "bg-brand-500 text-white",
  },
  amber: {
    gradient: "#ffffff",
    iconBg: "bg-amber-500 text-white",
  },
  green: {
    gradient: "#ffffff",
    iconBg: "bg-emerald-500 text-white",
  },
  violet: {
    gradient: "#ffffff",
    iconBg: "bg-violet-500 text-white",
  },
  red: {
    gradient: "#ffffff",
    iconBg: "bg-red-500 text-white",
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
        "rounded-lg border border-slate-200 p-5 shadow-card transition-shadow duration-200",
        href && "hover:shadow-card-hover",
        className,
      )}
      style={{ background: styles.gradient }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("rounded-md p-2.5", styles.iconBg)}>{icon}</div>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              trendPositive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700",
            )}
          >
            {trendPositive ? (
              <TrendingUp size={12} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={12} strokeWidth={2.5} />
            )}
            {trendPositive ? "+" : ""}
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
      <Link
        href={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:ring-offset-2 rounded-lg"
      >
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
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 p-4">
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
    const h = Math.min(
      6000,
      Math.max(0, Math.round((Number.isFinite(v) ? v : 0) * 100)),
    );
    return [
      Math.floor(h / 1000),
      Math.floor(h / 100) % 10,
      Math.floor(h / 10) % 10,
      h % 10,
    ];
  };
  const digitsToH = (d: Digits) => d[0] * 1000 + d[1] * 100 + d[2] * 10 + d[3];

  const [digits, setDigits] = React.useState<Digits>(() =>
    valueToDigits(value),
  );
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
    } else if (e.key === "Backspace" || e.key === "Delete") {
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
  const isMax = h >= 6000; // exactly 60.00 → red border
  const isWarning = h >= 5500 && h < 6000; // approaching limit → amber

  return (
    <div className={cn("relative", className)}>
      {/* Hidden number for native required validation */}
      {required && (
        <input
          type="number"
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
          value={h === 0 ? "" : h}
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
          "h-10 w-full rounded-lg border border-line bg-white px-3 pr-12 text-sm text-ink",
          "outline-none transition-all duration-150 tabular-nums cursor-text select-none",
          "focus:border-brand focus:ring-[3px] focus:ring-brand/10",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
          isMax &&
            "border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500/15",
          isWarning &&
            "border-amber-400 bg-amber-50 text-amber-800 focus:border-amber-500 focus:ring-amber-500/15",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium",
          isMax
            ? "text-red-400"
            : isWarning
              ? "text-amber-500"
              : "text-gray-400",
        )}
      >
        hrs
      </span>
    </div>
  );
}

/* --- iOS-Style 24-Hour Time Wheel Picker --- */
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
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const hoursRef = React.useRef<HTMLDivElement>(null);
  const minutesRef = React.useRef<HTMLDivElement>(null);

  // Parse current HH and mm
  const [hhStr, mmStr] = (value || "17:20").split(":");
  const currentHour = parseInt(hhStr || "17", 10);
  const currentMinute = parseInt(mmStr || "20", 10);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Scroll active hour & minute into exact center when popover opens
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (hoursRef.current) {
          hoursRef.current.scrollTop = currentHour * 40;
        }
        if (minutesRef.current) {
          minutesRef.current.scrollTop = currentMinute * 40;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, currentHour, currentMinute]);

  const selectHour = (h: number) => {
    const formatted = `${String(h).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
    onChange(formatted);
  };

  const selectMinute = (m: number) => {
    const formatted = `${String(currentHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    onChange(formatted);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9:]/g, "");
    if (raw.length === 4 && !raw.includes(":")) {
      raw = `${raw.slice(0, 2)}:${raw.slice(2)}`;
    }
    onChange(raw);
  };

  const handleBlur = () => {
    if (!value) return;
    const parts = value.split(":");
    if (parts.length === 2) {
      let h = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      if (isNaN(h)) h = 0;
      if (isNaN(m)) m = 0;
      h = Math.min(23, Math.max(0, h));
      m = Math.min(59, Math.max(0, m));
      const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      onChange(formatted);
    }
  };

  const hoursList = Array.from({ length: 24 }, (_, i) => i);
  const minutesList = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className="relative space-y-2" ref={containerRef}>
      <div className="relative flex items-center">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="17:20 (24-hr)"
          maxLength={5}
          required={required}
          disabled={disabled}
          value={value}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onClick={() => setOpen(true)}
          className={cn(
            "font-mono text-sm tracking-wider pr-14 cursor-pointer",
            className,
          )}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className="absolute right-2 flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 transition-colors"
          title="Open iOS 24-hr Time Wheel Picker"
        >
          <Clock size={15} />
          <span>24 น.</span>
        </button>
      </div>

      {/* Quick preset buttons below input */}
      {quickTimes && quickTimes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            QUICK TIME :
          </span>
          {quickTimes.map((time) => (
            <button
              key={time}
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(time);
                setOpen(false);
              }}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                value === time
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
              )}
            >
              {time} น.
            </button>
          ))}
        </div>
      )}

      {/* Clean iOS-Style Floating Time Wheel Picker */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95">
          {/* Top Column Labels */}
          <div className="mb-2 flex items-center justify-around text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span className="w-1/2 text-center">HOURS</span>
            <span className="w-1/2 text-center">MINUTES</span>
          </div>

          {/* iOS Dual Wheel Drum Container */}
          <div className="relative flex h-[200px] items-center justify-center overflow-hidden rounded-xl bg-slate-50/90 border border-slate-100">
            {/* Center Selection Highlight Bar */}
            <div className="pointer-events-none absolute inset-x-2 top-1/2 h-10 -translate-y-1/2 rounded-lg bg-brand-500/10 border-y border-brand-500/30 shadow-inner" />

            {/* Hours Wheel */}
            <div
              ref={hoursRef}
              onScroll={(e) => {
                const target = e.currentTarget;
                const idx = Math.round(target.scrollTop / 40);
                if (idx >= 0 && idx < 24 && idx !== currentHour) {
                  selectHour(idx);
                }
              }}
              className="h-[200px] w-1/2 overflow-y-auto scroll-smooth snap-y snap-mandatory text-center scrollbar-none"
              style={{ scrollbarWidth: "none" }}
            >
              <div className="h-[80px]" />
              {hoursList.map((h) => {
                const isSelected = h === currentHour;
                return (
                  <div
                    key={h}
                    onClick={() => {
                      selectHour(h);
                      if (hoursRef.current) hoursRef.current.scrollTop = h * 40;
                    }}
                    className={cn(
                      "flex h-10 snap-center items-center justify-center font-mono text-xl cursor-pointer transition-all duration-150 select-none",
                      isSelected
                        ? "font-bold text-brand-600 scale-110"
                        : "text-slate-400 opacity-60 hover:opacity-100",
                    )}
                  >
                    {String(h).padStart(2, "0")}
                  </div>
                );
              })}
              <div className="h-[80px]" />
            </div>

            {/* Separator Colon */}
            <div className="flex h-10 items-center justify-center font-mono text-xl font-bold text-brand-500/70 select-none z-10 px-1">
              :
            </div>

            {/* Minutes Wheel */}
            <div
              ref={minutesRef}
              onScroll={(e) => {
                const target = e.currentTarget;
                const idx = Math.round(target.scrollTop / 40);
                if (idx >= 0 && idx < 60 && idx !== currentMinute) {
                  selectMinute(idx);
                }
              }}
              className="h-[200px] w-1/2 overflow-y-auto scroll-smooth snap-y snap-mandatory text-center scrollbar-none"
              style={{ scrollbarWidth: "none" }}
            >
              <div className="h-[80px]" />
              {minutesList.map((m) => {
                const isSelected = m === currentMinute;
                return (
                  <div
                    key={m}
                    onClick={() => {
                      selectMinute(m);
                      if (minutesRef.current)
                        minutesRef.current.scrollTop = m * 40;
                    }}
                    className={cn(
                      "flex h-10 snap-center items-center justify-center font-mono text-xl cursor-pointer transition-all duration-150 select-none",
                      isSelected
                        ? "font-bold text-brand-600 scale-110"
                        : "text-slate-400 opacity-60 hover:opacity-100",
                    )}
                  >
                    {String(m).padStart(2, "0")}
                  </div>
                );
              })}
              <div className="h-[80px]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
