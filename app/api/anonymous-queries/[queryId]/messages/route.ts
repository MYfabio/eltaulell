import { NextResponse } from "next/server";
import { z } from "zod";
import { addAnonymousQueryMessage } from "@/lib/anonymous-queries";
import { getDemoViewer } from "@/lib/demo-auth";

const messageSchema = z.object({
  body: z.string().trim().min(2).max(2_000),
  accessToken: z.string().trim().min(20).max(100).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ queryId: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "El missatge no és vàlid." }, { status: 400 });
  try {
    const { queryId } = await params;
    const query = await addAnonymousQueryMessage(
      viewer,
      queryId,
      parsed.data.body,
      parsed.data.accessToken,
    );
    return NextResponse.json({ query }, { status: 201 });
  } catch (error) {
    const closed = error instanceof Error && error.message === "QUERY_CLOSED";
    return NextResponse.json(
      { error: closed ? "Aquesta consulta ja està tancada." : "Consulta no trobada." },
      { status: closed ? 409 : 404 },
    );
  }
}
