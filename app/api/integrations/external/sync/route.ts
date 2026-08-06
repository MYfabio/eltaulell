import { NextResponse } from "next/server";
import { z } from "zod";
import { syncExternalIntegration } from "@/lib/external-integrations";
import { getDemoViewer } from "@/lib/demo-auth";

const schema = z.object({ provider: z.enum(["MOODLE", "IEDUCA"]) });

export async function POST(request: Request) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Connector no vàlid." }, { status: 400 });
  try {
    return NextResponse.json(await syncExternalIntegration(viewer, parsed.data.provider));
  } catch (error) {
    const code = error instanceof Error ? error.message : "SYNC_FAILED";
    return NextResponse.json({ error: `La sincronització ha fallat (${code}).` }, { status: 502 });
  }
}
