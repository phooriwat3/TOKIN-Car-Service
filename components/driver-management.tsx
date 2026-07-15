'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Link2, Plus, RefreshCw, Unlink } from 'lucide-react';
import { useApp } from './app-provider';
import { Button, Card, Field, Input } from './ui';
import { createClient } from '@/lib/supabase/client';
import {
  createDriverLineLinkCode,
  disconnectDriverLineAccount,
} from '@/lib/supabase/repository';

const emptyForm = {
  employeeId: '',
  fullName: '',
  phone: '',
  licenseNumber: '',
  licenseExpiry: '',
};

export function DriverManagement() {
  const { data, saveDriver } = useApp();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [busyDriverId, setBusyDriverId] = useState('');
  const [message, setMessage] = useState('');

  const save = async () => {
    setMessage('');
    try {
      await saveDriver({ id: `d-${Date.now()}`, ...form, active: true });
      setForm(emptyForm);
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save driver.');
    }
  };

  const generate = async (driverId: string) => {
    if (!supabase) return;
    setMessage('');
    setBusyDriverId(driverId);
    try {
      const code = await createDriverLineLinkCode(supabase, driverId);
      setCodes((current) => ({ ...current, [driverId]: code }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create LINE link code.');
    } finally {
      setBusyDriverId('');
    }
  };

  const disconnect = async (driverId: string) => {
    if (!supabase || !window.confirm('Disconnect this driver from LINE?')) return;
    setBusyDriverId(driverId);
    try {
      await disconnectDriverLineAccount(supabase, driverId);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to disconnect LINE.');
      setBusyDriverId('');
    }
  };

  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">Driver directory</h1>
        <p className="text-sm text-gray-500">Add drivers and connect LINE without creating an email account.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => window.location.reload()}><RefreshCw size={16} />Refresh LINE status</Button>
        <Button onClick={() => setOpen((current) => !current)}><Plus size={16} />Add driver</Button>
      </div>
    </div>

    {open && <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-5">
      {Object.entries(form).map(([key, value]) => <Field key={key} label={key.replace(/([A-Z])/g, ' $1')}>
        <Input
          type={key === 'licenseExpiry' ? 'date' : 'text'}
          value={value}
          onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
        />
      </Field>)}
      <Button
        className="sm:col-span-5"
        disabled={Object.values(form).some((value) => !value)}
        onClick={save}
      >Save driver</Button>
    </Card>}

    {message && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p>}

    <div className="grid gap-3 md:grid-cols-2">
      {data.drivers.map((driver) => {
        const licenseExpiresSoon = (new Date(driver.licenseExpiry).getTime() - Date.now()) / 86400000 < 30;
        const command = codes[driver.id] ? `LINK ${codes[driver.id]}` : '';
        return <Card className="p-4" key={driver.id}>
          <div className="flex justify-between gap-3">
            <div>
              <p className="font-semibold">{driver.fullName}</p>
              <p className="text-sm text-gray-500">{driver.employeeId} · {driver.phone}</p>
            </div>
            {licenseExpiresSoon && <AlertTriangle className="shrink-0 text-amber-600" />}
          </div>
          <p className="mt-3 text-xs text-gray-500">License {driver.licenseNumber} · expires {driver.licenseExpiry}</p>

          <div className="mt-4 border-t border-line pt-4">
            {driver.lineConnection ? <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                <CheckCircle2 size={17} />LINE connected
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {driver.lineConnection.displayName || 'LINE user'} · {new Date(driver.lineConnection.linkedAt).toLocaleString()}
              </p>
              <Button
                className="mt-3"
                variant="ghost"
                disabled={busyDriverId === driver.id}
                onClick={() => disconnect(driver.id)}
              ><Unlink size={16} />Disconnect</Button>
            </div> : command ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-gray-600">Ask this driver to send the following message to TOKIN Car Service:</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="rounded bg-white px-3 py-2 font-bold tracking-wider text-brand">{command}</code>
                <Button variant="secondary" onClick={() => navigator.clipboard.writeText(command)}><Copy size={15} />Copy</Button>
              </div>
              <p className="mt-2 text-xs text-gray-500">The code expires in 10 minutes and can be used once.</p>
              <Button className="mt-2" variant="ghost" onClick={() => generate(driver.id)}>Generate another code</Button>
            </div> : <Button
              variant="secondary"
              disabled={!supabase || busyDriverId === driver.id}
              onClick={() => generate(driver.id)}
            ><Link2 size={16} />Create LINE link code</Button>}
          </div>
        </Card>;
      })}
    </div>
  </>;
}
