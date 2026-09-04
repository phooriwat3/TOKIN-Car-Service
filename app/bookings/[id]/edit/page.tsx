"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Clock3 } from "lucide-react";
import { useApp } from "@/components/app-provider";
import {
  Button,
  Card,
  Empty,
  Field,
  Input,
  Select,
  Textarea,
  WeeklyHoursInput,
  TimeMaskInput,
} from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { GoogleMapLinks } from "@/components/google-map-links";
import { createClient } from "@/lib/supabase/client";
import type { OvertimeEmployee, User } from "@/lib/types";
import { demoUsers } from "@/lib/mock-data";

const blankEmployee = (): OvertimeEmployee => ({
  employeeId: "",
  employeeName: "",
  workDescription: "",
  workStart: "",
  workEnd: "",
  totalWeeklyHours: 0,
  transportRequired: true,
  busStop: "",
});

export default function EditRequest({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, user, configured, resubmitBooking } = useApp();
  const booking = data.bookings.find((x) => x.id === id);
  const router = useRouter();
  const [approvers, setApprovers] = useState<User[]>(
    demoUsers.filter((x) => x.role === "approver"),
  );
  const [approverId, setApproverId] = useState(booking?.approverId ?? "");
  const [usingDate, setUsingDate] = useState(booking?.usingDate ?? "");
  const [startTime, setStartTime] = useState(booking?.startTime ?? "");
  const [endTime, setEndTime] = useState(booking?.endTime ?? "");
  const [pickup, setPickup] = useState(booking?.pickupLocation ?? "");
  const [destination, setDestination] = useState(booking?.destination ?? "");
  const [purpose, setPurpose] = useState(booking?.purpose ?? "");
  const [meetingPoint, setMeetingPoint] = useState(
    booking?.meetingPoint ?? "front_area",
  );
  const [withStaff, setWithStaff] = useState(booking?.withStaff ?? false);
  const [passengers, setPassengers] = useState(
    (booking?.passengerList ?? []).join("\n"),
  );
  const [employees, setEmployees] = useState<OvertimeEmployee[]>(
    booking?.overtimeEmployees?.length
      ? booking.overtimeEmployees
      : [blankEmployee()],
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    if (!supabase) return;
    void supabase
      .from("active_approver_directory")
      .select("id,full_name,email,department_name")
      .order("full_name")
      .then(({ data: rows, error }: { data: any; error: any }) => {
        if (error) return setError(error.message);
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

  const approver = useMemo(
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
  if (!booking)
    return (
      <Empty title="Request not found" body="The request is unavailable." />
    );
  if (booking.requesterId !== user.id || booking.status !== "changes_requested")
    return (
      <Empty
        title="Editing is unavailable"
        body="Only your request returned for changes can be edited."
      />
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (booking.requestType === "outside_company" && !approver)
      return setError("Select an approver.");
    if (
      booking.requestType === "overtime" &&
      employees.some(
        (x) =>
          !x.employeeId ||
          !x.employeeName ||
          (x.transportRequired && !x.busStop),
      )
    )
      return setError("Complete every OT employee row.");
    setSaving(true);
    try {
      await resubmitBooking({
        ...booking,
        status:
          booking.requestType === "overtime"
            ? "pending_ot_verification"
            : "pending_approval",
        approverId:
          booking.requestType === "outside_company" ? approver?.id : undefined,
        approverName:
          booking.requestType === "outside_company"
            ? approver?.fullName
            : undefined,
        approverEmail:
          booking.requestType === "outside_company"
            ? approver?.email
            : undefined,
        usingDate,
        startTime:
          booking.requestType === "overtime"
            ? employees[0].workStart
            : startTime,
        endTime:
          booking.requestType === "overtime" ? employees[0].workEnd : endTime,
        pickupLocation: pickup,
        destination:
          booking.requestType === "overtime"
            ? "Employee bus stops"
            : destination,
        purpose,
        meetingPoint: meetingPoint as any,
        withStaff,
        passengerList: passengers
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
        overtimeEmployees:
          booking.requestType === "overtime"
            ? employees.map((emp) => ({
                ...emp,
                workDescription: emp.workDescription.trim() || "Overtime Work",
              }))
            : [],
      });
      router.push(`/bookings/${id}`);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to resubmit request.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`Edit ${booking.bookingNo}`}
        description={`Manager comment: ${booking.rejectReason || "Please revise this request."}`}
      />
      <form onSubmit={submit} className="space-y-6">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-[#f8fafc] px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
              Trip details & schedule
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Update the request parameters before resubmitting.
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Using date">
                <Input
                  required
                  type="date"
                  value={usingDate}
                  onChange={(e) => setUsingDate(e.target.value)}
                />
              </Field>
              {booking.requestType === "outside_company" && (
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
              {booking.requestType !== "overtime" && (
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
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
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
            {booking.requestType !== "overtime" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Passenger names">
                  <Textarea
                    placeholder={
                      "Enter 1 passenger name per line:\n1. John Doe\n2. Jane Smith"
                    }
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                  />
                </Field>
                <label className="flex items-center gap-2 self-start pt-8 text-sm font-medium text-slate-700 cursor-pointer select-none">
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
        {booking.requestType !== "overtime" && destination.trim() && (
          <GoogleMapLinks origin={pickup} destination={destination} />
        )}
        {booking.requestType === "overtime" && (
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
        {booking.requestType === "overtime" && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-[#f8fafc] px-5 py-4 sm:px-6 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
                  OT Employee roster
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Add or edit employees included in this overtime request.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEmployees((x) => [...x, blankEmployee()])}
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
                    <strong className="text-xs uppercase tracking-wider text-slate-800">
                      Employee {index + 1}
                    </strong>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={employees.length === 1}
                      onClick={() =>
                        setEmployees((x) => x.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2
                        size={15}
                        className="text-slate-400 hover:text-red-600"
                      />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Employee number">
                      <Input
                        required
                        placeholder="7-DIGIT ID"
                        value={employee.employeeId}
                        onChange={(e) =>
                          updateEmployee(index, "employeeId", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Employee name">
                      <Input
                        required
                        placeholder="e.g. Somchai Jaidee"
                        value={employee.employeeName}
                        onChange={(e) =>
                          updateEmployee(index, "employeeName", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Description of work">
                      <Textarea
                        className="min-h-[80px]"
                        value={employee.workDescription}
                        placeholder="Describe the work this employee will be performing during overtime..."
                        onChange={(e) =>
                          updateEmployee(
                            index,
                            "workDescription",
                            e.target.value,
                          )
                        }
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
        {error && (
          <p className="border-l-2 border-danger bg-danger-light p-3 pl-4 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button disabled={saving}>
            {saving ? "Submitting..." : "Save and resubmit"}
          </Button>
        </div>
      </form>
    </>
  );
}
