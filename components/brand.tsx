import Link from "next/link";
import { cn } from "@/lib/utils";

export function TokinIconSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-full w-auto select-none", className)}
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
    >
      {/* Red Brand Accent Mark */}
      <path
        d="M6 10C6 7.79086 7.79086 6 10 6H34C36.2091 6 38 7.79086 38 10V38C38 40.2091 36.2091 42 34 42H10C7.79086 42 6 40.2091 6 38V10Z"
        fill="url(#tokin_red_gradient)"
      />
      {/* Dynamic Chevron Icon within Mark */}
      <path
        d="M16 16L24 24L16 32M24 24H14"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* TOKIN Vector Typography */}
      <text
        x="48"
        y="33"
        fill="#0F172A"
        fontSize="24"
        fontWeight="800"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        letterSpacing="-0.03em"
      >
        TOKIN
      </text>

      <defs>
        <linearGradient
          id="tokin_red_gradient"
          x1="6"
          y1="6"
          x2="38"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#DC2626" />
          <stop offset="1" stopColor="#B91C1C" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BrandLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-start overflow-visible",
        compact ? "h-8 sm:h-9" : "h-10 sm:h-11",
        className,
      )}
      aria-label="TOKIN Corporation"
    >
      <picture className="h-full w-auto flex shrink-0 items-center">
        <img
          src="/tokin-logo-clear.png"
          alt="TOKIN"
          className="h-full w-auto max-h-full max-w-none select-none object-contain drop-shadow-sm"
          onError={(e) => {
            // If image fails, toggle display to fallback
            e.currentTarget.style.display = "none";
          }}
        />
      </picture>
    </span>
  );
}

export function PublicHeader({
  context,
  action,
}: {
  context: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="border-b border-slate-200/80 bg-white px-4 py-3 sm:px-6 shadow-sm">
      <div className="flex min-h-12 w-full items-center justify-between gap-4">
        <Link
          href="/request"
          className="flex min-w-0 items-center gap-3 sm:gap-4 transition-opacity hover:opacity-90"
          aria-label="TOKIN Transport home"
        >
          <BrandLogo />
          <span className="hidden h-7 w-px bg-slate-200 sm:block" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight text-slate-900">
              TOKIN Transport
            </span>
            <span className="mt-0.5 hidden truncate text-xs font-medium text-slate-500 sm:block">
              {context}
            </span>
          </span>
        </Link>
        {action && (
          <div className="flex shrink-0 items-start justify-end gap-2 pt-0.5">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
