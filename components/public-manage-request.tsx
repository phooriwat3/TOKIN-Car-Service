"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
  Clock3,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  WeeklyHoursInput,
  TimeMaskInput,
} from "@/components/ui";
import { OtGuidelines } from "@/components/ot-guidelines";
import { GoogleMapLinks } from "@/components/google-map-links";
import { CompanyUserField } from "@/components/company-user-field";
import { isOtRequestWindowOpen } from "@/lib/request-window";
import { overtimeDuration } from "@/lib/overtime";
import { PublicHeader } from "@/components/brand";
import type { BookingStatus, OvertimeEmployee, RequestType } from "@/lib/types";

type ManagedRequest = {
  id: string;
  requestNo: string;
  status: BookingStatus;
  revisionNo: number;
  requestType: RequestType;
  requester: {
    name: string;
    email: string;
    employeeId?: string;
    department: string;
  };
  approver: { name: string; email: string };
  usingDate: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  destination: string;
  purpose: string;
  meetingPoint: "front_area" | "loading_area";
  withStaff?: boolean;
  passengers: string[];
  overtimeEmployees: OvertimeEmployee[];
  rejectReason?: string;
};

type Permissions = { canEdit: boolean; canCancel: boolean };
type LoadState = "loading" | "ready" | "error" | "saved" | "cancelled";

const DEPARTMENTS = [
  "MD",
  "HR",
  "SUST",
  "FA",
  "PLN",
  "PROC",
  "PE",
  "IT",
  "EE",
  "FAC",
  "QA",
  "TA MFG",
  "SC",
  "TE",
];

const emptyEmployee = (): OvertimeEmployee => ({
  employeeId: "",
  employeeName: "",
  employeeEmail: "",
  workDescription: "",
  workStart: "17:20",
  workEnd: "20:00",
  totalWeeklyHours: 0,
  transportRequired: true,
  busStop: "",
});

const statusText: Record<string, string> = {
  pending_approval: "Pending department approval",
  pending_ot_verification: "Waiting for OT verification",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
  assigned: "Assigned",
  cancelled: "Cancelled",
  completed: "Completed",
};

const apiConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey)
    throw new Error("Request management service is not configured.");
  return { supabaseUrl, publishableKey };
};

export default function PublicManageRequest({
  initialToken,
}: {
  initialToken?: string;
}) {
  const [token, setToken] = useState(initialToken ?? "");
  const [request, setRequest] = useState<ManagedRequest | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({
    canEdit: false,
    canCancel: false,
  });
  const [state, setState] = useState<LoadState>(
    initialToken ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    initialToken ? "" : "Request link is missing.",
  );
  const [saving, setSaving] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const otWindowOpen = useMemo(() => isOtRequestWindowOpen(), []);

  useEffect(() => {
    if (initialToken) load(initialToken);
  }, [initialToken]);

  const disabled =
    saving ||
    !permissions.canEdit ||
    !request ||
    (request.requestType === "overtime" && !otWindowOpen);

  async function load(rawToken = token) {
    setState("loading");
    setMessage("");
    try {
      const { supabaseUrl, publishableKey } = apiConfig();
      const response = await fetch(
        `${supabaseUrl}/functions/v1/public-request-access`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: publishableKey,
          },
          body: JSON.stringify({ token: rawToken }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to load request.");
      setRequest(normalizeRequest(result.request));
      setPermissions(
        result.permissions ?? { canEdit: false, canCancel: false },
      );
      setToken(rawToken);
      setState("ready");
    } catch (cause) {
      setState("error");
      setMessage(
        cause instanceof Error ? cause.message : "Unable to load request.",
      );
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!request) return;
    if (request.requestType === "overtime" && !otWindowOpen) {
      setMessage(
        "OT requests can be edited only from 08:00 to 16:00 (Thailand time).",
      );
      return;
    }
    const validationError = validate(request);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const { supabaseUrl, publishableKey } = apiConfig();
      const payloadRequest = {
        ...request,
        overtimeEmployees:
          request.requestType === "overtime"
            ? request.overtimeEmployees.map((emp) => ({
                ...emp,
                workDescription: emp.workDescription.trim() || "Overtime Work",
              }))
            : [],
      };
      const response = await fetch(
        `${supabaseUrl}/functions/v1/public-update-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: publishableKey,
          },
          body: JSON.stringify({
            token,
            action: "update",
            request: payloadRequest,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to save request.");
      const nextToken = String(result.manageToken ?? "");
      if (nextToken) {
        const nextUrl = `/request/manage?token=${encodeURIComponent(nextToken)}`;
        window.history.replaceState(null, "", nextUrl);
        setToken(nextToken);
      }
      setRequest((current) =>
        current
          ? {
              ...current,
              status:
                current.requestType === "overtime"
                  ? "pending_ot_verification"
                  : "pending_approval",
              revisionNo: Number(result.revisionNo ?? current.revisionNo + 1),
            }
          : current,
      );
      setPermissions({ canEdit: true, canCancel: true });
      setState("saved");
      setMessage(
        request.requestType === "overtime"
          ? "Transport request updated. HR/GA will verify it against the Tiger Space report."
          : "Request updated and sent back for approval. Please use this latest page if you need to edit again.",
      );
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Unable to save request.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancel() {
    if (!request || !window.confirm(`Cancel ${request.requestNo}?`)) return;
    setSaving(true);
    setMessage("");
    try {
      const { supabaseUrl, publishableKey } = apiConfig();
      const response = await fetch(
        `${supabaseUrl}/functions/v1/public-update-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: publishableKey,
          },
          body: JSON.stringify({ token, action: "cancel" }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to cancel request.");
      setRequest((current) =>
        current ? { ...current, status: "cancelled" } : current,
      );
      setPermissions({ canEdit: false, canCancel: false });
      setState("cancelled");
      setMessage(
        "Request cancelled. This link can no longer be used to edit the request.",
      );
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Unable to cancel request.",
      );
    } finally {
      setSaving(false);
    }
  }

  const update = <K extends keyof ManagedRequest>(
    key: K,
    value: ManagedRequest[K],
  ) => {
    setRequest((current) => (current ? { ...current, [key]: value } : current));
  };
  const updateRequester = (
    key: keyof ManagedRequest["requester"],
    value: string,
  ) => {
    setRequest((current) =>
      current
        ? { ...current, requester: { ...current.requester, [key]: value } }
        : current,
    );
  };
  const updateApprover = (
    key: keyof ManagedRequest["approver"],
    value: string,
  ) => {
    setRequest((current) =>
      current
        ? { ...current, approver: { ...current.approver, [key]: value } }
        : current,
    );
  };
  const updateEmployee = <K extends keyof OvertimeEmployee>(
    index: number,
    key: K,
    value: OvertimeEmployee[K],
  ) => {
    setRequest((current) =>
      current
        ? {
            ...current,
            overtimeEmployees: current.overtimeEmployees.map(
              (item, itemIndex) =>
                itemIndex === index ? { ...item, [key]: value } : item,
            ),
          }
        : current,
    );
  };

  function switchRequestType(nextType: RequestType) {
    if (!request) return;
    setRequest({
      ...request,
      requestType: nextType,
      startTime: nextType === "overtime" ? "17:20" : "08:00",
      endTime: nextType === "overtime" ? "20:00" : "17:00",
      destination: nextType === "overtime" ? "Employee bus stops" : "",
      passengers: nextType === "outside_company" ? request.passengers : [],
      overtimeEmployees:
        nextType === "overtime"
          ? request.overtimeEmployees.length
            ? request.overtimeEmployees
            : [emptyEmployee()]
          : [],
    });
  }

  const overtimeEmployee = request?.overtimeEmployees[0] ?? emptyEmployee();

  return (
    <main className="min-h-screen bg-canvas">
      <PublicHeader
        context="Request management"
        action={<a href="/request" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-600">New request</a>}
      />

      <div className="mx-auto max-w-[1080px] p-4 py-6 sm:p-6 sm:py-8">
        {state === "loading" && (
          <Card className="mx-auto max-w-xl p-8 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" />
            <p className="mt-4 font-semibold">Loading request...</p>
          </Card>
        )}

        {state === "error" && (
          <Card className="mx-auto max-w-xl p-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-600" />
            <h1 className="mt-4 text-2xl font-bold">
              Request link unavailable
            </h1>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            <Button className="mt-6" onClick={() => token && load()}>
              Try again
            </Button>
          </Card>
        )}

        {request && state !== "loading" && state !== "error" && (
          <form onSubmit={save} className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase text-brand">
                  {request.requestNo}
                </p>
                <h1 className="mt-1 text-2xl font-bold">
                  Manage transportation request
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Revision {request.revisionNo}
                </p>
              </div>
              <Badge status={request.status}>
                {statusText[request.status] ?? request.status}
              </Badge>
            </div>

            {request.rejectReason && (
              <Card className="border-l-4 border-l-amber-500 p-5">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <h2 className="font-bold">Change requested</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {request.rejectReason}
                    </p>
                  </div>
                </div>
              </Card>
            )}
            {!permissions.canEdit && (
              <Card className="border-l-4 border-l-gray-400 p-5 text-sm text-gray-600">
                This request can no longer be edited because its current status
                is {statusText[request.status] ?? request.status}.
              </Card>
            )}
            {state === "saved" && (
              <Card className="border-l-4 border-l-green-600 p-5">
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-green-800">
                    {message}
                  </p>
                </div>
              </Card>
            )}
            {state === "cancelled" && (
              <Card className="border-l-4 border-l-red-600 p-5">
                <p className="text-sm font-medium text-red-700">{message}</p>
              </Card>
            )}
            {message && state !== "saved" && state !== "cancelled" && (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {message}
              </p>
            )}

            {request.requestType === "overtime" ? (
              <div className="space-y-5">
                {!otWindowOpen && permissions.canEdit && (
                  <div className="border-l-[3px] border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Editing is locked outside the 08:00–16:00 Thailand submission window. You can still view the request details.
                  </div>
                )}

                <section className="rounded-lg border border-line bg-white">
                  <div className="border-b border-line bg-[#f7f8fa] px-5 py-4 sm:px-6">
                    <h2 className="font-semibold text-ink">Employee information</h2>
                    <p className="mt-0.5 text-xs text-gray-500">The department determines the approval route automatically.</p>
                  </div>
                  <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
                    <CompanyUserField
                      inputId="manage-employee-search"
                      label="Employee name"
                      required
                      disabled={disabled}
                      value={request.requester.name}
                      onChange={(value) => {
                        updateRequester("name", value);
                        updateEmployee(0, "employeeName", value);
                      }}
                      placeholder="Search English name"
                      onSelectUser={(person) => {
                        updateRequester("name", person.displayName);
                        updateEmployee(0, "employeeName", person.displayName);
                        updateEmployee(0, "employeeEmail", person.mail);
                        if (person.department) updateRequester("department", person.department);
                        if (person.employeeId) {
                          updateRequester("employeeId", person.employeeId);
                          updateEmployee(0, "employeeId", person.employeeId);
                        }
                      }}
                    />
                    <Field label="Employee number">
                      <Input
                        required
                        disabled={disabled}
                        value={request.requester.employeeId ?? overtimeEmployee.employeeId}
                        onChange={(event) => {
                          const value = event.target.value.replace(/\D/g, "").slice(0, 7);
                          updateRequester("employeeId", value);
                          updateEmployee(0, "employeeId", value);
                        }}
                      />
                    </Field>
                    <Field label="Company email"><Input disabled value={request.requester.email} /></Field>
                    <Field label="Department">
                      <Select required disabled={disabled} value={request.requester.department} onChange={(event) => updateRequester("department", event.target.value)}>
                        <option value="">Select department</option>
                        {DEPARTMENTS.map((item) => <option key={item} value={item}>{item}</option>)}
                        {request.requester.department && !DEPARTMENTS.includes(request.requester.department) && <option value={request.requester.department}>{request.requester.department}</option>}
                      </Select>
                    </Field>
                    <Field label="OT approval system"><Input disabled value="Tiger Space" /></Field>
                    <Field label="Transport verification"><Input disabled value="HR/GA checks the Tiger Space report" /></Field>
                  </div>
                </section>

                <section className="rounded-lg border border-line bg-white">
                  <div className="border-b border-line bg-[#f7f8fa] px-5 py-4 sm:px-6">
                    <h2 className="font-semibold text-ink">OT and transportation details</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Changes return the transport request to waiting for Tiger Space verification.</p>
                  </div>
                  <div className="space-y-6 px-5 py-5 sm:px-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="OT / holiday work date"><Input required disabled={disabled} type="date" lang="en-US" value={request.usingDate} onChange={(event) => update("usingDate", event.target.value)} /></Field>
                      <Field label="Weekly total working hours"><WeeklyHoursInput required disabled={disabled} value={overtimeEmployee.totalWeeklyHours} onChange={(value) => updateEmployee(0, "totalWeeklyHours", value)} /></Field>
                      <div className="sm:col-span-2">
                        <Field label="Work description (optional)"><Textarea disabled={disabled} value={overtimeEmployee.workDescription} onChange={(event) => { updateEmployee(0, "workDescription", event.target.value); update("purpose", `Overtime / Holiday Work: ${event.target.value}`); }} /></Field>
                      </div>
                      <Field label="OT start time"><TimeMaskInput required disabled={disabled} value={overtimeEmployee.workStart} onChange={(value) => { updateEmployee(0, "workStart", value); update("startTime", value); }} quickTimes={["08:00", "17:20"]} /></Field>
                      <Field label="OT end time"><TimeMaskInput required disabled={disabled} value={overtimeEmployee.workEnd} onChange={(value) => { updateEmployee(0, "workEnd", value); update("endTime", value); }} quickTimes={["16:45", "19:00", "20:00"]} /></Field>
                    </div>
                    <div className="flex items-center justify-between border-y border-line bg-[#fafbfc] px-3.5 py-3 text-sm">
                      <span className="text-gray-600">Calculated OT duration</span>
                      <strong className="text-ink">{overtimeDuration(overtimeEmployee.workStart, overtimeEmployee.workEnd) ?? "Check the time range"}</strong>
                    </div>
                    <fieldset>
                      <legend className="text-[13px] font-semibold text-gray-700">Transportation requirement</legend>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <label className={`flex min-h-[72px] gap-3 border p-3.5 ${overtimeEmployee.transportRequired ? "border-brand bg-brand-light/60" : "border-gray-300"}`}>
                          <input type="radio" name="manage-transport" disabled={disabled} checked={overtimeEmployee.transportRequired} onChange={() => updateEmployee(0, "transportRequired", true)} className="mt-1 h-4 w-4 accent-brand" />
                          <span><strong className="block text-sm text-ink">Transportation required</strong><span className="mt-1 block text-xs text-gray-500">GA can plan now and confirm transport after OT verification.</span></span>
                        </label>
                        <label className={`flex min-h-[72px] gap-3 border p-3.5 ${!overtimeEmployee.transportRequired ? "border-brand bg-brand-light/60" : "border-gray-300"}`}>
                          <input type="radio" name="manage-transport" disabled={disabled} checked={!overtimeEmployee.transportRequired} onChange={() => updateEmployee(0, "transportRequired", false)} className="mt-1 h-4 w-4 accent-brand" />
                          <span><strong className="block text-sm text-ink">No transportation required</strong><span className="mt-1 block text-xs text-gray-500">No vehicle assignment will be created.</span></span>
                        </label>
                      </div>
                    </fieldset>
                    {overtimeEmployee.transportRequired ? (
                      <Field label="Drop-off location"><Input required disabled={disabled} value={overtimeEmployee.busStop} onChange={(event) => updateEmployee(0, "busStop", event.target.value)} /></Field>
                    ) : (
                      <p className="border border-green-200 bg-green-50 px-3.5 py-3 text-sm text-green-800">No vehicle assignment is required for this request.</p>
                    )}
                  </div>
                </section>

                <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="button" variant="secondary" disabled={saving} onClick={() => load()}><RefreshCw size={16} /> Reload</Button>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button type="button" variant="danger" disabled={saving || !permissions.canCancel} onClick={cancel}>Cancel request</Button>
                    <Button disabled={saving || !permissions.canEdit || !otWindowOpen}>{saving ? "Saving…" : request.status === "changes_requested" ? "Resubmit request" : "Save changes"}</Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Outside Company Requisition Form (Stacked cards layout) */
              <div className="space-y-5">
                <Card className="p-5">
                  <h2 className="mb-4 font-bold">Requester information</h2>
                  <div className="border border-line bg-canvas p-4 rounded-lg grid gap-4 sm:grid-cols-2">
                    <Field label="Employee number">
                      <Input
                        disabled={disabled}
                        value={request.requester.employeeId ?? ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 7);
                          updateRequester("employeeId", val);
                        }}
                      />
                    </Field>
                    <Field label="Department">
                      <Select
                        required
                        disabled={disabled}
                        value={request.requester.department}
                        onChange={(e) =>
                          updateRequester("department", e.target.value)
                        }
                      >
                        <option value="">Select Dept</option>
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                        {request.requester.department &&
                          !DEPARTMENTS.includes(
                            request.requester.department,
                          ) && (
                            <option value={request.requester.department}>
                              {request.requester.department}
                            </option>
                          )}
                      </Select>
                    </Field>
                    <CompanyUserField
                      label="Employee name"
                      required
                      disabled={disabled}
                      value={request.requester.name}
                      onChange={(val) => updateRequester("name", val)}
                      placeholder="Search name or email..."
                      onSelectUser={(person) => {
                        updateRequester("name", person.displayName);
                        if (person.department)
                          updateRequester("department", person.department);
                        if (person.employeeId)
                          updateRequester("employeeId", person.employeeId);
                      }}
                    />
                    <Field label="Company email">
                      <Input
                        required
                        disabled
                        type="email"
                        value={request.requester.email}
                      />
                    </Field>
                  </div>
                </Card>

                {request.requestType === "outside_company" && (
                <Card className="p-5">
                  <h2 className="mb-4 font-bold">Approver</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <CompanyUserField
                      label="Approver name"
                      required
                      disabled={disabled}
                      value={request.approver.name}
                      onChange={(val) => { updateApprover("name", val); updateApprover("email", ""); }}
                      placeholder="Search manager name or email..."
                      onSelectUser={(person) => {
                        updateApprover("name", person.displayName);
                        updateApprover("email", person.mail);
                      }}
                    />
                    <Field label="Approver email">
                      <Input
                        required
                        disabled={disabled}
                        type="email"
                        value={request.approver.email}
                        onChange={(e) =>
                          updateApprover("email", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                </Card>
                )}

                <Card className="p-5">
                  <h2 className="mb-4 font-bold">Request details</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Request type">
                      <Select
                        disabled={disabled}
                        value={request.requestType}
                        onChange={(e) =>
                          switchRequestType(e.target.value as RequestType)
                        }
                      >
                        <option value="outside_company">
                          CAR SERVICE REQUISITION
                        </option>
                        <option value="overtime">OVERTIME / HOLIDAY WORK</option>
                      </Select>
                    </Field>
                    <Field label="Using date">
                      <Input
                        required
                        disabled={disabled}
                        type="date"
                        lang="en-US"
                        value={request.usingDate}
                        onChange={(e) => update("usingDate", e.target.value)}
                      />
                    </Field>
                    <Field label="Start time">
                      <Input
                        required
                        disabled={disabled}
                        type="time"
                        value={request.startTime}
                        onChange={(e) => update("startTime", e.target.value)}
                      />
                    </Field>
                    <Field label="End time">
                      <Input
                        required
                        disabled={disabled}
                        type="time"
                        value={request.endTime}
                        onChange={(e) => update("endTime", e.target.value)}
                      />
                    </Field>
                    <Field label="Pickup location">
                      <Input
                        required
                        disabled={disabled}
                        value={request.pickupLocation}
                        onChange={(e) =>
                          update("pickupLocation", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Destination">
                      <Input
                        required
                        disabled={disabled}
                        value={request.destination}
                        onChange={(e) => update("destination", e.target.value)}
                      />
                    </Field>
                    <Field label="Meeting point">
                      <Select
                        disabled={disabled}
                        value={request.meetingPoint}
                        onChange={(e) =>
                          update(
                            "meetingPoint",
                            e.target.value as "front_area" | "loading_area",
                          )
                        }
                      >
                        <option value="front_area">Front area</option>
                        <option value="loading_area">Loading area</option>
                      </Select>
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Field label="Purpose / work summary">
                      <Textarea
                        required
                        disabled={disabled}
                        value={request.purpose}
                        onChange={(e) => update("purpose", e.target.value)}
                      />
                    </Field>
                  </div>
                  {request.destination.trim() && (
                    <div className="mt-4">
                      <GoogleMapLinks
                        origin={request.pickupLocation}
                        destination={request.destination}
                      />
                    </div>
                  )}
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Passenger names (one per line)">
                      <Textarea
                        disabled={disabled}
                        value={request.passengers.join("\n")}
                        onChange={(e) =>
                          update(
                            "passengers",
                            e.target.value
                              .split("\n")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          )
                        }
                      />
                    </Field>
                    <label className="flex items-center gap-3 self-start pt-8 text-sm">
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={Boolean(request.withStaff)}
                        onChange={(e) => update("withStaff", e.target.checked)}
                        className="h-4 w-4 accent-brand"
                      />
                      Travel with GA staff
                    </label>
                  </div>
                </Card>

                {/* Actions outside split column */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => load()}
                  >
                    <RefreshCw size={16} /> Reload
                  </Button>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="danger"
                      disabled={saving || !permissions.canCancel}
                      onClick={cancel}
                    >
                      Cancel request
                    </Button>
                    <Button disabled={saving || !permissions.canEdit}>
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      {request && request.requestType === "overtime" && (
        <>
          {/* Floating Guidelines Sidebar Tab */}
          <button
            type="button"
            onClick={() => setShowGuidelines(true)}
            className="fixed bottom-6 left-4 z-40 flex items-center gap-2 border border-brand-dark bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-modal transition hover:bg-brand-dark"
          >
            <Clock3 size={17} />
            <span>OT rules</span>
          </button>

          {/* Guidelines Modal Popup */}
          {showGuidelines && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 animate-fade-in">
              <div className="relative w-full max-w-5xl overflow-hidden border border-white/20 bg-white shadow-modal">
                <button
                  type="button"
                  onClick={() => setShowGuidelines(false)}
                  aria-label="Close OT rules"
                  className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center border border-white/20 bg-black/10 text-xl font-medium leading-none text-white transition hover:bg-white/15"
                >
                  &times;
                </button>

                <div className="max-h-[82vh] overflow-y-auto">
                  <OtGuidelines />
                </div>

                <div className="flex justify-end border-t border-line bg-white px-5 py-3 sm:px-7">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowGuidelines(false)}
                    className="px-5"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function normalizeRequest(raw: ManagedRequest): ManagedRequest {
  return {
    ...raw,
    passengers: Array.isArray(raw.passengers) ? raw.passengers : [],
    overtimeEmployees:
      Array.isArray(raw.overtimeEmployees) && raw.overtimeEmployees.length
        ? raw.overtimeEmployees
        : [emptyEmployee()],
    meetingPoint:
      raw.meetingPoint === "loading_area" ? "loading_area" : "front_area",
    withStaff: Boolean(raw.withStaff),
  };
}

function validate(request: ManagedRequest) {
  if (!request.requester.name.trim()) return "Requester name is required.";
  if (!request.requester.department.trim()) return "Department is required.";
  if (
    request.requestType === "outside_company" &&
    (!request.approver.name.trim() || !request.approver.email.trim())
  ) return "Approver is required.";
  if (!request.usingDate || !request.startTime || !request.endTime)
    return "Date and time are required.";
  if (request.endTime <= request.startTime)
    return "End time must be after start time.";
  if (!request.purpose.trim()) return "Purpose is required.";
  if (request.requestType === "outside_company") {
    if (!request.pickupLocation.trim() || !request.destination.trim())
      return "Pickup location and destination are required.";
  }
  if (request.requestType === "overtime") {
    if (!request.overtimeEmployees.length)
      return "At least one OT employee is required.";
    const incomplete = request.overtimeEmployees.some(
      (item) =>
        !item.employeeId.trim() ||
        !item.employeeName.trim() ||
        item.workEnd <= item.workStart ||
        !Number.isFinite(item.totalWeeklyHours) ||
        item.totalWeeklyHours < 0 ||
        item.totalWeeklyHours > 60 ||
        (item.transportRequired && !item.busStop.trim()),
    );
    if (incomplete)
      return "Complete every OT employee row, including valid time, weekly hours, and bus stop when transportation is required.";
  }
  return "";
}
