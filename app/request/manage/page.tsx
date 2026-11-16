import PublicManageRequest from "@/components/public-manage-request";
import SqlPublicManageRequest from "@/components/sql-public-manage-request";
import { sqlServerBackendEnabled } from "@/lib/sqlserver-backend";

export const dynamic = "force-dynamic";

export default async function ManageRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  if (sqlServerBackendEnabled())
    return <SqlPublicManageRequest token={params.token} />;
  return <PublicManageRequest initialToken={params.token} />;
}
