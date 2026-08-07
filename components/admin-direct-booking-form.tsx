"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, UserPlus } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Field, Input, Select, Textarea, TimeMaskInput } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { demoUsers } from "@/lib/mock-data";
import type { Booking, OtVerificationMode, User } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

export function AdminDirectBookingForm() {
  const { addBooking, configured, data, user } = useApp();
  const router = useRouter();
  const [employees, setEmployees] = useState<User[]>(
    demoUsers.filter((item) => item.email && item.id !== user.id),
  );
  const [employeeId, setEmployeeId] = useState("");
  const [usingDate, setUsingDate] = useState(today());
  const [startTime, setStartTime] = useState("17:20");
  const [endTime, setEndTime] = useState("20:00");
  const [pickupLocation, setPickupLocation] = useState("TOKIN Main Office");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("Overtime transport requested through HR");
  const [verificationMode, setVerificationMode] = useState<OtVerificationMode>("tiger_space");
  const [meetingPoint, setMeetingPoint] = useState<"front_area" | "loading_area">("front_area");
  const [urgent, setUrgent] = useState(false);
  const [urgentReason, setUrgentReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    if (!supabase) return;
    void supabase
      .from("profiles")
      .select("id,employee_id,full_name,email,role,department:departments(name)")
      .eq("is_active", true)
      .order("full_name")
      .then(({ data: rows, error: queryError }) => {
        if (queryError) {
          setError(`Unable to load employees: ${queryError.message}`);
          return;
        }
        setEmployees(
          (rows ?? [])
            .filter((row: any) => row.email && row.id !== user.id)
            .map((row: any) => ({
              id: row.id,
              employeeId: row.employee_id,
              fullName: row.full_name,
              email: row.email,
              department: Array.isArray(row.department)
                ? row.department[0]?.name ?? ""
                : row.department?.name ?? "",
              role: row.role,
            })),
        );
      });
  }, [configured, user.id]);

  const selectedEmployee = useMemo(
    () => employees.find((item) => item.id === employeeId),
    [employeeId, employees],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!selectedEmployee) return setError("Select the employee who needs transport.");
    if (!usingDate || !startTime || !endTime || !pickupLocation.trim() || !destination.trim() || !purpose.trim())
      return setError("Complete the date, time, route, and reason.");
    if (endTime <= startTime) return setError("End time must be later than start time.");
    if (urgent && !urgentReason.trim()) return setError("Enter the reason for the urgent booking.");

    setSubmitting(true);
    try {
      const booking: Booking = {
        id: `hr-${Date.now()}`,
        bookingNo: `CSR-${new Date().getFullYear()}-${String(data.bookings.length + 1).padStart(6, "0")}`,
        requesterId: selectedEmployee.id,
        requesterName: selectedEmployee.fullName,
        requesterEmail: selectedEmployee.email,
        requesterEmployeeId: selectedEmployee.employeeId,
        department: selectedEmployee.department,
        status: "approved",
        requestType: "overtime",
        requestOrigin: "hr_direct",
        createdByName: user.fullName,
        category: "overtime_transport",
        usingDate,
        startTime,
        endTime,
        pickupLocation: pickupLocation.trim(),
        destination: destination.trim(),
        purpose: purpose.trim(),
        numPassengers: 1,
        passengerList: [],
        overtimeEmployees: [{
          employeeId: selectedEmployee.employeeId,
          employeeName: selectedEmployee.fullName,
          employeeEmail: selectedEmployee.email,
          workDescription: purpose.trim(),
          workStart: startTime,
          workEnd: endTime,
          totalWeeklyHours: 0,
          transportRequired: true,
          busStop: destination.trim(),
        }],
        meetingPoint,
        vehicleTypePref: "any",
        driverRequired: true,
        urgent,
        urgentReason: urgent ? urgentReason.trim() : undefined,
        afterHours: true,
        overtimeTransport: true,
        sourceSystem: "transport_portal",
        otVerificationStatus: verificationMode === "manager_exception" ? "not_required" : "pending",
        otVerificationMode: verificationMode,
        createdAt: new Date().toISOString(),
      };
      const created = await addBooking(booking);
      router.push(`/admin/bookings/${created.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create the booking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="HR / GA"
        title="Create OT transport for an employee"
        description="Create an OT ride requested through HR, including requests made before the Tiger OpenSpace entry exists and manager exceptions."
      />
      <form onSubmit={submit} className="space-y-5">
        <Card className="border-l-4 border-l-emerald-500 p-5">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
            <div>
              <h2 className="font-bold text-ink">HR can arrange the vehicle immediately</h2>
              <p className="mt-1 text-sm text-gray-500">For normal employees, Tiger OpenSpace can be checked later after the OT entry is created. Manager exceptions do not require a Tiger OpenSpace record.</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-5 flex items-center gap-2 font-bold text-ink"><UserPlus size={18} className="text-brand" /> Employee and journey</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Employee">
              <Select required value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.employeeId} - {employee.fullName} ({employee.department})</option>
                ))}
              </Select>
            </Field>
            <Field label="Employee email"><Input disabled value={selectedEmployee?.email ?? ""} /></Field>
            <Field label="Department"><Input disabled value={selectedEmployee?.department ?? ""} /></Field>
            <Field label="Using date"><Input required min={today()} type="date" value={usingDate} onChange={(event) => setUsingDate(event.target.value)} /></Field>
            <Field label="Start time"><TimeMaskInput required value={startTime} onChange={setStartTime} quickTimes={["17:20", "19:00", "20:00"]} /></Field>
            <Field label="End time"><TimeMaskInput required value={endTime} onChange={setEndTime} quickTimes={["19:00", "20:00", "21:00"]} /></Field>
            <Field label="Pickup location"><Input required value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} /></Field>
            <Field label="Drop-off location"><Input required placeholder="Employee home / agreed drop-off point" value={destination} onChange={(event) => setDestination(event.target.value)} /></Field>
            <Field label="Meeting point">
              <Select value={meetingPoint} onChange={(event) => setMeetingPoint(event.target.value as "front_area" | "loading_area")}>
                <option value="front_area">Front Area</option>
                <option value="loading_area">Loading Area</option>
              </Select>
            </Field>
            <Field label="Tiger OpenSpace verification">
              <Select value={verificationMode} onChange={(event) => setVerificationMode(event.target.value as OtVerificationMode)}>
                <option value="tiger_space">Verify later in Tiger OpenSpace</option>
                <option value="manager_exception">Manager exception - no Tiger entry</option>
              </Select>
            </Field>
          </div>
          <div className="mt-4"><Field label="Reason / notes"><Textarea required value={purpose} onChange={(event) => setPurpose(event.target.value)} /></Field></div>
          <label className="mt-4 flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} className="h-4 w-4 accent-brand" /> Urgent booking
          </label>
          {urgent && <div className="mt-3"><Field label="Urgent reason"><Input required value={urgentReason} onChange={(event) => setUrgentReason(event.target.value)} /></Field></div>}
        </Card>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={submitting}>{submitting ? "Creating..." : "Create and arrange transport"}</Button>
        </div>
      </form>
    </>
  );
}
