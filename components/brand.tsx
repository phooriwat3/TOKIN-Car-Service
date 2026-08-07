import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        "block shrink-0 overflow-hidden",
        compact ? "h-9 w-[96px]" : "h-11 w-[122px] sm:h-12 sm:w-[132px]",
        className,
      )}
      aria-hidden="true"
    >
      <img
        src="/tokin-logo-clear.png"
        alt=""
        className="pointer-events-none h-full w-full select-none object-contain [image-rendering:-webkit-optimize-contrast]"
      />
    </span>
  );
}

export function PublicHeader({ context, action }: { context: string; action?: React.ReactNode }) {
  return (
    <header className="border-b border-slate-200/80 bg-white px-4 py-3 sm:px-6">
      <div className="flex min-h-12 w-full items-start justify-between gap-4">
        <Link href="/request" className="flex min-w-0 items-center gap-3 sm:gap-4" aria-label="TOKIN Transport home">
          <BrandLogo />
          <span className="hidden h-8 w-px bg-slate-200 sm:block" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight text-slate-900">TOKIN Transport</span>
            <span className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">{context}</span>
          </span>
        </Link>
        {action && <div className="flex shrink-0 items-start justify-end gap-2 pt-0.5">{action}</div>}
      </div>
    </header>
  );
}
