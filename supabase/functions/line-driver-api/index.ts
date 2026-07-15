import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const jsonHeaders = { 'Content-Type': 'application/json', ...corsHeaders };

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

async function authenticateLineDriver(request: Request, admin: ReturnType<typeof createClient>) {
  const accessToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!accessToken) throw new Error('LINE access token is required.');

  const verificationResponse = await fetch(
    `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!verificationResponse.ok) throw new Error('LINE access token is invalid or expired.');
  const verification = await verificationResponse.json() as {
    client_id?: string;
    expires_in?: number;
  };
  if (verification.client_id !== required('LINE_LOGIN_CHANNEL_ID') || Number(verification.expires_in) <= 0) {
    throw new Error('LINE access token belongs to another channel.');
  }

  const profileResponse = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileResponse.ok) throw new Error('Unable to load LINE profile.');
  const lineProfile = await profileResponse.json() as { userId?: string; displayName?: string };
  if (!lineProfile.userId) throw new Error('LINE profile has no user ID.');

  const { data: account, error: accountError } = await admin.from('driver_line_accounts')
    .select('driver_id,driver:drivers!inner(id,full_name,employee_id,is_active)')
    .eq('line_user_id', lineProfile.userId)
    .eq('is_active', true)
    .maybeSingle();
  if (accountError) throw accountError;

  const driverValue = account?.driver;
  const driver = Array.isArray(driverValue) ? driverValue[0] : driverValue;
  if (!account || !driver?.is_active) throw new Error('This LINE account is not linked to an active driver.');

  return {
    driverId: account.driver_id as string,
    fullName: driver.full_name as string,
    employeeId: driver.employee_id as string | null,
    lineDisplayName: lineProfile.displayName ?? null,
  };
}

async function loadTrips(admin: ReturnType<typeof createClient>, driverId: string) {
  const { data, error } = await admin.from('vehicle_assignments').select(`
    booking_id,
    assigned_at,
    notes,
    driver_accepted,
    driver_accepted_at,
    vehicle:vehicles(license_plate,brand,model),
    booking:bookings!inner(
      id,booking_no,status,using_date,start_time,end_time,
      pickup_location,destination,purpose,num_passengers,
      trip_logs(actual_time_out,actual_time_in,start_mileage,end_mileage,remarks),
      expenses(fuel_cost,toll_fee,parking_fee)
    )
  `).eq('driver_id', driverId).order('assigned_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const booking = Array.isArray(row.booking) ? row.booking[0] : row.booking;
    const vehicle = Array.isArray(row.vehicle) ? row.vehicle[0] : row.vehicle;
    const trip = Array.isArray(booking?.trip_logs) ? booking.trip_logs[0] : booking?.trip_logs;
    const expense = Array.isArray(booking?.expenses) ? booking.expenses[0] : booking?.expenses;
    return {
      id: booking.id,
      bookingNo: booking.booking_no,
      status: booking.status,
      usingDate: booking.using_date,
      startTime: String(booking.start_time).slice(0, 5),
      endTime: String(booking.end_time).slice(0, 5),
      pickupLocation: booking.pickup_location,
      destination: booking.destination,
      purpose: booking.purpose,
      numPassengers: booking.num_passengers,
      accepted: Boolean(row.driver_accepted),
      assignedAt: row.assigned_at,
      notes: row.notes,
      vehicle: vehicle ? `${vehicle.license_plate} · ${vehicle.brand} ${vehicle.model}` : '-',
      tripLog: trip ? {
        actualTimeOut: trip.actual_time_out,
        actualTimeIn: trip.actual_time_in,
        startMileage: trip.start_mileage == null ? null : Number(trip.start_mileage),
        endMileage: trip.end_mileage == null ? null : Number(trip.end_mileage),
        remarks: trip.remarks,
      } : null,
      expenses: expense ? {
        fuelCost: Number(expense.fuel_cost),
        tollFee: Number(expense.toll_fee),
        parkingFee: Number(expense.parking_fee),
      } : null,
    };
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const admin = createClient(
      required('SUPABASE_URL'),
      required('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } },
    );
    const driver = await authenticateLineDriver(request, admin);
    const body = await request.json().catch(() => ({})) as {
      action?: 'list' | 'accept' | 'start' | 'complete';
      bookingId?: string;
      startMileage?: number;
      endMileage?: number;
      fuelCost?: number;
      tollFee?: number;
      parkingFee?: number;
      remarks?: string;
    };
    const action = body.action ?? 'list';

    if (action !== 'list') {
      if (!body.bookingId) return json({ error: 'bookingId is required.' }, 400);
      let result: { error: { message: string } | null };
      if (action === 'accept') {
        result = await admin.rpc('line_accept_assignment', {
          p_booking_id: body.bookingId,
          p_driver_id: driver.driverId,
        });
      } else if (action === 'start') {
        result = await admin.rpc('line_start_trip', {
          p_booking_id: body.bookingId,
          p_driver_id: driver.driverId,
          p_actual_time_out: new Date().toISOString(),
          p_start_mileage: body.startMileage,
        });
      } else if (action === 'complete') {
        result = await admin.rpc('line_complete_trip', {
          p_booking_id: body.bookingId,
          p_driver_id: driver.driverId,
          p_actual_time_in: new Date().toISOString(),
          p_end_mileage: body.endMileage,
          p_fuel_cost: body.fuelCost ?? 0,
          p_toll_fee: body.tollFee ?? 0,
          p_parking_fee: body.parkingFee ?? 0,
          p_remarks: body.remarks ?? null,
        });
      } else {
        return json({ error: 'Unsupported action.' }, 400);
      }
      if (result.error) return json({ error: result.error.message }, 400);
    }

    return json({ driver, trips: await loadTrips(admin, driver.driverId) });
  } catch (error) {
    console.error('LINE driver API error', error);
    return json({ error: error instanceof Error ? error.message : 'Unable to process request.' }, 401);
  }
});
