import PublicRequestForm from "@/components/public-request-form";
import { sqlServerBackendEnabled } from "@/lib/sqlserver-backend";

export const dynamic = "force-dynamic";

export default function RequestPage() {
  return <PublicRequestForm sqlServerMode={sqlServerBackendEnabled()} />;
}
