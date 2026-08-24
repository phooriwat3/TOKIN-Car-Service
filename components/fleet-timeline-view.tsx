"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  addDays,
  format,
  isToday as checkIsToday,
} from "date-fns";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  ShieldAlert,
  User,
} from "lucide-react";
import type { Booking, Driver, Vehicle } from "@/lib/types";
import { Badge, Button } from "./ui";
import { statusLabel } from "@/lib/business";

// Convert HH:mm to minutes from midnight
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Timeline runs from 06:00 (360 min) to 24:00 (1440 min) => Total 1080 min (18 hours)
const TIMELINE_START_MINUTES = 6 * 60; // 06:00
const TIMELINE_END_MINUTES = 24 * 60; // 24:00
const TIMELINE_TOTAL_MINUTES = TIMELINE_END_MINUTES - TIMELINE_START_MINUTES;

const HOURS = Array.from({ length: 19 }, (_, i) => 6 + i); // 6 to 24

export function FleetTimelineView({
  bookings,
  vehicles,
  drivers,
}: {
  bookings: Booking[];
  vehicles: Vehicle[];
  drivers: Driver[];
}) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isSelectedToday = checkIsToday(selectedDate);

  // Trips for selected date
  const dayBookings = useMemo(() => {
    return bookings.filter((b) => b.usingDate === dateStr);
  }, [bookings, dateStr]);

  // Unassigned bookings for the selected date
  const unassignedDayBookings = useMemo(() => {
    return dayBookings.filter((b) => {
      const units = b.assignment?.manualTransportUnits;
      const hasVehicle = b.assignment?.vehicleId || (units && units.length > 0);
      return (
        !hasVehicle &&
        ["pending_approval", "pending_ot_verification", "approved"].includes(
          b.status,
        )
      );
    });
  }, [dayBookings]);

  // Fleet stats for the day
  const stats = useMemo(() => {
    const assignedVehicleIds = new Set<string>();
    const assignedDriverIds = new Set<string>();

    dayBookings.forEach((b) => {
      if (b.assignment?.vehicleId) assignedVehicleIds.add(b.assignment.vehicleId);
      if (b.assignment?.driverId) assignedDriverIds.add(b.assignment.driverId);
      b.assignment?.manualTransportUnits?.forEach((u) => {
        if (u.licensePlate) assignedVehicleIds.add(u.licensePlate);
        if (u.driverName) assignedDriverIds.add(u.driverName);
      });
    });

    return {
      totalTrips: dayBookings.length,
      activeVehicles: assignedVehicleIds.size,
      totalVehicles: vehicles.length,
      activeDrivers: assignedDriverIds.size,
      totalDrivers: drivers.length,
      unassignedCount: unassignedDayBookings.length,
    };
  }, [dayBookings, vehicles, drivers, unassignedDayBookings]);

  // Helper to calculate position & width for timeline bar
  const getBarStyle = (startTime: string, endTime: string) => {
    const startMin = Math.max(timeToMinutes(startTime), TIMELINE_START_MINUTES);
    const endMin = Math.min(timeToMinutes(endTime), TIMELINE_END_MINUTES);
    const duration = Math.max(endMin - startMin, 30); // min 30 min width

    const leftPercent =
      ((startMin - TIMELINE_START_MINUTES) / TIMELINE_TOTAL_MINUTES) * 100;
    const widthPercent = (duration / TIMELINE_TOTAL_MINUTES) * 100;

    return {
      left: `${Math.max(0, Math.min(leftPercent, 100))}%`,
      width: `${Math.max(2, Math.min(widthPercent, 100 - leftPercent))}%`,
    };
  };

  // Check for tight turnaround (< 30 min buffer) on a specific resource's bookings
  const checkTurnaroundWarning = (
    currentBooking: Booking,
    resourceBookings: Booking[],
  ): boolean => {
    const currentStart = timeToMinutes(currentBooking.startTime);
    const currentEnd = timeToMinutes(currentBooking.endTime);

    return resourceBookings.some((other) => {
      if (other.id === currentBooking.id) return false;
      const otherStart = timeToMinutes(other.startTime);
      const otherEnd = timeToMinutes(other.endTime);

      // Overlap or gap < 30 minutes
      if (otherStart >= currentEnd && otherStart - currentEnd < 30) return true;
      if (currentStart >= otherEnd && currentStart - otherEnd < 30) return true;
      // Actual overlap
      if (currentStart < otherEnd && currentEnd > otherStart) return true;

      return false;
    });
  };

  return (
    <div className="space-y-4">
      {/* Date Navigation & Daily Stats Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate((d) => addDays(d, -1))}
            className="h-8 w-8 p-0"
            aria-label="Previous day"
          >
            <ChevronLeft size={16} />
          </Button>

          <Button
            variant={isSelectedToday ? "primary" : "secondary"}
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            className="h-8 text-xs font-semibold"
          >
            Today
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            className="h-8 w-8 p-0"
            aria-label="Next day"
          >
            <ChevronRight size={16} />
          </Button>

          <div className="ml-2">
            <span className="text-base font-bold text-ink">
              {format(selectedDate, "EEEE, d MMMM yyyy")}
            </span>
          </div>
        </div>

        {/* Fleet KPI Badges */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-slate-50 px-3 py-1.5 font-medium text-slate-700">
            <CalendarIcon size={14} className="text-brand" />
            <span>Total Trips:</span>
            <strong className="text-ink">{stats.totalTrips}</strong>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-slate-50 px-3 py-1.5 font-medium text-slate-700">
            <Car size={14} className="text-blue-600" />
            <span>Vehicles Active:</span>
            <strong className="text-ink">
              {stats.activeVehicles}/{stats.totalVehicles}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-slate-50 px-3 py-1.5 font-medium text-slate-700">
            <User size={14} className="text-emerald-600" />
            <span>Drivers On Duty:</span>
            <strong className="text-ink">
              {stats.activeDrivers}/{stats.totalDrivers}
            </strong>
          </div>

          {stats.unassignedCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 font-bold text-amber-800 animate-pulse">
              <AlertTriangle size={14} className="text-amber-600" />
              <span>{stats.unassignedCount} Needs Assignment</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Gantt Timeline Container */}
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-brand" />
            <h3 className="font-bold text-ink text-sm">
              Daily Fleet Gantt Schedule
            </h3>
            <span className="text-xs text-slate-500">
              (06:00 – 24:00 Operating Window)
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-blue-600" />
              <span>Assigned Trip</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-purple-600" />
              <span>OT Transport</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-amber-500 ring-2 ring-rose-400" />
              <span>Tight Gap / Overlap</span>
            </div>
          </div>
        </div>

        {/* Scrollable Timeline Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            {/* Timeline Hours Header */}
            <div className="flex border-b border-line bg-slate-100/70 text-[11px] font-semibold text-slate-500">
              {/* Fixed Resource Column Header */}
              <div className="w-56 shrink-0 border-r border-line p-3">
                Fleet Resource
              </div>

              {/* Time Slots 06:00 - 24:00 */}
              <div className="relative flex flex-1">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 border-r border-slate-200 py-2 text-center text-[10px]"
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicle Rows */}
            <div className="divide-y divide-line">
              <div className="bg-slate-50/50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                🚗 Company Vehicles ({vehicles.length})
              </div>

              {vehicles.map((v) => {
                // Find bookings assigned to this vehicle
                const vehicleBookings = dayBookings.filter((b) => {
                  if (b.assignment?.vehicleId === v.id) return true;
                  return b.assignment?.manualTransportUnits?.some(
                    (u) =>
                      u.licensePlate.toLowerCase() ===
                      v.licensePlate.toLowerCase(),
                  );
                });

                return (
                  <div
                    key={v.id}
                    className="flex transition-colors hover:bg-slate-50/70"
                  >
                    {/* Resource Details Card */}
                    <div className="w-56 shrink-0 border-r border-line p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs">
                          {v.licensePlate}
                        </span>
                        <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold uppercase text-slate-600">
                          {v.type}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {v.brand} {v.model} · {v.capacity} seats
                      </p>
                    </div>

                    {/* Timeline Canvas */}
                    <div className="relative flex flex-1 items-center bg-white px-0 py-2">
                      {/* Background Grid Lines */}
                      <div className="pointer-events-none absolute inset-0 flex">
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="flex-1 border-r border-dashed border-slate-100"
                          />
                        ))}
                      </div>

                      {/* Booking Bars */}
                      {vehicleBookings.length === 0 ? (
                        <span className="ml-4 text-[11px] italic text-slate-300">
                          Available / No bookings
                        </span>
                      ) : (
                        vehicleBookings.map((b) => {
                          const style = getBarStyle(b.startTime, b.endTime);
                          const isOt =
                            b.requestType === "overtime" ||
                            (b.overtimeEmployees &&
                              b.overtimeEmployees.length > 0) ||
                            b.category === "overtime_transport";
                          const hasWarning = checkTurnaroundWarning(
                            b,
                            vehicleBookings,
                          );

                          return (
                            <Link
                              key={b.id}
                              href={`/admin/bookings/${b.id}`}
                              style={style}
                              className={`group absolute top-2 z-10 flex h-8 items-center truncate rounded-md px-2 text-[11px] font-medium text-white shadow-sm transition-all hover:z-20 hover:scale-[1.02] hover:shadow-md ${
                                hasWarning
                                  ? "bg-amber-500 ring-2 ring-rose-500"
                                  : isOt
                                  ? "bg-purple-600 hover:bg-purple-700"
                                  : "bg-blue-600 hover:bg-blue-700"
                              }`}
                              title={`${b.bookingNo} (${b.startTime} - ${b.endTime})\nTo: ${b.destination}\nRequester: ${b.requesterName} (${b.department})`}
                            >
                              <div className="flex w-full items-center justify-between gap-1 overflow-hidden">
                                <span className="truncate font-semibold">
                                  {b.startTime} {b.destination}
                                </span>
                                {hasWarning && (
                                  <AlertTriangle
                                    size={12}
                                    className="shrink-0 text-white fill-amber-300 animate-bounce"
                                  />
                                )}
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drivers Section */}
            <div className="divide-y divide-line border-t border-line">
              <div className="bg-slate-50/50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                👨‍✈️ Drivers On Roster ({drivers.length})
              </div>

              {drivers.map((d) => {
                const driverBookings = dayBookings.filter((b) => {
                  if (b.assignment?.driverId === d.id) return true;
                  return b.assignment?.manualTransportUnits?.some(
                    (u) =>
                      u.driverName.toLowerCase() === d.fullName.toLowerCase(),
                  );
                });

                return (
                  <div
                    key={d.id}
                    className="flex transition-colors hover:bg-slate-50/70"
                  >
                    {/* Driver Card */}
                    <div className="w-56 shrink-0 border-r border-line p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs">
                          {d.fullName}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {d.phone || "No phone"} · ID: {d.employeeId || "—"}
                      </p>
                    </div>

                    {/* Timeline Canvas */}
                    <div className="relative flex flex-1 items-center bg-white px-0 py-2">
                      <div className="pointer-events-none absolute inset-0 flex">
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="flex-1 border-r border-dashed border-slate-100"
                          />
                        ))}
                      </div>

                      {driverBookings.length === 0 ? (
                        <span className="ml-4 text-[11px] italic text-slate-300">
                          Off-duty / Standby
                        </span>
                      ) : (
                        driverBookings.map((b) => {
                          const style = getBarStyle(b.startTime, b.endTime);
                          const isOt =
                            b.requestType === "overtime" ||
                            (b.overtimeEmployees &&
                              b.overtimeEmployees.length > 0) ||
                            b.category === "overtime_transport";

                          return (
                            <Link
                              key={b.id}
                              href={`/admin/bookings/${b.id}`}
                              style={style}
                              className={`group absolute top-2 z-10 flex h-8 items-center truncate rounded-md px-2 text-[11px] font-medium text-white shadow-sm transition-all hover:z-20 hover:scale-[1.02] ${
                                isOt
                                  ? "bg-purple-600 hover:bg-purple-700"
                                  : "bg-emerald-600 hover:bg-emerald-700"
                              }`}
                              title={`${b.bookingNo} (${b.startTime} - ${b.endTime})\nTo: ${b.destination}`}
                            >
                              <span className="truncate">
                                {b.startTime} {b.destination}
                              </span>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Unassigned Trips Queue for the Day */}
      {unassignedDayBookings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-600" />
              <h4 className="font-bold text-amber-950 text-sm">
                Unassigned Trips for {format(selectedDate, "dd/MM/yyyy")} (
                {unassignedDayBookings.length})
              </h4>
            </div>
            <span className="text-xs text-amber-800">
              Needs vehicle and driver assignment
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unassignedDayBookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-col justify-between rounded-lg border border-amber-200 bg-white p-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-brand">
                      {b.bookingNo}
                    </span>
                    <Badge status={b.status}>{statusLabel(b.status)}</Badge>
                  </div>
                  <p className="mt-1 font-semibold text-ink text-xs">
                    {b.startTime}–{b.endTime} · {b.destination}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {b.requesterName} ({b.department}) · {b.numPassengers} pass.
                  </p>
                </div>

                <div className="mt-3 border-t border-gray-100 pt-2">
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    className="flex items-center justify-center gap-1 rounded bg-brand px-2 py-1 text-center text-xs font-semibold text-white hover:bg-brand-dark"
                  >
                    <span>Assign Fleet</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
