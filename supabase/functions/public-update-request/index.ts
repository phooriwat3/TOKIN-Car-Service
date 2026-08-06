import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/http.ts';
import {
  bangkokMinutes, date, email, randomToken, requiredText, sha256Hex, time, token,
} from '../_shared/request-access.ts';
import { approvalEmail } from '../_shared/email-template.ts';

type OvertimeEmployee = {
  employeeId: string;
  employeeName: string;
  workDescription: string;
  workStart: string;
  workEnd: string;
  totalWeeklyHours: number;
  transportRequired: boolean;
  busStop?: string;
};

const editableStatuses = ['pending_approval', 'pending_ot_verification', 'changes_requested', 'approved'];
const appBaseUrl = () => {
  const configured = Deno.env.get('APP_BASE_URL')?.trim().replace(/\/+$/, '');
  return configured || 'https://tokin-car-service.vercel.app';
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Service configuration is missing.' }, 500);

    const body = await request.json();
    const rawToken = token(body?.token);
    const tokenHash = await sha256Hex(rawToken);
    const action = body?.action === 'cancel' ? 'cancel' : body?.action === 'update' ? 'update' : '';
    if (!action) return json({ error: 'Action must be update or cancel.' }, 400);

    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: access, error: accessError } = await db.from('request_access_tokens')
      .select('id,booking_id,revision_no,subject_email,expires_at,used_at,revoked_at')
      .eq('token_hash', tokenHash)
      .eq('token_type', 'requester_manage')
      .maybeSingle();

    if (accessError) throw accessError;
    if (!access || access.used_at || access.revoked_at) {
      return json({ error: 'The request link is invalid or no longer active.' }, 401);
    }
    if (new Date(access.expires_at).getTime() <= Date.now()) {
      return json({ error: 'The request link has expired.' }, 410);
    }

    const { data: current, error: currentError } = await db.from('bookings')
      .select('id,booking_no,status,revision_no,requester_email,request_type')
      .eq('id', access.booking_id).maybeSingle();
    if (currentError) throw currentError;
    if (!current || current.revision_no !== access.revision_no) {
      return json({ error: 'This request has already been updated. Reload it using the latest link.' }, 409);
    }
    if (!editableStatuses.includes(current.status)) {
      return json({ error: `This request can no longer be changed because its status is ${current.status}.` }, 409);
    }

    const nextRevision = current.revision_no + 1;
    if (action === 'cancel') {
      const { data: cancelled, error: cancelError } = await db.from('bookings').update({
        status: 'cancelled',
        revision_no: nextRevision,
        updated_at: new Date().toISOString(),
      }).eq('id', current.id)
        .eq('revision_no', current.revision_no)
        .in('status', editableStatuses)
        .select('id,booking_no,status,revision_no')
        .maybeSingle();

      if (cancelError) throw cancelError;
      if (!cancelled) return json({ error: 'The request changed while it was being cancelled. Please reload.' }, 409);

      const { error: historyError } = await db.from('booking_revision_history').insert({
        booking_id: current.id,
        revision_no: nextRevision,
        status: 'cancelled',
        snapshot: cancelled,
        change_source: 'requester_edit',
        changed_by_email: current.requester_email,
        change_reason: 'Requester cancelled request.',
      });
      if (historyError) throw historyError;

      return json({ ok: true, requestId: current.id, requestNo: current.booking_no, status: 'cancelled' });
    }

    const payload = body?.request ?? {};
    if (!['outside_company', 'overtime'].includes(payload.requestType)) {
      throw new Error('Request type is invalid.');
    }
    const submittedAtBangkokMinutes = bangkokMinutes();
    const isLateOt = payload.requestType === 'overtime' && submittedAtBangkokMinutes >= 15 * 60 + 30;
    if (payload.requestType === 'overtime' &&
        (submittedAtBangkokMinutes < 8 * 60 || submittedAtBangkokMinutes >= 16 * 60)) {
      throw new Error('OT requests can be edited only from 08:00 to 16:00 (Thailand time).');
    }

    const requesterName = requiredText(payload.requester?.name, 'Requester name', 200);
    const requesterDepartment = requiredText(payload.requester?.department, 'Requester department', 200);
    const departmentCode = requesterDepartment.trim().toUpperCase().replace(/\s+/g, ' ');
    const { data: department, error: departmentError } = await db.from('departments')
      .select('id,name,code').eq('code', departmentCode).eq('is_active', true).single();
    if (departmentError || !department) {
      throw new Error('Selected department is unavailable. Please contact Admin.');
    }
    if (action === 'update' && current.status === 'approved') {
      return json({ error: 'Cancel this Tiger Space transport request and submit a new one to change its details.' }, 409);
    }
    const { data: departmentApprovers, error: approversError } = await db.from('profiles')
      .select('id,full_name,email').eq('department_id', department.id)
      .eq('role', 'approver').eq('is_active', true).order('full_name');
    if (approversError) throw approversError;
    const selectedApprover = departmentApprovers?.[0];
    if (!selectedApprover && payload.requestType === 'outside_company') {
      throw new Error(`No active approver is configured for ${department.code}. Please contact Admin.`);
    }
    const approverName = selectedApprover?.full_name ?? '';
    const approverEmail = selectedApprover
      ? email(selectedApprover.email, 'Approver email')
      : '';
    const usingDate = date(payload.usingDate);
    const startTime = time(payload.startTime, 'Start time');
    const endTime = time(payload.endTime, 'End time');
    if (endTime <= startTime) throw new Error('End time must be after start time.');

    const pickupLocation = requiredText(payload.pickupLocation, 'Pickup location', 500);
    const destination = requiredText(payload.destination, 'Destination', 500);
    const purpose = requiredText(payload.purpose, 'Purpose', 2000);
    const meetingPoint = payload.meetingPoint === 'loading_area' ? 'loading_area' : 'front_area';
    const passengers = (Array.isArray(payload.passengers) ? payload.passengers : [])
      .map((item: unknown) => requiredText(item, 'Passenger name', 200)).slice(0, 20);
    const overtimeEmployees = (payload.requestType === 'overtime' && Array.isArray(payload.overtimeEmployees)
      ? payload.overtimeEmployees : []) as OvertimeEmployee[];

    if (payload.requestType === 'overtime' && !overtimeEmployees.length) {
      throw new Error('At least one OT employee is required.');
    }
    if (overtimeEmployees.length > 20) throw new Error('A request can contain at most 20 employees.');

    const otRows = overtimeEmployees.map((employee, seq) => ({
      booking_id: current.id,
      employee_id: requiredText(employee.employeeId, 'Employee number', 100),
      employee_name: requiredText(employee.employeeName, 'Employee name', 200),
      work_description: requiredText(employee.workDescription, 'Work description', 500),
      work_start: time(employee.workStart, 'OT start'),
      work_end: time(employee.workEnd, 'OT end'),
      total_weekly_hours: Number(employee.totalWeeklyHours),
      transport_required: Boolean(employee.transportRequired),
      bus_stop: employee.transportRequired ? requiredText(employee.busStop, 'Bus stop', 500) : null,
      seq,
    }));
    if (otRows.some(row => row.work_end <= row.work_start)) {
      throw new Error('Every OT end time must be after its start time.');
    }
    if (otRows.some(row => !Number.isFinite(row.total_weekly_hours) || row.total_weekly_hours < 0 || row.total_weekly_hours > 60)) {
      throw new Error('Weekly hours must be between 0 and 60.');
    }

    const passengerCount = payload.requestType === 'overtime'
      ? otRows.filter(row => row.transport_required).length
      : Math.max(1, passengers.length);
    if (passengerCount < 1 || passengerCount > 20) {
      throw new Error('Passenger count must be between 1 and 20.');
    }

    const { data: updated, error: updateError } = await db.from('bookings').update({
      requester_name: requesterName,
      requester_employee_id: typeof payload.requester?.employeeId === 'string'
        ? payload.requester.employeeId.trim().slice(0, 100) : null,
      requester_department: department.name,
      department_id: department.id,
      approver_id: payload.requestType === 'outside_company' ? selectedApprover?.id ?? null : null,
      approver_name: payload.requestType === 'outside_company' ? approverName : null,
      approver_email: payload.requestType === 'outside_company' ? approverEmail : null,
      request_type: payload.requestType,
      category: payload.requestType === 'overtime' ? 'overtime_transport' : 'business_trip',
      using_date: usingDate,
      start_time: startTime,
      end_time: endTime,
      pickup_location: pickupLocation,
      destination,
      purpose,
      num_passengers: passengerCount,
      meeting_point: meetingPoint,
      with_staff: Boolean(payload.withStaff),
      after_hours: payload.requestType === 'overtime',
      overtime_transport: payload.requestType === 'overtime',
      status: payload.requestType === 'overtime'
        ? 'pending_ot_verification'
        : 'pending_approval',
      ot_verification_status: payload.requestType === 'overtime'
        ? 'pending'
        : 'not_required',
      ot_verified_at: null,
      ot_verified_by: null,
      ot_verification_note: null,
      reject_reason: null,
      approval_email_status: payload.requestType === 'overtime' ? 'not_configured' : 'pending',
      urgent: isLateOt,
      urgent_reason: isLateOt ? 'Submitted after the 15:30 OT approval batch cutoff.' : null,
      revision_no: nextRevision,
      last_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', current.id)
      .eq('revision_no', current.revision_no)
      .in('status', editableStatuses)
      .select('id,booking_no,status,revision_no')
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updated) return json({ error: 'The request changed while it was being saved. Please reload.' }, 409);

    const { error: passengerDeleteError } = await db.from('booking_passengers').delete().eq('booking_id', current.id);
    if (passengerDeleteError) throw passengerDeleteError;
    const { error: otDeleteError } = await db.from('overtime_employees').delete().eq('booking_id', current.id);
    if (otDeleteError) throw otDeleteError;

    if (payload.requestType === 'outside_company' && passengers.length) {
      const { error } = await db.from('booking_passengers').insert(
        passengers.map((name: string, seq: number) => ({ booking_id: current.id, name, seq })),
      );
      if (error) throw error;
    }
    if (payload.requestType === 'overtime') {
      const { error } = await db.from('overtime_employees').insert(otRows);
      if (error) throw error;
    }

    const newRawToken = randomToken();
    const newTokenHash = await sha256Hex(newRawToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
    const { error: tokenError } = await db.from('request_access_tokens').insert({
      booking_id: current.id,
      token_type: 'requester_manage',
      token_hash: newTokenHash,
      revision_no: nextRevision,
      subject_email: access.subject_email,
      expires_at: expiresAt,
    });
    if (tokenError) throw tokenError;

    let approvalExpiresAt = '';
    let approvalUrl = '';
    if (payload.requestType === 'outside_company') {
      const approvalRawToken = randomToken();
      const approvalTokenHash = await sha256Hex(approvalRawToken);
      approvalExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString();
      approvalUrl = `${appBaseUrl()}/request/approve?token=${encodeURIComponent(approvalRawToken)}`;
      const { error: approvalTokenError } = await db.from('request_access_tokens').insert({
        booking_id: current.id,
        token_type: 'approval',
        token_hash: approvalTokenHash,
        revision_no: nextRevision,
        subject_email: approverEmail,
        expires_at: approvalExpiresAt,
      });
      if (approvalTokenError) throw approvalTokenError;
    }

    const { data: snapshotBooking, error: snapshotError } = await db.from('bookings').select(`
      *, booking_passengers(name,seq),
      overtime_employees(employee_id,employee_name,work_description,work_start,work_end,total_weekly_hours,transport_required,bus_stop,seq)
    `).eq('id', current.id).single();
    if (snapshotError) throw snapshotError;

    const { error: historyError } = await db.from('booking_revision_history').insert({
      booking_id: current.id,
      revision_no: nextRevision,
      status: payload.requestType === 'overtime'
        ? 'pending_ot_verification'
        : 'pending_approval',
      snapshot: snapshotBooking,
      change_source: 'requester_edit',
      changed_by_email: current.requester_email,
      change_reason: typeof body?.reason === 'string' ? body.reason.trim().slice(0, 1000) || null : null,
    });
    if (historyError) throw historyError;

    const manageUrl = `${appBaseUrl()}/request/manage?token=${encodeURIComponent(newRawToken)}`;
    const approvalFlowUrl = Deno.env.get('POWER_AUTOMATE_APPROVAL_FLOW_URL');
    let approvalEmailStatus: 'queued' | 'sent' | 'failed' | 'not_configured' =
      'not_configured';
    if (approvalFlowUrl && payload.requestType === 'outside_company') {
      const approverEmailTemplate = approvalEmail({
        requestNo: current.booking_no, requestType: payload.requestType, requesterName, requesterDepartment,
        approverName, usingDate, startTime, endTime, pickupLocation, destination, purpose, meetingPoint,
        withStaff: Boolean(payload.withStaff), passengers, overtimeEmployees, approvalUrl, expiresAt: approvalExpiresAt,
      });
      try {
        const response = await fetch(approvalFlowUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: current.id,
            requestNo: current.booking_no,
            revisionNo: nextRevision,
            requestType: payload.requestType,
            requester: { name: requesterName, email: current.requester_email, department: requesterDepartment },
            approver: { name: approverName, email: approverEmail },
            usingDate,
            startTime,
            endTime,
            pickupLocation,
            destination,
            purpose,
            manageUrl,
            approvalUrl,
            approvalExpiresAt,
            passengers,
            overtimeEmployees,
            ...approverEmailTemplate,
          }),
        });
        approvalEmailStatus = response.ok ? 'sent' : 'failed';
      } catch {
        approvalEmailStatus = 'failed';
      }
    }
    await db.from('bookings').update({ approval_email_status: approvalEmailStatus }).eq('id', current.id);

    return json({
      ok: true,
      requestId: current.id,
      requestNo: current.booking_no,
      status: payload.requestType === 'overtime'
        ? 'pending_ot_verification'
        : 'pending_approval',
      revisionNo: nextRevision,
      manageToken: newRawToken,
      manageTokenExpiresAt: expiresAt,
      approvalEmailStatus,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unable to update request.';
    const clientError = /invalid|must|required|between|at most|only from|only be/i.test(message);
    return json({ error: message }, clientError ? 400 : 500);
  }
});
