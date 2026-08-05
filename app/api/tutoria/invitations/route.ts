import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDemoViewer } from "@/lib/demo-auth";
import {
  createGroupInvite,
  inviteGroupsFor,
  listGroupInvites,
  revokeGroupInvite,
} from "@/lib/group-invites";
import { can, PERMISSIONS } from "@/lib/permissions";

const createInviteSchema = z.object({
  groupId: z.string().min(1),
  expiresInDays: z.number().int().min(1).max(30),
  maxUses: z.number().int().min(1).max(100),
});

async function authorizedViewer() {
  const viewer = await getDemoViewer();
  if (!viewer) return { error: NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 }) };
  if (!can(viewer, PERMISSIONS.MANAGE_GROUP_INVITES)) {
    return {
      error: NextResponse.json(
        { error: "No tens permís per convidar alumnat." },
        { status: 403 },
      ),
    };
  }
  return { viewer };
}

export async function GET() {
  const auth = await authorizedViewer();
  if ("error" in auth) return auth.error;

  const [groups, invitations] = await Promise.all([
    inviteGroupsFor(auth.viewer),
    listGroupInvites(auth.viewer),
  ]);
  return NextResponse.json({ groups, invitations });
}

export async function POST(request: NextRequest) {
  const auth = await authorizedViewer();
  if ("error" in auth) return auth.error;

  const parsed = createInviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revisa el grup, la caducitat i el nombre màxim d'accessos." },
      { status: 400 },
    );
  }

  try {
    const result = await createGroupInvite(auth.viewer, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "GROUP_FORBIDDEN") {
      return NextResponse.json(
        { error: "Només pots crear invitacions per als teus grups." },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: "No s'ha pogut crear la invitació." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authorizedViewer();
  if ("error" in auth) return auth.error;
  const inviteId = request.nextUrl.searchParams.get("inviteId");
  if (!inviteId) return NextResponse.json({ error: "Falta la invitació." }, { status: 400 });

  try {
    await revokeGroupInvite(auth.viewer, inviteId);
    return NextResponse.json({ revoked: true, id: inviteId });
  } catch (error) {
    if (error instanceof Error && error.message === "INVITE_NOT_FOUND") {
      return NextResponse.json({ error: "No s'ha trobat la invitació." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "GROUP_FORBIDDEN") {
      return NextResponse.json({ error: "Aquesta invitació no pertany als teus grups." }, { status: 403 });
    }
    return NextResponse.json({ error: "No s'ha pogut revocar la invitació." }, { status: 500 });
  }
}
