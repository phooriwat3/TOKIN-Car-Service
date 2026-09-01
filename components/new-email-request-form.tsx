"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Car, Clock3, Plus, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app-provider";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  WeeklyHoursInput,
  TimeMaskInput,
} from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { GoogleMapLinks } from "@/components/google-map-links";
import { CompanyUserField } from "@/components/company-user-field";
import { createClient } from "@/lib/supabase/client";
import type { Booking, OvertimeEmployee, RequestType, User } from "@/lib/types";
import { demoUsers } from "@/lib/mock-data";
import { bangkokTime, isOtRequestWindowOpen } from "@/lib/request-window";

const emptyEmployee = (): OvertimeEmployee => ({
  employeeId: "",
  employeeName: "",
  employeeEmail: "",
  workDescription: "",
  workStart: "",
  workEnd: "",
  totalWeeklyHours: 0,
  transportRequired: true,
  busStop: "",
});

export default function NewEmailRequestForm() {
  const { addBooking, user, data, configured } = useApp();
  const router = useRouter();
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [approvers, setApprovers] = useState<User[]>(
    demoUsers.filter((x) => x.role === "approver"),
  );
  const [approverId, setApproverId] = useState("");
  const [usingDate, setUsingDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [pickupLocation, setPickupLocation] = useState("TOKIN Main Office");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [meetingPoint, setMeetingPoint] = useState<
    "front_area" | "loading_area"
  >("front_area");
  const [withStaff, setWithStaff] = useState(false);
  const [passengers, setPassengers] = useState("");
  const [employees, setEmployees] = useState<OvertimeEmployee[]>([
    emptyEmployee(),
  ]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    if (!supabase) return;
    void supabase
      .from("active_approver_directory")
      .select(
        "id,full_name,email,department_name",
      )
      .order("full_name")
      .then(({ data: rows, error: queryError }: { data: any; error: any }) => {
        if (queryError)
          return setError(`Unable to load approvers: ${queryError.message}`);
        setApprovers(
          (rows ?? []).map((row: any) => ({
            id: row.id,
            employeeId: "",
            fullName: row.full_name,
            email: row.email,
            department: row.department_name ?? "",
            role: "approver",
          })),
        );
      });
  }, [configured]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedApprover = useMemo(
    () => approvers.find((x) => x.id === approverId),
    [approvers, approverId],
  );
  const updateEmployee = <K extends keyof OvertimeEmployee>(
    index: number,
    key: K,
    value: OvertimeEmployee[K],
  ) =>
    setEmployees((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    );

  const otWindowOpen = isOtRequestWindowOpen(clock);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!requestType) return setError("Please select the request type.");
    if (requestType === "outside_company" && !selectedApprover)
      return setError("Please select an approver.");
    if (requestType === "overtime" && !isOtRequestWindowOpen())
      return setError(
        "OT requests can be submitted only from 08:00 to 17:00.",
      );
    if (!usingDate || (requestType !== "overtime" && !purpose.trim()))
      return setError("Date and purpose are required.");
    if (requestType === "outside_company" && !destination.trim())
      return setError("Destination is required.");
    if (
      requestType === "overtime" &&
      employees.some(
        (x) =>
          !x.employeeId ||
          !x.employeeName ||
          (x.transportRequired && !x.busStop),
      )
    ) {
      return setError(
        "Complete every OT employee row, including the bus stop when transport is required.",
      );
    }
    setSubmitting(true);
    try {
      const passengerList =
        requestType === "outside_company"
          ? passengers
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean)
          : [];
      const booking: Booking = {
        id: `b-${Date.now()}`,
        bookingNo: `CSR-${new Date().getFullYear()}-${String(data.bookings.length + 1).padStart(6, "0")}`,
        requesterId: user.id,
        requesterName: user.fullName,
        department: user.department,
        status: requestType === "overtime" ? "pending_ot_verification" : "pending_approval",
        requestType,
        approverId: requestType === "outside_company" ? selectedApprover?.id : undefined,
        approverName: requestType === "outside_company" ? selectedApprover?.fullName : undefined,
        approverEmail: requestType === "outside_company" ? selectedApprover?.email : undefined,
        category:
          requestType === "overtime" ? "overtime_transport" : "business_trip",
        usingDate,
        startTime:
          requestType === "overtime" ? employees[0].workStart : startTime,
        endTime: requestType === "overtime" ? employees[0].workEnd : endTime,
        pickupLocation,
        destination:
          requestType === "overtime" ? "Employee bus stops" : destination,
        purpose:
          requestType === "overtime"
            ? (
                "Overtime / Holiday Work: " +
                employees
                  .map((e) => e.workDescription.trim())
                  .filter(Boolean)
                  .join(", ")
              ).slice(0, 2000)
            : purpose,
        numPassengers:
          requestType === "overtime"
            ? employees.filter((x) => x.transportRequired).length
            : Math.max(1, passengerList.length),
        passengerList,
        overtimeEmployees:
          requestType === "overtime"
            ? employees.map((emp) => ({
                ...emp,
                workDescription: emp.workDescription.trim() || "Overtime Work",
              }))
            : [],
        meetingPoint,
        withStaff,
        vehicleTypePref: "any",
        driverRequired: true,
        urgent: false,
        afterHours: requestType === "overtime",
        overtimeTransport: requestType === "overtime",
        createdAt: new Date().toISOString(),
      };
      const created = await addBooking(booking);
      router.push(`/bookings/${created.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to submit request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!requestType)
    return (
      <>
        <PageHeader
          title="Create transport request"
          description="Choose the request type that matches your transportation requirement."
        />
        <div className="grid gap-5 md:grid-cols-2">
          <Choice
            eyebrow="Daily employee transport"
            title="OVERTIME TRANSPORT"
            body="Request company transport for approved overtime or holiday work."
            note="Submit by 16:00"
            onClick={() => setRequestType("overtime")}
          />
          <Choice
            eyebrow="Business travel"
            title="OFF-SITE BUSINESS TRANSPORT"
            body="Vehicle request for official business travel outside the company premises."
            note="For off-site company trips"
            onClick={() => setRequestType("outside_company")}
          />
        </div>
      </>
    );

  return (
    <>
      <PageHeader
        title={
          requestType === "overtime"
            ? "OVERTIME TRANSPORT"
            : "OFF-SITE BUSINESS TRANSPORT"
        }
        description={
          requestType === "overtime"
            ? "Submit OT transportation for Tiger OpenSpace verification and GA fleet scheduling."
            : "Request a company vehicle. The designated approver will receive a secure email approval link."
        }
      />
      <form onSubmit={submit} className="space-y-6">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-[#f8fafc] px-5 py-4 sm:px-6 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Request information</h2>
              <p className="mt-0.5 text-xs text-slate-500">Provide the requester details and general travel parameters.</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRequestType(null)}
            >
              Change form
            </Button>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Requester">
                <Input disabled value={`${user.fullName} (${user.email})`} />
              </Field>
              <Field label="Department">
                <Input disabled value={user.department} />
              </Field>
              <Field label="Using date">
                <Input
                  required
                  type="date"
                  value={usingDate}
                  onChange={(e) => setUsingDate(e.target.value)}
                />
              </Field>
              {requestType === "outside_company" && (
                <Field label="Approver">
                  <Select
                    required
                    value={approverId}
                    onChange={(e) => setApproverId(e.target.value)}
                  >
                    <option value="">Search or select approver</option>
                    {approvers.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.fullName} · {x.email}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {requestType === "outside_company" && (
                <>
                  <Field label="Start time">
                    <Input
                      required
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </Field>
                  <Field label="End time">
                    <Input
                      required
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </Field>
                  <Field label="Pickup location">
                    <Input
                      required
                      placeholder="TOKIN Main Office"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                    />
                  </Field>
                  <Field label="Destination">
                    <Input
                      required
                      placeholder="e.g. Supplier site / External work location"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                  </Field>
                  <Field label="Meeting point">
                    <Select
                      value={meetingPoint}
                      onChange={(e) => setMeetingPoint(e.target.value as any)}
                    >
                      <option value="front_area">Front Area</option>
                      <option value="loading_area">Loading Area</option>
                    </Select>
                  </Field>
                </>
              )}
            </div>
            {requestType === "outside_company" && (
              <div className="mt-4">
                <Field label="Purpose / work summary">
                  <Textarea
                    required
                    placeholder="State the purpose of travel or work description..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                  />
                </Field>
              </div>
            )}
            {requestType === "outside_company" && destination.trim() && (
              <div className="mt-4">
                <GoogleMapLinks
                  origin={pickupLocation}
                  destination={destination}
                />
              </div>
            )}
            {requestType === "outside_company" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Passenger names">
                  <Textarea
                    placeholder={"Enter 1 passenger name per line:\n1. John Doe\n2. Jane Smith"}
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                  />
                </Field>
                <label className="flex items-center gap-3 self-start pt-8 text-sm text-slate-700 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={withStaff}
                    onChange={(e) => setWithStaff(e.target.checked)}
                    className="h-4 w-4 accent-brand rounded border-slate-300"
                  />
                  <span>Travel with GA staff</span>
                </label>
              </div>
            )}
          </div>
        </section>

        {requestType === "overtime" && (
          <Card className="p-5 border-amber-200 bg-amber-50/30 mb-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700">
                <Clock3 size={20} />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-amber-900 mb-1">
                  คำแนะนำการคำนวณและหมายเหตุ (OT Guidelines & Notes)
                </h2>
                <p className="text-xs text-amber-800/80 mb-4">
                  โปรดใช้ตารางอ้างอิงนี้เพื่อกรอกจำนวนชั่วโมงทำงานรายสัปดาห์
                  (Weekly hours) และตรวจสอบกฎระเบียบของทางบริษัทฯ
                </p>

                {/* Reference Table */}
                <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-amber-100/50 text-amber-900 font-semibold border-b border-amber-200">
                      <tr>
                        <th className="px-3 py-2">
                          การนับเวลาทำงาน (Work Period)
                        </th>
                        <th className="px-3 py-2 text-center">Day (Hrs.)</th>
                        <th className="px-3 py-2 text-center">OT (Hrs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 text-gray-700">
                      <tr className="hover:bg-amber-50/20">
                        <td className="px-3 py-2 font-mono">17:20 - 19:00</td>
                        <td className="px-3 py-2 text-center">-</td>
                        <td className="px-3 py-2 text-center font-semibold text-amber-700">
                          1.67
                        </td>
                      </tr>
                      <tr className="hover:bg-amber-50/20">
                        <td className="px-3 py-2 font-mono">17:20 - 20:00</td>
                        <td className="px-3 py-2 text-center">-</td>
                        <td className="px-3 py-2 text-center font-semibold text-amber-700">
                          2.67
                        </td>
                      </tr>
                      <tr className="hover:bg-amber-50/20">
                        <td className="px-3 py-2 font-mono">08:00 - 16:45</td>
                        <td className="px-3 py-2 text-center font-semibold text-gray-800">
                          8.00
                        </td>
                        <td className="px-3 py-2 text-center">0.00</td>
                      </tr>
                      <tr className="hover:bg-amber-50/20">
                        <td className="px-3 py-2 font-mono">08:00 - 19:00</td>
                        <td className="px-3 py-2 text-center font-semibold text-gray-800">
                          8.00
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-amber-700">
                          1.67
                        </td>
                      </tr>
                      <tr className="hover:bg-amber-50/20">
                        <td className="px-3 py-2 font-mono">08:00 - 20:00</td>
                        <td className="px-3 py-2 text-center font-semibold text-gray-800">
                          8.00
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-amber-700">
                          2.67
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Notes List */}
                <div className="mt-4 space-y-2 text-xs text-amber-900/90 leading-relaxed">
                  <p className="font-bold border-b border-amber-200/60 pb-1">
                    หมายเหตุสำคัญ (Important Notes):
                  </p>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>
                      ในกรณีที่พนักงานได้มาทำงานล่วงเวลาหรือทำงานในวันหยุดโดยมิได้รับคำสั่งหรือมิได้รับอนุมัติจากบริษัทฯให้ถูกต้องก่อน
                      ทางบริษัทฯ จะไม่จ่ายค่าล่วงเวลาหรือค่าทำงานในวันหยุดให้
                    </li>
                    <li>
                      บริษัทฯ
                      จะไม่จ่ายค่าทำงานล่วงเวลาและค่าทำงานในวันหยุดซึ่งเกินจากที่ได้รับอนุมัติ
                    </li>
                    <li className="text-danger font-bold">
                      ชั่วโมงการทำงานต้องไม่เกิน 60 ชั่วโมง / สัปดาห์
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        )}

        {requestType === "overtime" && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-[#f8fafc] px-5 py-4 sm:px-6 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 sm:text-base">OT Employee roster</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Add all employees participating in this overtime / holiday work request.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEmployees((x) => [...x, emptyEmployee()])}
              >
                <Plus size={15} /> Add employee
              </Button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {employees.map((employee, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 sm:p-5 transition-colors hover:border-slate-300"
                >
                  <div className="mb-3 flex justify-between items-center">
                    <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Employee {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={employees.length === 1}
                      onClick={() =>
                        setEmployees((x) => x.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 size={15} className="text-slate-400 hover:text-red-600" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <CompanyUserField
                      label="Employee name"
                      required
                      value={employee.employeeName}
                      placeholder="Search name or email..."
                      onChange={(val) =>
                        updateEmployee(index, "employeeName", val)
                      }
                      onSelectUser={(person) => {
                        updateEmployee(
                          index,
                          "employeeName",
                          person.displayName,
                        );
                        updateEmployee(index, "employeeEmail", person.mail);
                        if (person.employeeId)
                          updateEmployee(
                            index,
                            "employeeId",
                            person.employeeId,
                          );
                      }}
                    />
                    <Field label="Employee email">
                      <Input
                        required={employee.transportRequired}
                        type="email"
                        placeholder="name@yageo.com"
                        value={employee.employeeEmail || ""}
                        onChange={(e) =>
                          updateEmployee(index, "employeeEmail", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Employee number">
                      <Input
                        required
                        placeholder="e.g. 100456"
                        value={employee.employeeId}
                        onChange={(e) =>
                          updateEmployee(index, "employeeId", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Description of work">
                      <Textarea
                        className="min-h-[80px]"
                        value={employee.workDescription}
                        onChange={(e) =>
                          updateEmployee(
                            index,
                            "workDescription",
                            e.target.value,
                          )
                        }
                        placeholder="Describe the work this employee will be performing during overtime..."
                      />
                    </Field>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Weekly hours (≤ 60)">
                      <WeeklyHoursInput
                        required
                        value={employee.totalWeeklyHours}
                        onChange={(val) =>
                          updateEmployee(index, "totalWeeklyHours", val)
                        }
                      />
                    </Field>
                    <Field label="OT start">
                      <TimeMaskInput
                        required
                        value={employee.workStart}
                        onChange={(val) =>
                          updateEmployee(index, "workStart", val)
                        }
                        quickTimes={["17:20"]}
                      />
                    </Field>
                    <Field label="OT end">
                      <TimeMaskInput
                        required
                        value={employee.workEnd}
                        onChange={(val) =>
                          updateEmployee(index, "workEnd", val)
                        }
                        quickTimes={["19:00", "20:00"]}
                      />
                    </Field>
                    <Field label="Transportation">
                      <Select
                        value={employee.transportRequired ? "yes" : "no"}
                        onChange={(e) =>
                          updateEmployee(
                            index,
                            "transportRequired",
                            e.target.value === "yes",
                          )
                        }
                      >
                        <option value="yes">Required</option>
                        <option value="no">Not required</option>
                      </Select>
                    </Field>
                    <Field label="Bus stop">
                      <Input
                        required={employee.transportRequired}
                        disabled={!employee.transportRequired}
                        placeholder="e.g. Bang Saen Junction / Wat Som Poi Stop"
                        value={employee.busStop}
                        onChange={(e) =>
                          updateEmployee(index, "busStop", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {requestType === "overtime" && !otWindowOpen && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            OT request submission is currently closed. Submissions are available from 08:00 to 17:00.
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200/80 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setRequestType(null)}
          >
            Cancel
          </Button>
          <Button
            disabled={
              submitting || (requestType === "overtime" && !otWindowOpen)
            }
          >
            {submitting ? "Submitting..." : requestType === "overtime" ? "Submit OT request" : "Submit for approval"}
          </Button>
        </div>
      </form>
    </>
  );
}

function Choice({
  eyebrow,
  title,
  body,
  note,
  onClick,
}: {
  eyebrow: string;
  title: string;
  body: string;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {eyebrow}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
            {note || "Select request type"}
          </span>
        </div>
        <h2 className="mt-4 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      </div>
      <div className="mt-6 flex w-full items-center justify-start border-t border-slate-100 pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 transition-colors group-hover:text-brand-700">
          Open form <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </button>
  );
}
