import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformViewer } from "@/lib/platform-auth";
import { db } from "@/lib/db";
import { getPlatformAdminId } from "@/lib/platform-admin";
import { issueAccountInvitation } from "@/lib/account-auth";
import { sendInvitationEmail } from "@/lib/email";

const optionalDomain = z.string().trim().max(120).transform((value) => value || null);

const createSchoolSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  emailDomain: optionalDomain,
  plan: z.enum(["PILOT", "STANDARD"]),
  maxUsers: z.number().int().min(10).max(10000),
  maxGroups: z.number().int().min(1).max(1000),
  coordinatorName: z.string().trim().min(2).max(100),
  coordinatorEmail: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
});

export async function POST(request: NextRequest) {
  const viewer = await getPlatformViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió com a administració de plataforma." }, { status: 401 });
  }

  const parsed = createSchoolSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revisa les dades del centre, el domini, els límits i la coordinació inicial." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  try {
    const platformAdminId = await getPlatformAdminId(viewer);
    const result = await db.$transaction(async (transaction) => {
      const created = await transaction.school.create({
        data: {
          name: data.name,
          slug: data.slug,
          emailDomain: data.emailDomain,
          plan: data.plan,
          maxUsers: data.maxUsers,
          maxGroups: data.maxGroups,
          active: true,
        },
      });
      const coordinator = await transaction.user.upsert({
        where: { email: data.coordinatorEmail },
        update: { name: data.coordinatorName },
        create: { name: data.coordinatorName, email: data.coordinatorEmail },
      });
      await transaction.schoolMembership.create({
        data: {
          schoolId: created.id,
          userId: coordinator.id,
          role: "COORDINATOR",
          status: "INVITED",
        },
      });
      const invitation = await issueAccountInvitation(transaction, {
        schoolId: created.id,
        email: data.coordinatorEmail,
        role: "COORDINATOR",
      });
      await transaction.platformAuditLog.create({
        data: {
          platformAdminId,
          schoolId: created.id,
          action: "SCHOOL_CREATED",
          entityType: "School",
          entityId: created.id,
          metadata: {
            coordinatorEmail: data.coordinatorEmail,
            plan: data.plan,
            maxUsers: data.maxUsers,
            maxGroups: data.maxGroups,
          },
        },
      });
      return { school: created, invitation, coordinatorId: coordinator.id as string };
    });
    const activationPath = `/activar?token=${encodeURIComponent(result.invitation.token)}`;
    await sendInvitationEmail({
      to: data.coordinatorEmail,
      schoolName: result.school.name,
      activationUrl: new URL(activationPath, process.env.APP_BASE_URL || request.nextUrl.origin).toString(),
      userId: result.coordinatorId,
    });
    return NextResponse.json(
      {
        schoolId: result.school.id,
        activationPath,
        expiresAt: result.invitation.expiresAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "Ja existeix un centre amb aquest identificador o aquesta coordinació ja hi pertany." },
        { status: 409 },
      );
    }
    console.error("Unable to create platform school", error);
    return NextResponse.json({ error: "No s'ha pogut crear el centre." }, { status: 500 });
  }
}
