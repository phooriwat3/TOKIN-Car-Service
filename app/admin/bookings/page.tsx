import AdminBookingsHome from "@/components/admin-bookings-home";
import SqlGaAssignments from "@/components/sql-ga-assignments";
import { sqlServerBackendEnabled } from "@/lib/sqlserver-backend";

export const dynamic = "force-dynamic";

export default function AllBookings() {
  return sqlServerBackendEnabled() ? <SqlGaAssignments /> : <AdminBookingsHome />;
}
