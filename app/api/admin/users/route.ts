import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActorId, getSchoolForAdmin } from "@/lib/admin";
import { getDemoViewer } from "@/lib/demo-auth";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { issueAccountInvitation } from "@/lib/account-auth";
import { sendInvitationEmail } from "@/lib/email";

const createPersonSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  role: z.enum(["COORDINATOR", "TUTOR", "DELEGATE", "STUDENT"]),
  groupId: z.string().trim().min(1).nullable().optional(),
});

const GROUP_ROLE: Partial<Record<AppRole, GroupMemberRole>> = {
  TUTOR: "TUTOR",
  DELEGATE: "DELEGATE",
  STUDENT: "STUDENT",
};

type GroupMemberRole = "TUTOR" | "DELEGATE" | "STUDENT";

export async function POST(request: NextRequest) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  if (!can(viewer, PERMISSIONS.MANAGE_USERS)) {
    return NextResponse.json({ error: "No tens permís per gestionar persones." }, { status: 403 });
  }

  const parsed = createPersonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa el nom, el correu i el perfil." }, { status: 400 });
  }

  const school = await getSchoolForAdmin(viewer);
  const { name, email, role } = parsed.data;
  const status = "INVITED" as const;
  const groupId = role === "COORDINATOR" ? null : parsed.data.groupId || null;
  const groupRole = GROUP_ROLE[role];

  if (groupRole && !groupId) {
    return NextResponse.json({ error: "Aquest perfil ha de tenir un grup assignat." }, { status: 400 });
  }

  if (groupId) {
    const group = await db.group.findFirst({ where: { id: groupId, schoolId: school.id } });
    if (!group) return NextResponse.json({ error: "El grup no pertany a aquest centre." }, { status: 400 });
  }

  try {
    const actorId = await getActorId(viewer);
    const result = await db.$transaction(async (transaction) => {
      const user = await transaction.user.upsert({
        where: { email },
        update: { name },
        create: { name, email },
      });

      const existing = await transaction.schoolMembership.findUnique({
        where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
      });
      if (existing) throw new Error("ALREADY_MEMBER");

      const created = await transaction.schoolMembership.create({
        data: {
          schoolId: school.id,
          userId: user.id,
          role,
          status,
          groupMemberships: groupId && groupRole
            ? { create: { groupId, role: groupRole } }
            : undefined,
        },
      });

      await transaction.auditLog.create({
        data: {
          schoolId: school.id,
          actorId,
          action: "USER_CREATED",
          entityType: "SchoolMembership",
          entityId: created.id,
          metadata: { email, role, status, groupId },
        },
      });
      const invitation = await issueAccountInvitation(transaction, {
        schoolId: school.id,
        email,
        role,
      });
      return { membership: created, invitation };
    });

    const activationPath = `/activar?token=${encodeURIComponent(result.invitation.token)}`;
    await sendInvitationEmail({
      to: email,
      schoolName: school.name,
      activationUrl: new URL(activationPath, process.env.APP_BASE_URL || request.nextUrl.origin).toString(),
      userId: result.membership.userId,
    });
    return NextResponse.json(
      {
        membershipId: result.membership.id,
        activationPath,
        expiresAt: result.invitation.expiresAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_MEMBER") {
      return NextResponse.json({ error: "Aquesta persona ja forma part del centre." }, { status: 409 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ja existeix una persona amb aquestes dades." }, { status: 409 });
    }
    console.error("Unable to create school member", error);
    return NextResponse.json({ error: "No s'ha pogut crear la persona." }, { status: 500 });
  }
}
