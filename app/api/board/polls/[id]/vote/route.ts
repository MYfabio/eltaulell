import { NextResponse } from "next/server";
import { z } from "zod";
import { votePoll } from "@/lib/demo-board-store";
import { getDemoViewer } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

const voteSchema = z.object({
  optionId: z.string().min(1).max(100),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }

  if (!can(viewer, PERMISSIONS.VOTE_POLL)) {
    return NextResponse.json(
      { error: "Aquest perfil no pot votar." },
      { status: 403 },
    );
  }

  const parsed = voteSchema.safeParse(await request.json().catch(() => null));
  const { id } = await params;
  if (!id || !parsed.success) {
    return NextResponse.json({ error: "El vot no és vàlid." }, { status: 400 });
  }

  const result = votePoll(viewer, id, parsed.data.optionId);
  if ("error" in result && result.error) {
    const message = {
      NOT_FOUND: "No s'ha trobat l'enquesta d'aquest grup.",
      NOT_OPEN: "La votació ja no està oberta.",
      ALREADY_VOTED: "Ja has votat en aquesta enquesta.",
      OPTION_NOT_FOUND: "Aquesta opció no existeix.",
    }[result.error];
    return NextResponse.json(
      { error: message },
      { status: result.error === "NOT_FOUND" ? 404 : 409 },
    );
  }

  return NextResponse.json({ ...result, pollId: id });
}
