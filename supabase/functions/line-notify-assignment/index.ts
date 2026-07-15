import { createClient } from 'npm:@supabase/supabase-js@2';
const jsonHeaders = { 'Content-Type': 'application/json' };

async function lineRequest(path: string, token: string, body: unknown) {
  const response = await fetch(`https://api.line.me${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`LINE API ${response.status}: ${await response.text()}`);
  }
  return response;
}

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const admin = createClient(
    required('SUPABASE_URL'),
    required('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  );
  const jwt = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const { data: authData, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !authData.user) return new Response('Unauthorized', { status: 401 });

  const authorization = request.headers.get('Authorization') ?? '';
  const callerClient = createClient(
    required('SUPABASE_URL'),
    required('SUPABASE_ANON_KEY'),
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    },
  );
  const { data: callerRole, error: callerRoleError } = await callerClient.rpc('app_role');
  if (callerRoleError) {
    console.error('Unable to verify caller role', callerRoleError);
    return new Response('Unable to verify caller role', { status: 500 });
  }
  if (callerRole !== 'admin') return new Response('Admin role required', { status: 403 });

  const { bookingId } = await request.json() as { bookingId?: string };
  if (!bookingId) return new Response('bookingId is required', { status: 400 });

  const { data: booking, error: bookingError } = await admin.from('bookings')
    .select('id,booking_no,status,using_date,start_time,end_time,pickup_location,destination')
    .eq('id', bookingId).maybeSingle();
  if (bookingError) {
    console.error('Unable to load booking', { bookingId, error: bookingError });
    return Response.json({ sent: false, reason: 'booking_query_failed' }, { status: 500, headers: corsHeaders });
  }
  if (!booking) {
    console.warn('Booking does not exist', { bookingId });
    return Response.json({ sent: false, reason: 'booking_missing', bookingId }, { status: 404, headers: corsHeaders });
  }
  if (booking.status !== 'assigned') {
    console.warn('Booking is not assigned', { bookingId, status: booking.status });
    return Response.json({
      sent: false,
      reason: 'booking_not_assigned',
      bookingId,
      status: booking.status,
    }, { status: 409, headers: corsHeaders });
  }

  const { data: assignment, error: assignmentError } = await admin.from('vehicle_assignments')
    .select('driver_id,assigned_at,vehicle:vehicles(license_plate,brand,model)')
    .eq('booking_id', bookingId).maybeSingle();
  if (assignmentError) {
    console.error('Unable to load assignment', { bookingId, error: assignmentError });
    return Response.json({ sent: false, reason: 'assignment_query_failed' }, { status: 500, headers: corsHeaders });
  }
  if (!assignment) {
    console.warn('Assignment does not exist', { bookingId });
    return Response.json({ sent: false, reason: 'assignment_missing', bookingId }, { status: 404, headers: corsHeaders });
  }

  const { data: driver, error: driverError } = await admin.from('drivers')
    .select('user_id,full_name').eq('id', assignment.driver_id).single();
  if (driverError) {
    console.error('Unable to load assigned driver', driverError);
    return new Response('Unable to load assigned driver', { status: 500 });
  }
  if (!driver?.user_id) {
    console.warn('Assigned driver has no linked login', { driverId: assignment.driver_id });
    return Response.json({ sent: false, reason: 'driver_has_no_login' }, { status: 422, headers: corsHeaders });
  }

  const idempotencyKey = `${bookingId}:assigned:${assignment.assigned_at}`;
  const { data: existing, error: existingError } = await admin.from('line_notifications')
    .select('status').eq('idempotency_key', idempotencyKey).maybeSingle();
  if (existingError) {
    console.error('Unable to check notification history', existingError);
    return new Response('Unable to check notification history', { status: 500 });
  }
  if (existing?.status === 'sent') return Response.json({ sent: true, duplicate: true }, { headers: corsHeaders });

  const { data: lineAccount, error: lineAccountError } = await admin.from('line_accounts')
    .select('line_user_id').eq('profile_id', driver.user_id).eq('is_active', true).maybeSingle();
  if (lineAccountError) {
    console.error('Unable to load LINE account', lineAccountError);
    return new Response('Unable to load LINE account', { status: 500 });
  }
  if (!lineAccount) {
    const { error: skippedError } = await admin.from('line_notifications').upsert({
      booking_id: bookingId,
      profile_id: driver.user_id,
      event_type: 'assignment',
      idempotency_key: idempotencyKey,
      status: 'skipped',
      error_message: 'Driver has not linked LINE.',
    }, { onConflict: 'idempotency_key' });
    if (skippedError) console.error('Unable to record skipped notification', skippedError);
    return Response.json({ sent: false, reason: 'line_not_linked' }, { headers: corsHeaders });
  }

  const { error: pendingError } = await admin.from('line_notifications').upsert({
    booking_id: bookingId,
    profile_id: driver.user_id,
    event_type: 'assignment',
    idempotency_key: idempotencyKey,
    status: 'pending',
    error_message: null,
  }, { onConflict: 'idempotency_key' });
  if (pendingError) {
    console.error('Unable to record pending notification', pendingError);
    return new Response('Unable to record pending notification', { status: 500 });
  }

  const vehicleValue = Array.isArray(assignment.vehicle) ? assignment.vehicle[0] : assignment.vehicle;
  const vehicle = vehicleValue
    ? `${vehicleValue.license_plate} · ${vehicleValue.brand} ${vehicleValue.model}`
    : '-';
  const baseUrl = required('APP_BASE_URL').replace(/\/$/, '');
  const detailsUrl = `${baseUrl}/driver/trips/${bookingId}`;
  const message = {
    type: 'flex',
    altText: `งานเดินทางใหม่ ${booking.booking_no}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: 'งานเดินทางใหม่', weight: 'bold', color: '#17345F', size: 'xl' },
          { type: 'text', text: booking.booking_no, size: 'sm', color: '#777777', margin: 'sm' },
          { type: 'separator', margin: 'lg' },
          { type: 'text', text: `${booking.using_date}  ${String(booking.start_time).slice(0, 5)}–${String(booking.end_time).slice(0, 5)}`, margin: 'lg', wrap: true },
          { type: 'text', text: `${booking.pickup_location} → ${booking.destination}`, margin: 'md', wrap: true },
          { type: 'text', text: vehicle, margin: 'md', wrap: true, color: '#555555' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [{ type: 'button', style: 'primary', color: '#194786', action: { type: 'uri', label: 'เปิดดูและรับงาน', uri: detailsUrl } }],
      },
    },
  };

  try {
    const response = await lineRequest('/v2/bot/message/push', required('LINE_CHANNEL_ACCESS_TOKEN'), {
      to: lineAccount.line_user_id,
      messages: [message],
    });
    const { error: sentError } = await admin.from('line_notifications').update({
      status: 'sent',
      line_message_id: response.headers.get('x-line-request-id'),
      error_message: null,
      sent_at: new Date().toISOString(),
    }).eq('idempotency_key', idempotencyKey);
    if (sentError) {
      console.error('LINE accepted the message but history update failed', sentError);
      return new Response(JSON.stringify({ sent: true, historyRecorded: false }), {
        headers: { ...jsonHeaders, ...corsHeaders },
      });
    }
    return new Response(JSON.stringify({ sent: true }), { headers: { ...jsonHeaders, ...corsHeaders } });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Unknown LINE error';
    console.error('Unable to send LINE notification', messageText);
    const { error: failedError } = await admin.from('line_notifications').update({
      status: 'failed',
      error_message: messageText,
    }).eq('idempotency_key', idempotencyKey);
    if (failedError) console.error('Unable to record failed notification', failedError);
    return new Response('Unable to send LINE notification', { status: 502, headers: corsHeaders });
  }
});
