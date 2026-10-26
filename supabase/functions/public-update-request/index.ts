import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/http.ts';
import {
  bangkokMinutes, date, optionalText, randomToken, requiredText, sha256Hex, time, token,
} from '../_shared/request-access.ts';
import { approvalEmail } from '../_shared/email-template.ts';
import { companyEmail } from '../_shared/company-email.ts';
import { requesterPermissions } from '../_shared/requester-permissions.ts';

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

const appBaseUrl = () => {
  const configured = Deno.env.get('APP_BASE_URL')?.trim().replace(/\/+$/, '');
  return configured || 'https://carservice.tokin.co.th';
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
    const permissions = requesterPermissions(current.status);
    if (action === 'update' && !permissions.canEdit) {
      return json({ error: `This request can no longer be edited because its status is ${current.status}.` }, 409);
    }
    if (action === 'cancel' && !permissions.canCancel) {
      return json({ error: `This request can no longer be changed because its status is ${current.status}.` }, 409);
    }

    const nextRevision = current.revision_no + 1;
    if (action === 'cancel') {
      const { data: cancelled, error: cancelError } = await db.rpc('execute_requester_change', {
        p_token_hash: tokenHash,
        p_action: 'cancel',
        p_request: null,
        p_reason: null,
        p_manage_token_hash: null,
        p_manage_token_expires_at: null,
        p_approval_token_hash: null,
        p_approval_token_expires_at: null,
      });
      if (cancelError) throw new Error(cancelError.message);
      const result = cancelled as {
        requestId?: string;
        requestNo?: string;
        status?: string;
        revisionNo?: number;
      } | null;

      return json({
        ok: true,
        requestId: result?.requestId ?? current.id,
        requestNo: result?.requestNo ?? current.booking_no,
        status: result?.status ?? 'cancelled',
        revisionNo: result?.revisionNo ?? nextRevision,
      });
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
    let selectedApprover: { id: string; full_name: string; email: string } | undefined;
    let approverName = '';
    let approverEmail = '';
    if (payload.requestType === 'outside_company') {
      approverEmail = companyEmail(payload.approver?.email, 'Approver email');
      approverName = optionalText(payload.approver?.name, 200) || approverEmail;
      const { data: departmentApprovers } = await db.from('profiles')
        .select('id,full_name,email').eq('department_id', department.id)
        .eq('role', 'approver').eq('is_active', true);
      selectedApprover = departmentApprovers?.find(
        (item) => item.email?.trim().toLowerCase() === approverEmail.toLowerCase(),
      );
      if (selectedApprover?.full_name) {
        approverName = selectedApprover.full_name;
      }
      if (!selectedApprover) {
        throw new Error('Select an active approver assigned to your department.');
      }
    }
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
      work_description: optionalText(employee.workDescription, 500),
      work_start: time(employee.workStart, 'OT start'),
      work_end: time(employee.workEnd, 'OT end'),
      total_weekly_hours: Number(employee.totalWeeklyHours || 0),
      transport_required: Boolean(employee.transportRequired),
      bus_stop: employee.transportRequired ? requiredText(employee.busStop, 'Bus stop', 500) : null,
      seq,
    }));
    if (otRows.some(row => row.work_end <= row.work_start)) {
      throw new Error('Every OT end time must be after its start time.');
    }

    const passengerCount = payload.requestType === 'overtime'
      ? Math.max(1, otRows.filter(row => row.transport_required).length)
      : Math.max(1, passengers.length);
    if (passengerCount < 1 || passengerCount > 20) {
      throw new Error('Passenger count must be between 1 and 20.');
    }

    const newRawToken = randomToken();
    const newTokenHash = await sha256Hex(newRawToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
    let approvalExpiresAt = '';
    let approvalUrl = '';
    let approvalTokenHash: string | null = null;
    if (payload.requestType === 'outside_company') {
      const approvalRawToken = randomToken();
      approvalTokenHash = await sha256Hex(approvalRawToken);
      approvalExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString();
      approvalUrl = `${appBaseUrl()}/request/approve?token=${encodeURIComponent(approvalRawToken)}`;
    }

    const normalizedRequest = {
      requester_name: requesterName,
      requester_employee_id: typeof payload.requester?.employeeId === 'string'
        ? payload.requester.employeeId.trim().slice(0, 100) : null,
      requester_department: department.name,
      department_id: department.id,
      approver_id: payload.requestType === 'outside_company' ? selectedApprover?.id ?? null : null,
      approver_name: payload.requestType === 'outside_company' ? approverName : null,
      approver_email: payload.requestType === 'outside_company' ? approverEmail : null,
      request_type: payload.requestType,
      using_date: usingDate,
      start_time: startTime,
      end_time: endTime,
      pickup_location: pickupLocation,
      destination,
      purpose,
      num_passengers: passengerCount,
      meeting_point: meetingPoint,
      with_staff: Boolean(payload.withStaff),
      urgent: isLateOt,
      urgent_reason: isLateOt ? 'Submitted after the 15:30 OT approval batch cutoff.' : null,
      passengers,
      overtime_employees: otRows.map(({ booking_id: _bookingId, ...employee }) => employee),
    };
    const { data: commandData, error: commandError } = await db.rpc('execute_requester_change', {
      p_token_hash: tokenHash,
      p_action: 'update',
      p_request: normalizedRequest,
      p_reason: typeof body?.reason === 'string' ? body.reason.trim().slice(0, 1000) || null : null,
      p_manage_token_hash: newTokenHash,
      p_manage_token_expires_at: expiresAt,
      p_approval_token_hash: approvalTokenHash,
      p_approval_token_expires_at: approvalExpiresAt || null,
    });
    if (commandError) throw new Error(commandError.message);
    const command = commandData as {
      requestId?: string;
      requestNo?: string;
      status?: string;
      revisionNo?: number;
    } | null;
    if (!command?.requestId) throw new Error('The request update did not return a result.');

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
    const { error: deliveryStatusError } = await db.from('bookings')
      .update({ approval_email_status: approvalEmailStatus })
      .eq('id', current.id);
    if (deliveryStatusError) {
      console.error('Unable to record approval delivery status.', {
        requestId: current.id,
        message: deliveryStatusError.message,
      });
    }

    return json({
      ok: true,
      requestId: command.requestId,
      requestNo: command.requestNo ?? current.booking_no,
      status: command.status ?? (payload.requestType === 'overtime'
        ? 'pending_ot_verification'
        : 'pending_approval'),
      revisionNo: command.revisionNo ?? nextRevision,
      manageToken: newRawToken,
      manageTokenExpiresAt: expiresAt,
      approvalEmailStatus,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unable to update request.';
    const status = /expired/i.test(message)
      ? 410
      : /already been updated|no longer be changed|no longer be edited/i.test(message)
        ? 409
        : /request link is invalid/i.test(message)
          ? 401
          : /invalid|must|required|between|at most|only from|only be|select an active/i.test(message)
            ? 400
            : 500;
    return json({ error: message }, status);
  }
});
