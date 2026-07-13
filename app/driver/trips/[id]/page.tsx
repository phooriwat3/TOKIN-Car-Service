'use client';
import { useState } from 'react';
import { useApp } from '@/components/app-provider';
import { BookingDetail } from '@/components/booking-detail';
import { Button, Card, Field, Input, Textarea } from '@/components/ui';
export default function Trip({ params }: { params: { id: string } }) {
    const { data, updateBooking } = useApp();
    const b = data.bookings.find(x => x.id === params.id);
    const [out, setOut] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [fuel, setFuel] = useState('0'),
        [toll, setToll] = useState('0'),
        [parking, setParking] = useState('0'),
        [remarks, setRemarks] = useState('');
    if (!b) return null;
    const accept = () => updateBooking(b.id, { assignment: { ...b.assignment!, accepted: true } });
    const begin = () => updateBooking(b.id, { status: 'in_progress', tripLog: { actualTimeOut: out, startMileage: +start, fuelCost: 0, tollFee: 0, parkingFee: 0 } });
    const complete = () => {
        if (+end <= (b.tripLog?.startMileage || 0)) return;
        updateBooking(b.id, {
            status: 'completed',
            tripLog: { ...b.tripLog!, actualTimeIn: new Date().toISOString(), endMileage: +end, fuelCost: +fuel, tollFee: +toll, parkingFee: +parking, remarks }
        })
    };
    return <div className="space-y-5">
        <BookingDetail id={b.id} />
        {b.status === 'assigned' && !b.assignment?.accepted && <Card className="p-5">
            <h2 className="font-bold">Trip acceptance</h2><p className="my-2 text-sm text-gray-500">Confirm that you have reviewed this assignment.</p>
            <Button onClick={accept}>Accept trip</Button></Card>}
        {b.status === 'assigned' && b.assignment?.accepted && <Card className="p-5">
            <h2 className="mb-4 font-bold">Start trip</h2><div className="grid gap-4 sm:grid-cols-2"><Field label="Actual departure time"><Input type="datetime-local" value={out} onChange={e => setOut(e.target.value)} /></Field><Field label="Starting mileage"><Input type="number" value={start} onChange={e => setStart(e.target.value)} /></Field></div><Button className="mt-4" disabled={!out || !start} onClick={begin}>Start trip</Button></Card>}
        {b.status === 'in_progress' && <Card className="p-5"><h2 className="mb-4 font-bold">Complete trip</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Finished mileage"><Input type="number" value={end} onChange={e => setEnd(e.target.value)} /></Field><Field label="Fuel cost (THB)"><Input type="number" value={fuel} onChange={e => setFuel(e.target.value)} /></Field><Field label="Toll fee (THB)"><Input type="number" value={toll} onChange={e => setToll(e.target.value)} /></Field><Field label="Parking fee (THB)"><Input type="number" value={parking} onChange={e => setParking(e.target.value)} /></Field></div><div className="mt-4"><Field label="Remarks"><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} /></Field></div>{end && +end <= (b.tripLog?.startMileage || 0) && <p className="mt-2 text-sm text-red-600">Finished mileage must exceed starting mileage.</p>}<Button className="mt-4" disabled={!end || +end <= (b.tripLog?.startMileage || 0)} onClick={complete}>Complete trip</Button></Card>}
    </div>
}
