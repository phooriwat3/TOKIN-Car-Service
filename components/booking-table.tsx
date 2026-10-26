"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDownUp,
  Car,
  CheckSquare,
  ChevronRight,
  Clock,
  Download,
  Filter,
  RotateCcw,
  Search,
  Square,
  User,
  X,
} from "lucide-react";
import {
  addDays,
  format,
  isToday,
  isTomorrow,
  isWithinInterval,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import type { Booking } from "@/lib/types";
import { Badge, Button, Empty, Input, TableSkeleton } from "./ui";
import { statusLabel } from "@/lib/business";
import { maskEmployeeId } from "@/lib/privacy";
import {
  AdminBatchAssignModal,
  AdminSmartGroupingSection,
} from "./admin-batch-assignment-modal";
import type { SmartGroup } from "@/lib/smart-grouping";
import { useBookingsQuery } from "@/lib/hooks/use-bookings-query";
import {
  bookingMatchesOperationalStage,
  countBookingsByOperationalStage,
  getOperationalStage,
  isBookingReadyForAssignment,
  isOperationalStage,
  operationalStageDescriptions,
  operationalStageLabels,
  operationalStageOrder,
  type OperationalStage,
} from "@/lib/operations-queue";

type DatePreset =
  | "all"
  | "today"
  | "tomorrow"
  | "this_week"
  | "this_month"
  | "custom";

const queueDetails = {
  urgent: {
    title: "Urgent requests",
    description: "Showing open requests marked urgent.",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
  },
  ot_verification: {
    title: "OT verification queue",
    description: "Showing overtime transport requests awaiting HR/GA verification.",
    tone: "border-violet-200 bg-violet-50 text-violet-900",
  },
  unassigned: {
    title: "Unassigned approved trips",
    description: "Showing approved trips that still need a vehicle and driver assignment.",
    tone: "border-blue-200 bg-blue-50 text-blue-900",
  },
} as const;

type OperationsQueue = keyof typeof queueDetails;

const stageTabStyles: Record<
  OperationalStage,
  { active: string; idle: string; count: string }
> = {
  all: {
    active: "border-brand-900 bg-brand-900 text-white",
    idle: "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-800",
    count: "bg-white/15 text-current",
  },
  needs_review: {
    active: "border-amber-500 bg-amber-500 text-brand-950",
    idle: "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400",
    count: "bg-white/45 text-current",
  },
  ready_to_plan: {
    active: "border-blue-600 bg-blue-600 text-white",
    idle: "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-400",
    count: "bg-white/20 text-current",
  },
  assigned: {
    active: "border-emerald-600 bg-emerald-600 text-white",
    idle: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400",
    count: "bg-white/20 text-current",
  },
  in_progress: {
    active: "border-violet-600 bg-violet-600 text-white",
    idle: "border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-400",
    count: "bg-white/20 text-current",
  },
  completed: {
    active: "border-slate-700 bg-slate-700 text-white",
    idle: "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400",
    count: "bg-white/20 text-current",
  },
};

export function BookingTable({
  bookings,
  basePath = "/bookings",
  isLoading = false,
  serverMode = false,
}: {
  bookings: Booking[];
  basePath?: string;
  isLoading?: boolean;
  serverMode?: boolean;
}) {
  const isAdmin = basePath.includes("/admin");
  const searchParams = useSearchParams();
  const queueParam = searchParams.get("queue");
  const operationsQueue =
    queueParam && queueParam in queueDetails
      ? (queueParam as OperationsQueue)
      : null;
  const stageParam = searchParams.get("stage");
  const requestedStage: OperationalStage = isOperationalStage(stageParam)
    ? stageParam
    : operationsQueue === "unassigned"
      ? "ready_to_plan"
      : operationsQueue === "ot_verification"
        ? "needs_review"
        : "all";

  // Filter States
  const [activeTab, setActiveTab] = useState<OperationalStage>(requestedStage);
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedServiceType, setSelectedServiceType] = useState<
    "all" | "car_service" | "overtime"
  >("all");
  const [selectedAssignmentStatus, setSelectedAssignmentStatus] = useState<
    "all" | "unassigned" | "assigned"
  >("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [serverPage, setServerPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Selection & Modal States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [groupForModal, setGroupForModal] = useState<Booking[] | null>(null);

  useEffect(() => {
    setActiveTab(requestedStage);
  }, [requestedStage]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setServerPage(1);
  }, [
    activeTab,
    debouncedSearch,
    datePreset,
    customStartDate,
    customEndDate,
    selectedDepartment,
    selectedServiceType,
    selectedAssignmentStatus,
    operationsQueue,
  ]);

  const serverDateFilters = useMemo(() => {
    const now = new Date();
    if (datePreset === "today") return { usingDate: format(now, "yyyy-MM-dd") };
    if (datePreset === "tomorrow")
      return { usingDate: format(addDays(now, 1), "yyyy-MM-dd") };
    if (datePreset === "this_week")
      return {
        dateFrom: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        dateTo: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    if (datePreset === "this_month")
      return {
        dateFrom: format(startOfMonth(now), "yyyy-MM-dd"),
        dateTo: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    if (datePreset === "custom")
      return {
        dateFrom: customStartDate || undefined,
        dateTo: customEndDate || undefined,
      };
    return {};
  }, [datePreset, customStartDate, customEndDate]);

  const serverQuery = useBookingsQuery(
    {
      page: serverPage,
      limit: 25,
      stage: activeTab === "all" ? undefined : activeTab,
      department: selectedDepartment === "all" ? undefined : selectedDepartment,
      search: debouncedSearch || undefined,
      requestType:
        selectedServiceType === "all"
          ? undefined
          : selectedServiceType === "car_service"
            ? "outside_company"
            : "overtime",
      assignmentStatus:
        selectedAssignmentStatus === "all"
          ? undefined
          : selectedAssignmentStatus,
      urgent: operationsQueue === "urgent" || undefined,
      otVerification: operationsQueue === "ot_verification" || undefined,
      ...serverDateFilters,
    },
    { enabled: isAdmin && serverMode },
  );
  const sourceBookings =
    isAdmin && serverMode && serverQuery.data ? serverQuery.data.data : bookings;

  // Department List from dataset
  const departments = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach((b) => {
      if (b.department) set.add(b.department);
    });
    return Array.from(set).sort();
  }, [bookings]);

  // Tab counts
  const tabCounts = useMemo(
    () =>
      isAdmin && serverMode && serverQuery.data?.facets?.stages
        ? serverQuery.data.facets.stages
        : countBookingsByOperationalStage(bookings),
    [bookings, isAdmin, serverMode, serverQuery.data],
  );

  // Filtered dataset based on tab and advanced criteria
  const processedBookings = useMemo(() => {
    const now = new Date();
    return sourceBookings.filter((b) => {
      const hasAssignment = Boolean(
        b.assignment?.vehicleId || b.assignment?.manualTransportUnits?.length,
      );

      if (operationsQueue === "urgent" && !b.urgent) return false;
      if (
        operationsQueue === "ot_verification" &&
        b.status !== "pending_ot_verification"
      )
        return false;
      if (
        operationsQueue === "unassigned" &&
        (!['approved', 'assigned', 'scheduled'].includes(b.status) || hasAssignment)
      )
        return false;

      // 1. GA operational stage filter
      if (!bookingMatchesOperationalStage(b, activeTab)) return false;

      // 2. Department filter
      if (
        selectedDepartment !== "all" &&
        b.department !== selectedDepartment
      ) {
        return false;
      }

      // 3. Service type filter
      if (selectedServiceType === "overtime") {
        const isOt =
          b.requestType === "overtime" ||
          (b.overtimeEmployees && b.overtimeEmployees.length > 0) ||
          b.category === "overtime_transport";
        if (!isOt) return false;
      } else if (selectedServiceType === "car_service") {
        const isOt =
          b.requestType === "overtime" ||
          (b.overtimeEmployees && b.overtimeEmployees.length > 0) ||
          b.category === "overtime_transport";
        if (isOt) return false;
      }

      // 4. Assignment status filter
      if (selectedAssignmentStatus === "unassigned") {
        if (
          hasAssignment
        )
          return false;
      } else if (selectedAssignmentStatus === "assigned") {
        if (
          !hasAssignment
        )
          return false;
      }

      // 5. Date filter
      if (b.usingDate) {
        try {
          const dateObj = parseISO(b.usingDate);
          if (datePreset === "today" && !isToday(dateObj)) return false;
          if (datePreset === "tomorrow" && !isTomorrow(dateObj)) return false;
          if (datePreset === "this_week") {
            const start = startOfWeek(now, { weekStartsOn: 1 });
            const end = endOfWeek(now, { weekStartsOn: 1 });
            if (!isWithinInterval(dateObj, { start, end })) return false;
          }
          if (datePreset === "this_month") {
            const start = startOfMonth(now);
            const end = endOfMonth(now);
            if (!isWithinInterval(dateObj, { start, end })) return false;
          }
          if (datePreset === "custom") {
            if (customStartDate && b.usingDate < customStartDate) return false;
            if (customEndDate && b.usingDate > customEndDate) return false;
          }
        } catch {
          // keep row if date parsing fails
        }
      }

      return true;
    });
  }, [
    sourceBookings,
    activeTab,
    selectedDepartment,
    selectedServiceType,
    selectedAssignmentStatus,
    operationsQueue,
    datePreset,
    customStartDate,
    customEndDate,
  ]);

  const hasActiveAdvancedFilters =
    selectedDepartment !== "all" ||
    selectedServiceType !== "all" ||
    selectedAssignmentStatus !== "all" ||
    datePreset !== "all";

  const resetFilters = () => {
    setSelectedDepartment("all");
    setSelectedServiceType("all");
    setSelectedAssignmentStatus("all");
    setDatePreset("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSearchQuery("");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (rows: Booking[]) => {
    const assignableRows = rows.filter(isBookingReadyForAssignment);
    const allAssignableSelected =
      assignableRows.length > 0 &&
      assignableRows.every((row) => selectedIds.has(row.id));

    if (allAssignableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assignableRows.map((row) => row.id)));
    }
  };

  const selectedBookings = useMemo(() => {
    if (groupForModal) return groupForModal;
    return sourceBookings.filter((b) => selectedIds.has(b.id));
  }, [sourceBookings, selectedIds, groupForModal]);

  // Export to CSV Function
  const exportToCSV = (items: Booking[]) => {
    if (!items.length) return;
    const headers = [
      "Booking No",
      "Using Date",
      "Start Time",
      "End Time",
      "Type",
      "Department",
      "Requester",
      "Employee ID",
      "Pickup Location",
      "Destination",
      "Passengers",
      "Status",
      "Vehicle Plate",
      "Driver Name",
      "Purpose",
    ];

    const csvRows = items.map((b) => {
      const isOt =
        b.requestType === "overtime" ||
        (b.overtimeEmployees && b.overtimeEmployees.length > 0) ||
        b.category === "overtime_transport";
      const vehicle = b.assignment?.manualTransportUnits?.[0]?.licensePlate || "";
      const driver = b.assignment?.manualTransportUnits?.[0]?.driverName || "";

      return [
        `"${b.bookingNo || ""}"`,
        `"${b.usingDate || ""}"`,
        `"${b.startTime || ""}"`,
        `"${b.endTime || ""}"`,
        `"${isOt ? "Overtime Transport" : "Off-site Business Transport"}"`,
        `"${b.department || ""}"`,
        `"${b.requesterName || ""}"`,
        `"${b.requesterEmployeeId || ""}"`,
        `"${b.pickupLocation || ""}"`,
        `"${(b.destination || "").replace(/"/g, '""')}"`,
        `"${b.numPassengers || 1}"`,
        `"${b.status || ""}"`,
        `"${vehicle}"`,
        `"${driver}"`,
        `"${(b.purpose || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `TOKIN_Fleet_Bookings_${format(new Date(), "yyyyMMdd_HHmm")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = useMemo(() => {
    const column = createColumnHelper<Booking>();
    const cols = [];

    if (isAdmin) {
      cols.push(
        column.display({
          id: "select",
          header: () => null,
          cell: (info) => {
            const canAssign = isBookingReadyForAssignment(info.row.original);
            const isSelected = selectedIds.has(info.row.original.id);

            if (!canAssign) {
              return (
                <span
                  className="block h-[18px] w-[18px] rounded border border-slate-200 bg-slate-50"
                  title="Only requests in Ready to plan can be batch assigned"
                  aria-label="Not available for batch assignment"
                />
              );
            }

            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(info.row.original.id);
                }}
                className="text-gray-400 hover:text-brand"
                aria-label="Select request"
              >
                {isSelected ? (
                  <CheckSquare size={18} className="text-brand fill-brand/10" />
                ) : (
                  <Square size={18} />
                )}
              </button>
            );
          },
        }),
      );
    }

    cols.push(
      column.accessor("bookingNo", {
        header: "Request",
        cell: (info) => {
          const isOt =
            info.row.original.requestType === "overtime" ||
            (info.row.original.overtimeEmployees &&
              info.row.original.overtimeEmployees.length > 0) ||
            info.row.original.category === "overtime_transport";
          return (
            <div>
              <Link
                className="font-semibold text-brand hover:text-brand-dark hover:underline"
                href={`${basePath}/${info.row.original.id}`}
              >
                {info.getValue()}
              </Link>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    isOt
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {isOt ? "OT Transport" : "Off-site Transport"}
                </span>
                {info.row.original.urgent && (
                  <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    Urgent
                  </span>
                )}
              </div>
            </div>
          );
        },
      }),
      column.accessor("usingDate", {
        header: "Date & Time",
        cell: (info) => (
          <div>
            <p className="font-medium text-ink">{info.getValue()}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
              <Clock size={12} className="text-gray-400" />
              {info.row.original.startTime}–{info.row.original.endTime}
            </p>
          </div>
        ),
      }),
      column.accessor("destination", {
        header: "Route / Destination",
        cell: (info) => (
          <div className="max-w-[200px]">
            <p className="truncate font-medium text-ink" title={info.getValue()}>
              {info.getValue()}
            </p>
            <p className="truncate text-xs text-gray-500" title={info.row.original.pickupLocation}>
              From: {info.row.original.pickupLocation}
            </p>
          </div>
        ),
      }),
      column.accessor(
        (row) =>
          [row.requesterName, row.requesterEmployeeId, row.department]
            .filter(Boolean)
            .join(" "),
        {
          id: "requester",
          header: "Requester / Dept",
          cell: (info) => (
            <div>
              <p className="font-medium text-ink">
                {info.row.original.requesterName}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {isAdmin
                  ? info.row.original.requesterEmployeeId || "No ID"
                  : maskEmployeeId(
                      info.row.original.requesterEmployeeId,
                      "requester",
                    ) || "No ID"}{" "}
                ·{" "}
                <span className="font-medium text-gray-700">
                  {info.row.original.department}
                </span>
              </p>
            </div>
          ),
        },
      ),
      column.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge status={info.getValue()}>
            {statusLabel(info.getValue())}
          </Badge>
        ),
      }),
    );

    if (isAdmin) {
      cols.push(
        column.display({
          id: "assignment",
          header: "Fleet Assignment",
          cell: (info) => {
            const b = info.row.original;
            const units = b.assignment?.manualTransportUnits;
            const hasAssignedUnit = units && units.length > 0;
            const vehicle = hasAssignedUnit ? units[0].licensePlate : null;
            const driver = hasAssignedUnit ? units[0].driverName : null;

            if (vehicle || driver) {
              return (
                <div className="space-y-0.5 text-xs">
                  <div className="flex items-center gap-1 font-semibold text-slate-800">
                    <Car size={13} className="text-brand" />
                    <span>{vehicle || "Plate N/A"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <User size={12} className="text-gray-400" />
                    <span>{driver || "Driver N/A"}</span>
                  </div>
                </div>
              );
            }

            if (["approved", "pending_approval"].includes(b.status)) {
              return (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Unassigned
                </span>
              );
            }

            return <span className="text-xs text-gray-400">—</span>;
          },
        }),
        column.display({
          id: "actions",
          header: "Action",
          cell: (info) => {
            const stage = getOperationalStage(info.row.original);
            const label =
              stage === "ready_to_plan"
                ? "Assign"
                : stage === "needs_review"
                  ? "Review"
                  : "Open";

            return (
              <Link
                href={`${basePath}/${info.row.original.id}`}
                className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 text-xs font-bold transition ${
                  stage === "ready_to_plan"
                    ? "border-brand-600 bg-brand-600 text-white hover:bg-brand-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {label}
                <ChevronRight size={13} />
              </Link>
            );
          },
        }),
      );
    }

    return cols;
  }, [basePath, isAdmin, selectedIds]);

  const table = useReactTable({
    data: processedBookings,
    columns,
    state: { globalFilter: searchQuery },
    onGlobalFilterChange: setSearchQuery,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const filteredBookings = useMemo(
    () => rows.map((r) => r.original),
    [rows],
  );
  const filteredAssignableBookings = useMemo(
    () => filteredBookings.filter(isBookingReadyForAssignment),
    [filteredBookings],
  );

  return (
    <div className="space-y-4">
      {/* Smart Grouping Suggestion Cards for Admin */}
      {isAdmin && (
        <AdminSmartGroupingSection
          onSelectGroup={(group: SmartGroup) => {
            setGroupForModal(group.bookings);
            setBatchModalOpen(true);
          }}
        />
      )}

      {operationsQueue && (
        <div className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${queueDetails[operationsQueue].tone}`}>
          <div>
            <p className="font-semibold text-sm">{queueDetails[operationsQueue].title}</p>
            <p className="mt-0.5 text-xs">{queueDetails[operationsQueue].description}</p>
          </div>
          <Link
            href="/admin/bookings"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-current/20 bg-white/70 px-3 py-2 text-xs font-semibold transition hover:bg-white"
          >
            Clear queue
          </Link>
        </div>
      )}

      {isAdmin && serverMode && serverQuery.error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
          <span>{serverQuery.error.message || "Unable to refresh the booking queue."}</span>
          <Button type="button" size="sm" variant="secondary" onClick={() => void serverQuery.refetch()}>
            <RotateCcw size={14} /> Try again
          </Button>
        </div>
      )}

      {/* GA workflow stages stay separate from date and service filters. */}
      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-card" aria-labelledby="operations-stage-title">
        <div className="mb-3 flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p id="operations-stage-title" className="text-sm font-bold text-slate-900">Operational queue</p>
            <p className="text-xs text-slate-500">Move from review to planning, dispatch, and completion.</p>
          </div>
          <p className="text-xs font-medium text-slate-500" aria-live="polite">
            {operationalStageDescriptions[activeTab]}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Booking workflow stage">
          {operationalStageOrder.map((stage) => {
            const active = activeTab === stage;
            const styles = stageTabStyles[stage];
            return (
              <button
                key={stage}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(stage)}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold transition ${active ? `${styles.active} shadow-sm` : styles.idle}`}
              >
                <span>{operationalStageLabels[stage]}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${styles.count}`}>
                  {tabCounts[stage]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        {/* Search and Filter Toolbar */}
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            {/* Search Box */}
            <div className="relative flex-1 sm:max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <Input
                className="h-9 pl-9 text-xs"
                aria-label="Search requests"
                placeholder="Search request ID, destination, employee, plate…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Toggle & Export Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={showAdvancedFilters || hasActiveAdvancedFilters ? "primary" : "secondary"}
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                className="gap-1.5 text-xs"
              >
                <Filter size={14} />
                <span>Filters</span>
                {hasActiveAdvancedFilters && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-amber-300" />
                )}
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => exportToCSV(filteredBookings)}
                className="gap-1.5 text-xs"
                title="Export filtered records to CSV"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* Advanced Multi-Filters Panel */}
          {showAdvancedFilters && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs animate-fade-in">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Date Preset */}
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    Date Range
                  </label>
                  <select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                    className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month</option>
                    <option value="custom">Custom Date Range…</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Type */}
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    Service Type
                  </label>
                  <select
                    value={selectedServiceType}
                    onChange={(e) =>
                      setSelectedServiceType(
                        e.target.value as "all" | "car_service" | "overtime",
                      )
                    }
                    className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="car_service">Off-site Business Transport</option>
                    <option value="overtime">Overtime Transport (OT)</option>
                  </select>
                </div>

                {/* Assignment Status */}
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    Assignment Status
                  </label>
                  <select
                    value={selectedAssignmentStatus}
                    onChange={(e) =>
                      setSelectedAssignmentStatus(
                        e.target.value as "all" | "unassigned" | "assigned",
                      )
                    }
                    className="w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="unassigned">Unassigned (Needs Fleet)</option>
                    <option value="assigned">Assigned (Has Vehicle/Driver)</option>
                  </select>
                </div>
              </div>

              {/* Custom Date Range Inputs */}
              {datePreset === "custom" && (
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">From:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="rounded border border-line bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">To:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="rounded border border-line bg-white px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Active Filter Reset */}
              {hasActiveAdvancedFilters && (
                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                  <span className="text-slate-500">
                    Showing filtered subset ({rows.length} of {bookings.length} requests)
                  </span>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex items-center gap-1 font-semibold text-rose-600 hover:underline"
                  >
                    <RotateCcw size={12} />
                    Reset all filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Row selection & count summary */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-ink">{rows.length}</strong>{" "}
                {rows.length === 1 ? "request" : "requests"}
                {isAdmin && serverMode && serverQuery.data
                  ? ` of ${serverQuery.data.pagination.total}`
                  : ""}
              </span>
              {isAdmin && serverMode && serverQuery.isFetching && !serverQuery.isLoading && (
                <span className="inline-flex items-center gap-1 font-medium text-brand-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                  Updating
                </span>
              )}
              {isAdmin && filteredAssignableBookings.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleSelectAll(filteredBookings)}
                  className="font-semibold text-brand hover:underline"
                >
                  {filteredAssignableBookings.every((booking) =>
                    selectedIds.has(booking.id),
                  )
                    ? "Deselect ready requests"
                    : "Select ready requests on this page"}
                </button>
              )}
            </div>

            {selectedIds.size > 0 && (
              <span className="font-semibold text-brand">
                {selectedIds.size} selected
              </span>
            )}
          </div>
        </div>

        {isLoading || (isAdmin && serverMode && serverQuery.isLoading) ? (
          <div className="p-4">
            <TableSkeleton rows={8} columns={6} />
          </div>
        ) : rows.length === 0 ? (
          <Empty
            title="No matching requests"
            body={
              searchQuery || hasActiveAdvancedFilters
                ? "Clear or adjust your filters to view more records."
                : activeTab === "all"
                  ? "New requests will appear here."
                  : `No requests are currently in ${operationalStageLabels[activeTab].toLowerCase()}.`
            }
          />
        ) : (
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-line bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th
                        key={header.id}
                        className="whitespace-nowrap px-4 py-3.5"
                      >
                        {header.column.id === "select" ? (
                          <span className="sr-only">Select</span>
                        ) : (
                          <button
                            className="flex items-center gap-1.5 hover:text-ink"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            <ArrowDownUp size={12} className="text-gray-400" />
                          </button>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => {
                  const isSelected = selectedIds.has(row.original.id);
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-brand-50/70 hover:bg-brand-50"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3.5 text-gray-600">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {isAdmin && serverMode && serverQuery.data && serverQuery.data.pagination.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Page <strong className="text-slate-900">{serverQuery.data.pagination.page}</strong> of{" "}
              <strong className="text-slate-900">{serverQuery.data.pagination.totalPages}</strong>
              {" · "}{serverQuery.data.pagination.total} matching requests
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={serverPage <= 1 || serverQuery.isFetching}
                onClick={() => setServerPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!serverQuery.data.pagination.hasMore || serverQuery.isFetching}
                onClick={() => setServerPage((page) => page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Batch Action Bar when rows are selected */}
      {isAdmin && selectedIds.size > 0 && !batchModalOpen && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-white shadow-2xl animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold">
              {selectedIds.size}
            </span>
            <span className="text-sm font-semibold">selected</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <Button
            size="sm"
            className="gap-2 bg-brand text-xs hover:bg-brand-dark"
            onClick={() => {
              setGroupForModal(null);
              setBatchModalOpen(true);
            }}
          >
            <Car size={14} />
            Batch Assign Fleet
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
            onClick={() => exportToCSV(selectedBookings)}
          >
            <Download size={14} />
            Export Selected CSV
          </Button>

          <button
            type="button"
            className="text-xs text-slate-400 hover:text-white hover:underline"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Batch Assignment Modal */}
      {batchModalOpen && (
        <AdminBatchAssignModal
          selectedBookings={selectedBookings}
          onClose={() => {
            setBatchModalOpen(false);
            setGroupForModal(null);
            setSelectedIds(new Set());
          }}
        />
      )}
    </div>
  );
}

