'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '@/components/app-provider';
import { Button, Card, Empty, Field, Input, Select, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { GoogleMapLinks } from '@/components/google-map-links';
import { createClient } from '@/lib/supabase/client';
import type { OvertimeEmployee, User } from '@/lib/types';
import { demoUsers } from '@/lib/mock-data';

const blankEmployee = (): OvertimeEmployee => ({ employeeId:'', employeeName:'', workDescription:'', workStart:'17:20', workEnd:'20:00', totalWeeklyHours:0, transportRequired:true, busStop:'' });

export default function EditRequest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, user, configured, resubmitBooking } = useApp();
  const booking = data.bookings.find(x => x.id === id);
  const router = useRouter();
  const [approvers, setApprovers] = useState<User[]>(demoUsers.filter(x => x.role === 'approver'));
  const [approverId, setApproverId] = useState(booking?.approverId ?? '');
  const [usingDate, setUsingDate] = useState(booking?.usingDate ?? '');
  const [startTime, setStartTime] = useState(booking?.startTime ?? '');
  const [endTime, setEndTime] = useState(booking?.endTime ?? '');
  const [pickup, setPickup] = useState(booking?.pickupLocation ?? '');
  const [destination, setDestination] = useState(booking?.destination ?? '');
  const [purpose, setPurpose] = useState(booking?.purpose ?? '');
  const [meetingPoint, setMeetingPoint] = useState(booking?.meetingPoint ?? 'front_area');
  const [withStaff, setWithStaff] = useState(booking?.withStaff ?? false);
  const [passengers, setPassengers] = useState((booking?.passengerList ?? []).join('\n'));
  const [employees, setEmployees] = useState<OvertimeEmployee[]>(booking?.overtimeEmployees?.length ? booking.overtimeEmployees : [blankEmployee()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    if (!supabase) return;
    void supabase.from('profiles').select('id,employee_id,full_name,email,role,department:departments(name)').eq('role','approver').eq('is_active',true).order('full_name').then(({data:rows,error}) => {
      if (error) return setError(error.message);
      setApprovers((rows ?? []).map((row:any) => ({ id:row.id, employeeId:row.employee_id, fullName:row.full_name, email:row.email, department:Array.isArray(row.department)?row.department[0]?.name ?? '':row.department?.name ?? '', role:'approver' })));
    });
  }, [configured]);

  const approver = useMemo(() => approvers.find(x => x.id === approverId), [approvers, approverId]);
  const updateEmployee = <K extends keyof OvertimeEmployee>(index:number,key:K,value:OvertimeEmployee[K]) => setEmployees(current => current.map((item,i) => i===index ? {...item,[key]:value}:item));
  if (!booking) return <Empty title="Request not found" body="The request is unavailable." />;
  if (booking.requesterId !== user.id || booking.status !== 'changes_requested') return <Empty title="Editing is unavailable" body="Only your request returned for changes can be edited." />;

  const submit = async (event:React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!approver) return setError('Select an approver.');
    if (booking.requestType === 'overtime' && employees.some(x => !x.employeeId || !x.employeeName || !x.workDescription || (x.transportRequired && !x.busStop))) return setError('Complete every OT employee row.');
    setSaving(true);
    try {
      await resubmitBooking({ ...booking, status:'pending_approval', approverId:approver.id, approverName:approver.fullName, approverEmail:approver.email, usingDate, startTime:booking.requestType==='overtime'?employees[0].workStart:startTime, endTime:booking.requestType==='overtime'?employees[0].workEnd:endTime, pickupLocation:pickup, destination:booking.requestType==='overtime'?'Employee bus stops':destination, purpose, meetingPoint:meetingPoint as any, withStaff, passengerList:passengers.split('\n').map(x=>x.trim()).filter(Boolean), overtimeEmployees:booking.requestType==='overtime'?employees:[] });
      router.push(`/bookings/${id}`); router.refresh();
    } catch(cause) { setError(cause instanceof Error ? cause.message : 'Unable to resubmit request.'); }
    finally { setSaving(false); }
  };

  return <><PageHeader title={`Edit ${booking.bookingNo}`} description={`Manager comment: ${booking.rejectReason || 'Please revise this request.'}`} /><form onSubmit={submit} className="space-y-5"><Card className="p-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Using date"><Input required type="date" value={usingDate} onChange={e=>setUsingDate(e.target.value)} /></Field><Field label="Approver"><Select required value={approverId} onChange={e=>setApproverId(e.target.value)}><option value="">Select approver</option>{approvers.map(x=><option key={x.id} value={x.id}>{x.fullName} · {x.email}</option>)}</Select></Field>{booking.requestType!=='overtime'&&<><Field label="Start time"><Input required type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} /></Field><Field label="End time"><Input required type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} /></Field><Field label="Pickup"><Input required value={pickup} onChange={e=>setPickup(e.target.value)} /></Field><Field label="Destination"><Input required value={destination} onChange={e=>setDestination(e.target.value)} /></Field><Field label="Meeting point"><Select value={meetingPoint} onChange={e=>setMeetingPoint(e.target.value as any)}><option value="front_area">Front area</option><option value="loading_area">Loading area</option></Select></Field></>}</div><div className="mt-4"><Field label="Purpose"><Textarea required value={purpose} onChange={e=>setPurpose(e.target.value)} /></Field></div>{booking.requestType!=='overtime'&&<div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Passenger names"><Textarea value={passengers} onChange={e=>setPassengers(e.target.value)} /></Field><label className="flex items-center gap-2 self-start pt-8 text-sm"><input type="checkbox" checked={withStaff} onChange={e=>setWithStaff(e.target.checked)} /> Travel with GA staff</label></div>}</Card>
  {booking.requestType!=='overtime'&&destination.trim()&&<GoogleMapLinks origin={pickup} destination={destination}/>}
  {booking.requestType==='overtime'&&<Card className="p-5"><div className="mb-4 flex justify-between"><h2 className="font-bold">OT employees</h2><Button type="button" variant="secondary" onClick={()=>setEmployees(x=>[...x,blankEmployee()])}><Plus size={16}/> Add employee</Button></div><div className="space-y-4">{employees.map((employee,index)=><div key={index} className="rounded-lg border border-line bg-gray-50 p-4"><div className="mb-3 flex justify-between"><strong>Employee {index+1}</strong><Button type="button" variant="ghost" disabled={employees.length===1} onClick={()=>setEmployees(x=>x.filter((_,i)=>i!==index))}><Trash2 size={16}/></Button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Employee number"><Input required value={employee.employeeId} onChange={e=>updateEmployee(index,'employeeId',e.target.value)}/></Field><Field label="Employee name"><Input required value={employee.employeeName} onChange={e=>updateEmployee(index,'employeeName',e.target.value)}/></Field><Field label="Work description"><Input required value={employee.workDescription} onChange={e=>updateEmployee(index,'workDescription',e.target.value)}/></Field><Field label="Weekly hours"><Input required type="number" min="0" max="60" step="0.01" value={employee.totalWeeklyHours} onChange={e=>updateEmployee(index,'totalWeeklyHours',Number(e.target.value))}/></Field><Field label="OT start"><Input required type="time" value={employee.workStart} onChange={e=>updateEmployee(index,'workStart',e.target.value)}/></Field><Field label="OT end"><Input required type="time" value={employee.workEnd} onChange={e=>updateEmployee(index,'workEnd',e.target.value)}/></Field><Field label="Transportation"><Select value={employee.transportRequired?'yes':'no'} onChange={e=>updateEmployee(index,'transportRequired',e.target.value==='yes')}><option value="yes">Required</option><option value="no">Not required</option></Select></Field><Field label="Bus stop"><Input required={employee.transportRequired} disabled={!employee.transportRequired} value={employee.busStop} onChange={e=>updateEmployee(index,'busStop',e.target.value)}/></Field></div></div>)}</div></Card>}
  {error&&<p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={()=>router.back()}>Cancel</Button><Button disabled={saving}>{saving?'Submitting...':'Save and resubmit'}</Button></div></form></>;
}
