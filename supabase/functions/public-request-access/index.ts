import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/http.ts';
import { sha256Hex, token } from '../_shared/request-access.ts';

type Sequenced = { seq: number };
type PassengerRow = Sequenced & { name: string };
type OvertimeRow = Sequenced & {
  employee_id: string;
  employee_name: string;
  work_description: string;
  work_start: string;
  work_end: string;
  total_weekly_hours: number | string;
  transport_required: boolean;
  bus_stop: string | null;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Service configuration is missing.' }, 500);

    const body = await request.json();
    const tokenHash = await sha256Hex(token(body?.token));
    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: access, error: accessError } = await db.from('request_access_tokens')
      .select('id,booking_id,revision_no,expires_at,used_at,revoked_at')
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

    const { data: booking, error: bookingError } = await db.from('bookings').select(`
      id, booking_no, status, revision_no, request_type,
      requester_name, requester_email, requester_employee_id, requester_department,
      approver_name, approver_email, using_date, start_time, end_time,
      pickup_location, destination, purpose, meeting_point, with_staff,
      created_at, updated_at, reject_reason,
      booking_passengers(name,seq),
      overtime_employees(employee_id,employee_name,work_description,work_start,work_end,total_weekly_hours,transport_required,bus_stop,seq)
    `).eq('id', access.booking_id).maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking || booking.revision_no !== access.revision_no) {
      return json({ error: 'A newer version of this request is available. Please use the latest link.' }, 409);
    }

    await db.from('request_access_tokens')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', access.id);

    const editable = ['pending_approval', 'changes_requested'].includes(booking.status);
    return json({
      request: {
        id: booking.id,
        requestNo: booking.booking_no,
        status: booking.status,
        revisionNo: booking.revision_no,
        requestType: booking.request_type,
        requester: {
          name: booking.requester_name,
          email: booking.requester_email,
          employeeId: booking.requester_employee_id ?? '',
          department: booking.requester_department,
        },
        approver: { name: booking.approver_name ?? '', email: booking.approver_email ?? '' },
        usingDate: booking.using_date,
        startTime: String(booking.start_time).slice(0, 5),
        endTime: String(booking.end_time).slice(0, 5),
        pickupLocation: booking.pickup_location,
        destination: booking.destination,
        purpose: booking.purpose,
        meetingPoint: booking.meeting_point,
        withStaff: booking.with_staff,
        passengers: ((booking.booking_passengers ?? []) as PassengerRow[])
          .sort((a, b) => a.seq - b.seq).map(item => item.name),
        overtimeEmployees: ((booking.overtime_employees ?? []) as OvertimeRow[])
          .sort((a, b) => a.seq - b.seq).map(item => ({
            employeeId: item.employee_id,
            employeeName: item.employee_name,
            workDescription: item.work_description,
            workStart: String(item.work_start).slice(0, 5),
            workEnd: String(item.work_end).slice(0, 5),
            totalWeeklyHours: Number(item.total_weekly_hours),
            transportRequired: item.transport_required,
            busStop: item.bus_stop ?? '',
          })),
        rejectReason: booking.reject_reason ?? '',
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
      },
      permissions: { canEdit: editable, canCancel: editable },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unable to load request.';
    return json({ error: message }, message.includes('link is invalid') ? 400 : 500);
  }
});
