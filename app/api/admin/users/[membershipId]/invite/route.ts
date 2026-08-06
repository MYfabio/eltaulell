import { NextRequest, NextResponse } from "next/server";
import { issueAccountInvitation } from "@/lib/account-auth";
import { getActorId, getSchoolForAdmin } from "@/lib/admin";
import { getDemoViewer } from "@/lib/demo-auth";
import { db } from "@/lib/db";
import { can, PERMISSIONS } from "@/lib/permissions";
import { sendInvitationEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  if (!can(viewer, PERMISSIONS.MANAGE_USERS)) {
    return NextResponse.json({ error: "No tens permís per gestionar persones." }, { status: 403 });
  }

  const school = await getSchoolForAdmin(viewer);
  const { membershipId } = await params;
  const membership = await db.schoolMembership.findFirst({
    where: { id: membershipId, schoolId: school.id },
    include: { user: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "No s'ha trobat aquesta persona al centre." }, { status: 404 });
  }

  const actorId = await getActorId(viewer);
  const result = await db.$transaction(async (transaction) => {
    await transaction.schoolMembership.update({
      where: { id: membership.id },
      data: { status: "INVITED" },
    });
    await transaction.session.updateMany({
      where: { schoolMembershipId: membership.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const invitation = await issueAccountInvitation(transaction, {
      schoolId: school.id,
      email: membership.user.email,
      role: membership.role,
    });
    await transaction.auditLog.create({
      data: {
        schoolId: school.id,
        actorId,
        action: "ACCOUNT_INVITATION_CREATED",
        entityType: "SchoolMembership",
        entityId: membership.id,
        metadata: { email: membership.user.email, role: membership.role },
      },
    });
    return invitation;
  });

  const activationPath = `/activar?token=${encodeURIComponent(result.token)}`;
  await sendInvitationEmail({
    to: membership.user.email,
    schoolName: school.name,
    activationUrl: new URL(activationPath, process.env.APP_BASE_URL || request.nextUrl.origin).toString(),
    userId: membership.userId,
  });
  return NextResponse.json({
    activationPath,
    expiresAt: result.expiresAt.toISOString(),
  });
}
