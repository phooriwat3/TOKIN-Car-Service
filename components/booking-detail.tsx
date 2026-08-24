"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Mail,
  Car,
  Printer,
  FileText,
} from "lucide-react";
import { useApp } from "./app-provider";
import { Badge, Button, Card, Empty } from "./ui";
import { statusLabel, totalCost } from "@/lib/business";
import { formatThaiDateTime } from "@/lib/date-format";
import { BookingActivityLog } from "./booking-activity-log";
import { DriverDispatchSlipModal } from "./driver-dispatch-slip-modal";

export function BookingDetail({
  id,
  admin = false,
}: {
  id: string;
  admin?: boolean;
}) {
  const { data } = useApp();
  const [showSlipModal, setShowSlipModal] = useState(false);

  const b = data.bookings.find((x) => x.id === id);
  if (!b)
    return (
      <Empty
        title="Booking not found"
        body="This record does not exist in the dataset."
      />
    );

  const vehicle = data.vehicles.find((x) => x.id === b.assignment?.vehicleId);
  const driver = data.drivers.find((x) => x.id === b.assignment?.driverId);
  const isOt =
    b.requestType === "overtime" ||
    (b.overtimeEmployees && b.overtimeEmployees.length > 0);

  const hasAssignment =
    b.assignment?.vehicleId ||
    (b.assignment?.manualTransportUnits &&
      b.assignment.manualTransportUnits.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-brand">
            {b.bookingNo}
          </p>
          <h1 className="text-2xl font-bold text-ink">{b.destination}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {admin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSlipModal(true)}
              className="gap-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              title="View and print official driver dispatch slip"
            >
              <Printer size={14} className="text-brand" />
              <span>Print Dispatch Slip</span>
            </Button>
          )}
          <Badge status={b.status}>{statusLabel(b.status)}</Badge>
        </div>
      </div>

      <div className="grid gap-5">

        <Card className="p-5">
          <h2 className="mb-4 font-bold text-ink">Trip request</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              icon={<CalendarDays />}
              label="Using date"
              value={b.usingDate}
            />
            <Info
              icon={<Clock />}
              label="Time"
              value={`${b.startTime} - ${b.endTime}`}
            />
            <Info
              icon={<MapPin />}
              label="Route"
              value={`${b.pickupLocation} → ${b.destination}`}
            />
            <Info
              icon={<Users />}
              label="Passengers"
              value={String(b.numPassengers)}
            />
          </div>
          <div className="mt-5 border-t border-line pt-5">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Purpose
            </p>
            <p className="mt-1 text-sm text-ink">{b.purpose}</p>
          </div>
          <div className="mt-4 grid gap-x-8 gap-y-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">Requester</p>
              <p className="text-sm font-medium text-ink">{b.requesterName}</p>
              {b.requesterEmail && (
                <p className="text-xs text-gray-400">{b.requesterEmail}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Department</p>
              <p className="text-sm font-medium text-ink">{b.department}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Meeting point</p>
              <p className="text-sm font-medium text-ink">
                {statusLabel(b.meetingPoint)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Category</p>
              <p className="text-sm font-medium text-ink">
                {statusLabel(b.category)}
              </p>
            </div>
          </div>
          {b.urgent && (
            <div className="mt-4 border-l-2 border-amber-400 bg-amber-50 p-3 pl-4 text-sm text-amber-900">
              <strong>Urgent:</strong> {b.urgentReason}
            </div>
          )}
          {b.requestOrigin === "hr_direct" && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <strong>HR-created OT transport:</strong> This ride was created by {b.createdByName || "HR / GA"} on behalf of the employee. {b.otVerificationMode === "manager_exception" ? "HR recorded it as a manager exception, so no Tiger OpenSpace entry is expected." : "The vehicle can be arranged now and the Tiger OpenSpace record can be verified later."}
            </div>
          )}
          {isOt && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <strong>Tiger Space transport request:</strong>{" "}
              {b.otVerificationMode === "manager_exception"
                ? "Manager exception recorded by HR; Tiger OpenSpace verification is not required."
                : b.otVerificationStatus === "verified"
                ? "OT has been matched against the Tiger Space report."
                : b.otVerificationStatus === "not_found"
                  ? "No matching approved OT was found yet; this request remains pending."
                  : b.otVerificationStatus === "rejected"
                    ? "OT was not approved, so transport cannot be confirmed."
                    : "Waiting for HR/GA to verify the approved OT from the Tiger Space report."}
              {b.otVerificationNote ? ` Note: ${b.otVerificationNote}` : ""}
            </div>
          )}
        </Card>
      </div>

      {/* OT Employees Section */}
      {isOt && b.overtimeEmployees && b.overtimeEmployees.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 font-bold text-ink flex items-center gap-2">
            <Users className="text-brand" size={18} />
            OT Employees Included ({b.overtimeEmployees.length} people)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2.5">Employee</th>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Work Summary</th>
                  <th className="px-3 py-2.5">OT Hours</th>
                  <th className="px-3 py-2.5">Drop-off Stop</th>
                  <th className="px-3 py-2.5">Assigned Vehicle & Driver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {b.overtimeEmployees.map((emp, i) => {
                  const empVehicle =
                    data.vehicles.find((v) => v.id === emp.assignedVehicleId) ||
                    vehicle;
                  const empDriver =
                    data.drivers.find((d) => d.id === emp.assignedDriverId) ||
                    driver;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-ink">
                        {emp.employeeName}
                        <span className="block text-xs text-gray-400">
                          {emp.employeeId}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {emp.employeeEmail ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail size={12} className="text-brand" />
                            {emp.employeeEmail}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700">
                        {emp.workDescription}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold">
                        {emp.workStart} - {emp.workEnd}
                      </td>
                      <td className="px-3 py-3">
                        {emp.transportRequired ? (
                          <span className="bg-brand-light px-2 py-1 text-xs font-semibold text-brand">
                            {emp.busStop}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No transport needed
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {empVehicle && empDriver ? (
                          <div>
                            <p className="font-semibold text-ink">
                              {empVehicle.licensePlate} ({empVehicle.model})
                            </p>
                            <p className="text-gray-500">
                              {empDriver.fullName} ({empDriver.phone})
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium italic">
                            Pending assignment
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {b.approversList && b.approversList.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 font-bold text-ink flex items-center gap-2">
            <Users className="text-brand" size={18} />
            Approved by
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {b.approversList.map((appr, idx) => (
              <div key={idx} className="border border-line bg-canvas p-3">
                <p className="text-xs font-bold uppercase text-brand">
                  {appr.position}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {appr.name}
                </p>
                <p className="text-xs text-gray-500">{appr.email}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {b.approval && (
        <Card className="p-5">
          <h2 className="font-bold text-ink">Approval decision</h2>
          <p className="mt-2 text-sm text-gray-700">{b.approval.comments}</p>
          <p className="mt-1 text-xs text-gray-500">
            {b.approval.approverName} ·{" "}
            {formatThaiDateTime(b.approval.actedAt)}
          </p>
        </Card>
      )}

      {b.assignment && (
        <Card className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-ink flex items-center gap-2">
              <Car className="text-brand" size={18} /> Primary Assignment Details
            </h2>
            {admin && (
              <Link
                className="text-xs font-semibold text-brand hover:underline"
                href={`/admin/bookings/${b.id}`}
              >
                Edit assignment →
              </Link>
            )}
          </div>
          {b.assignment.manualTransportUnits?.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {b.assignment.manualTransportUnits.map((unit, index) => (
                <div key={index} className="border border-line bg-canvas p-4">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Vehicle and driver {index + 1}
                  </p>
                  <p className="mt-2 font-bold text-ink">
                    {unit.licensePlate} · {unit.brand} {unit.vehicleType}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {unit.driverName}
                    {unit.driverPhone ? ` (${unit.driverPhone})` : ""}
                  </p>
                  <div className="mt-3 border-t border-line pt-3 text-xs text-gray-600">
                    <span className="font-semibold">Passengers: </span>
                    {(unit.employeeIds ?? [])
                      .map(
                        (employeeId) =>
                          b.overtimeEmployees?.find(
                            (employee) => employee.employeeId === employeeId,
                          )?.employeeName ||
                          (employeeId.startsWith("passenger:")
                            ? b.passengerList[Number(employeeId.split(":")[1])]
                            : employeeId),
                      )
                      .join(", ") || "-"}
                    {isOt && (
                      <div className="mt-1">
                        Drop-offs:{" "}
                        {(unit.employeeIds ?? [])
                          .map(
                            (employeeId) =>
                              b.overtimeEmployees?.find(
                                (employee) => employee.employeeId === employeeId,
                              )?.busStop || "-",
                          )
                          .join(", ") || "-"}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div
            className={`grid gap-4 sm:grid-cols-2 ${b.assignment.manualTransportUnits?.length ? "hidden" : ""}`}
          >
            <Rows
              items={[
                [
                  "Primary Vehicle",
                  vehicle
                    ? `${vehicle.licensePlate} · ${vehicle.brand} ${vehicle.model}`
                    : "Unknown",
                ],
                [
                  "Primary Driver",
                  driver ? `${driver.fullName} (${driver.phone})` : "Unknown",
                ],
              ]}
            />
            <Rows
              items={[
                [
                  "Driver status",
                  b.assignment.accepted ? "Accepted" : "Awaiting acceptance",
                ],
                [
                  "Assigned time",
                  formatThaiDateTime(b.assignment.assignedAt),
                ],
              ]}
            />
          </div>
        </Card>
      )}

      {b.tripLog && (
        <Card className="p-5">
          <h2 className="mb-3 font-bold text-ink">Trip log</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Rows
              items={[
                [
                  "Departure",
                  formatThaiDateTime(b.tripLog.actualTimeOut),
                ],
                [
                  "Return",
                  formatThaiDateTime(b.tripLog.actualTimeIn),
                ],
              ]}
            />
            <Rows
              items={[
                ["Starting mileage", b.tripLog.startMileage?.toString() || "-"],
                ["Finished mileage", b.tripLog.endMileage?.toString() || "-"],
              ]}
            />
            <Rows
              items={[
                ["Total expenses", `THB ${totalCost(b).toLocaleString()}`],
                ["Remarks", b.tripLog.remarks || "-"],
              ]}
            />
          </div>
        </Card>
      )}

      {/* Enterprise Audit Trail & Lifecycle History */}
      <BookingActivityLog booking={b} />

      {/* Driver Dispatch Slip Modal */}
      {showSlipModal && (
        <DriverDispatchSlipModal
          booking={b}
          vehicle={vehicle}
          driver={driver}
          onClose={() => setShowSlipModal(false)}
        />
      )}
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-brand [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}

function Rows({ items }: { items: string[][] }) {
  return (
    <dl className="space-y-3">
      {items.map(([a, b]) => (
        <div key={a}>
          <dt className="text-xs text-gray-500">{a}</dt>
          <dd className="text-sm font-medium text-ink">{b}</dd>
        </div>
      ))}
    </dl>
  );
}
