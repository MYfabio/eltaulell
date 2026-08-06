import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformViewer } from "@/lib/platform-auth";
import { db } from "@/lib/db";
import { getPlatformAdminId } from "@/lib/platform-admin";

const updateSchoolSchema = z.object({
  schoolId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(120).optional(),
  emailDomain: z.string().trim().max(120).transform((value) => value || null).optional(),
  active: z.boolean().optional(),
  plan: z.enum(["PILOT", "STANDARD"]).optional(),
  maxUsers: z.number().int().min(10).max(10000).optional(),
  maxGroups: z.number().int().min(1).max(1000).optional(),
}).refine((value) => Object.keys(value).some((key) => key !== "schoolId"));

export async function PATCH(request: NextRequest) {
  const viewer = await getPlatformViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió com a administració de plataforma." }, { status: 401 });
  }

  const parsed = updateSchoolSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa l'estat, el pla i els límits del centre." }, { status: 400 });
  }

  const { schoolId, ...updates } = parsed.data;
  try {
    const platformAdminId = await getPlatformAdminId(viewer);
    const school = await db.$transaction(async (transaction) => {
      const updated = await transaction.school.update({
        where: { id: schoolId },
        data: updates,
      });
      const statusOnly = typeof updates.active === "boolean" && Object.keys(updates).length === 1;
      await transaction.platformAuditLog.create({
        data: {
          platformAdminId,
          schoolId: updated.id,
          action: statusOnly ? "SCHOOL_STATUS_CHANGED" : "SCHOOL_SETTINGS_UPDATED",
          entityType: "School",
          entityId: updated.id,
          metadata: updates,
        },
      });
      return updated;
    });
    return NextResponse.json({ schoolId: school.id });
  } catch (error) {
    if (
      (error instanceof Error && error.message === "School not found") ||
      (error && typeof error === "object" && "code" in error && error.code === "P2025")
    ) {
      return NextResponse.json({ error: "Centre no trobat." }, { status: 404 });
    }
    console.error("Unable to update platform school", error);
    return NextResponse.json({ error: "No s'ha pogut actualitzar el centre." }, { status: 500 });
  }
}
