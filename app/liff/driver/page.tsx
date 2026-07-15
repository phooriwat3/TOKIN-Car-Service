'use client';

import Script from 'next/script';
import { useCallback, useState } from 'react';
import { CheckCircle2, Clock3, MapPin, Play, RefreshCw, Route, Square } from 'lucide-react';
import { Button, Card } from '@/components/ui';

type LiffSdk = {
  init: (config: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: (config?: { redirectUri?: string }) => void;
  getAccessToken: () => string | null;
};

declare global {
  interface Window {
    liff: LiffSdk;
  }
}

type Trip = {
  id: string;
  bookingNo: string;
  status: string;
  usingDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  destination: string;
  purpose: string;
  numPassengers: number;
  accepted: boolean;
  vehicle: string;
  tripLog: { startMileage: number | null } | null;
};

type DriverResponse = {
  driver: { fullName: string; employeeId: string | null; lineDisplayName: string | null };
  trips: Trip[];
  error?: string;
};

const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID ?? '';
const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/line-driver-api`;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

const numberPrompt = (label: string, defaultValue = '0') => {
  const value = window.prompt(label, defaultValue);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function LiffDriverPage() {
  const [data, setData] = useState<DriverResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const callApi = useCallback(async (body: Record<string, unknown> = { action: 'list' }) => {
    const accessToken = window.liff?.getAccessToken();
    if (!accessToken) throw new Error('Unable to get LINE access token.');
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: publishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const result = await response.json() as DriverResponse;
    if (!response.ok || result.error) throw new Error(result.error || 'Unable to load driver trips.');
    setData(result);
  }, []);

  const initialize = useCallback(async () => {
    try {
      setError('');
      if (!liffId) throw new Error('NEXT_PUBLIC_LINE_LIFF_ID is not configured.');
      await window.liff.init({ liffId });
      if (!window.liff.isLoggedIn()) {
        window.liff.login({ redirectUri: window.location.href });
        return;
      }
      await callApi();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open the driver portal.');
    } finally {
      setLoading(false);
    }
  }, [callApi]);

  const action = async (trip: Trip, actionName: 'accept' | 'start' | 'complete') => {
    const payload: Record<string, unknown> = { action: actionName, bookingId: trip.id };
    if (actionName === 'start') {
      const startMileage = numberPrompt('Starting mileage');
      if (startMileage === null) return;
      payload.startMileage = startMileage;
    }
    if (actionName === 'complete') {
      const endMileage = numberPrompt('Ending mileage', String((trip.tripLog?.startMileage ?? 0) + 1));
      if (endMileage === null) return;
      const fuelCost = numberPrompt('Fuel cost', '0');
      if (fuelCost === null) return;
      const tollFee = numberPrompt('Toll fee', '0');
      if (tollFee === null) return;
      const parkingFee = numberPrompt('Parking fee', '0');
      if (parkingFee === null) return;
      payload.endMileage = endMileage;
      payload.fuelCost = fuelCost;
      payload.tollFee = tollFee;
      payload.parkingFee = parkingFee;
      payload.remarks = window.prompt('Remarks (optional)', '') ?? '';
    }

    setBusy(`${trip.id}:${actionName}`);
    setError('');
    try {
      await callApi(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this trip.');
    } finally {
      setBusy('');
    }
  };

  return <div className="min-h-screen bg-[#f4f7fb] px-4 py-5 text-ink">
    <Script src="https://static.line-scdn.net/liff/edge/2/sdk.js" strategy="afterInteractive" onLoad={initialize} />
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl bg-[#17345f] p-5 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">TOKIN Car Service</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Driver Portal</h1>
            <p className="mt-1 text-sm text-blue-100">
              {data ? `${data.driver.fullName}${data.driver.employeeId ? ` · ${data.driver.employeeId}` : ''}` : 'Loading your assignments'}
            </p>
          </div>
          <Button className="bg-white text-brand hover:bg-blue-50" disabled={loading} onClick={() => callApi()}>
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {loading && <Card className="mt-4 p-6 text-center text-sm text-gray-500">Connecting to LINE...</Card>}
      {error && <Card className="mt-4 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      {!loading && data && <div className="mt-4 space-y-3">
        {!data.trips.length && <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto text-green-600" />
          <p className="mt-3 font-semibold">No assigned trips</p>
          <p className="mt-1 text-sm text-gray-500">New assignments will appear here.</p>
        </Card>}

        {data.trips.map((trip) => <Card className="overflow-hidden" key={trip.id}>
          <div className="border-b border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-brand">{trip.bookingNo}</p>
                <h2 className="mt-1 font-bold">{trip.destination}</h2>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold capitalize text-brand">
                {trip.status.replace('_', ' ')}
              </span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p className="flex items-center gap-2"><Clock3 size={16} />{trip.usingDate} · {trip.startTime}–{trip.endTime}</p>
              <p className="flex items-center gap-2"><MapPin size={16} />{trip.pickupLocation}</p>
              <p className="flex items-center gap-2"><Route size={16} />{trip.destination}</p>
              <p className="text-xs text-gray-500">{trip.vehicle} · {trip.numPassengers} passenger(s)</p>
            </div>
          </div>
          <div className="flex gap-2 bg-gray-50 p-3">
            {trip.status === 'assigned' && !trip.accepted && <Button
              className="w-full"
              disabled={Boolean(busy)}
              onClick={() => action(trip, 'accept')}
            ><CheckCircle2 size={17} />Accept assignment</Button>}
            {trip.status === 'assigned' && trip.accepted && <Button
              className="w-full"
              disabled={Boolean(busy)}
              onClick={() => action(trip, 'start')}
            ><Play size={17} />Start trip</Button>}
            {trip.status === 'in_progress' && <Button
              className="w-full"
              disabled={Boolean(busy)}
              onClick={() => action(trip, 'complete')}
            ><Square size={17} />Complete trip</Button>}
            {trip.status === 'completed' && <p className="w-full py-2 text-center text-sm font-semibold text-green-700">Trip completed</p>}
          </div>
        </Card>)}
      </div>}
    </div>
  </div>;
}
