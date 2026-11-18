import { forwardGaRequest } from "@/lib/sqlserver-ga-gateway";

export const dynamic = "force-dynamic";

export async function POST(request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> }) {
  const { id, unitId } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id) || !/^[0-9a-fA-F-]{36}$/.test(unitId))
    return Response.json({ error: "Invalid request." }, { status: 400 });
  return forwardGaRequest(request, `/api/v1/ga/ot-assignments/${id}/units/${unitId}/dispatch`, "POST");
}
