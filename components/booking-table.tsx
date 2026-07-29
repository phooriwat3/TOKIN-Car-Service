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
import { Booking } from "@/lib/types";
import { Badge, Empty, Input } from "./ui";
import { statusLabel } from "@/lib/business";
import { ArrowUpDown, Search } from "lucide-react";
export function BookingTable({
  bookings,
  basePath = "/bookings",
}: {
  bookings: Booking[];
  basePath?: string;
}) {
  const [filter, setFilter] = useState("");
  const columns = useMemo(() => {
    const c = createColumnHelper<Booking>();
    return [
      c.accessor("bookingNo", {
        header: "Booking",
        cell: (i) => (
          <Link
            className="font-mono font-semibold text-brand hover:underline"
            href={`${basePath}/${i.row.original.id}`}
          >
            {i.getValue()}
          </Link>
        ),
      }),
      c.accessor("usingDate", {
        header: "Schedule",
        cell: (i) => (
          <div>
            <p>{i.getValue()}</p>
            <p className="text-xs text-gray-500">
              {i.row.original.startTime} - {i.row.original.endTime}
            </p>
          </div>
        ),
      }),
      c.accessor("destination", { header: "Destination" }),
      c.accessor("requesterName", { header: "Requester" }),
      c.accessor("status", {
        header: "Status",
        cell: (i) => (
          <Badge status={i.getValue()}>{statusLabel(i.getValue())}</Badge>
        ),
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
  return (
    <div className="overflow-hidden border border-line bg-white">
      <div className="relative max-w-sm p-3">
        <Search
          className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400"
          size={16}
        />
        <Input
          className="pl-9"
          placeholder="Search bookings"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      {table.getRowModel().rows.length === 0 ? (
        <Empty
          title="No bookings found"
          body="Try a different search or create a new request."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-y border-line bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr className="font-bold">
                {table.getHeaderGroups().map((g) => (
                  <tr key={g.id}>
                    {g.headers.map((h) => (
                      <th key={h.id} className="px-4 py-3">
                        <button
                          className="flex items-center gap-1 font-semibold"
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                          <ArrowUpDown size={12} />
                        </button>
                      </th>
                    ))}
                  </tr>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-line last:border-0 hover:bg-canvas"
                >
                  {r.getVisibleCells().map((c) => (
                    <td key={c.id} className="px-4 py-3">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
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
