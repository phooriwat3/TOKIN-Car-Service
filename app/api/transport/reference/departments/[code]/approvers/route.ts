import { forwardSqlServerGet } from "@/lib/sqlserver-backend";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(code)) {
    return Response.json({ error: "Invalid department code." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  return forwardSqlServerGet(`/api/v1/reference/departments/${encodeURIComponent(code)}/approvers`);
}
