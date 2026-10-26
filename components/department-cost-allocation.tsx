"use client";

import { useMemo } from "react";
import { PieChart } from "lucide-react";
import { Card } from "@/components/ui";
import { aggregateDepartmentCostCenters } from "@/lib/contractor-billing";
import type { Booking } from "@/lib/types";

export function DepartmentCostAllocation({ bookings }: { bookings: Booking[] }) {
  const departmentSummaries = useMemo(
    () => aggregateDepartmentCostCenters(bookings),
    [bookings],
  );

  const totalCostThb = useMemo(
    () => departmentSummaries.reduce((sum, d) => sum + d.allocatedAmountThb, 0),
    [departmentSummaries],
  );

  const totalRides = useMemo(
    () => departmentSummaries.reduce((sum, d) => sum + d.passengerRides, 0),
    [departmentSummaries],
  );

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Allocated Transport Cost</p>
          <p className="mt-1 font-mono text-2xl font-bold text-brand">
            THB {totalCostThb.toLocaleString()}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Departments Cross-Charged</p>
          <p className="mt-1 font-mono text-2xl font-bold text-ink">
            {departmentSummaries.length} cost centers
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Employee Rides</p>
          <p className="mt-1 font-mono text-2xl font-bold text-ink">
            {totalRides.toLocaleString()} rides
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <PieChart className="text-brand" size={18} />
          <h2 className="font-bold text-ink">Departmental Cost Center Cross-Charging Matrix</h2>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Pro-rated monthly transport expenditures allocated per requesting department cost center for internal accounting cross-charging.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Cost Center / Department</th>
                <th className="px-4 py-3 text-right">Passenger Rides</th>
                <th className="px-4 py-3 text-right">Allocated Expenditure</th>
                <th className="px-4 py-3 text-right">Budget Share (%)</th>
                <th className="px-4 py-3">Budget Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {departmentSummaries.map((d) => (
                <tr key={d.departmentCode} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5">
                    <span className="font-mono font-bold text-ink bg-slate-100 rounded px-2.5 py-1 border border-slate-200">
                      {d.departmentCode}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold">{d.passengerRides}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-brand">
                    THB {d.allocatedAmountThb.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-700">
                    {d.percentageShare}%
                  </td>
                  <td className="px-4 py-3.5 w-48">
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-brand h-2.5 rounded-full"
                        style={{ width: `${Math.min(100, d.percentageShare)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!departmentSummaries.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">
                    No confirmed departmental trips found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
