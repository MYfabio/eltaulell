import { NextResponse } from "next/server";
import { z } from "zod";
import { updateAnonymousQuery } from "@/lib/anonymous-queries";
import { getDemoViewer } from "@/lib/demo-auth";

const updateSchema = z.object({
  status: z.enum(["ASSIGNED", "CLOSED"]).optional(),
  assignedRole: z.enum(["TUTOR", "COORDINATOR"]).optional(),
}).refine((value) => value.status || value.assignedRole, "Empty update");

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ queryId: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Acció no vàlida." }, { status: 400 });
  try {
    const { queryId } = await params;
    return NextResponse.json({ query: await updateAnonymousQuery(viewer, queryId, parsed.data) });
  } catch {
    return NextResponse.json({ error: "Consulta no trobada." }, { status: 404 });
  }
}
