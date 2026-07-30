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
import { ArrowDownUp, Search } from "lucide-react";
import type { Booking } from "@/lib/types";
import { Badge, Empty, Input } from "./ui";
import { statusLabel } from "@/lib/business";

export function BookingTable({ bookings, basePath = "/bookings" }: { bookings: Booking[]; basePath?: string }) {
  const [filter, setFilter] = useState("");
  const columns = useMemo(() => {
    const column = createColumnHelper<Booking>();
    return [
      column.accessor("bookingNo", {
        header: "Request",
        cell: (info) => (
          <Link className="font-semibold text-brand hover:text-brand-dark hover:underline" href={`${basePath}/${info.row.original.id}`}>
            {info.getValue()}
          </Link>
        ),
      }),
      column.accessor("usingDate", {
        header: "Date and time",
        cell: (info) => (
          <div>
            <p className="font-medium text-ink">{info.getValue()}</p>
            <p className="mt-0.5 text-xs text-gray-500">{info.row.original.startTime}–{info.row.original.endTime}</p>
          </div>
        ),
      }),
      column.accessor("destination", {
        header: "Destination",
        cell: (info) => <span className="font-medium text-ink">{info.getValue()}</span>,
      }),
      column.accessor("requesterName", { header: "Requested by" }),
      column.accessor("status", {
        header: "Status",
        cell: (info) => <Badge status={info.getValue()}>{statusLabel(info.getValue())}</Badge>,
      }),
    ];
  }, [basePath]);

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

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <div className="flex flex-col justify-between gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <p className="text-sm text-gray-500"><span className="font-semibold text-ink">{rows.length}</span> {rows.length === 1 ? "request" : "requests"}</p>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input className="h-9 pl-9" aria-label="Search requests" placeholder="Search request, destination…" value={filter} onChange={(event) => setFilter(event.target.value)} />
        </div>
      </div>
      {rows.length === 0 ? (
        <Empty title="No matching requests" body={filter ? "Clear the search or try another term." : "New requests will appear here."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-line bg-[#f8f9fa] text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th key={header.id} className="px-5 py-3">
                      <button className="flex items-center gap-1.5 hover:text-ink" onClick={header.column.getToggleSortingHandler()}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowDownUp size={12} className="text-gray-400" />
                      </button>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-[#f8fafb]">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-4 text-gray-600">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}