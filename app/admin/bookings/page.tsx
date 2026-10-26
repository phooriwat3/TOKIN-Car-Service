"use client";

import Link from "next/link";
import {
  ArrowRight,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  PlayCircle,
  Plus,
  Route,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import { BookingTable } from "@/components/booking-table";
import { AdminBookingDataControls } from "@/components/admin-booking-data-controls";
import { TigerSpaceReportImport } from "@/components/tiger-space-report-import";
import { ErrorBoundary } from "@/components/error-boundary";
import { AdminWorkflowExceptions } from "@/components/admin-workflow-exceptions";
import { useBookingsQuery } from "@/lib/hooks/use-bookings-query";
import { countBookingsByOperationalStage } from "@/lib/operations-queue";

export default function AllBookings() {
  const { data, configured } = useApp();
  const { data: summaryData, isLoading } = useBookingsQuery(
    { page: 1, limit: 1 },
    { enabled: configured },
  );
  const stageCounts =
    summaryData?.facets?.stages ??
    countBookingsByOperationalStage(data.bookings);

  const overview = [
    {
      label: "Needs review",
      value: stageCounts.needs_review,
      detail: "Confirm, approve, correct, or verify OT",
      href: "/admin/bookings?stage=needs_review",
      icon: ClipboardCheck,
      tone: "text-amber-700 bg-amber-50 border-amber-300",
    },
    {
      label: "Ready to plan",
      value: stageCounts.ready_to_plan,
      detail: "Approved and waiting for fleet",
      href: "/admin/bookings?stage=ready_to_plan",
      icon: Route,
      tone: "text-blue-700 bg-blue-50 border-blue-300",
    },
    {
      label: "Assigned",
      value: stageCounts.assigned,
      detail: "Vehicle and driver prepared",
      href: "/admin/bookings?stage=assigned",
      icon: CarFront,
      tone: "text-emerald-700 bg-emerald-50 border-emerald-300",
    },
    {
      label: "In progress",
      value: stageCounts.in_progress,
      detail: "Trips currently on the road",
      href: "/admin/bookings?stage=in_progress",
      icon: PlayCircle,
      tone: "text-violet-700 bg-violet-50 border-violet-300",
    },
    {
      label: "Completed",
      value: stageCounts.completed,
      detail: "Completed and closed records",
      href: "/admin/bookings?stage=completed",
      icon: CheckCircle2,
      tone: "text-slate-700 bg-slate-50 border-slate-300",
    },
  ];

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl bg-white shadow-lg" aria-labelledby="admin-bookings-title">
          <div className="relative min-h-[230px] overflow-hidden px-5 pb-16 pt-7 text-white sm:px-8 sm:pb-20 sm:pt-9">
            <div className="absolute inset-0 bg-[url('/images/tokin-thailand.jpg')] bg-cover bg-center" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-950/95 via-brand-900/88 to-brand-700/65" aria-hidden="true" />
            <div className="absolute inset-x-0 top-0 h-1 bg-amber-400" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[42px] border-white/[0.05]" aria-hidden="true" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">
                  GA transport control
                </p>
                <h1 id="admin-bookings-title" className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Plan every request from one queue.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-brand-100 sm:text-base">
                  Review demand, verify overtime transport, assign the right vehicle and driver, and monitor delivery exceptions.
                </p>
              </div>
              <Link
                href="/admin/bookings/new"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-400 px-5 text-sm font-bold text-brand-950 shadow-lg transition hover:bg-amber-300"
              >
                <Plus size={17} />
                Create employee OT ride
              </Link>
            </div>
          </div>

          <div className="relative z-10 mx-3 -mt-11 grid gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:mx-5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-5">
            {overview.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group min-w-0 rounded-xl border border-transparent p-3.5 transition hover:border-brand-200 hover:bg-brand-50/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-lg border p-2 ${item.tone}`}>
                      <Icon size={17} />
                    </span>
                    <span className="font-display text-2xl font-extrabold text-brand-950">
                      {isLoading ? "—" : item.value}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-900">{item.label}</p>
                  <p className="mt-1 min-h-8 text-xs leading-4 text-slate-500">{item.detail}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-700">
                    Open queue <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="h-4" />
        </section>

        <AdminWorkflowExceptions />
        <TigerSpaceReportImport />
        <BookingTable
          basePath="/admin/bookings"
          bookings={data.bookings}
          isLoading={configured && isLoading && !data.bookings.length}
          serverMode={configured}
        />
        <AdminBookingDataControls />
      </div>
    </ErrorBoundary>
  );
}
