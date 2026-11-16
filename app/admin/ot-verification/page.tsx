import { redirect } from "next/navigation";
import SqlGaOtVerification from "@/components/sql-ga-ot-verification";
import { sqlServerBackendEnabled } from "@/lib/sqlserver-backend";

export const dynamic = "force-dynamic";

export default function OtVerificationPage() {
  if (!sqlServerBackendEnabled()) redirect("/admin/bookings");
  return <SqlGaOtVerification />;
}
