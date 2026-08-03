import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActorId, getSchoolForAdmin } from "@/lib/admin";
import { getDemoViewer } from "@/lib/demo-auth";
import { db } from "@/lib/db";
import { can, PERMISSIONS } from "@/lib/permissions";

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(50),
  stage: z.string().trim().min(1).max(60),
  section: z.string().trim().max(20).optional(),
  academicYear: z.string().trim().regex(/^\d{4}-\d{4}$/),
});

export async function POST(request: NextRequest) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  if (!can(viewer, PERMISSIONS.MANAGE_GROUPS)) {
    return NextResponse.json({ error: "No tens permís per gestionar grups." }, { status: 403 });
  }

  const parsed = createGroupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa el nom, l'etapa i el curs acadèmic." }, { status: 400 });
  }

  const school = await getSchoolForAdmin(viewer);
  const { name, stage, academicYear } = parsed.data;
  const section = parsed.data.section || null;

  try {
    const actorId = await getActorId(viewer);
    const group = await db.$transaction(async (transaction) => {
      const created = await transaction.group.create({
        data: {
          schoolId: school.id,
          name,
          stage,
          section,
          academicYear,
          board: { create: { title: `Taulell de ${name}` } },
        },
      });
      await transaction.auditLog.create({
        data: {
          schoolId: school.id,
          actorId,
          action: "GROUP_CREATED",
          entityType: "Group",
          entityId: created.id,
          metadata: { name, stage, section, academicYear },
        },
      });
      return created;
    });
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Aquest grup ja existeix en el curs indicat." }, { status: 409 });
    }
    console.error("Unable to create group", error);
    return NextResponse.json({ error: "No s'ha pogut crear el grup." }, { status: 500 });
  }
}
