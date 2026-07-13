'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useApp } from '@/components/app-provider';
import { BookingTable } from '@/components/booking-table';
import { PageHeader } from '@/components/page-header';
export default function Bookings() {
    const { data, user } = useApp();
    return <><PageHeader title="My bookings" description="Track your requests from submission through trip completion." action={<Link href="/bookings/new" className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-white"><Plus size={17} />New request</Link>} /><BookingTable bookings={data.bookings.filter(b => b.requesterId === user.id)} /></>
}
