import { NextRequest, NextResponse } from "next/server";
import { isConfiguredCentreAdminEmail } from "@/lib/centre-admin-auth";
import { getDemoViewer } from "@/lib/demo-auth";
import { issueDemoRequestInvitation } from "@/lib/demo-requests";

function requestOrigins(request: NextRequest) {
  const origins = new Set([request.nextUrl.origin]);
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (host && protocol) origins.add(`${protocol}://${host}`);
  return origins;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer || !isConfiguredCentreAdminEmail(viewer.email)) {
    return NextResponse.json({ error: "No tens permís per gestionar demos." }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin && !requestOrigins(request).has(origin)) {
    return NextResponse.json({ error: "Origen no autoritzat." }, { status: 403 });
  }

  const { requestId } = await params;
  const result = await issueDemoRequestInvitation(requestId);
  if ("error" in result) {
    const status = result.error === "NOT_FOUND" ? 404 : result.error === "ALREADY_ACTIVE" ? 409 : 500;
    const error = result.error === "ALREADY_ACTIVE"
      ? "Aquest correu ja té una demo activa."
      : "No s'ha pogut preparar l'accés a la demo.";
    return NextResponse.json({ error }, { status });
  }
  return NextResponse.json(result, { status: 201 });
}
