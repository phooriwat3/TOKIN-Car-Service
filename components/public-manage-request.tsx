"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
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
  pending_approval: "Pending approval",
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
  const [showGuidelines, setShowGuidelines] = useState(true);
  const otWindowOpen = useMemo(() => isOtRequestWindowOpen(), []);

  useEffect(() => {
    if (initialToken) load(initialToken);
  }, [initialToken]);

  const disabled = saving || !permissions.canEdit || !request;

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
        "OT requests can be edited only from 08:00 to 17:00 (Thailand time).",
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
              status: "pending_approval",
              revisionNo: Number(result.revisionNo ?? current.revisionNo + 1),
            }
          : current,
      );
      setPermissions({ canEdit: true, canCancel: true });
      setState("saved");
      setMessage(
        "Request updated and sent back for approval. Please use this latest page if you need to edit again.",
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

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-[#17345f] px-5 py-4 text-white">
        <div className="mx-auto flex h-16 max-w-6xl lg:max-w-none lg:px-14 items-center justify-between">
          <div>
            <p className="font-bold">TOKIN Transport</p>
            <p className="text-xs text-blue-200">Request management</p>
          </div>
          <a href="/request" className="text-xs text-blue-200 hover:text-white">
            New request
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl lg:max-w-none lg:px-14 p-4 py-8 md:p-8">
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
              /* Overtime form layout (stacked layout: top grid, bottom employees table) */
              <div className="space-y-5">
                {/* Top Section: Requester and Approver in grid on Desktop, stack on Mobile */}
                <div className="grid gap-5 lg:grid-cols-2">
                  <Card className="p-5">
                    <h2 className="mb-4 font-bold">Requester information</h2>
                    <div className="border border-line bg-canvas p-4 rounded-xl grid gap-4 sm:grid-cols-2">
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

                  <Card className="p-5">
                    <h2 className="mb-4 font-bold">Approver</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                      <CompanyUserField
                        label="Approver name"
                        required
                        disabled={disabled}
                        value={request.approver.name}
                        onChange={(val) => updateApprover("name", val)}
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
                </div>

                {/* Bottom Section: Employees List */}
                <div className="space-y-5">
                  {/* Desktop View: Excel-like horizontal table */}
                  <div className="hidden lg:block">
                    <Card className="p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="font-bold">Employees</h2>
                          <p className="text-sm text-gray-500">
                            Add everyone included in this OT request. Type employee
                            name to search directory.
                          </p>
                        </div>
                      </div>
                      {!otWindowOpen && permissions.canEdit && (
                        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                          OT requests can be edited only from 08:00 to 17:00 Thailand
                          time.
                        </p>
                      )}

                      <div className="overflow-x-auto pb-3">
                        <table className="w-full text-left border-collapse min-w-[1050px]">
                          <thead>
                            <tr className="border-b border-line text-xs font-semibold text-gray-400 uppercase">
                              <th className="pb-3 pr-2 w-8 text-center">#</th>
                              <th className="pb-3 pr-2 w-[70px]">Emp No.</th>
                              <th className="pb-3 pr-2 w-[180px]">Employee Name</th>
                              <th className="pb-3 pr-2 w-[160px]">Company Email</th>
                              <th className="pb-3 pr-2 w-[130px]">Work Description</th>
                              <th className="pb-3 pr-2 w-[85px]">OT Start</th>
                              <th className="pb-3 pr-2 w-[85px]">OT End</th>
                              <th className="pb-3 pr-2 w-[85px]">Weekly Hours</th>
                              <th className="pb-3 pr-2 w-[100px]">Transport</th>
                              <th className="pb-3 pr-2 w-[185px]">Bus Stop</th>
                              <th className="pb-3 text-center w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {request.overtimeEmployees.map((employee, index) => (
                              <tr key={index} className="align-middle">
                                <td className="py-3 pr-2 text-sm font-semibold text-gray-400 text-center">
                                  {index + 1}
                                </td>
                                <td className="py-3 pr-2">
                                  <Input
                                    required
                                    disabled={disabled}
                                    className="px-2 text-center"
                                    value={employee.employeeId}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/\D/g, "").slice(0, 7);
                                      updateEmployee(
                                        index,
                                        "employeeId",
                                        val,
                                      );
                                    }}
                                  />
                                </td>
                                <td className="py-3 pr-2">
                                  <CompanyUserField
                                    label=""
                                    required
                                    disabled={disabled}
                                    value={employee.employeeName}
                                    placeholder="Search name..."
                                    onChange={(val) =>
                                      updateEmployee(index, "employeeName", val)
                                    }
                                    onSelectUser={(person) => {
                                      updateEmployee(
                                        index,
                                        "employeeName",
                                        person.displayName,
                                      );
                                      updateEmployee(
                                        index,
                                        "employeeEmail",
                                        person.mail,
                                      );
                                      if (person.employeeId)
                                        updateEmployee(
                                          index,
                                          "employeeId",
                                          person.employeeId,
                                        );
                                    }}
                                  />
                                </td>
                                <td className="py-3 pr-2">
                                  <Input
                                    required={employee.transportRequired}
                                    disabled={disabled}
                                    type="email"
                                    placeholder="name@yageo.com"
                                    value={employee.employeeEmail || ""}
                                    onChange={(e) =>
                                      updateEmployee(
                                        index,
                                        "employeeEmail",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </td>
                                <td className="py-3 pr-2">
                                  <Input
                                    disabled={disabled}
                                    placeholder="Describe work..."
                                    value={employee.workDescription}
                                    onChange={(e) =>
                                      updateEmployee(
                                        index,
                                        "workDescription",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </td>
                                <td className="py-3 pr-2">
                                  <TimeMaskInput
                                    required
                                    disabled={disabled}
                                    value={employee.workStart}
                                    onChange={(val) =>
                                      updateEmployee(index, "workStart", val)
                                    }
                                    quickTimes={["08:00", "17:20"]}
                                  />
                                </td>
                                <td className="py-3 pr-2">
                                  <TimeMaskInput
                                    required
                                    disabled={disabled}
                                    value={employee.workEnd}
                                    onChange={(val) =>
                                      updateEmployee(index, "workEnd", val)
                                    }
                                    quickTimes={["16:45", "19:00", "20:00"]}
                                  />
                                </td>
                                <td className="py-3 pr-2">
                                  <WeeklyHoursInput
                                    required
                                    disabled={disabled}
                                    value={employee.totalWeeklyHours}
                                    onChange={(val) =>
                                      updateEmployee(
                                        index,
                                        "totalWeeklyHours",
                                        val,
                                      )
                                    }
                                  />
                                </td>
                                <td className="py-3 pr-2">
                                  <Select
                                    disabled={disabled}
                                    value={
                                      employee.transportRequired ? "yes" : "no"
                                    }
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
                                </td>
                                <td className="py-3 pr-2">
                                  <Input
                                    required={employee.transportRequired}
                                    disabled={
                                      disabled || !employee.transportRequired
                                    }
                                    value={employee.busStop}
                                    onChange={(e) =>
                                      updateEmployee(
                                        index,
                                        "busStop",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </td>
                                <td className="py-3 text-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={
                                      disabled ||
                                      request.overtimeEmployees.length === 1
                                    }
                                    onClick={() =>
                                      update(
                                        "overtimeEmployees",
                                        request.overtimeEmployees.filter(
                                          (_, itemIndex) => itemIndex !== index,
                                        ),
                                      )
                                    }
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-2 flex justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={disabled}
                          onClick={() =>
                            update("overtimeEmployees", [
                              ...request.overtimeEmployees,
                              emptyEmployee(),
                            ])
                          }
                        >
                          <Plus size={16} /> Add employee
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* Mobile View: Stacked Cards (Layout 1) */}
                  <div className="block lg:hidden space-y-4">
                    <Card className="p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="font-bold">Employees</h2>
                          <p className="text-sm text-gray-500">
                            Add everyone included in this OT request. Type employee
                            name to search directory.
                          </p>
                        </div>
                      </div>
                      {!otWindowOpen && permissions.canEdit && (
                        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                          OT requests can be edited only from 08:00 to 17:00 Thailand
                          time.
                        </p>
                      )}

                      <div className="space-y-4">
                        {request.overtimeEmployees.map((employee, index) => (
                          <div
                            key={index}
                            className="rounded-xl border border-line bg-canvas p-4 shadow-panel"
                          >
                            <div className="mb-3 flex justify-between items-center">
                              <p className="font-bold text-ink text-sm">
                                Employee {index + 1}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={
                                  disabled ||
                                  request.overtimeEmployees.length === 1
                                }
                                onClick={() =>
                                  update(
                                    "overtimeEmployees",
                                    request.overtimeEmployees.filter(
                                      (_, itemIndex) => itemIndex !== index,
                                    ),
                                  )
                                }
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <Field label="Employee number">
                                <Input
                                  required
                                  disabled={disabled}
                                  className="px-2"
                                  value={employee.employeeId}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "").slice(0, 7);
                                    updateEmployee(
                                      index,
                                      "employeeId",
                                      val,
                                    );
                                  }}
                                />
                              </Field>
                              <CompanyUserField
                                label="Employee name"
                                required
                                disabled={disabled}
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
                                  updateEmployee(
                                    index,
                                    "employeeEmail",
                                    person.mail,
                                  );
                                  if (person.employeeId)
                                    updateEmployee(
                                      index,
                                      "employeeId",
                                      person.employeeId,
                                    );
                                }}
                              />
                              <Field label="Company email">
                                <Input
                                  required={employee.transportRequired}
                                  disabled={disabled}
                                  type="email"
                                  placeholder="name@yageo.com"
                                  value={employee.employeeEmail || ""}
                                  onChange={(e) =>
                                    updateEmployee(
                                      index,
                                      "employeeEmail",
                                      e.target.value,
                                    )
                                  }
                                />
                              </Field>
                              <Field label="Work description">
                                <Input
                                  disabled={disabled}
                                  value={employee.workDescription}
                                  onChange={(e) =>
                                    updateEmployee(
                                      index,
                                      "workDescription",
                                      e.target.value,
                                    )
                                  }
                                />
                              </Field>
                              <Field label="OT start">
                                <TimeMaskInput
                                  required
                                  disabled={disabled}
                                  value={employee.workStart}
                                  onChange={(val) =>
                                    updateEmployee(index, "workStart", val)
                                  }
                                  quickTimes={["08:00", "17:20"]}
                                />
                              </Field>
                              <Field label="OT end">
                                <TimeMaskInput
                                  required
                                  disabled={disabled}
                                  value={employee.workEnd}
                                  onChange={(val) =>
                                    updateEmployee(index, "workEnd", val)
                                  }
                                  quickTimes={["16:45", "19:00", "20:00"]}
                                />
                              </Field>
                              <Field label="Weekly hours (max 60)">
                                <WeeklyHoursInput
                                  required
                                  disabled={disabled}
                                  value={employee.totalWeeklyHours}
                                  onChange={(val) =>
                                    updateEmployee(
                                      index,
                                      "totalWeeklyHours",
                                      val,
                                    )
                                  }
                                />
                              </Field>
                              <Field label="Transportation">
                                <Select
                                  disabled={disabled}
                                  value={
                                    employee.transportRequired ? "yes" : "no"
                                  }
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
                                  disabled={
                                    disabled || !employee.transportRequired
                                  }
                                  value={employee.busStop}
                                  onChange={(e) =>
                                    updateEmployee(
                                      index,
                                      "busStop",
                                      e.target.value,
                                    )
                                  }
                                />
                              </Field>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={disabled}
                          onClick={() =>
                            update("overtimeEmployees", [
                              ...request.overtimeEmployees,
                              emptyEmployee(),
                            ])
                          }
                        >
                          <Plus size={16} /> Add employee
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* Actions inside full-width column */}
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
              </div>
            ) : (
              /* Outside Company Requisition Form (Stacked cards layout) */
              <div className="space-y-5">
                <Card className="p-5">
                  <h2 className="mb-4 font-bold">Requester information</h2>
                  <div className="border border-line bg-canvas p-4 rounded-xl grid gap-4 sm:grid-cols-2">
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

                <Card className="p-5">
                  <h2 className="mb-4 font-bold">Approver</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <CompanyUserField
                      label="Approver name"
                      required
                      disabled={disabled}
                      value={request.approver.name}
                      onChange={(val) => updateApprover("name", val)}
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
  if (!request.approver.name.trim() || !request.approver.email.trim())
    return "Approver is required.";
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
