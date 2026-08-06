import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDemoViewer } from "@/lib/demo-auth";
import { syncGoogleCalendar, syncGoogleClassroom } from "@/lib/google";
import { can, PERMISSIONS } from "@/lib/permissions";

const schema = z.object({ target: z.enum(["classroom", "calendar"]) });

export async function POST(request: NextRequest) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  if (!can(viewer, PERMISSIONS.MANAGE_INTEGRATIONS)) {
    return NextResponse.json({ error: "No tens permís per sincronitzar integracions." }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  const forwardedOrigin = forwardedHost ? `${forwardedProtocol}://${forwardedHost}` : request.nextUrl.origin;
  if (origin && origin !== request.nextUrl.origin && origin !== forwardedOrigin) {
    return NextResponse.json({ error: "Origen no autoritzat." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Destí de sincronització no vàlid." }, { status: 400 });
  try {
    const result = parsed.data.target === "classroom"
      ? await syncGoogleClassroom(viewer)
      : await syncGoogleCalendar(viewer);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Google synchronization failed", error);
    return NextResponse.json({ error: "La sincronització no s'ha pogut completar." }, { status: 502 });
  }
}
