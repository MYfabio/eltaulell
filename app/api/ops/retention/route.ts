import { NextResponse } from "next/server";
import { cronAuthorized, runRetention } from "@/lib/operations";
import { logSystemError, requestId } from "@/lib/observability";

export async function POST(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "No autoritzat." }, { status: 401 });
  const id = requestId(request);
  try {
    return NextResponse.json({ requestId: id, deleted: await runRetention() });
  } catch (error) {
    await logSystemError({ source: "retention-job", code: "RETENTION_FAILED", error, requestId: id });
    return NextResponse.json({ error: "La retenció no s'ha pogut completar.", requestId: id }, { status: 500 });
  }
}
