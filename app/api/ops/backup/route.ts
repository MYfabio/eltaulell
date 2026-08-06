import { NextResponse } from "next/server";
import { createEncryptedBackups, cronAuthorized } from "@/lib/operations";
import { logSystemError, requestId } from "@/lib/observability";

export async function POST(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "No autoritzat." }, { status: 401 });
  const id = requestId(request);
  try {
    return NextResponse.json({ requestId: id, backups: await createEncryptedBackups() });
  } catch (error) {
    await logSystemError({ source: "backup-job", code: "BACKUP_FAILED", error, requestId: id });
    return NextResponse.json({ error: "La còpia no s'ha pogut completar.", requestId: id }, { status: 500 });
  }
}
