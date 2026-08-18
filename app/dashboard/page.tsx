"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CalendarCheck,
  Car,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Gauge,
  MapPin,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Badge, Button, Card, Empty, Stat } from "@/components/ui";
import { statusLabel } from "@/lib/business";
import type { Role } from "@/lib/types";
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
          icon={<Clock3 size={18} />}
          tone="amber"
          href={listPathByRole[role]}
        />
        <Stat
          label="Trips in motion"
          value={active}
          icon={<Car size={18} />}
          tone="blue"
          href={listPathByRole[role]}
        />
        <Stat
          label="Completed requests"
          value={complete}
          icon={<CheckCircle2 size={18} />}
          tone="green"
          href={listPathByRole[role]}
        />
        {role === "admin" && (
          <Stat
            label="Ready for GA"
            value={readyForGa}
            icon={<Gauge size={18} />}
            tone="violet"
            href="/admin/bookings"
          />
        )}
      </section>

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
