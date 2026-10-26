"use client";

import { useMemo, useState } from "react";
import { Building2, FileSpreadsheet, Search } from "lucide-react";
import { Card, Input } from "@/components/ui";
import {
  aggregateContractorBilling,
  getContractorBillingLedger,
} from "@/lib/contractor-billing";
import type { Booking } from "@/lib/types";

export function ContractorBillingLedger({ bookings }: { bookings: Booking[] }) {
  const [search, setSearch] = useState("");
  const [selectedContractor, setSelectedContractor] = useState("");

  const contractorSummaries = useMemo(
    () => aggregateContractorBilling(bookings),
    [bookings],
  );

  const billingLedger = useMemo(
    () => getContractorBillingLedger(bookings),
    [bookings],
  );

  const totalExpenditureThb = useMemo(
    () => contractorSummaries.reduce((sum, c) => sum + c.totalAmountThb, 0),
    [contractorSummaries],
  );

  const filteredLedger = useMemo(() => {
    return billingLedger.filter((item) => {
      if (selectedContractor && item.contractorName !== selectedContractor) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.bookingNo.toLowerCase().includes(q) ||
        item.contractorName.toLowerCase().includes(q) ||
        item.driverName.toLowerCase().includes(q) ||
        item.vehiclePlate.toLowerCase().includes(q) ||
        item.route.toLowerCase().includes(q)
      );
    });
  }, [billingLedger, search, selectedContractor]);

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Van Expenditure</p>
          <p className="mt-1 font-mono text-2xl font-bold text-brand">
            THB {totalExpenditureThb.toLocaleString()}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Active Van Contractors</p>
          <p className="mt-1 font-mono text-2xl font-bold text-ink">
            {contractorSummaries.length} providers
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Dispatched Van Trips</p>
          <p className="mt-1 font-mono text-2xl font-bold text-ink">
            {billingLedger.length} trips
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Transported</p>
          <p className="mt-1 font-mono text-2xl font-bold text-ink">
            {billingLedger.reduce((sum, i) => sum + i.passengerCount, 0)} passengers
          </p>
        </Card>
      </div>

      {/* Contractor Summary Table */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="text-brand" size={18} />
          <h2 className="font-bold text-ink">Contractor Service Provider Invoicing Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Contractor Service Provider</th>
                <th className="px-4 py-3 text-right">Trips Operated</th>
                <th className="px-4 py-3 text-right">Total Passengers</th>
                <th className="px-4 py-3 text-right">Avg Occupancy</th>
                <th className="px-4 py-3 text-right">Total Invoiced (THB)</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {contractorSummaries.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-bold text-ink">{c.contractorName}</td>
                  <td className="px-4 py-3.5 text-right font-mono">{c.tripCount}</td>
                  <td className="px-4 py-3.5 text-right font-mono">{c.passengerCount}</td>
                  <td className="px-4 py-3.5 text-right font-mono">{c.averageOccupancy} pax/van</td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-brand">
                    THB {c.totalAmountThb.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedContractor(
                          selectedContractor === c.contractorName ? "" : c.contractorName,
                        )
                      }
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      {selectedContractor === c.contractorName ? "Clear Filter" : "Filter Trips"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Trip-by-Trip Detail Ledger */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-brand" size={18} />
            <h2 className="font-bold text-ink">
              Trip-by-Trip Invoicing Ledger
              {selectedContractor ? ` · ${selectedContractor}` : ""}
            </h2>
          </div>
          <div className="relative w-64">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <Input
              className="pl-8 text-xs py-1.5"
              placeholder="Search booking, driver, plate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Date & Time</th>
                <th className="px-3 py-2.5">Booking No</th>
                <th className="px-3 py-2.5">Route</th>
                <th className="px-3 py-2.5">Contractor</th>
                <th className="px-3 py-2.5">Van / Driver</th>
                <th className="px-3 py-2.5 text-center">Pax</th>
                <th className="px-3 py-2.5">Dept</th>
                <th className="px-3 py-2.5 text-right">Agreed Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {filteredLedger.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                    {item.usingDate}
                    <span className="block text-[11px] text-slate-400">{item.shiftTime}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-brand whitespace-nowrap">
                    {item.bookingNo}
                  </td>
                  <td className="px-3 py-2.5 max-w-[200px] truncate" title={item.route}>
                    {item.route}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{item.contractorName}</td>
                  <td className="px-3 py-2.5 font-mono">
                    {item.vehiclePlate}
                    <span className="block text-[11px] text-slate-400">{item.driverName}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-semibold">{item.passengerCount}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-700">
                      {item.departments.join(", ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-ink whitespace-nowrap">
                    THB {item.agreedRateThb.toLocaleString()}
                  </td>
                </tr>
              ))}
              {!filteredLedger.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 italic">
                    No trips match the current filter.
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
