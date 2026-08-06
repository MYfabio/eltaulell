import { NextResponse } from "next/server";
import { z } from "zod";
import { configureExternalIntegration } from "@/lib/external-integrations";
import { getDemoViewer } from "@/lib/demo-auth";

const schema = z.object({
  provider: z.enum(["MOODLE", "IEDUCA"]),
  baseUrl: z.string().url().max(300),
  apiToken: z.string().trim().min(8).max(1_000),
});

export async function POST(request: Request) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa la URL i el token del servei." }, { status: 400 });
  try {
    await configureExternalIntegration(viewer, parsed.data);
    return NextResponse.json({ connected: true });
  } catch (error) {
    const configuration = error instanceof Error && error.message === "ENCRYPTION_NOT_CONFIGURED";
    return NextResponse.json(
      { error: configuration ? "Falta la clau de xifratge del servidor." : "No s'ha pogut desar la connexió." },
      { status: configuration ? 503 : 403 },
    );
  }
}
