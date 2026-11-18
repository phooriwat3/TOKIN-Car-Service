import { forwardGaRequest } from "@/lib/sqlserver-ga-gateway";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const page = new URL(request.url).searchParams.get("page");
  if (page && !/^[1-9][0-9]{0,3}$/.test(page))
    return Response.json({ error: "Invalid page." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  return forwardGaRequest(request, `/api/v1/ga/ot-assignments${page ? `?page=${page}` : ""}`, "GET");
}
