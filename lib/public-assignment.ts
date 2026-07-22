export type PublicAssignment = {
  requestId: string;
  requestNo: string;
  status: string;
  requestType: string;
  requester: { name: string; email: string; employeeId: string; department: string };
  usingDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  destination: string;
  purpose: string;
  meetingPoint: string;
  withStaff?: boolean;
  numPassengers: number;
  passengers: Array<{ name: string; seq: number }>;
  overtimeEmployees: Array<{
    employee_id: string;
    employee_name: string;
    bus_stop?: string;
    transport_required: boolean;
    seq: number;
  }>;
  vehicle: { licensePlate: string; brand: string; model: string; color: string; capacity: number };
  driver: { name: string; phone: string };
  transportUnits?: Array<{
    licensePlate: string;
    unitId: string;
    employeeIds: string[];
    brand: string;
    vehicleType: string;
    driverName: string;
    driverPhone: string;
  }>;
  notes: string;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
};

type AssignmentResult = {
  assignment?: PublicAssignment;
  expiresAt?: string;
  error?: string;
};

export async function loadPublicAssignment(token?: string): Promise<AssignmentResult> {
  if (!token) return { error: 'Assignment link is missing.' };
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) return { error: 'Assignment service is not configured.' };

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/public-assignment-access`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
      },
      body: JSON.stringify({ token }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { error: body.error || `Unable to open assignment (HTTP ${response.status}).` };
    return { assignment: body.assignment, expiresAt: body.expiresAt };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : 'Unable to load assignment.' };
  }
}
