import { NextResponse } from "next/server";
import { z } from "zod";
import { managePoll } from "@/lib/board-store";
import { getDemoViewer } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

const actionSchema = z.object({
  action: z.enum(["APPROVE", "CLOSE", "PUBLISH", "DELETE"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }

  if (!can(viewer, PERMISSIONS.MANAGE_POLL_RESULTS)) {
    return NextResponse.json(
      { error: "Només tutoria i coordinació poden validar resultats." },
      { status: 403 },
    );
  }

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "L'acció no és vàlida." }, { status: 400 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Falta l'enquesta." }, { status: 400 });
  }

  const result = await managePoll(viewer, id, parsed.data.action);
  if ("error" in result) {
    return NextResponse.json(
      {
        error:
          result.error === "NOT_FOUND"
            ? "No s'ha trobat l'enquesta d'aquest grup."
            : "Aquesta acció no correspon amb l'estat actual de l'enquesta.",
      },
      { status: result.error === "NOT_FOUND" ? 404 : 409 },
    );
  }

  return NextResponse.json({
    id,
    action: parsed.data.action,
    ...result,
  });
}
