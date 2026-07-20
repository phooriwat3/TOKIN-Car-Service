import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !token) return json({ error: 'Unauthorized.' }, 401);

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: authData } = await authClient.auth.getUser(token);
    if (!authData.user) return json({ error: 'Unauthorized.' }, 401);
    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: profile } = await db.from('profiles').select('role').eq('id', authData.user.id).single();
    if (profile?.role !== 'admin') return json({ error: 'Admin access required.' }, 403);

    const body = await request.json();
    const bookingId = typeof body.requestId === 'string' ? body.requestId : '';
    const { data: booking, error } = await db.from('bookings').select(`
      id,booking_no,requester_name,requester_email,using_date,start_time,end_time,pickup_location,destination,purpose,
      vehicle_assignments(
        vehicle_id,driver_id,notes,
        vehicle:vehicles(license_plate,brand,model),
        driver:drivers(full_name,phone)
      )
    `).eq('id', bookingId).single();
    if (error || !booking) return json({ error: 'Request not found.' }, 404);

    const assignment = Array.isArray(booking.vehicle_assignments) ? booking.vehicle_assignments[0] : booking.vehicle_assignments;
    const vehicle = Array.isArray(assignment?.vehicle) ? assignment.vehicle[0] : assignment?.vehicle;
    const driver = Array.isArray(assignment?.driver) ? assignment.driver[0] : assignment?.driver;
    if (!assignment || !vehicle || !driver) return json({ error: 'Assignment is incomplete.' }, 409);

    const flowUrl = Deno.env.get('POWER_AUTOMATE_ASSIGNMENT_EMAIL_FLOW_URL');
    if (!flowUrl) {
      await db.from('bookings').update({ requester_notification_status: 'not_configured' }).eq('id', booking.id);
      return json({ ok: true, notificationStatus: 'not_configured' });
    }

    const response = await fetch(flowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: booking.id,
        requestNo: booking.booking_no,
        requester: { name: booking.requester_name, email: booking.requester_email },
        usingDate: booking.using_date,
        startTime: String(booking.start_time).slice(0, 5),
        endTime: String(booking.end_time).slice(0, 5),
        pickupLocation: booking.pickup_location,
        destination: booking.destination,
        purpose: booking.purpose,
        vehicle: { licensePlate: vehicle.license_plate, brand: vehicle.brand, model: vehicle.model },
        driver: { name: driver.full_name, phone: driver.phone },
        notes: assignment.notes ?? '',
      }),
    });
    const notificationStatus = response.ok ? 'sent' : 'failed';
    await db.from('bookings').update({ requester_notification_status: notificationStatus }).eq('id', booking.id);
    return json({ ok: response.ok, notificationStatus }, response.ok ? 200 : 502);
  } catch (cause) {
    return json({ error: cause instanceof Error ? cause.message : 'Unable to notify requester.' }, 500);
  }
});
