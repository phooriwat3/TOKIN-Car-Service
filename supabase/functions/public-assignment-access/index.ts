import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/http.ts';
import { sha256Hex, token } from '../_shared/request-access.ts';

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
      .eq('token_type', 'assignment_document')
      .maybeSingle();

    if (accessError) throw accessError;
    if (!access) return json({ error: 'This assignment link is invalid.' }, 401);
    if (access.revoked_at) return json({ error: 'This assignment link is no longer active.' }, 409);
    if (new Date(access.expires_at).getTime() <= Date.now()) return json({ error: 'This assignment link has expired.' }, 410);

    const { data: booking, error: bookingError } = await db.from('bookings').select(`
      id,booking_no,status,revision_no,request_type,
      requester_name,requester_email,requester_employee_id,requester_department,
      using_date,start_time,end_time,pickup_location,destination,purpose,
      meeting_point,with_staff,num_passengers,created_at,updated_at,
      booking_passengers(name,seq),
      overtime_employees(employee_id,employee_name,bus_stop,transport_required,seq),
      vehicle_assignments(
        assigned_at,notes,manual_transport_units,
        vehicle:vehicles(license_plate,brand,model,color,capacity),
        driver:drivers(full_name,phone)
      )
    `).eq('id', access.booking_id).maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking || booking.revision_no !== access.revision_no) {
      return json({ error: 'This assignment document is no longer current.' }, 409);
    }
    if (!['assigned', 'scheduled', 'in_progress', 'completed'].includes(booking.status)) {
      return json({ error: 'Assignment details are not available for this request.' }, 409);
    }

    const assignment = Array.isArray(booking.vehicle_assignments)
      ? booking.vehicle_assignments[0]
      : booking.vehicle_assignments;
    const vehicle = Array.isArray(assignment?.vehicle) ? assignment.vehicle[0] : assignment?.vehicle;
    const driver = Array.isArray(assignment?.driver) ? assignment.driver[0] : assignment?.driver;
    const transportUnits = Array.isArray(assignment?.manual_transport_units) ? assignment.manual_transport_units : [];
    const primaryManualUnit = transportUnits[0];
    if (!assignment || (!primaryManualUnit && (!vehicle || !driver))) return json({ error: 'Assignment details are incomplete.' }, 409);
    const publicVehicle = primaryManualUnit
      ? { licensePlate: primaryManualUnit.licensePlate, brand: primaryManualUnit.brand, model: primaryManualUnit.vehicleType, color: '', capacity: 0 }
      : { licensePlate: vehicle.license_plate, brand: vehicle.brand, model: vehicle.model, color: vehicle.color ?? '', capacity: vehicle.capacity };
    const publicDriver = primaryManualUnit
      ? { name: primaryManualUnit.driverName, phone: primaryManualUnit.driverPhone ?? '' }
      : { name: driver.full_name, phone: driver.phone ?? '' };

    await db.from('request_access_tokens')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', access.id);

    return json({
      assignment: {
        requestId: booking.id,
        requestNo: booking.booking_no,
        status: booking.status,
        requestType: booking.request_type,
        requester: {
          name: booking.requester_name,
          email: booking.requester_email,
          employeeId: booking.requester_employee_id ?? '',
          department: booking.requester_department,
        },
        usingDate: booking.using_date,
        startTime: String(booking.start_time).slice(0, 5),
        endTime: String(booking.end_time).slice(0, 5),
        pickupLocation: booking.pickup_location,
        destination: booking.destination,
        purpose: booking.purpose,
        meetingPoint: booking.meeting_point,
        withStaff: booking.with_staff,
        numPassengers: booking.num_passengers,
        passengers: booking.booking_passengers?.length
          ? booking.booking_passengers
          : Array.from({ length: booking.num_passengers }, (_item, index) => ({
              name: `Passenger ${index + 1}`, seq: index,
            })),
        overtimeEmployees: booking.overtime_employees ?? [],
        vehicle: publicVehicle,
        driver: publicDriver,
        transportUnits,
        notes: assignment.notes ?? '',
        assignedAt: assignment.assigned_at,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
      },
      expiresAt: access.expires_at,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unable to load assignment.';
    return json({ error: message }, /invalid|required/i.test(message) ? 400 : 500);
  }
});
