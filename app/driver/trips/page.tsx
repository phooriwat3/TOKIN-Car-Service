'use client';
import Link from 'next/link';
import { useApp } from '@/components/app-provider';
import { Badge, Card, Empty } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { statusLabel } from '@/lib/business';
export default function Trips() {
    const { data, user } = useApp(); const did = data.drivers.find(d => d.userId === user.id)?.id;
    const trips = data.bookings.filter(b => b.assignment?.driverId === did);
    return <><PageHeader title="Assigned trips" description="Accept assignments and record trip activity." />{!trips.length ? <Empty title="No assigned trips" body="New assignments will appear here." /> : <div className="space-y-3">{trips.map(b => <Link href={`/driver/trips/${b.id}`} key={b.id}><Card className="mb-3 flex items-center justify-between p-4 hover:border-brand"><div><p className="font-semibold">{b.destination}</p><p className="text-sm text-gray-500">{b.usingDate} · {b.startTime} - {b.endTime} · {b.bookingNo}</p></div><Badge status={b.status}>{statusLabel(b.status)}</Badge></Card></Link>)}</div>}</>
}
