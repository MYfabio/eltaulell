import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActorId, getSchoolForAdmin } from "@/lib/admin";
import { getDemoViewer } from "@/lib/demo-auth";
import { db } from "@/lib/db";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";

const updatePersonSchema = z.object({
  role: z.enum(["COORDINATOR", "TUTOR", "DELEGATE", "STUDENT"]),
  status: z.enum(["INVITED", "ACTIVE", "SUSPENDED"]),
  groupId: z.string().trim().min(1).nullable().optional(),
});

const GROUP_ROLE: Partial<Record<AppRole, GroupMemberRole>> = {
  TUTOR: "TUTOR",
  DELEGATE: "DELEGATE",
  STUDENT: "STUDENT",
};

type GroupMemberRole = "TUTOR" | "DELEGATE" | "STUDENT";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ membershipId: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  if (!can(viewer, PERMISSIONS.MANAGE_USERS)) {
    return NextResponse.json({ error: "No tens permís per gestionar persones." }, { status: 403 });
  }

  const parsed = updatePersonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "El canvi no és vàlid." }, { status: 400 });

  const { membershipId } = await context.params;
  const school = await getSchoolForAdmin(viewer);
  const existing = await db.schoolMembership.findFirst({
    where: { id: membershipId, schoolId: school.id },
    include: { user: true },
  });

  if (!existing) return NextResponse.json({ error: "No s'ha trobat aquesta persona." }, { status: 404 });

  const { role, status } = parsed.data;
  const groupId = role === "COORDINATOR" ? null : parsed.data.groupId || null;
  const groupRole = GROUP_ROLE[role];

  if (existing.user.email === viewer.email.toLowerCase() && (role !== "COORDINATOR" || status !== "ACTIVE")) {
    return NextResponse.json({ error: "No pots retirar-te el teu propi accés de coordinació." }, { status: 400 });
  }

  if (groupRole && !groupId) {
    return NextResponse.json({ error: "Aquest perfil ha de tenir un grup assignat." }, { status: 400 });
  }

  if (groupId) {
    const group = await db.group.findFirst({ where: { id: groupId, schoolId: school.id } });
    if (!group) return NextResponse.json({ error: "El grup no pertany a aquest centre." }, { status: 400 });
  }

  const removesActiveCoordinator = existing.role === "COORDINATOR"
    && existing.status === "ACTIVE"
    && (role !== "COORDINATOR" || status !== "ACTIVE");
  if (removesActiveCoordinator) {
    const coordinatorCount = await db.schoolMembership.count({
      where: { schoolId: school.id, role: "COORDINATOR", status: "ACTIVE" },
    });
    if (coordinatorCount <= 1) {
      return NextResponse.json({ error: "El centre ha de conservar almenys una coordinació activa." }, { status: 400 });
    }
  }

  try {
    const actorId = await getActorId(viewer);
    await db.$transaction(async (transaction) => {
      await transaction.schoolMembership.update({
        where: { id: existing.id },
        data: { role, status },
      });
      await transaction.groupMembership.deleteMany({
        where: { schoolMembershipId: existing.id },
      });
      if (groupId && groupRole) {
        await transaction.groupMembership.create({
          data: { groupId, schoolMembershipId: existing.id, role: groupRole },
        });
      }
      if (status === "SUSPENDED") {
        await transaction.session.updateMany({
          where: { schoolMembershipId: existing.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await transaction.auditLog.create({
        data: {
          schoolId: school.id,
          actorId,
          action: "USER_UPDATED",
          entityType: "SchoolMembership",
          entityId: existing.id,
          metadata: { email: existing.user.email, role, status, groupId },
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to update school member", error);
    return NextResponse.json({ error: "No s'ha pogut desar el canvi." }, { status: 500 });
  }
}
