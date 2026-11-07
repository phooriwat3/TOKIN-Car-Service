import { forwardSqlServerGet } from "@/lib/sqlserver-backend";

export const dynamic = "force-dynamic";

export async function GET() {
  return forwardSqlServerGet("/api/v1/reference/departments");
}
