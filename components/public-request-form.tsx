'use client';

import { useEffect, useState } from 'react';
import { Car, CheckCircle2, Clock3, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { GoogleMapLinks } from '@/components/google-map-links';
import type { OvertimeEmployee, RequestType } from '@/lib/types';
import { isOtRequestWindowOpen } from '@/lib/request-window';

const emptyEmployee = (): OvertimeEmployee => ({
  employeeId: '', employeeName: '', workDescription: '', workStart: '17:20',
  workEnd: '20:00', totalWeeklyHours: 0, transportRequired: true, busStop: '',
});

type CompanyUser = { displayName: string; mail: string; department: string; jobTitle: string };

export default function PublicRequestForm() {
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approverEmail, setApproverEmail] = useState('');
  const [approverResults, setApproverResults] = useState<CompanyUser[]>([]);
  const [approverSearching, setApproverSearching] = useState(false);
  const [approverSelected, setApproverSelected] = useState(false);
  const [usingDate, setUsingDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [pickupLocation, setPickupLocation] = useState('TOKIN Main Office');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [meetingPoint, setMeetingPoint] = useState<'front_area' | 'loading_area'>('front_area');
  const [withStaff, setWithStaff] = useState(false);
  const [passengers, setPassengers] = useState('');
  const [employees, setEmployees] = useState<OvertimeEmployee[]>([emptyEmployee()]);
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ requestNo: string; emailStatus: string } | null>(null);

  useEffect(() => {
    if (approverSelected || approverName.trim().length < 2) {
      setApproverResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !publishableKey) return;
      setApproverSearching(true);
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/search-company-users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: publishableKey },
          body: JSON.stringify({ query: approverName.trim() }),
        });
        const result = await response.json();
        setApproverResults(response.ok && Array.isArray(result.users) ? result.users : []);
      } catch {
        setApproverResults([]);
      } finally {
        setApproverSearching(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [approverName, approverSelected]);

  const chooseApprover = (person: CompanyUser) => {
    setApproverName(person.displayName);
    setApproverEmail(person.mail);
    setApproverResults([]);
    setApproverSelected(true);
  };

  const updateEmployee = <K extends keyof OvertimeEmployee>(index: number, key: K, value: OvertimeEmployee[K]) =>
    setEmployees(current => current.map((item, i) => i === index ? { ...item, [key]: value } : item));

  const reset = () => {
    setRequestType(null);
    setUsingDate(''); setDestination(''); setPurpose(''); setPassengers('');
    setEmployees([emptyEmployee()]); setSuccess(null); setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!requestType) return;
    if (requestType === 'overtime' && !isOtRequestWindowOpen()) {
      return setError('OT requests can be submitted only from 08:00 to 17:00 (Thailand time).');
    }
    if (requestType === 'overtime' && employees.some(item =>
      !item.employeeId || !item.employeeName || !item.workDescription || (item.transportRequired && !item.busStop))) {
      return setError('Complete every OT employee row, including the bus stop when transportation is required.');
    }

    setSubmitting(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !publishableKey) throw new Error('Public request service is not configured.');
      const passengerList = passengers.split('\n').map(item => item.trim()).filter(Boolean);
      const response = await fetch(`${supabaseUrl}/functions/v1/public-submit-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: publishableKey },
        body: JSON.stringify({
          requestType,
          requester: { name: requesterName, email: requesterEmail, employeeId, department },
          approver: { name: approverName, email: approverEmail },
          usingDate,
          startTime: requestType === 'overtime' ? employees[0].workStart : startTime,
          endTime: requestType === 'overtime' ? employees[0].workEnd : endTime,
          pickupLocation,
          destination: requestType === 'overtime' ? 'Employee bus stops' : destination,
          purpose,
          meetingPoint,
          withStaff,
          passengers: requestType === 'outside_company' ? passengerList : [],
          overtimeEmployees: requestType === 'overtime' ? employees : [],
          website,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to submit request.');
      setSuccess({ requestNo: result.requestNo, emailStatus: result.approvalEmailStatus });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) return <PublicFrame>
    <Card className="mx-auto max-w-xl p-8 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
      <h1 className="mt-4 text-2xl font-bold">Request submitted</h1>
      <p className="mt-2 text-gray-600">Request number: <strong>{success.requestNo}</strong></p>
      <p className="mt-4 text-sm text-gray-500">The request was sent to {approverEmail}. You will receive another email after Admin assigns the vehicle and driver.</p>
      {success.emailStatus !== 'sent' && <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">The request was saved, but the approval email service is not ready. Admin can still see this request.</p>}
      <Button className="mt-6" onClick={reset}>Create another request</Button>
    </Card>
  </PublicFrame>;

  if (!requestType) return <PublicFrame>
    <div className="mx-auto max-w-5xl">
      <div className="mb-7 text-center"><h1 className="text-3xl font-bold">Request transportation</h1><p className="mt-2 text-gray-500">No account is required. Choose the request form below.</p></div>
      <div className="grid gap-5 md:grid-cols-2">
        <Choice icon={<Clock3 />} title="OT transportation" body="Transportation for employees working overtime or on a holiday." onClick={() => setRequestType('overtime')} />
        <Choice icon={<Car />} title="Outside-company trip" body="Vehicle request for business outside the company." onClick={() => setRequestType('outside_company')} />
      </div>
    </div>
  </PublicFrame>;

  return <PublicFrame>
    <form onSubmit={submit} className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase text-brand">TOKIN Transport</p><h1 className="text-2xl font-bold">{requestType === 'overtime' ? 'OT transportation request' : 'Outside-company car request'}</h1></div><Button type="button" variant="secondary" onClick={() => setRequestType(null)}>Change request type</Button></div>

      <Card className="p-5"><h2 className="mb-4 font-bold">Requester information</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Full name"><Input required value={requesterName} onChange={e => setRequesterName(e.target.value)} /></Field>
        <Field label="Company email"><Input required type="email" value={requesterEmail} onChange={e => setRequesterEmail(e.target.value)} /></Field>
        <Field label="Employee number"><Input value={employeeId} onChange={e => setEmployeeId(e.target.value)} /></Field>
        <Field label="Department"><Input required value={department} onChange={e => setDepartment(e.target.value)} /></Field>
      </div></Card>

      <Card className="p-5"><h2 className="mb-1 font-bold">Approver</h2><p className="mb-4 text-sm text-gray-500">Enter the manager who should approve this request by email.</p><div className="grid gap-4 sm:grid-cols-2">
        <Field label="Approver name"><Input required value={approverName} onChange={e => { setApproverName(e.target.value); setApproverEmail(''); setApproverSelected(false); }} /></Field>
        <Field label="Approver email"><Input required type="email" value={approverEmail} onChange={e => setApproverEmail(e.target.value)} placeholder="Select a search result or enter email" /></Field>
      </div>
      {approverSearching && <p className="mt-3 text-sm text-gray-500">Searching company directory...</p>}
      {approverResults.length > 0 && <div className="mt-3 overflow-hidden rounded-lg border border-line bg-white">{approverResults.map(person => <button type="button" key={person.mail} onClick={() => chooseApprover(person)} className="block w-full border-b border-line px-4 py-3 text-left last:border-0 hover:bg-blue-50"><span className="block text-sm font-semibold">{person.displayName}</span><span className="block text-xs text-gray-500">{person.mail}{person.jobTitle ? ` - ${person.jobTitle}` : ''}{person.department ? ` - ${person.department}` : ''}</span></button>)}</div>}
      {approverSelected && <p className="mt-3 text-sm font-medium text-green-700">Selected: {approverName} ({approverEmail})</p>}
      </Card>

      <Card className="p-5"><h2 className="mb-4 font-bold">Request details</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Using date"><Input required type="date" value={usingDate} onChange={e => setUsingDate(e.target.value)} /></Field>
        {requestType === 'outside_company' && <><Field label="Start time"><Input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></Field><Field label="End time"><Input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></Field><Field label="Pickup location"><Input required value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} /></Field><Field label="Destination"><Input required value={destination} onChange={e => setDestination(e.target.value)} /></Field><Field label="Meeting point"><Select value={meetingPoint} onChange={e => setMeetingPoint(e.target.value as 'front_area' | 'loading_area')}><option value="front_area">Front area</option><option value="loading_area">Loading area</option></Select></Field></>}
      </div><div className="mt-4"><Field label="Purpose / work summary"><Textarea required value={purpose} onChange={e => setPurpose(e.target.value)} /></Field></div>
      {requestType === 'outside_company' && destination.trim() && <div className="mt-4"><GoogleMapLinks origin={pickupLocation} destination={destination} /></div>}
      {requestType === 'outside_company' && <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Passenger names (one per line)"><Textarea value={passengers} onChange={e => setPassengers(e.target.value)} /></Field><label className="flex items-center gap-3 self-start pt-8 text-sm"><input type="checkbox" checked={withStaff} onChange={e => setWithStaff(e.target.checked)} className="h-4 w-4 accent-brand" />Travel with GA staff</label></div>}
      </Card>

      {requestType === 'overtime' && <Card className="p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Employees</h2><p className="text-sm text-gray-500">Add everyone included in this OT request.</p></div><Button type="button" variant="secondary" onClick={() => setEmployees(current => [...current, emptyEmployee()])}><Plus size={16} /> Add employee</Button></div><div className="space-y-4">{employees.map((employee, index) => <div key={index} className="rounded-lg border border-line bg-gray-50 p-4"><div className="mb-3 flex justify-between"><p className="font-semibold">Employee {index + 1}</p><Button type="button" variant="ghost" disabled={employees.length === 1} onClick={() => setEmployees(current => current.filter((_, i) => i !== index))}><Trash2 size={16} /></Button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Employee number"><Input required value={employee.employeeId} onChange={e => updateEmployee(index, 'employeeId', e.target.value)} /></Field><Field label="Employee name"><Input required value={employee.employeeName} onChange={e => updateEmployee(index, 'employeeName', e.target.value)} /></Field><Field label="Work description"><Input required value={employee.workDescription} onChange={e => updateEmployee(index, 'workDescription', e.target.value)} /></Field><Field label="Weekly hours (max 60)"><Input required type="number" min="0" max="60" step="0.01" value={employee.totalWeeklyHours} onChange={e => updateEmployee(index, 'totalWeeklyHours', Number(e.target.value))} /></Field><Field label="OT start"><Input required type="time" value={employee.workStart} onChange={e => updateEmployee(index, 'workStart', e.target.value)} /></Field><Field label="OT end"><Input required type="time" value={employee.workEnd} onChange={e => updateEmployee(index, 'workEnd', e.target.value)} /></Field><Field label="Transportation"><Select value={employee.transportRequired ? 'yes' : 'no'} onChange={e => updateEmployee(index, 'transportRequired', e.target.value === 'yes')}><option value="yes">Required</option><option value="no">Not required</option></Select></Field><Field label="Bus stop"><Input required={employee.transportRequired} disabled={!employee.transportRequired} value={employee.busStop} onChange={e => updateEmployee(index, 'busStop', e.target.value)} /></Field>
      </div></div>)}</div></Card>}

      <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end"><Button disabled={submitting}>{submitting ? 'Submitting...' : 'Submit request'}</Button></div>
    </form>
  </PublicFrame>;
}

function PublicFrame({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-canvas"><header className="border-b border-line bg-[#17345f] px-5 py-4 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between"><div><p className="font-bold">TOKIN Transport</p><p className="text-xs text-blue-200">Transportation Request Portal</p></div><a href="/admin/login" className="text-xs text-blue-200 hover:text-white">Admin</a></div></header><div className="p-4 py-8 md:p-8">{children}</div></main>;
}

function Choice({ icon, title, body, onClick }: { icon: React.ReactNode; title: string; body: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-xl border border-line bg-white p-7 text-left shadow-panel transition hover:border-brand hover:bg-blue-50"><span className="mb-5 grid h-12 w-12 place-items-center rounded-lg bg-blue-100 text-brand">{icon}</span><h2 className="text-lg font-bold">{title}</h2><p className="mt-2 text-sm text-gray-500">{body}</p></button>;
}
