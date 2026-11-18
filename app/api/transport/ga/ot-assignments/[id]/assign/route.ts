import { forwardGaRequest } from "@/lib/sqlserver-ga-gateway";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) return Response.json({ error: "Invalid request." }, { status: 400 });
  return forwardGaRequest(request, `/api/v1/ga/ot-assignments/${id}/assign`, "POST");
}
