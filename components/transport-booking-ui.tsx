import type { ReactNode } from "react";
import {
  ArrowRight,
  BusFront,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Route,
  TicketCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type JourneyStep = {
  label: string;
  complete?: boolean;
};

export function TransportBookingHero({
  eyebrow,
  title,
  description,
  serviceLabel,
  origin,
  destination,
  date,
  time,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  serviceLabel: string;
  origin?: string;
  destination?: string;
  date?: string;
  time?: string;
  action?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-brand-800 bg-brand-950 text-white shadow-lg">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/tokin-thailand.jpg')" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,13,26,0.96)_0%,rgba(7,22,40,0.9)_48%,rgba(7,22,40,0.48)_100%)]"
        aria-hidden="true"
      />

      <div className="relative px-5 pb-28 pt-7 sm:px-7 sm:pb-28 sm:pt-9 lg:px-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-100 backdrop-blur-sm">
                <BusFront size={14} aria-hidden="true" />
                {serviceLabel}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-200">
                {eyebrow}
              </span>
            </div>
            <h1 className="mt-4 max-w-xl text-3xl font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
              {description}
            </p>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 lg:inset-x-8">
        <TransportRouteStrip
          origin={origin}
          destination={destination}
          date={date}
          time={time}
          inverse
        />
      </div>
    </section>
  );
}

export function TransportRouteStrip({
  origin,
  destination,
  date,
  time,
  inverse = false,
}: {
  origin?: string;
  destination?: string;
  date?: string;
  time?: string;
  inverse?: boolean;
}) {
  const items = [
    {
      label: "From",
      value: origin?.trim() || "TOKIN Thailand",
      icon: MapPin,
    },
    {
      label: "To",
      value: destination?.trim() || "Choose destination",
      icon: Route,
    },
    {
      label: "Travel date",
      value: date?.trim() || "Select date",
      icon: CalendarDays,
    },
    {
      label: "Time",
      value: time?.trim() || "Select time",
      icon: Clock3,
    },
  ];

  return (
    <dl
      className={cn(
        "grid overflow-hidden rounded-lg border shadow-lg sm:grid-cols-2 lg:grid-cols-4",
        inverse
          ? "border-white/20 bg-brand-900/95 text-white backdrop-blur-md"
          : "border-slate-200 bg-white text-slate-900",
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "flex min-w-0 items-center gap-3 px-4 py-3",
            index > 0 && "border-t sm:border-t-0",
            index % 2 === 1 && "sm:border-l",
            index >= 2 && "lg:border-t-0",
            index > 0 && "lg:border-l",
            inverse ? "border-white/10" : "border-slate-100",
          )}
        >
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-md",
              inverse
                ? "bg-white/10 text-amber-300"
                : "bg-brand-50 text-brand-600",
            )}
          >
            <item.icon size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <dt
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.12em]",
                inverse ? "text-brand-200" : "text-slate-500",
              )}
            >
              {item.label}
            </dt>
            <dd className="mt-0.5 truncate text-xs font-bold sm:text-sm">
              {item.value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export function BookingJourney({
  steps,
  activeStep,
}: {
  steps: JourneyStep[];
  activeStep: number;
}) {
  return (
    <nav
      aria-label="Request progress"
      className="overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-4 shadow-card sm:px-5"
    >
      <ol className="grid grid-cols-3">
        {steps.map((step, index) => {
          const number = index + 1;
          const active = number === activeStep;
          const complete = number < activeStep || Boolean(step.complete);
          return (
            <li
              key={step.label}
              aria-current={active ? "step" : undefined}
              className="relative flex min-w-0 flex-col items-center px-1 text-center sm:flex-row sm:text-left"
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute right-1/2 top-3.5 h-px w-full sm:right-[calc(50%+14px)]",
                    number <= activeStep ? "bg-brand-500" : "bg-slate-200",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold",
                  active
                    ? "border-brand-500 bg-brand-500 text-white ring-4 ring-brand-50"
                    : complete
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-300 bg-white text-slate-500",
                )}
              >
                {complete && !active ? <Check size={13} /> : number}
              </span>
              <span
                className={cn(
                  "relative z-10 mt-2 min-w-0 bg-white px-1 text-[10px] leading-4 sm:ml-2 sm:mt-0 sm:text-xs",
                  active ? "font-bold text-slate-900" : "text-slate-500",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function DigitalTransportTicket({
  requestNo,
  serviceLabel,
  statusLabel,
  origin,
  destination,
  date,
  time,
  children,
  footer,
}: {
  requestNo: string;
  serviceLabel: string;
  statusLabel: string;
  origin?: string;
  destination?: string;
  date?: string;
  time?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex flex-col gap-3 bg-brand-900 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-amber-300">
            <TicketCheck size={21} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-200">
              {serviceLabel}
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight">
              {requestNo}
            </h1>
          </div>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-200">
          {statusLabel}
        </span>
      </div>

      {(origin || destination || date || time) && (
        <div className="border-b border-dashed border-slate-300 px-5 py-5 sm:px-7">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-center">
            <TicketPlace label="From" value={origin || "TOKIN Thailand"} />
            <ArrowRight className="hidden text-brand-400 sm:block" size={20} aria-hidden="true" />
            <TicketPlace label="To" value={destination || "Pending destination"} />
            {(date || time) && (
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-1 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                {date && <TicketPlace label="Date" value={date} compact />}
                {time && <TicketPlace label="Time" value={time} compact />}
              </div>
            )}
          </div>
        </div>
      )}

      {children && <div className="px-5 py-5 sm:px-7">{children}</div>}
      {footer && (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
          {footer}
        </div>
      )}
    </section>
  );
}

function TicketPlace({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 break-words font-bold text-slate-900",
          compact ? "text-sm" : "text-base sm:text-lg",
        )}
      >
        {value}
      </p>
    </div>
  );
}
