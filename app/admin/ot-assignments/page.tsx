import { redirect } from "next/navigation";
import SqlGaOtAssignments from "@/components/sql-ga-ot-assignments";
import { sqlServerBackendEnabled } from "@/lib/sqlserver-backend";

export const dynamic = "force-dynamic";

export default function OtAssignmentsPage() {
  if (!sqlServerBackendEnabled()) redirect("/admin/bookings");
  return <SqlGaOtAssignments />;
}
