import { NextResponse } from "next/server";
import { z } from "zod";
import { askAiTutor } from "@/lib/ai-tutor";
import { getDemoViewer } from "@/lib/demo-auth";

const requestSchema = z.object({
  groupId: z.string().trim().min(1).max(100),
  message: z.string().trim().min(2).max(1_500),
  sessionKey: z.string().trim().min(16).max(100),
  taskId: z.string().trim().min(1).max(100).optional(),
});

function allowedOrigins(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  return new Set([url.origin, ...(host ? [`${protocol}://${host}`] : [])]);
}

export async function POST(request: Request) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins(request).has(origin)) {
    return NextResponse.json({ error: "Origen no permès." }, { status: 403 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "La consulta no és vàlida." }, { status: 400 });
  }
  try {
    return NextResponse.json(await askAiTutor(viewer, parsed.data));
  } catch (error) {
    const code = error instanceof Error ? error.message : "AI_FAILED";
    const responses: Record<string, [number, string]> = {
      AI_ROLE_FORBIDDEN: [403, "Aquest perfil no pot utilitzar el Tutor IA."],
      AI_GROUP_FORBIDDEN: [403, "No tens accés a aquest grup."],
      AI_DAILY_LIMIT_REACHED: [429, "Has arribat al límit d'avui. Continua amb el tutor o tutora del grup."],
      OPENAI_API_KEY_NOT_CONFIGURED: [503, "El Tutor IA encara no està configurat pel centre."],
    };
    const [status, message] = responses[code] || [502, "El Tutor IA no està disponible ara mateix. Torna-ho a provar d'aquí a uns minuts."];
    return NextResponse.json({ error: message }, { status });
  }
}
