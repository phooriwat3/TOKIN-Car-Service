import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { buildAssignmentPdf } from "@/lib/assignment-pdf";
import { loadPublicAssignment } from "@/lib/public-assignment";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || undefined;
  const result = await loadPublicAssignment(token);
  if (!result.assignment) {
    return NextResponse.json(
      { error: result.error || "Assignment unavailable." },
      { status: 404 },
    );
  }

  try {
    const font = await readFile(
      path.join(process.cwd(), "public", "fonts", "Sarabun-Regular.ttf"),
    );
    const pdf = buildAssignmentPdf(result.assignment, font.toString("base64"));
    const safeRequestNo = result.assignment.requestNo.replace(
      /[^A-Za-z0-9_-]/g,
      "_",
    );
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="TOKIN-Transport-${safeRequestNo}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (cause) {
    return NextResponse.json(
      {
        error:
          cause instanceof Error ? cause.message : "Unable to generate PDF.",
      },
      { status: 500 },
    );
  }
}
