'use client';

import Link from 'next/link';
import { CalendarDays, Clock, MapPin, Users, Mail, Car } from 'lucide-react';
import { useApp } from './app-provider';
import { Badge, Card, Empty } from './ui';
import { statusLabel, totalCost } from '@/lib/business';

export function BookingDetail({ id, admin = false }: { id: string; admin?: boolean }) {
  const { data } = useApp();
  const b = data.bookings.find((x) => x.id === id);
  if (!b) return <Empty title="Booking not found" body="This record does not exist in the dataset." />;

  const vehicle = data.vehicles.find((x) => x.id === b.assignment?.vehicleId);
  const driver = data.drivers.find((x) => x.id === b.assignment?.driverId);
  const isOt = b.requestType === 'overtime' || (b.overtimeEmployees && b.overtimeEmployees.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand">{b.bookingNo}</p>
          <h1 className="text-2xl font-bold text-ink">{b.destination}</h1>
        </div>
        <Badge status={b.status}>{statusLabel(b.status)}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-bold text-ink">Trip request</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Info icon={<CalendarDays />} label="Date" value={b.usingDate} />
            <Info icon={<Clock />} label="Time" value={`${b.startTime} - ${b.endTime}`} />
            <Info icon={<MapPin />} label="Route" value={`${b.pickupLocation} to ${b.destination}`} />
            <Info icon={<Users />} label="Passengers" value={String(b.numPassengers)} />
          </div>
          <div className="mt-5 border-t border-line pt-5">
            <p className="text-xs font-semibold uppercase text-gray-500">Purpose</p>
            <p className="mt-1 text-sm text-ink">{b.purpose}</p>
          </div>
          {b.urgent && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <strong>Urgent:</strong> {b.urgentReason}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-bold text-ink">Request details</h2>
          <Rows
            items={[
              ['Requester', b.requesterName],
              ['Requester Email', b.requesterEmail || '-'],
              ['Department', b.department],
              ['Category', statusLabel(b.category)],
              ['Vehicle preference', statusLabel(b.vehicleTypePref)],
              ['Meeting point', statusLabel(b.meetingPoint)],
            ]}
          />
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
                  const empVehicle = data.vehicles.find((v) => v.id === emp.assignedVehicleId) || vehicle;
                  const empDriver = data.drivers.find((d) => d.id === emp.assignedDriverId) || driver;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-ink">
                        {emp.employeeName}
                        <span className="block text-xs text-gray-400">{emp.employeeId}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {emp.employeeEmail ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail size={12} className="text-brand" />
                            {emp.employeeEmail}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700">{emp.workDescription}</td>
                      <td className="px-3 py-3 text-xs font-semibold">
                        {emp.workStart} - {emp.workEnd}
                      </td>
                      <td className="px-3 py-3">
                        {emp.transportRequired ? (
                          <span className="rounded bg-brand-light px-2 py-1 text-xs font-semibold text-brand">
                            {emp.busStop}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No transport needed</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {empVehicle && empDriver ? (
                          <div>
                            <p className="font-semibold text-ink">
                              {empVehicle.licensePlate} ({empVehicle.model})
                            </p>
                            <p className="text-gray-500">{empDriver.fullName} ({empDriver.phone})</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium italic">Pending assignment</span>
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

      {b.approval && (
        <Card className="p-5">
          <h2 className="font-bold text-ink">Approval decision</h2>
          <p className="mt-2 text-sm text-gray-700">{b.approval.comments}</p>
          <p className="mt-1 text-xs text-gray-500">
            {b.approval.approverName} · {new Date(b.approval.actedAt).toLocaleString()}
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
              <Link className="text-xs font-semibold text-brand hover:underline" href={`/admin/bookings/${b.id}`}>
                Edit assignment →
              </Link>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Rows
              items={[
                ['Primary Vehicle', vehicle ? `${vehicle.licensePlate} · ${vehicle.brand} ${vehicle.model}` : 'Unknown'],
                ['Primary Driver', driver ? `${driver.fullName} (${driver.phone})` : 'Unknown'],
              ]}
            />
            <Rows
              items={[
                ['Driver status', b.assignment.accepted ? 'Accepted' : 'Awaiting acceptance'],
                ['Assigned time', new Date(b.assignment.assignedAt).toLocaleString()],
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
                ['Departure', b.tripLog.actualTimeOut ? new Date(b.tripLog.actualTimeOut).toLocaleString() : '-'],
                ['Return', b.tripLog.actualTimeIn ? new Date(b.tripLog.actualTimeIn).toLocaleString() : '-'],
              ]}
            />
            <Rows
              items={[
                ['Starting mileage', b.tripLog.startMileage?.toString() || '-'],
                ['Finished mileage', b.tripLog.endMileage?.toString() || '-'],
              ]}
            />
            <Rows
              items={[
                ['Total expenses', `THB ${totalCost(b).toLocaleString()}`],
                ['Remarks', b.tripLog.remarks || '-'],
              ]}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

