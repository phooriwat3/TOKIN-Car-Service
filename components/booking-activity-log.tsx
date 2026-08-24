"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  HelpCircle,
  MapPin,
  ShieldCheck,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";
import type { Booking } from "@/lib/types";
import { statusLabel } from "@/lib/business";
import { formatThaiDateTime } from "@/lib/date-format";

interface ActivityEvent {
  id: string;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
  status: "success" | "pending" | "warning" | "danger" | "info";
  icon: typeof FileText;
}

export function BookingActivityLog({ booking }: { booking: Booking }) {
  const events = useMemo(() => {
    const list: ActivityEvent[] = [];

    // 1. Creation Event
    list.push({
      id: "created",
      title: "Request Submitted",
      description: `Ride requisition submitted for ${booking.usingDate} (${booking.startTime} - ${booking.endTime}) to ${booking.destination}.`,
      actor: booking.requesterName || "Requester",
      timestamp: booking.createdAt || booking.usingDate,
      status: "info",
      icon: FileText,
    });

    // 2. Approval Event
    if (booking.approval) {
      const isApproved = booking.approval.action === "approved";
      list.push({
        id: "approval",
        title: isApproved ? "Manager Approved" : "Approval Decision",
        description: booking.approval.comments
          ? `Comments: "${booking.approval.comments}"`
          : isApproved
          ? "Requisition approved by line manager."
          : "Changes requested or rejected.",
        actor: booking.approval.approverName || booking.approverName || "Manager",
        timestamp: booking.approval.actedAt || booking.createdAt,
        status: isApproved ? "success" : "danger",
        icon: isApproved ? UserCheck : XCircle,
      });
    } else if (booking.status === "pending_approval") {
      list.push({
        id: "pending_approval",
        title: "Awaiting Manager Approval",
        description: `Waiting for review by ${booking.approverName || "Department Manager"}.`,
        actor: booking.approverName || "Approver",
        timestamp: booking.createdAt,
        status: "pending",
        icon: Clock,
      });
    }

    // 3. OT Verification Event (if OT)
    const isOt =
      booking.requestType === "overtime" ||
      (booking.overtimeEmployees && booking.overtimeEmployees.length > 0) ||
      booking.category === "overtime_transport";

    if (isOt) {
      if (booking.otVerificationMode === "manager_exception") {
        list.push({
          id: "ot_exception",
          title: "HR Exception Approved",
          description: "Registered as manager exception — Tiger Space verification bypassed.",
          actor: booking.createdByName || "HR / GA Administrator",
          timestamp: booking.createdAt,
          status: "success",
          icon: ShieldCheck,
        });
      } else if (booking.otVerificationStatus === "verified") {
        list.push({
          id: "ot_verified",
          title: "Tiger Space OT Verified",
          description: booking.otVerificationNote || "Overtime records matched against Tiger Space report.",
          actor: "System / HR",
          timestamp: booking.otVerifiedAt || booking.createdAt,
          status: "success",
          icon: FileCheck,
        });
      } else if (booking.status === "pending_ot_verification") {
        list.push({
          id: "ot_pending",
          title: "Awaiting Tiger Space Match",
          description: "Pending verification against daily Tiger Space OT upload.",
          actor: "HR System",
          timestamp: booking.createdAt,
          status: "pending",
          icon: Clock,
        });
      }
    }

    // 4. Fleet Assignment Event
    const units = booking.assignment?.manualTransportUnits;
    const hasAssignedUnit = units && units.length > 0;
    const vehicle = hasAssignedUnit
      ? units[0].licensePlate
      : booking.assignment?.vehicleId;
    const driver = hasAssignedUnit
      ? units[0].driverName
      : booking.assignment?.driverId;

    if (vehicle || driver) {
      list.push({
        id: "assignment",
        title: "Fleet Dispatched",
        description: `Assigned vehicle: ${vehicle || "N/A"} · Driver: ${driver || "N/A"}${
          booking.assignment?.notes ? ` (Notes: ${booking.assignment.notes})` : ""
        }`,
        actor: "GA Fleet Dispatcher",
        timestamp: booking.assignment?.assignedAt || booking.createdAt,
        status: "success",
        icon: Truck,
      });
    }

    // 5. Trip execution
    if (booking.status === "in_progress") {
      list.push({
        id: "in_progress",
        title: "Trip In Progress",
        description: "Vehicle has departed from pickup location.",
        actor: driver ? String(driver) : "Driver",
        timestamp: `${booking.usingDate} ${booking.startTime}`,
        status: "info",
        icon: MapPin,
      });
    }

    if (booking.status === "completed") {
      list.push({
        id: "completed",
        title: "Trip Completed & Logged",
        description: booking.tripLog
          ? `Mileage: ${booking.tripLog.startMileage || "—"} → ${
              booking.tripLog.endMileage || "—"
            } km | Fuel: ฿${booking.tripLog.fuelCost || 0} | Toll: ฿${
              booking.tripLog.tollFee || 0
            }`
          : "Trip finished and returned to station.",
        actor: driver ? String(driver) : "Driver / GA",
        timestamp: `${booking.usingDate} ${booking.endTime}`,
        status: "success",
        icon: CheckCircle2,
      });
    }

    if (booking.status === "cancelled") {
      list.push({
        id: "cancelled",
        title: "Request Cancelled",
        description: booking.rejectReason || "Request was cancelled by user or administrator.",
        actor: "Administrator / User",
        timestamp: booking.usingDate,
        status: "danger",
        icon: XCircle,
      });
    }

    return list;
  }, [booking]);

  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-brand" />
          <h3 className="font-bold text-ink text-sm">Audit Trail &amp; Lifecycle History</h3>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
          {events.length} Events Logged
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {events.map((ev, index) => {
          const Icon = ev.icon;
          const isLatest = index === events.length - 1;

          const dotColor =
            ev.status === "success"
              ? "bg-emerald-500 ring-emerald-100"
              : ev.status === "danger"
              ? "bg-rose-500 ring-rose-100"
              : ev.status === "pending"
              ? "bg-amber-500 ring-amber-100"
              : "bg-blue-600 ring-blue-100";

          return (
            <div key={ev.id} className="relative group">
              {/* Dot Icon */}
              <div
                className={`absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 text-white ${dotColor}`}
              >
                <Icon size={11} />
              </div>

              {/* Event Content */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-xs text-slate-900">{ev.title}</p>
                  <span className="text-[11px] text-slate-400">
                    {formatThaiDateTime(ev.timestamp)}
                  </span>
                </div>

                <p className="text-xs text-slate-600">{ev.description}</p>

                <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-400">
                  <span>Actor:</span>
                  <span className="font-semibold text-slate-700">{ev.actor}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
