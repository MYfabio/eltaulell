import "server-only";

import { db } from "@/lib/db";
import {
  DEMO_VIEWERS,
  PLATFORM_DEMO_ADMIN,
  type PlatformDemoViewer,
} from "@/lib/demo-auth";
import { ensureDemoSchoolData } from "@/lib/admin";
import type {
  PlatformAuditEntry,
  PlatformSchool,
  PlatformSnapshot,
} from "@/lib/platform-admin-types";

type SchoolRow = {
  id: string;
  name: string;
  slug: string;
  emailDomain: string | null;
  active: boolean;
  plan: "PILOT" | "STANDARD";
  maxUsers: number;
  maxGroups: number;
  createdAt: Date;
  memberships: Array<{ user: { name: string; email: string } }>;
  _count: { memberships: number; groups: number };
};

type PlatformAuditRow = {
  id: string;
  action: string;
  metadata: unknown;
  createdAt: Date;
  school: { name: string } | null;
  platformAdmin: { user: { name: string } } | null;
};

function auditDetail(action: string, metadata: unknown) {
  const data = metadata && typeof metadata === "object"
    ? metadata as Record<string, unknown>
    : {};
  if (action === "SCHOOL_CREATED") {
    return `Centre creat amb coordinació inicial: ${String(data.coordinatorEmail || "")}`;
  }
  if (action === "SCHOOL_STATUS_CHANGED") {
    return data.active ? "Centre activat" : "Centre suspès";
  }
  if (action === "SCHOOL_SETTINGS_UPDATED") {
    return "Pla i límits del centre actualitzats";
  }
  return "Canvi d'administració de plataforma";
}

export async function ensurePlatformDemoAdmin(viewer: PlatformDemoViewer) {
  const user = await db.user.upsert({
    where: { email: viewer.email.toLowerCase() },
    update: { name: viewer.name },
    create: {
      id: viewer.id,
      name: viewer.name,
      email: viewer.email.toLowerCase(),
    },
  });
  return db.platformAdmin.upsert({
    where: { userId: user.id },
    update: { active: true },
    create: { userId: user.id, active: true },
  });
}

export async function ensurePlatformDemoData(viewer = PLATFORM_DEMO_ADMIN) {
  await ensureDemoSchoolData(DEMO_VIEWERS[0]);
  return ensurePlatformDemoAdmin(viewer);
}

export async function getPlatformAdminId(viewer: PlatformDemoViewer) {
  const admin = await ensurePlatformDemoAdmin(viewer);
  return admin.id as string;
}

export async function getPlatformSnapshot(
  viewer: PlatformDemoViewer,
): Promise<PlatformSnapshot> {
  await ensurePlatformDemoData(viewer);
  const [schools, audit] = await Promise.all([
    db.school.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        memberships: {
          where: { role: "COORDINATOR" },
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { memberships: true, groups: true } },
      },
    }),
    db.platformAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        platformAdmin: { include: { user: true } },
        school: true,
      },
    }),
  ]);

  return {
    schools: (schools as SchoolRow[]).map((school): PlatformSchool => ({
      id: school.id,
      name: school.name,
      slug: school.slug,
      emailDomain: school.emailDomain,
      active: school.active,
      plan: school.plan || "PILOT",
      maxUsers: school.maxUsers || 500,
      maxGroups: school.maxGroups || 30,
      userCount: school._count.memberships,
      groupCount: school._count.groups,
      coordinators: school.memberships.map((membership) => ({
        name: membership.user.name,
        email: membership.user.email,
      })),
      createdAt: school.createdAt.toISOString(),
    })),
    audit: (audit as PlatformAuditRow[]).map((entry): PlatformAuditEntry => ({
      id: entry.id,
      action: entry.action,
      actorName: entry.platformAdmin?.user.name || "Sistema",
      detail: auditDetail(entry.action, entry.metadata),
      schoolName: entry.school?.name || null,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}
