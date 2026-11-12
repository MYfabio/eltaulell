import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";
import { getPlatformAdminId } from "@/lib/platform-admin";
import { getPlatformViewer } from "@/lib/platform-auth";
import { altaPrevia, baixa, type BaixaMode } from "@/lib/usuaris";

// Persones de qualsevol centre per a l'administració de plataforma.
// Ruta estàtica (sense [id]) pel mateix motiu que /api/platform/schools/update.

const ROLES = ["COORDINATOR", "TUTOR", "DELEGATE", "STUDENT"] as const;

async function platformActor() {
  const viewer = await getPlatformViewer();
  if (!viewer) return null;
  return { viewer, platformAdminId: await getPlatformAdminId(viewer) };
}

const unauthorized = () =>
  NextResponse.json({ error: "Cal iniciar sessió com a administració de plataforma." }, { status: 401 });

export async function GET(request: NextRequest) {
  const actor = await platformActor();
  if (!actor) return unauthorized();
  const schoolId = request.nextUrl.searchParams.get("schoolId")?.trim();
  if (!schoolId) return NextResponse.json({ error: "Falta el centre." }, { status: 400 });
  const school = await db.school.findFirst({ where: { id: schoolId } });
  if (!school) return NextResponse.json({ error: "No s'ha trobat el centre." }, { status: 404 });
  const [memberships, groups] = await Promise.all([
    db.schoolMembership.findMany({
      where: { schoolId },
      include: { user: true, groupMemberships: { include: { group: true } } },
    }),
    db.group.findMany({ where: { schoolId } }),
  ]);
  return NextResponse.json({
    members: (memberships as Array<Record<string, any>>)
      .map((membership) => ({
        id: membership.id as string,
        name: membership.user?.name as string,
        email: membership.user?.email as string,
        role: membership.role as string,
        status: membership.status as string,
        groups: (membership.groupMemberships ?? []).map((assignment: Record<string, any>) => assignment.group?.name).filter(Boolean),
        isMe: membership.userId === actor.viewer.id,
      }))
      .sort((a, b) => ROLES.indexOf(a.role as never) - ROLES.indexOf(b.role as never) || String(a.name).localeCompare(String(b.name))),
    groups: (groups as Array<Record<string, any>>)
      .map((group) => ({ id: group.id as string, name: group.name as string, academicYear: group.academicYear as string }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
}

const altaSchema = z.object({
  schoolId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  role: z.enum(ROLES),
  groupId: z.string().trim().min(1).nullable().optional(),
});

const ALTA_ERRORS = {
  exists: [409, "Aquest correu ja existeix a El Taulell i no s'ha tocat."],
  school_not_found: [404, "No s'ha trobat el centre."],
  group_required: [400, "Aquest perfil ha de tenir un grup assignat."],
  invalid_group: [400, "El grup no pertany a aquest centre."],
} as const;

export async function POST(request: NextRequest) {
  const actor = await platformActor();
  if (!actor) return unauthorized();
  const parsed = altaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa el nom, el correu i el perfil." }, { status: 400 });
  const result = await altaPrevia(parsed.data, actor.platformAdminId);
  if (result.status !== "created") {
    const [status, error] = ALTA_ERRORS[result.status];
    return NextResponse.json({ error }, { status });
  }
  const activationPath = `/activar?token=${encodeURIComponent(result.token)}`;
  await sendInvitationEmail({
    to: parsed.data.email,
    schoolName: result.schoolName,
    activationUrl: new URL(activationPath, process.env.APP_BASE_URL || request.nextUrl.origin).toString(),
    userId: result.userId,
  });
  return NextResponse.json(
    { membershipId: result.membershipId, activationPath, expiresAt: result.expiresAt.toISOString() },
    { status: 201 },
  );
}

const baixaSchema = z.object({
  membershipId: z.string().trim().min(1),
  mode: z.enum(["suspendre", "reactivar", "esborrar"]),
  confirm: z.boolean().optional(),
});

const BAIXA_ERRORS = {
  not_found: [404, "No s'ha trobat aquesta persona."],
  self: [400, "No pots canviar el teu propi accés des d'aquí."],
  platform_admin: [400, "Una administració de plataforma no es pot canviar des d'aquí."],
  last_coordinator: [400, "El centre ha de conservar almenys una coordinació activa."],
} as const;

async function changeMembership(request: NextRequest, allowed: BaixaMode[]) {
  const actor = await platformActor();
  if (!actor) return unauthorized();
  const parsed = baixaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !allowed.includes(parsed.data.mode)) {
    return NextResponse.json({ error: "El canvi no és vàlid." }, { status: 400 });
  }
  if (parsed.data.mode === "esborrar" && parsed.data.confirm !== true) {
    return NextResponse.json({ error: "Cal confirmar l'esborrat." }, { status: 400 });
  }
  const result = await baixa(parsed.data.membershipId, parsed.data.mode, {
    platformAdminId: actor.platformAdminId,
    userId: actor.viewer.id,
  });
  if (result.status !== "ok") {
    const [status, error] = BAIXA_ERRORS[result.status];
    return NextResponse.json({ error }, { status });
  }
  return NextResponse.json(result);
}

/** Suspendre o reactivar. */
export function PATCH(request: NextRequest) {
  return changeMembership(request, ["suspendre", "reactivar"]);
}

/** Esborrar (amb confirmació). */
export function DELETE(request: NextRequest) {
  return changeMembership(request, ["esborrar"]);
}
