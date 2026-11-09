import PublicConfirmRequest from "@/components/public-confirm-request";
import { sqlServerBackendEnabled } from "@/lib/sqlserver-backend";

export const dynamic = "force-dynamic";

export default async function ConfirmRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <PublicConfirmRequest initialToken={params.token} sqlServerMode={sqlServerBackendEnabled()} />;
}
