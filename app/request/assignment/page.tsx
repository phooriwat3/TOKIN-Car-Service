import type { ReactNode } from 'react';
import { AlertTriangle, CalendarDays, Car, Clock3, Download, MapPin, Phone, UserRound } from 'lucide-react';
import { Card } from '@/components/ui';
import { loadPublicAssignment } from '@/lib/public-assignment';

export default async function AssignmentPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = await loadPublicAssignment(token);

  if (!result.assignment) {
    return <Page><Card className="p-10 text-center"><AlertTriangle className="mx-auto text-amber-600" size={36} /><h1 className="mt-3 text-xl font-bold">Assignment unavailable</h1><p className="mt-2 text-sm text-gray-600">{result.error || 'Unable to load assignment.'}</p></Card></Page>;
  }

  const assignment = result.assignment;
  const pdfUrl = `/api/request/assignment/pdf?token=${encodeURIComponent(token || '')}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(assignment.pickupLocation)}&destination=${encodeURIComponent(assignment.destination)}`;

  return <Page>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-brand">Assignment confirmation</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{assignment.requestNo}</h1></div>
      <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-green-800">Assigned</span>
    </div>

    <Card className="overflow-hidden">
      <div className="grid gap-px bg-line sm:grid-cols-3">
        <Summary icon={<CalendarDays size={18} />} label="Using date" value={assignment.usingDate} />
        <Summary icon={<Clock3 size={18} />} label="Pickup time" value={`${assignment.startTime} - ${assignment.endTime}`} />
        <Summary icon={<UserRound size={18} />} label="Passengers" value={String(assignment.numPassengers)} />
      </div>
    </Card>

    <Card className="mt-5 p-6">
      <h2 className="font-bold">Route</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <Location label="Pickup location" value={assignment.pickupLocation} />
        <div className="hidden h-px w-10 bg-line sm:block" />
        <Location label="Destination" value={assignment.destination} />
      </div>
      <div className="mt-5 border-t border-line pt-5"><Info label="Purpose" value={assignment.purpose} /></div>
    </Card>

    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <Card className="border-l-4 border-l-brand p-6">
        <div className="flex items-center gap-2 text-brand"><Car size={20} /><h2 className="font-bold">Vehicle</h2></div>
        <p className="mt-4 text-xl font-bold">{assignment.vehicle.licensePlate}</p>
        <p className="mt-1 text-sm text-gray-600">{assignment.vehicle.brand} {assignment.vehicle.model}</p>
        {assignment.vehicle.color && <p className="mt-3 text-xs text-gray-500">Color: {assignment.vehicle.color}</p>}
      </Card>
      <Card className="border-l-4 border-l-accent p-6">
        <div className="flex items-center gap-2 text-brand"><UserRound size={20} /><h2 className="font-bold">Driver</h2></div>
        <p className="mt-4 text-xl font-bold">{assignment.driver.name}</p>
        <p className="mt-2 flex items-center gap-2 text-sm text-gray-600"><Phone size={15} />{assignment.driver.phone || '-'}</p>
      </Card>
    </div>

    {assignment.notes && <Card className="mt-5 bg-amber-50 p-6"><h2 className="font-bold text-amber-900">Assignment notes</h2><p className="mt-2 whitespace-pre-wrap text-sm text-amber-950">{assignment.notes}</p></Card>}

    <Card className="mt-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2"><Info label="Requester" value={assignment.requester.name} /><Info label="Department" value={assignment.requester.department} /></div>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={pdfUrl} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-[#194786]"><Download size={17} />Download PDF</a>
        <a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-gray-50"><MapPin size={17} />Get directions</a>
      </div>
      {result.expiresAt && <p className="mt-4 text-xs text-gray-500">This secure document link expires on {new Date(result.expiresAt).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })}.</p>}
    </Card>
  </Page>;
}

function Page({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-ink"><div className="mx-auto max-w-4xl"><div className="mb-7 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand font-bold text-white">TT</div><div><p className="font-bold">TOKIN Transport</p><p className="text-xs text-gray-500">Secure assignment document</p></div></div>{children}</div></main>;
}

function Summary({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="bg-blue-50 p-5"><div className="flex items-center gap-2 text-brand">{icon}<p className="text-xs font-semibold uppercase">{label}</p></div><p className="mt-2 font-bold text-ink">{value || '-'}</p></div>;
}

function Location({ label, value }: { label: string; value: string }) {
  return <div><p className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500"><MapPin size={14} />{label}</p><p className="mt-2 font-semibold">{value || '-'}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase text-gray-500">{label}</p><p className="mt-1 text-sm">{value || '-'}</p></div>;
}
