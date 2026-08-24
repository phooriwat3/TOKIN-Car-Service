"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { useApp } from "@/components/app-provider";
import { Badge, Button } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { FleetTimelineView } from "@/components/fleet-timeline-view";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Plus,
} from "lucide-react";
import { statusLabel } from "@/lib/business";

export default function Calendar() {
  const { data } = useApp();
  const [viewMode, setViewMode] = useState<"gantt" | "week">("gantt");
  const [offset, setOffset] = useState(0);

  const days = useMemo(() => {
    const s = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), offset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [offset]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fleet Schedule &amp; Calendar"
        description="Monitor vehicle utilization, driver assignments, and daily dispatch schedules in real time."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg border border-line bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode("gantt")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "gantt"
                    ? "bg-white text-ink shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock size={14} />
                <span>Gantt Timeline</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "week"
                    ? "bg-white text-ink shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CalendarIcon size={14} />
                <span>Weekly Grid</span>
              </button>
            </div>

            <Link href="/admin/bookings/new">
              <Button size="sm" className="gap-1.5 text-xs font-semibold">
                <Plus size={15} />
                <span>New Ride</span>
              </Button>
            </Link>
          </div>
        }
      />

      {viewMode === "gantt" ? (
        <FleetTimelineView
          bookings={data.bookings}
          vehicles={data.vehicles}
          drivers={data.drivers}
        />
      ) : (
        <div className="space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between rounded-xl border border-line bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOffset((x) => x - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOffset(0)}
                className="text-xs font-semibold"
              >
                This week
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOffset((x) => x + 1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
            <p className="font-bold text-ink text-sm">
              Week of {format(days[0], "d MMM")} – {format(days[6], "d MMM yyyy")}
            </p>
          </div>

          {/* 7-day Grid */}
          <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-7 shadow-sm">
            {days.map((d) => {
              const ds = format(d, "yyyy-MM-dd");
              const items = data.bookings.filter((b) => b.usingDate === ds);
              const isToday = format(new Date(), "yyyy-MM-dd") === ds;

              return (
                <div
                  key={ds}
                  className={`min-h-48 p-3.5 transition-colors ${
                    isToday ? "bg-blue-50/40" : "bg-white"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {format(d, "EEE")}
                      </p>
                      <p
                        className={`text-lg font-extrabold ${
                          isToday ? "text-brand" : "text-slate-900"
                        }`}
                      >
                        {format(d, "d")}
                      </p>
                    </div>
                    {items.length > 0 && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {items.length} {items.length === 1 ? "trip" : "trips"}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <p className="text-[11px] text-slate-300 italic">
                        No bookings
                      </p>
                    ) : (
                      items.map((b) => (
                        <Link
                          key={b.id}
                          href={`/admin/bookings/${b.id}`}
                          className="block rounded-lg border border-line bg-white p-2 text-xs shadow-2xs transition-all hover:border-brand hover:shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-brand">
                              {b.bookingNo}
                            </span>
                            <Badge status={b.status}>
                              {statusLabel(b.status)}
                            </Badge>
                          </div>
                          <p className="mt-1 font-semibold text-ink truncate">
                            {b.destination}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {b.startTime}–{b.endTime} · {b.requesterName}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

