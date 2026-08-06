import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAnonymousQuery,
  listAnonymousInbox,
  readAnonymousQuery,
} from "@/lib/anonymous-queries";
import { getDemoViewer } from "@/lib/demo-auth";

const createSchema = z.object({
  groupId: z.string().trim().min(1).max(100),
  subject: z.string().trim().min(2).max(100),
  message: z.string().trim().min(5).max(2_000),
});

export async function GET(request: Request) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  const token = url.searchParams.get("token");
  try {
    if (reference && token) {
      return NextResponse.json({ query: await readAnonymousQuery(reference, token) });
    }
    return NextResponse.json({ queries: await listAnonymousInbox(viewer) });
  } catch (error) {
    const code = error instanceof Error ? error.message : "QUERY_FAILED";
    return NextResponse.json(
      { error: code === "QUERY_FORBIDDEN" ? "No tens accés a aquesta bandeja." : "Consulta no trobada." },
      { status: code === "QUERY_FORBIDDEN" ? 403 : 404 },
    );
  }
}

export async function POST(request: Request) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa el tema i el missatge." }, { status: 400 });
  try {
    return NextResponse.json(await createAnonymousQuery(viewer, parsed.data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "No s'ha pogut enviar la consulta." }, { status: 403 });
  }
}
