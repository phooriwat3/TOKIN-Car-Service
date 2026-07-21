'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Badge, Button, Card, Field, Textarea } from '@/components/ui';

type ApprovalRequest = {
  requestNo: string;
  status: string;
  revisionNo: number;
  requestType: string;
  requester: { name: string; email: string; employeeId?: string; department: string };
  approver: { name: string; email: string };
  usingDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  destination: string;
  purpose: string;
  meetingPoint: string;
  withStaff?: boolean;
  numPassengers: number;
  passengers: Array<{ name: string; seq: number }>;
  overtimeEmployees: Array<{
    employee_id: string;
    employee_name: string;
    work_description: string;
    work_start: string;
    work_end: string;
    transport_required: boolean;
    bus_stop?: string;
    seq: number;
  }>;
};

const apiConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) throw new Error('Approval service is not configured.');
  return { supabaseUrl, publishableKey };
};
const readResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return {} as Record<string, unknown>;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text } as Record<string, unknown>;
  }
};

const responseError = (body: Record<string, unknown>, fallback: string) => {
  if (typeof body.error === 'string' && body.error) return body.error;
  if (typeof body.message === 'string' && body.message) return body.message;
  return fallback;
};

export default function PublicApproveRequest({ initialToken }: { initialToken?: string }) {
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'complete'>(initialToken ? 'loading' : 'error');
  const [message, setMessage] = useState(initialToken ? '' : 'Approval link is missing.');
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    if (!initialToken) return;
    void load();
  }, [initialToken]);

  async function load() {
    try {
      const { supabaseUrl, publishableKey } = apiConfig();
      const response = await fetch(`${supabaseUrl}/functions/v1/public-approval-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
        },
        body: JSON.stringify({ token: initialToken }),
      });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(responseError(body, `Unable to open approval (HTTP ${response.status}).`));
      setRequest(body.request as ApprovalRequest);
      setState('ready');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to open approval.');
      setState('error');
    }
  }

  async function decide(action: 'approve' | 'reject' | 'request_changes') {
    if (!initialToken || saving) return;
    if (action !== 'approve' && !comments.trim()) {
      setMessage('Please enter comments before rejecting or requesting changes.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const { supabaseUrl, publishableKey } = apiConfig();
      const response = await fetch(`${supabaseUrl}/functions/v1/public-approval-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
        },
        body: JSON.stringify({ token: initialToken, action, comments }),
      });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(responseError(body, `Unable to record decision (HTTP ${response.status}).`));
      setResult(String(body.status || 'updated'));
      setState('complete');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to record decision.');
    } finally {
      setSaving(false);
    }
  }

  if (state === 'loading') return <Page><Card className="p-10 text-center"><Loader2 className="mx-auto animate-spin text-brand" /><p className="mt-3 text-sm text-gray-600">Loading request...</p></Card></Page>;
  if (state === 'error') return <Page><Card className="p-8 text-center"><AlertTriangle className="mx-auto text-amber-600" /><h1 className="mt-3 text-xl font-bold">Approval unavailable</h1><p className="mt-2 text-sm text-gray-600">{message}</p></Card></Page>;
  if (state === 'complete') return <Page><Card className="p-8 text-center"><CheckCircle2 className="mx-auto text-green-600" size={40} /><h1 className="mt-3 text-xl font-bold">Decision recorded</h1><p className="mt-2 text-sm text-gray-600">Request {request?.requestNo} is now {result.replace('_', ' ')}. This link cannot be used again.</p></Card></Page>;
  if (!request) return null;

  const passengerNames = request.requestType === 'overtime'
    ? request.overtimeEmployees.filter(item => item.transport_required).map(item => `${item.employee_name}${item.bus_stop ? ` - ${item.bus_stop}` : ''}`)
    : request.passengers.sort((a, b) => a.seq - b.seq).map(item => item.name);

  return <Page>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-semibold text-brand">TOKIN Transport approval</p><h1 className="mt-1 text-2xl font-bold">{request.requestNo}</h1></div>
      <Badge status={request.status}>Revision {request.revisionNo} - Pending approval</Badge>
    </div>
    <Card className="p-6">
      <h2 className="font-bold">Request details</h2>
      <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Info label="Requester" value={request.requester.name} />
        <Info label="Department" value={request.requester.department} />
        <Info label="Request type" value={request.requestType === 'overtime' ? 'OT / holiday transport' : 'Outside-company trip'} />
        <Info label="Date and time" value={`${request.usingDate} - ${request.startTime} to ${request.endTime}`} />
        <Info label="Route" value={`${request.pickupLocation} to ${request.destination}`} />
        <Info label="Passengers" value={String(request.numPassengers)} />
      </div>
      <div className="mt-5 border-t border-line pt-5"><Info label="Purpose" value={request.purpose} /></div>
      {passengerNames.length > 0 && <div className="mt-5 border-t border-line pt-5"><p className="text-xs font-semibold uppercase text-gray-500">Passenger details</p><ul className="mt-2 list-inside list-disc space-y-1 text-sm">{passengerNames.map((name, index) => <li key={index}>{name}</li>)}</ul></div>}
    </Card>
    <Card className="mt-5 p-6">
      <Field label="Comments (required for Reject or Request changes)"><Textarea value={comments} onChange={event => setComments(event.target.value)} placeholder="Add a reason or instruction for the requester..." /></Field>
      {message && <p className="mt-3 text-sm font-medium text-red-600">{message}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" disabled={saving} onClick={() => decide('request_changes')}>Request changes</Button>
        <Button type="button" variant="danger" disabled={saving} onClick={() => decide('reject')}>Reject</Button>
        <Button type="button" disabled={saving} onClick={() => decide('approve')}>{saving ? 'Saving...' : 'Approve'}</Button>
      </div>
    </Card>
  </Page>;
}

function Page({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-ink"><div className="mx-auto max-w-3xl"><div className="mb-6 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand font-bold text-white">TT</div><div><p className="font-bold">TOKIN Transport</p><p className="text-xs text-gray-500">Secure approval page</p></div></div>{children}</div></main>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase text-gray-500">{label}</p><p className="mt-1 text-sm">{value || '-'}</p></div>;
}
