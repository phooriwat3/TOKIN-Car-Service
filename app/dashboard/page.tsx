"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import {
  ArrowUpRight,
  AlertTriangle,
  CalendarCheck,
  Car,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Gauge,
  ListChecks,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Badge, Button, Card, Empty, Stat } from "@/components/ui";
import { statusLabel } from "@/lib/business";
import type { Booking, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const actionByRole: Record<
  Role,
  { href: string; label: string; icon: typeof Car }
> = {
  requester: {
    href: "/bookings/new",
    label: "New transport request",
    icon: FilePlus2,
  },
  approver: {
    href: "/request",
    label: "Open approval queue",
    icon: CheckCircle2,
  },
  admin: { href: "/admin/bookings", label: "Manage assignments", icon: Car },
  driver: {
    href: "/driver/trips",
    label: "View assigned trips",
    icon: CalendarCheck,
  },
};

const listPathByRole: Record<Role, string> = {
  requester: "/bookings",
  approver: "/request",
  admin: "/admin/bookings",
  driver: "/driver/trips",
};

import { getBangkokDateString, getBangkokHour } from "@/lib/date-format";

function getGreeting() {
  const hour = getBangkokHour();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { role, user, data } = useApp();
  const router = useRouter();
  const own = data.bookings.filter((booking) =>
    role === "requester"
      ? booking.requesterId === user.id
      : role === "approver"
        ? booking.department === user.department
        : role === "driver"
          ? booking.assignment?.driverId ===
            data.drivers.find((driver) => driver.userId === user.id)?.id
          : true,
  );
  const pending = own.filter(
    (booking) =>
      booking.status === "pending_approval" ||
      booking.status === "pending_ot_verification",
  ).length;
  const active = own.filter((booking) =>
    ["approved", "assigned", "in_progress"].includes(booking.status),
  ).length;
  const complete = own.filter(
    (booking) => booking.status === "completed",
  ).length;
  const today = getBangkokDateString();
  const todayBookings = own.filter((booking) => booking.usingDate === today);
  const dailyVehicles = todayBookings.reduce(
    (sum, booking) =>
      sum + (booking.assignment?.manualTransportUnits?.length ?? 0),
    0,
  );
  const todayPassengers = todayBookings.reduce(
    (sum, booking) => sum + booking.numPassengers,
    0,
  );
  const readyForGa = own.filter((booking) => booking.status === "approved").length;
  const adminQueues = useMemo(() => {
    if (role !== "admin") return null;

    const hasAssignment = (booking: (typeof data.bookings)[number]) =>
      Boolean(
        booking.assignment?.vehicleId ||
          booking.assignment?.manualTransportUnits?.length,
      );
    const requiresAssignment = (booking: (typeof data.bookings)[number]) =>
      ["approved", "assigned", "scheduled"].includes(booking.status);
    const unassigned = data.bookings.filter(
      (booking) => requiresAssignment(booking) && !hasAssignment(booking),
    );
    const todayUnassigned = unassigned.filter(
      (booking) => booking.usingDate <= today,
    );
    const urgent = data.bookings.filter(
      (booking) => booking.urgent && !["completed", "cancelled", "rejected"].includes(booking.status),
    );
    const verification = data.bookings.filter(
      (booking) => booking.status === "pending_ot_verification",
    );
    const assignmentKeys = new Map<string, (typeof data.bookings)[number][]>();
    data.bookings.forEach((booking) => {
      if (!requiresAssignment(booking) || !hasAssignment(booking)) return;
      const units = booking.assignment?.manualTransportUnits ?? [];
      const resources = [
        booking.assignment?.vehicleId,
        booking.assignment?.driverId,
        ...units.flatMap((unit) => [unit.licensePlate, unit.driverName]),
      ].filter(Boolean);
      resources.forEach((resource) => {
        const key = `${booking.usingDate}:${resource}`;
        assignmentKeys.set(key, [...(assignmentKeys.get(key) ?? []), booking]);
      });
    });
    const conflicts = Array.from(assignmentKeys.values()).filter((bookings) =>
      bookings.some((booking, index) =>
        bookings.slice(index + 1).some(
          (other) =>
            booking.startTime < other.endTime && other.startTime < booking.endTime,
        ),
      ),
    );

    return { unassigned, todayUnassigned, urgent, verification, conflicts };
  }, [data.bookings, role, today]);
  const action = actionByRole[role];
  const ActionIcon = action.icon;

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-500">
            {role === "admin" ? "Transport control" : `${role} workspace`}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-[34px]">
            {getGreeting()}, {user.fullName.split(" ")[0]}.
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {role === "approver"
              ? `${pending} request${pending === 1 ? "" : "s"} waiting for a decision in ${user.department}.`
              : role === "driver"
                ? "Your assigned routes and trip status at a glance."
                : "Today’s transport requests and fleet activity."}
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          onClick={() => router.push(action.href)}
          className="self-start sm:self-auto"
        >
          <ActionIcon size={17} />
          {action.label}
        </Button>
      </section>

      <section
        className={cn(
          "grid gap-5 sm:grid-cols-2",
          role === "admin" ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        <Stat
          label={
            role === "approver"
              ? "Waiting for your review"
              : "Waiting for approval / OT check"
          }
          value={pending}
          href={listPathByRole[role]}
        />
        <Stat
          label="Trips in motion"
          value={active}
          href={listPathByRole[role]}
        />
        <Stat
          label="Completed requests"
          value={complete}
          href={listPathByRole[role]}
        />
        {role === "admin" && (
          <Stat
            label="Ready for GA"
            value={readyForGa}
            href="/admin/bookings"
          />
        )}
      </section>

      {role === "admin" && adminQueues && (
        <section className="space-y-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-500">
                Operations queue
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-ink">
                Items needing attention
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Resolve these before working through the complete booking list.
              </p>
            </div>
            <Link
              href="/admin/bookings"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500 hover:text-brand-700"
            >
              Open all bookings <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OperationsMetric
              icon={<AlertTriangle size={18} />}
              label="Urgent requests"
              value={adminQueues.urgent.length}
              tone="amber"
              href="/admin/bookings?queue=urgent"
            />
            <OperationsMetric
              icon={<ListChecks size={18} />}
              label="Awaiting OT verification"
              value={adminQueues.verification.length}
              tone="violet"
              href="/admin/bookings?queue=ot_verification"
            />
            <OperationsMetric
              icon={<Car size={18} />}
              label="Unassigned approved trips"
              value={adminQueues.unassigned.length}
              tone="blue"
              href="/admin/bookings?queue=unassigned"
            />
            <OperationsMetric
              icon={<ShieldAlert size={18} />}
              label="Potential assignment conflicts"
              value={adminQueues.conflicts.length}
              tone="red"
              href="/admin/calendar"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <OperationsQueue
              title="Dispatch risk"
              description="Approved trips without a vehicle or driver that need action today or earlier."
              bookings={adminQueues.todayUnassigned}
              emptyMessage="All approved trips due today have an assignment."
              tone="amber"
            />
            <OperationsQueue
              title="Priority requests"
              description="Urgent requests and OT bookings waiting for verification."
              bookings={[...adminQueues.urgent, ...adminQueues.verification].filter(
                (booking, index, list) => list.findIndex((item) => item.id === booking.id) === index,
              )}
              emptyMessage="No urgent or verification requests need attention."
              tone="blue"
            />
          </div>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-display font-semibold text-ink">
                Recent transport activity
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Latest requests relevant to your workspace
              </p>
            </div>
            <Link
              href={listPathByRole[role]}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500 transition-colors hover:text-brand-700"
            >
              View all <ArrowUpRight size={15} />
            </Link>
          </div>
          {own.length === 0 ? (
            <Empty
              title="No recent transport activity"
              body="Transport requests relevant to this workspace will appear here when available."
            />
          ) : (
            <div className="divide-y divide-slate-200">
              {own.slice(0, 5).map((booking) => (
                <Link
                  href={`${listPathByRole[role]}/${booking.id}`}
                  key={booking.id}
                  className="group grid gap-3 border-l-2 border-transparent px-5 py-4 transition-colors hover:border-brand-400 hover:bg-slate-50 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center sm:px-6"
                >
                  <div className="font-mono tabular-nums">
                    <p className="text-sm font-semibold text-slate-800">
                      {booking.startTime}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {booking.usingDate}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 transition-colors group-hover:text-brand-500">
                      {booking.destination}
                    </p>
                    <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
                      <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{booking.pickupLocation}</span>
                      </span>
                      <span className="truncate text-xs text-slate-500">
                        <span className="font-mono tabular-nums">{booking.bookingNo}</span>
                        {" · "}{booking.requesterName}
                      </span>
                    </div>
                  </div>
                  <Badge status={booking.status}>
                    {statusLabel(booking.status)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="self-start p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Daily sourcing
          </p>
          <h2 className="mt-2 font-display text-lg font-semibold text-ink">
            Today’s arrangement
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Vehicles entered</p>
              <p className="mt-1 text-2xl font-bold text-ink">{dailyVehicles}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Passengers</p>
              <p className="mt-1 text-2xl font-bold text-ink">{todayPassengers}</p>
            </div>
          </div>
          <p className="mt-6 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            Vehicle and driver details are entered by GA for each service day; no fleet master is required.
          </p>
        </Card>
      </section>
    </div>
  );
}

function OperationsMetric({
  icon,
  label,
  value,
  tone,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "amber" | "violet" | "blue" | "red";
  href: string;
}) {
  const styles = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <Link
      href={href}
      className={`rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-card ${styles[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-lg bg-white/70 p-2">{icon}</span>
        <span className="text-2xl font-bold tabular-nums">{value}</span>
      </div>
      <p className="mt-4 text-sm font-semibold">{label}</p>
    </Link>
  );
}

function OperationsQueue({
  title,
  description,
  bookings,
  emptyMessage,
  tone,
}: {
  title: string;
  description: string;
  bookings: Booking[];
  emptyMessage: string;
  tone: "amber" | "blue";
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h3 className="font-display font-semibold text-ink">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      {bookings.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500 sm:px-6">{emptyMessage}</p>
      ) : (
        <div className="divide-y divide-slate-200">
          {bookings.slice(0, 5).map((booking) => (
            <Link
              key={booking.id}
              href={`/admin/bookings/${booking.id}`}
              className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-slate-50 sm:px-6"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{booking.destination}</p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {booking.usingDate} · {booking.startTime} · {booking.requesterName}
                </p>
              </div>
              <Badge status={booking.status}>{statusLabel(booking.status)}</Badge>
            </Link>
          ))}
        </div>
      )}
      {bookings.length > 5 && (
        <Link href="/admin/bookings" className={`block border-t px-5 py-3 text-center text-xs font-semibold ${tone === "amber" ? "border-amber-100 text-amber-800" : "border-blue-100 text-blue-700"}`}>
          View all {bookings.length} items
        </Link>
      )}
    </Card>
  );
}

function FleetRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-sm font-semibold text-ink tabular-nums">
          {value}
          <span className="font-normal text-slate-400"> / {total}</span>
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
