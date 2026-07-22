'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Clock3, Plus, Trash2, Users } from 'lucide-react';
import { useApp } from '@/components/app-provider';
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { GoogleMapLinks } from '@/components/google-map-links';
import { CompanyUserField } from '@/components/company-user-field';
import { createClient } from '@/lib/supabase/client';
import type { Booking, OvertimeEmployee, RequestType, User } from '@/lib/types';
import { demoUsers } from '@/lib/mock-data';
import { bangkokTime, isOtRequestWindowOpen } from '@/lib/request-window';

const emptyEmployee = (): OvertimeEmployee => ({
  employeeId: '', employeeName: '', employeeEmail: '', workDescription: '', workStart: '17:20',
  workEnd: '20:00', totalWeeklyHours: 0, transportRequired: true, busStop: '',
});

export default function NewEmailRequestForm() {
  const { addBooking, user, data, configured } = useApp();
  const router = useRouter();
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [approvers, setApprovers] = useState<User[]>(demoUsers.filter(x => x.role === 'approver'));
  const [approverId, setApproverId] = useState('');
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
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    if (!supabase) return;
    void supabase.from('profiles')
      .select('id,employee_id,full_name,email,role,department:departments(name)')
      .eq('role', 'approver').eq('is_active', true).order('full_name')
      .then(({ data: rows, error: queryError }) => {
        if (queryError) return setError(`Unable to load approvers: ${queryError.message}`);
        setApprovers((rows ?? []).map((row: any) => ({
          id: row.id, employeeId: row.employee_id, fullName: row.full_name,
          email: row.email, department: Array.isArray(row.department) ? row.department[0]?.name ?? '' : row.department?.name ?? '', role: 'approver',
        })));
      });
  }, [configured]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);


  const selectedApprover = useMemo(() => approvers.find(x => x.id === approverId), [approvers, approverId]);
  const updateEmployee = <K extends keyof OvertimeEmployee>(index: number, key: K, value: OvertimeEmployee[K]) =>
    setEmployees(current => current.map((item, i) => i === index ? { ...item, [key]: value } : item));

  const otWindowOpen = isOtRequestWindowOpen(clock);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!requestType || !selectedApprover) return setError('Please select the request type and approver.');
    if (requestType === 'overtime' && !isOtRequestWindowOpen()) return setError('OT requests can be submitted only from 08:00 to 17:00 (Thailand time).');
    if (!usingDate || !purpose.trim()) return setError('Date and purpose are required.');
    if (requestType === 'outside_company' && !destination.trim()) return setError('Destination is required.');
    if (requestType === 'overtime' && employees.some(x => !x.employeeId || !x.employeeName || !x.workDescription || (x.transportRequired && !x.busStop))) {
      return setError('Complete every OT employee row, including the bus stop when transport is required.');
    }
    setSubmitting(true);
    try {
      const passengerList = requestType === 'outside_company' ? passengers.split('\n').map(x => x.trim()).filter(Boolean) : [];
      const booking: Booking = {
        id: `b-${Date.now()}`, bookingNo: `CSR-${new Date().getFullYear()}-${String(data.bookings.length + 1).padStart(6, '0')}`,
        requesterId: user.id, requesterName: user.fullName, department: user.department,
        status: 'pending_approval', requestType, approverId: selectedApprover.id,
        approverName: selectedApprover.fullName, approverEmail: selectedApprover.email,
        category: requestType === 'overtime' ? 'overtime_transport' : 'business_trip',
        usingDate, startTime: requestType === 'overtime' ? employees[0].workStart : startTime,
        endTime: requestType === 'overtime' ? employees[0].workEnd : endTime,
        pickupLocation, destination: requestType === 'overtime' ? 'Employee bus stops' : destination,
        purpose, numPassengers: requestType === 'overtime' ? employees.filter(x => x.transportRequired).length : Math.max(1, passengerList.length),
        passengerList, overtimeEmployees: requestType === 'overtime' ? employees : [], meetingPoint,
        withStaff, vehicleTypePref: 'any', driverRequired: true, urgent: false,
        afterHours: requestType === 'overtime', overtimeTransport: requestType === 'overtime', createdAt: new Date().toISOString(),
      };
      const created = await addBooking(booking);
      router.push(`/bookings/${created.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit request.');
    } finally { setSubmitting(false); }
  };

  if (!requestType) return <>
    <PageHeader title="Create car request" description="Choose the form that matches the transportation request." />
    <div className="grid gap-5 md:grid-cols-2">
      <Choice icon={<Clock3 />} title="OVERTIME / HOLIDAY WORK" body="Request transport for multiple employees working overtime or on a holiday." onClick={() => setRequestType('overtime')} />
      <Choice icon={<Car />} title="CAR SERVICE REQUISITION" body="Request a vehicle for a business trip outside the company." onClick={() => setRequestType('outside_company')} />
    </div>
  </>;

  return <>
    <PageHeader title={requestType === 'overtime' ? 'OVERTIME / HOLIDAY WORK' : 'CAR SERVICE REQUISITION'} description="The selected approver will receive this request by email after the Power Automate integration is enabled." />
    <form onSubmit={submit} className="space-y-5">
      <Card className="p-5">
        <div className="mb-5 flex items-center justify-between"><h2 className="font-bold">Request information</h2><Button type="button" variant="ghost" onClick={() => setRequestType(null)}>Change form</Button></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Requester"><Input disabled value={`${user.fullName} (${user.email})`} /></Field>
          <Field label="Department"><Input disabled value={user.department} /></Field>
          <Field label="Using date"><Input required type="date" value={usingDate} onChange={e => setUsingDate(e.target.value)} /></Field>
          <Field label="Approver"><Select required value={approverId} onChange={e => setApproverId(e.target.value)}><option value="">Search / select approver</option>{approvers.map(x => <option key={x.id} value={x.id}>{x.fullName} · {x.email}</option>)}</Select></Field>
          {requestType === 'outside_company' && <><Field label="Start time"><Input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></Field><Field label="End time"><Input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></Field><Field label="Pickup location"><Input required value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} /></Field><Field label="Destination"><Input required value={destination} onChange={e => setDestination(e.target.value)} /></Field><Field label="Meeting point"><Select value={meetingPoint} onChange={e => setMeetingPoint(e.target.value as any)}><option value="front_area">Front area</option><option value="loading_area">Loading area</option></Select></Field></>}
        </div>
        <div className="mt-4"><Field label="Purpose / work summary"><Textarea required value={purpose} onChange={e => setPurpose(e.target.value)} /></Field></div>
        {requestType === 'outside_company' && destination.trim() && <div className="mt-4"><GoogleMapLinks origin={pickupLocation} destination={destination} /></div>}
        {requestType === 'outside_company' && <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Passenger names (one per line)"><Textarea value={passengers} onChange={e => setPassengers(e.target.value)} /></Field><label className="flex items-center gap-3 self-start pt-8 text-sm"><input type="checkbox" checked={withStaff} onChange={e => setWithStaff(e.target.checked)} className="h-4 w-4 accent-brand" />Travel with GA staff</label></div>}
      </Card>

      {requestType === 'overtime' && <Card className="p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Employees</h2><p className="text-sm text-gray-500">Add everyone included in this OVERTIME / HOLIDAY WORK request.</p></div><Button type="button" variant="secondary" onClick={() => setEmployees(x => [...x, emptyEmployee()])}><Plus size={16} /> Add employee</Button></div>
        <div className="space-y-4">{employees.map((employee, index) => <div key={index} className="rounded-xl border border-line bg-canvas p-4 shadow-panel"><div className="mb-3 flex justify-between items-center"><p className="font-bold text-ink text-sm">Employee {index + 1}</p><Button type="button" variant="ghost" disabled={employees.length === 1} onClick={() => setEmployees(x => x.filter((_, i) => i !== index))}><Trash2 size={16} /></Button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CompanyUserField label="Employee name" required value={employee.employeeName} placeholder="Search name or email..." onChange={val => updateEmployee(index, 'employeeName', val)} onSelectUser={person => { updateEmployee(index, 'employeeName', person.displayName); updateEmployee(index, 'employeeEmail', person.mail); if (person.employeeId) updateEmployee(index, 'employeeId', person.employeeId); }} />
          <Field label="Employee email"><Input required={employee.transportRequired} type="email" placeholder="name@company.com" value={employee.employeeEmail || ''} onChange={e => updateEmployee(index, 'employeeEmail', e.target.value)} /></Field>
          <Field label="Employee number"><Input required value={employee.employeeId} onChange={e => updateEmployee(index, 'employeeId', e.target.value)} /></Field>
          <Field label="Work description"><Input required value={employee.workDescription} onChange={e => updateEmployee(index, 'workDescription', e.target.value)} /></Field>
          <Field label="Weekly hours (≤ 60)"><Input required type="number" min="0" max="60" step="0.01" value={employee.totalWeeklyHours} onChange={e => updateEmployee(index, 'totalWeeklyHours', Number(e.target.value))} /></Field>
          <Field label="OT start"><Input required type="time" value={employee.workStart} onChange={e => updateEmployee(index, 'workStart', e.target.value)} /></Field>
          <Field label="OT end"><Input required type="time" value={employee.workEnd} onChange={e => updateEmployee(index, 'workEnd', e.target.value)} /></Field>
          <Field label="Transportation"><Select value={employee.transportRequired ? 'yes' : 'no'} onChange={e => updateEmployee(index, 'transportRequired', e.target.value === 'yes')}><option value="yes">Required</option><option value="no">Not required</option></Select></Field>
          <Field label="Bus stop"><Input required={employee.transportRequired} disabled={!employee.transportRequired} value={employee.busStop} onChange={e => updateEmployee(index, 'busStop', e.target.value)} /></Field>
        </div></div>)}</div>
      </Card>}

      {requestType === 'overtime' && !otWindowOpen && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">OT request submission is closed. Current Thailand time: {bangkokTime(clock)}. Available from 08:00 to 17:00.</p>}
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end"><Button disabled={submitting || (requestType === 'overtime' && !otWindowOpen)}>{submitting ? 'Submitting...' : 'Submit for approval'}</Button></div>
    </form>
  </>;
}

function Choice({ icon, title, body, onClick }: { icon: React.ReactNode; title: string; body: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-xl border border-line bg-white p-7 text-left shadow-panel transition hover:border-brand hover:bg-blue-50"><span className="mb-5 grid h-12 w-12 place-items-center rounded-lg bg-blue-100 text-brand">{icon}</span><h2 className="text-lg font-bold">{title}</h2><p className="mt-2 text-sm text-gray-500">{body}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand"><Users size={16} /> Open form</span></button>;
}
