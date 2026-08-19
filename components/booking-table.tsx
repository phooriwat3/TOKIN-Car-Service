"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDownUp, Car, CheckSquare, Search, Sparkles, Square } from "lucide-react";
import type { Booking } from "@/lib/types";
import { Badge, Button, Empty, Input } from "./ui";
import { statusLabel } from "@/lib/business";
import {
  AdminBatchAssignModal,
  AdminSmartGroupingSection,
} from "./admin-batch-assignment-modal";
import type { SmartGroup } from "@/lib/smart-grouping";

export function BookingTable({
  bookings,
  basePath = "/bookings",
}: {
  bookings: Booking[];
  basePath?: string;
}) {
  const [filter, setFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [groupForModal, setGroupForModal] = useState<Booking[] | null>(null);

  const isAdmin = basePath.includes("/admin");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (rows: Booking[]) => {
    if (selectedIds.size === rows.length && rows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };

  const selectedBookings = useMemo(() => {
    if (groupForModal) return groupForModal;
    return bookings.filter((b) => selectedIds.has(b.id));
  }, [bookings, selectedIds, groupForModal]);

  const columns = useMemo(() => {
    const column = createColumnHelper<Booking>();
    const cols = [];

    if (isAdmin) {
      cols.push(
        column.display({
          id: "select",
          header: () => null,
          cell: (info) => {
            const isSelected = selectedIds.has(info.row.original.id);
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(info.row.original.id);
                }}
                className="text-gray-400 hover:text-brand"
                aria-label="Select request for batch assignment"
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
        cell: (info) => (
          <Link
            className="font-semibold text-brand hover:text-brand-dark hover:underline"
            href={`${basePath}/${info.row.original.id}`}
          >
            {info.getValue()}
          </Link>
        ),
      }),
      column.accessor("usingDate", {
        header: "Date and time",
        cell: (info) => (
          <div>
            <p className="font-medium text-ink">{info.getValue()}</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {info.row.original.startTime}–{info.row.original.endTime}
            </p>
          </div>
        ),
      }),
      column.accessor("destination", {
        header: "Destination",
        cell: (info) => (
          <span className="font-medium text-ink">{info.getValue()}</span>
        ),
      }),
      column.accessor(
        (row) =>
          [row.requesterName, row.requesterEmployeeId, row.department]
            .filter(Boolean)
            .join(" "),
        {
          id: "requester",
          header: "Employee / department",
          cell: (info) => (
            <div>
              <p className="font-medium text-ink">
                {info.row.original.requesterName}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {info.row.original.requesterEmployeeId || "No employee number"}{" "}
                · {info.row.original.department}
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

    return cols;
  }, [basePath, isAdmin, selectedIds]);

  const table = useReactTable({
    data: bookings,
    columns,
    state: { globalFilter: filter },
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const rows = table.getRowModel().rows;
  const filteredBookings = useMemo(
    () => rows.map((r) => r.original),
    [rows],
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

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
        <div className="flex flex-col justify-between gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-ink">{rows.length}</span>{" "}
              {rows.length === 1 ? "request" : "requests"}
            </p>
            {isAdmin && rows.length > 0 && (
              <button
                type="button"
                onClick={() => toggleSelectAll(filteredBookings)}
                className="text-xs font-semibold text-brand hover:underline"
              >
                {selectedIds.size === filteredBookings.length
                  ? "Deselect all"
                  : "Select all for batch"}
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <Input
              className="h-9 pl-9"
              aria-label="Search requests"
              placeholder="Search request, destination…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <Empty
            title="No matching requests"
            body={
              filter
                ? "Clear the search or try another term."
                : "New requests will appear here."
            }
          />
        ) : (
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-line bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th
                        key={header.id}
                        className="whitespace-nowrap px-5 py-3.5"
                      >
                        {header.column.id === "select" ? (
                          <span>#</span>
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
                          : "hover:bg-brand-50/40"
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-4 text-gray-600">
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
      </div>

      {/* Sticky Batch Action Bar when rows are selected */}
      {isAdmin && selectedIds.size > 0 && !batchModalOpen && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-white shadow-2xl animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold">
              {selectedIds.size}
            </span>
            <span className="text-sm font-semibold">requests selected</span>
          </div>

          <Button
            size="sm"
            className="gap-2 bg-brand hover:bg-brand-dark"
            onClick={() => {
              setGroupForModal(null);
              setBatchModalOpen(true);
            }}
          >
            <Car size={15} />
            Batch Assign Vehicle &amp; Driver
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
          }}
          onSuccess={() => {
            setBatchModalOpen(false);
            setGroupForModal(null);
            setSelectedIds(new Set());
          }}
        />
      )}
    </div>
  );
}
