'use client';

import { useEffect, useState } from 'react';
import { Car, CheckCircle2, Clock3, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Field, Input, Select, Textarea, WeeklyHoursInput } from '@/components/ui';
import { GoogleMapLinks } from '@/components/google-map-links';
import { CompanyUserField, type CompanyUser } from '@/components/company-user-field';
import type { ApproverItem, ApproverPosition, OvertimeEmployee, RequestType } from '@/lib/types';
import { isOtRequestWindowOpen } from '@/lib/request-window';

const emptyEmployee = (): OvertimeEmployee => ({
  employeeId: '', employeeName: '', employeeEmail: '', workDescription: '', workStart: '17:20',
  workEnd: '20:00', totalWeeklyHours: 0, transportRequired: true, busStop: '',
});

const APPROVER_POSITIONS: { value: ApproverPosition; label: string }[] = [
  { value: 'Supervisor', label: 'Supervisor' },
  { value: 'Sect.Manager', label: 'Sect.Manager' },
  { value: 'Dept.Manager', label: 'Dept.Manager' },
  { value: 'Chief', label: 'Chief' },
  { value: 'AGM.up', label: 'AGM.up (When necessary)' },
];

export default function PublicRequestForm() {
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [approvers, setApprovers] = useState<ApproverItem[]>([
    { position: 'Supervisor', name: '', email: '' },
  ]);
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
  const [success, setSuccess] = useState<{ requestNo: string; emailStatus: string; manageUrl?: string } | null>(null);

  const updateApprover = <K extends keyof ApproverItem>(index: number, key: K, value: ApproverItem[K]) =>
    setApprovers(current => current.map((item, i) => i === index ? { ...item, [key]: value } : item));

  const addApprover = () => setApprovers(current => [...current, { position: 'Sect.Manager', name: '', email: '' }]);
  const removeApprover = (index: number) => setApprovers(current => current.filter((_, i) => i !== index));

  const updateEmployee = <K extends keyof OvertimeEmployee>(index: number, key: K, value: OvertimeEmployee[K]) =>
    setEmployees(current => current.map((item, i) => i === index ? { ...item, [key]: value } : item));

  const reset = () => {
    setRequestType(null);
    setUsingDate(''); setDestination(''); setPurpose(''); setPassengers('');
    setApprovers([{ position: 'Supervisor', name: '', email: '' }]);
    setEmployees([emptyEmployee()]); setSuccess(null); setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!requestType) return;
    if (requestType === 'overtime' && !isOtRequestWindowOpen()) {
      return setError('OT requests can be submitted only from 08:00 to 17:00 (Thailand time).');
    }
    if (approvers.some(a => !a.name.trim() || !a.email.trim())) {
      return setError('Please complete the name and email for every assigned approver.');
    }
    if (requestType === 'outside_company' && !purpose.trim()) return setError('Purpose is required.');
    if (requestType === 'overtime' && employees.some(item =>
      !item.employeeId || !item.employeeName || !item.workDescription || (item.transportRequired && (!item.employeeEmail || !item.busStop)))) {
      return setError('Complete every OT employee row, including employee email and bus stop when transportation is required.');
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
          approver: { name: approvers[0].name, email: approvers[0].email },
          approversList: approvers,
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
      setSuccess({ requestNo: result.requestNo, emailStatus: result.approvalEmailStatus, manageUrl: result.manageUrl });
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
      <p className="mt-4 text-sm text-gray-500">The request was sent to {approvers.map(a => a.email).filter(Boolean).join(', ')}. You will receive another email after Admin assigns the vehicle and driver.</p>
      {success.manageUrl && <a className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-[#194786]" href={success.manageUrl}>Manage this request</a>}
      {success.emailStatus !== 'sent' && <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">The request was saved, but the approval email service is not ready. Admin can still see this request.</p>}
      <Button className="mt-6" onClick={reset}>Create another request</Button>
    </Card>
  </PublicFrame>;

  if (!requestType) return <PublicFrame>
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-ink">Request Transportation</h1>
        <p className="mt-2 text-base text-gray-500">No account required. Select the type of request below to get started.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Choice icon={<Clock3 />} title="OVERTIME / HOLIDAY WORK" body="Transportation for employees working overtime or on a public holiday." onClick={() => setRequestType('overtime')} />
        <Choice icon={<Car />} title="CAR SERVICE REQUISITION" body="Vehicle request for business travel outside the company premises." onClick={() => setRequestType('outside_company')} />
      </div>
    </div>
  </PublicFrame>;

  return <PublicFrame>
    <form onSubmit={submit} className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase text-brand">TOKIN Transport</p><h1 className="text-2xl font-bold">{requestType === 'overtime' ? 'OVERTIME / HOLIDAY WORK' : 'CAR SERVICE REQUISITION'}</h1></div><Button type="button" variant="secondary" onClick={() => setRequestType(null)}>Change request type</Button></div>

      <Card className="p-5">
        <h2 className="mb-1 font-bold">Requester information</h2>
        <p className="mb-4 text-xs text-gray-500">Search name or email to auto-fill company directory details.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CompanyUserField
            label="Full name"
            required
            value={requesterName}
            onChange={setRequesterName}
            placeholder="Type name or email to search..."
            onSelectUser={(person) => {
              setRequesterName(person.displayName);
              setRequesterEmail(person.mail);
              if (person.department) setDepartment(person.department);
              if (person.employeeId) setEmployeeId(person.employeeId);
            }}
          />
          <Field label="Company email">
            <Input required type="email" value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} />
          </Field>
          <Field label="Employee number">
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          </Field>
          <Field label="Department">
            <Input required value={department} onChange={(e) => setDepartment(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-ink">Approved by</h2>
            <p className="text-xs text-gray-500">
              Select position levels and search manager names or emails for approval.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addApprover}
          >
            <Plus size={15} /> Add approver
          </Button>
        </div>

        {requestType === 'overtime' && (
          <div className="mb-4 max-w-xs border-b border-line pb-4">
            <Field label="Using date (วันที่ใช้งาน)">
              <Input required type="date" value={usingDate} onChange={(e) => setUsingDate(e.target.value)} />
            </Field>
          </div>
        )}

        <div className="space-y-3">
          {approvers.map((item, index) => (
            <div key={index} className="flex flex-col gap-3 border border-line bg-canvas p-3 sm:flex-row sm:items-end">
              <div className="w-full sm:w-52 flex-shrink-0">
                <Field label="Position (ตำแหน่ง)">
                  <Select
                    value={item.position}
                    onChange={(e) => updateApprover(index, 'position', e.target.value as ApproverPosition)}
                  >
                    {APPROVER_POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex-1">
                <CompanyUserField
                  label="Approver name"
                  required
                  value={item.name}
                  onChange={(val) => updateApprover(index, 'name', val)}
                  placeholder="Search name or email..."
                  onSelectUser={(person) => {
                    updateApprover(index, 'name', person.displayName);
                    updateApprover(index, 'email', person.mail);
                  }}
                />
              </div>
              <div className="flex-1">
                <Field label="Approver email">
                  <Input
                    required
                    type="email"
                    value={item.email}
                    onChange={(e) => updateApprover(index, 'email', e.target.value)}
                    placeholder="manager@company.com"
                  />
                </Field>
              </div>
              {approvers.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="self-end text-gray-400 hover:text-danger"
                  onClick={() => removeApprover(index)}
                  title="Remove approver"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {requestType === 'outside_company' && (
        <Card className="p-5">
          <h2 className="mb-4 font-bold">Request details</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Using date"><Input required type="date" value={usingDate} onChange={e => setUsingDate(e.target.value)} /></Field>
            <Field label="Start time"><Input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></Field>
            <Field label="End time"><Input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></Field>
            <Field label="Pickup location"><Input required value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} /></Field>
            <Field label="Destination"><Input required value={destination} onChange={e => setDestination(e.target.value)} /></Field>
            <Field label="Meeting point"><Select value={meetingPoint} onChange={e => setMeetingPoint(e.target.value as 'front_area' | 'loading_area')}><option value="front_area">Front area</option><option value="loading_area">Loading area</option></Select></Field>
          </div>
          <div className="mt-4"><Field label="Purpose / work summary"><Textarea required value={purpose} onChange={e => setPurpose(e.target.value)} /></Field></div>
          {destination.trim() && <div className="mt-4"><GoogleMapLinks origin={pickupLocation} destination={destination} /></div>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Passenger names (one per line)"><Textarea value={passengers} onChange={e => setPassengers(e.target.value)} /></Field><label className="flex items-center gap-3 self-start pt-8 text-sm"><input type="checkbox" checked={withStaff} onChange={e => setWithStaff(e.target.checked)} className="h-4 w-4 accent-brand" />Travel with GA staff</label></div>
        </Card>
      )}

      {requestType === 'overtime' && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Employees</h2>
              <p className="text-sm text-gray-500">
                Add everyone included in this OT request. Type employee name to search directory.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEmployees((current) => [...current, emptyEmployee()])}
            >
              <Plus size={16} /> Add employee
            </Button>
          </div>
          <div className="space-y-4">
            {employees.map((employee, index) => (
              <div key={index} className="border border-line bg-canvas p-4 shadow-panel">
                <div className="mb-3 flex justify-between items-center">
                  <p className="font-bold text-ink text-sm">Employee {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={employees.length === 1}
                    onClick={() => setEmployees((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <CompanyUserField
                    label="Employee name"
                    required
                    value={employee.employeeName}
                    placeholder="Search name or email..."
                    onChange={(val) => updateEmployee(index, 'employeeName', val)}
                    onSelectUser={(person) => {
                      updateEmployee(index, 'employeeName', person.displayName);
                      updateEmployee(index, 'employeeEmail', person.mail);
                      if (person.employeeId) updateEmployee(index, 'employeeId', person.employeeId);
                    }}
                  />
                  <Field label="Employee email">
                    <Input
                      required={employee.transportRequired}
                      type="email"
                      placeholder="name@company.com"
                      value={employee.employeeEmail || ''}
                      onChange={(e) => updateEmployee(index, 'employeeEmail', e.target.value)}
                    />
                  </Field>
                  <Field label="Employee number">
                    <Input
                      required
                      value={employee.employeeId}
                      onChange={(e) => updateEmployee(index, 'employeeId', e.target.value)}
                    />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="Description of work">
                    <Textarea
                      required
                      className="min-h-[80px]"
                      value={employee.workDescription}
                      placeholder="Describe the work this employee will be performing during overtime..."
                      onChange={(e) => updateEmployee(index, 'workDescription', e.target.value)}
                    />
                  </Field>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Weekly hours (max 60)">
                    <WeeklyHoursInput
                      required
                      value={employee.totalWeeklyHours}
                      onChange={(val) => updateEmployee(index, 'totalWeeklyHours', val)}
                    />
                  </Field>
                  <Field label="OT start">
                    <Input
                      required
                      type="time"
                      value={employee.workStart}
                      onChange={(e) => updateEmployee(index, 'workStart', e.target.value)}
                    />
                  </Field>
                  <Field label="OT end">
                    <Input
                      required
                      type="time"
                      value={employee.workEnd}
                      onChange={(e) => updateEmployee(index, 'workEnd', e.target.value)}
                    />
                  </Field>
                  <Field label="Transportation">
                    <Select
                      value={employee.transportRequired ? 'yes' : 'no'}
                      onChange={(e) => updateEmployee(index, 'transportRequired', e.target.value === 'yes')}
                    >
                      <option value="yes">Required</option>
                      <option value="no">Not required</option>
                    </Select>
                  </Field>
                  <Field label="Bus stop">
                    <Input
                      required={employee.transportRequired}
                      disabled={!employee.transportRequired}
                      value={employee.busStop}
                      onChange={(e) => updateEmployee(index, 'busStop', e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
      {error && <p className="border-l-2 border-danger bg-danger-light p-3 pl-4 text-sm text-danger">{error}</p>}
      <div className="flex justify-end"><Button disabled={submitting}>{submitting ? 'Submitting...' : 'Submit request'}</Button></div>
    </form>
  </PublicFrame>;
}

function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-canvas">
      <header
        className="border-b border-white/10 px-5 py-0 text-white"
        style={{ background: 'linear-gradient(90deg, #00498E 0%, #003A71 100%)' }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center bg-white/15 ring-1 ring-white/20">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 17H5a2 2 0 01-2-2v-4l3-7h10l3 7v4a2 2 0 01-2 2h-3m-6 0a1 1 0 002 0m0 0a1 1 0 002 0M8 17h6" />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-bold leading-tight">TOKIN Transport</p>
              <p className="text-[11px] text-blue-200/80">Transportation Request Portal</p>
            </div>
          </div>
          <a
            href="/admin/login"
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-blue-100 hover:bg-white/10 hover:text-white transition"
          >
            Admin Login
          </a>
        </div>
      </header>
      <div className="p-4 py-8 md:p-10">{children}</div>
    </main>
  );
}

function Choice({ icon, title, body, onClick }: { icon: React.ReactNode; title: string; body: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-line bg-white p-8 text-left shadow-card transition-all duration-200 hover:border-brand/40 hover:shadow-card-hover hover:-translate-y-0.5"
    >
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white">
        {icon}
      </span>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{body}</p>
      <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-brand">
        <span>Get started</span>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
