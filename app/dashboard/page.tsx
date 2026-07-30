"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarCheck,
  Car,
  CheckCircle2,
  Clock3,
  FilePlus2,
  MapPin,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Badge, Card, Empty } from "@/components/ui";
import { statusLabel } from "@/lib/business";
import type { Role } from "@/lib/types";

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
    href: "/approvals",
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
  approver: "/approvals",
  admin: "/admin/bookings",
  driver: "/driver/trips",
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { role, user, data } = useApp();
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
    (booking) => booking.status === "pending_approval",
  ).length;
  const active = own.filter((booking) =>
    ["approved", "assigned", "in_progress"].includes(booking.status),
  ).length;
  const complete = own.filter(
    (booking) => booking.status === "completed",
  ).length;
  const availableVehicles = data.vehicles.filter(
    (vehicle) => vehicle.active,
  ).length;
  const availableDrivers = data.drivers.filter(
    (driver) => driver.active,
  ).length;
  const action = actionByRole[role];
  const ActionIcon = action.icon;

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 border-b border-line pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            {role === "admin" ? "Transport control" : `${role} workspace`}
          </p>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-ink sm:text-[34px]">
            {getGreeting()}, {user.fullName.split(" ")[0]}.
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {role === "approver"
              ? `${pending} request${pending === 1 ? "" : "s"} waiting for a decision in ${user.department}.`
              : role === "driver"
                ? "Your assigned routes and trip status at a glance."
                : "Today’s transport requests and fleet activity."}
          </p>
        </div>
        <Link
          href={action.href}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-btn transition-colors hover:bg-brand-dark"
        >
          <ActionIcon size={17} />
          {action.label}
        </Link>
      </section>

      <section className="grid overflow-hidden rounded-xl border border-line bg-white shadow-card sm:grid-cols-3 sm:divide-x sm:divide-line">
        <Metric
          label={
            role === "approver" ? "Waiting for your review" : "Pending approval"
          }
          value={pending}
          icon={<Clock3 size={18} />}
          tone="amber"
        />
        <Metric
          label="Trips in motion"
          value={active}
          icon={<Car size={18} />}
          tone="blue"
        />
        <Metric
          label="Completed requests"
          value={complete}
          icon={<CheckCircle2 size={18} />}
          tone="green"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-ink">
                Recent transport activity
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Latest requests relevant to your workspace
              </p>
            </div>
            <Link
              href={listPathByRole[role]}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-dark"
            >
              View all <ArrowUpRight size={15} />
            </Link>
          </div>
          {own.length === 0 ? (
            <Empty
              title="No activity yet"
              body="New transport requests will appear here."
            />
          ) : (
            <div className="divide-y divide-line">
              {own.slice(0, 5).map((booking) => (
                <Link
                  href={`${listPathByRole[role]}/${booking.id}`}
                  key={booking.id}
                  className="group grid gap-3 px-5 py-4 transition-colors hover:bg-gray-50 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-center sm:px-6"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {booking.startTime}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {booking.usingDate}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink group-hover:text-brand">
                      {booking.destination}
                    </p>
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-gray-500">
                      <MapPin size={12} className="shrink-0" />{" "}
                      {booking.bookingNo} · {booking.requesterName}
                    </p>
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
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
            Fleet readiness
          </p>
          <h2 className="mt-2 text-lg font-semibold text-ink">
            Resources available
          </h2>
          <div className="mt-6 space-y-5">
            <FleetRow
              label="Active vehicles"
              value={availableVehicles}
              total={data.vehicles.length}
            />
            <FleetRow
              label="Active drivers"
              value={availableDrivers}
              total={data.drivers.length}
            />
          </div>
          <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-gray-500">
            Availability reflects resources currently marked active by transport
            administration.
          </p>
        </Card>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "amber" | "blue" | "green";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-brand-light text-brand",
    green: "bg-success-light text-success",
  };
  return (
    <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tones[tone]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold leading-none text-ink">{value}</p>
        <p className="mt-1.5 text-xs text-gray-500">{label}</p>
      </div>
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
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-semibold text-ink">
          {value}
          <span className="font-normal text-gray-400"> / {total}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
