'use client';
import { useApp } from './app-provider';
import { Card } from './ui';
import { GoogleMapLinks } from './google-map-links';

export function RequestFormDetails({ id }: { id: string }) {
  const { data } = useApp();
  const booking = data.bookings.find(x => x.id === id);
  if (!booking) return null;
  return <Card className="p-5">
    <h2 className="font-bold">Email approval information</h2>
    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
      <Info label="Request type" value={booking.requestType === 'overtime' ? 'OT transportation' : 'Outside-company trip'} />
      <Info label="Selected approver" value={booking.approverName || '-'} />
      <Info label="Approver email" value={booking.approverEmail || '-'} />
    </dl>
    {booking.requestType !== 'overtime' && <div className="mt-5"><GoogleMapLinks origin={booking.pickupLocation} destination={booking.destination} /></div>}
    {booking.requestType === 'overtime' && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-y border-line bg-gray-50 text-xs uppercase text-gray-500"><tr>{['Employee no.','Employee name','Work','Period','Weekly hours','Transport','Bus stop'].map(x => <th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>{booking.overtimeEmployees?.map((employee, index) => <tr key={`${employee.employeeId}-${index}`} className="border-b border-line"><td className="px-3 py-3">{employee.employeeId}</td><td className="px-3 py-3 font-medium">{employee.employeeName}</td><td className="px-3 py-3">{employee.workDescription}</td><td className="px-3 py-3">{employee.workStart}–{employee.workEnd}</td><td className="px-3 py-3">{employee.totalWeeklyHours}</td><td className="px-3 py-3">{employee.transportRequired ? 'Yes' : 'No'}</td><td className="px-3 py-3">{employee.busStop || '-'}</td></tr>)}</tbody></table></div>}
  </Card>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }
