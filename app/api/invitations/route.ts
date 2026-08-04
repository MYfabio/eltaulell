import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDemoViewer } from "@/lib/demo-auth";
import { acceptGroupInvite } from "@/lib/group-invites";

const acceptSchema = z.object({
  inviteId: z.string().min(1),
  code: z.string().min(6).max(20),
});

const inviteErrors: Record<string, { status: number; message: string }> = {
  STUDENT_REQUIRED: { status: 403, message: "Cal entrar amb un perfil d'alumne." },
  INVITE_NOT_FOUND: { status: 404, message: "No s'ha trobat aquesta invitació." },
  INVITE_EXPIRED: { status: 410, message: "Aquesta invitació ha caducat." },
  INVITE_FULL: { status: 410, message: "Aquesta invitació ja ha arribat al límit d'accessos." },
  INVITE_REVOKED: { status: 410, message: "Aquesta invitació ha estat revocada." },
  INVITE_NO_LONGER_AVAILABLE: { status: 410, message: "Aquesta invitació ja no té accessos disponibles." },
  INVALID_CODE: { status: 400, message: "El codi no és correcte." },
  STUDENT_MEMBERSHIP_REQUIRED: { status: 403, message: "No tens una matrícula activa en aquest centre." },
  USER_NOT_FOUND: { status: 403, message: "No s'ha trobat el teu usuari del centre." },
};

export async function POST(request: NextRequest) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });

  const parsed = acceptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Introdueix el codi de la invitació." }, { status: 400 });
  }

  try {
    const result = await acceptGroupInvite(viewer, parsed.data.inviteId, parsed.data.code);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = error instanceof Error ? inviteErrors[error.message] : undefined;
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    return NextResponse.json({ error: "No s'ha pogut completar l'accés al grup." }, { status: 500 });
  }
}
