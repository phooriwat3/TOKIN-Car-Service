'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button, Card } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import {
  createLineLinkCode,
  disconnectLineAccount,
  loadLineConnection,
  type LineConnection,
} from '@/lib/supabase/repository';

export default function DriverLinePage() {
  const supabase = useMemo(() => createClient(), []);
  const [connection, setConnection] = useState<LineConnection | null>(null);
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    if (!supabase) return;
    try {
      const current = await loadLineConnection(supabase);
      setConnection(current);
      if (current) setCode('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to check LINE connection.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const generate = async () => {
    if (!supabase) return;
    setMessage('');
    try {
      const nextCode = await createLineLinkCode(supabase);
      setCode(nextCode);
      setExpiresAt(new Date(Date.now() + 10 * 60 * 1000));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create a link code.');
    }
  };

  const disconnect = async () => {
    if (!supabase || !window.confirm('Disconnect this LINE account?')) return;
    await disconnectLineAccount(supabase);
    setConnection(null);
    setMessage('LINE account disconnected.');
  };

  const command = code ? `LINK ${code}` : '';

  return <div className="space-y-5">
    <PageHeader title="Connect LINE" description="Receive new trip assignments in your LINE chat." />
    <Card className="max-w-2xl p-6">
      {loading ? <p className="text-sm text-gray-500">Checking connection...</p> : connection ? <div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 text-green-600" />
          <div>
            <h2 className="font-bold text-green-800">LINE connected</h2>
            <p className="mt-1 text-sm text-gray-600">
              {connection.displayName || 'LINE user'} · linked {new Date(connection.linkedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <Button className="mt-5" variant="secondary" onClick={disconnect}>Disconnect LINE</Button>
      </div> : <div>
        <div className="flex items-start gap-3">
          <MessageCircle className="mt-0.5 text-brand" />
          <div>
            <h2 className="font-bold">Link your driver account</h2>
            <p className="mt-1 text-sm text-gray-600">Add TOKIN Car Service as a LINE friend, then create a one-time code below.</p>
          </div>
        </div>
        {!code ? <Button className="mt-5" onClick={generate}>Create link code</Button> : <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-gray-700">Send this exact message to TOKIN Car Service:</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded bg-white px-4 py-2 text-xl font-bold tracking-wider text-brand">{command}</code>
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(command)}><Copy size={16} />Copy</Button>
          </div>
          <p className="mt-3 text-xs text-gray-500">Code expires at {expiresAt?.toLocaleTimeString()} and can be used once. This page checks the connection automatically.</p>
          <Button className="mt-4" variant="ghost" onClick={generate}>Generate another code</Button>
        </div>}
      </div>}
      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
    </Card>
  </div>;
}
