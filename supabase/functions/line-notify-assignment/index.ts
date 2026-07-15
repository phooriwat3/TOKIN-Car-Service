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


  const { bookingId } = await request.json() as { bookingId?: string };
  if (!bookingId) return new Response('bookingId is required', { status: 400 });

  const { data: booking, error: bookingError } = await admin.from('bookings')
    .select('id,booking_no,status,using_date,start_time,end_time,pickup_location,destination')
    .eq('id', bookingId).single();
  if (bookingError || !booking || booking.status !== 'assigned') return new Response('Assigned booking not found', { status: 404 });

  const { data: assignment, error: assignmentError } = await admin.from('vehicle_assignments')
    .select('driver_id,assigned_by,assigned_at,vehicle:vehicles(license_plate,brand,model)')
    .eq('booking_id', bookingId).single();
  if (assignmentError || !assignment) return new Response('Assignment not found', { status: 404 });
  if (assignment.assigned_by !== authData.user.id) {
    return new Response('Only the assigning admin can send this notification', { status: 403 });
  }

  const { data: driver } = await admin.from('drivers').select('user_id,full_name').eq('id', assignment.driver_id).single();
  if (!driver?.user_id) return Response.json({ sent: false, reason: 'driver_has_no_login' }, { headers: corsHeaders });

  const idempotencyKey = `${bookingId}:assigned:${assignment.assigned_at}`;
  const { data: existing } = await admin.from('line_notifications').select('status').eq('idempotency_key', idempotencyKey).maybeSingle();
  if (existing?.status === 'sent') return Response.json({ sent: true, duplicate: true }, { headers: corsHeaders });

  const { data: lineAccount } = await admin.from('line_accounts')
    .select('line_user_id').eq('profile_id', driver.user_id).eq('is_active', true).maybeSingle();
  if (!lineAccount) {
    await admin.from('line_notifications').upsert({
      booking_id: bookingId,
      profile_id: driver.user_id,
      event_type: 'assignment',
      idempotency_key: idempotencyKey,
      status: 'skipped',
      error_message: 'Driver has not linked LINE.',
    }, { onConflict: 'idempotency_key' });
    return Response.json({ sent: false, reason: 'line_not_linked' }, { headers: corsHeaders });
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
    await admin.from('line_notifications').upsert({
      booking_id: bookingId,
      profile_id: driver.user_id,
      event_type: 'assignment',
      idempotency_key: idempotencyKey,
      status: 'sent',
      line_message_id: response.headers.get('x-line-request-id'),
      error_message: null,
      sent_at: new Date().toISOString(),
    }, { onConflict: 'idempotency_key' });
    return new Response(JSON.stringify({ sent: true }), { headers: { ...jsonHeaders, ...corsHeaders } });
  } catch (error) {
    await admin.from('line_notifications').upsert({
      booking_id: bookingId,
      profile_id: driver.user_id,
      event_type: 'assignment',
      idempotency_key: idempotencyKey,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown LINE error',
    }, { onConflict: 'idempotency_key' });
    return new Response('Unable to send LINE notification', { status: 502, headers: corsHeaders });
  }
});
