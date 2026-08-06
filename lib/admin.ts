import "server-only";

import { db } from "@/lib/db";
import { DEMO_VIEWERS, type DemoViewer } from "@/lib/demo-auth";
import {
  ROLE_LABELS,
  type AdminSnapshot,
} from "@/lib/admin-types";
import { permissionsForRole, type AppRole } from "@/lib/permissions";

const ACADEMIC_YEAR = "2026-2027";

type GroupMemberRole = "TUTOR" | "DELEGATE" | "STUDENT";
type MembershipRole = AppRole;

const GROUP_ROLE: Partial<Record<AppRole, GroupMemberRole>> = {
  TUTOR: "TUTOR",
  DELEGATE: "DELEGATE",
  STUDENT: "STUDENT",
};

type SnapshotGroupRow = {
  id: string;
  name: string;
  stage: string;
  section: string | null;
  academicYear: string;
  _count: { members: number };
};

type SnapshotMembershipRow = {
  id: string;
  userId: string;
  role: MembershipRole;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  user: { name: string; email: string };
  groupMemberships: Array<{ group: { id: string; name: string } }>;
};

type SnapshotAuditRow = {
  id: string;
  action: string;
  metadata: unknown;
  createdAt: Date;
  actor: { name: string } | null;
};

export async function ensureDemoSchoolData(viewer: DemoViewer) {
  return db.$transaction(async (transaction) => {
    const school = await transaction.school.upsert({
      where: { slug: viewer.schoolSlug },
      update: {},
      create: {
        name: viewer.school,
        slug: viewer.schoolSlug,
      },
    });

    const group = await transaction.group.upsert({
      where: {
        schoolId_academicYear_name: {
          schoolId: school.id,
          academicYear: ACADEMIC_YEAR,
          name: "3r B",
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        name: "3r B",
        stage: "3r ESO",
        section: "B",
        academicYear: ACADEMIC_YEAR,
      },
    });

    const board = await transaction.board.upsert({
      where: { groupId: group.id },
      update: {},
      create: {
        groupId: group.id,
        title: "Taulell de 3r B",
      },
    });

    const demoActorIds: Record<string, string> = {};
    const demoMembershipIds: Record<string, string> = {};
    for (const demoPerson of DEMO_VIEWERS) {
      if (demoPerson.schoolSlug !== viewer.schoolSlug) continue;

      const user = await transaction.user.upsert({
        where: { email: demoPerson.email.toLowerCase() },
        update: {},
        create: {
          id: demoPerson.id,
          name: demoPerson.name,
          email: demoPerson.email.toLowerCase(),
        },
      });
      demoActorIds[demoPerson.id] = user.id;

      const membership = await transaction.schoolMembership.upsert({
        where: {
          schoolId_userId: {
            schoolId: school.id,
            userId: user.id,
          },
        },
        update: {},
        create: {
          schoolId: school.id,
          userId: user.id,
          role: demoPerson.role as MembershipRole,
          status: "ACTIVE",
        },
      });
      demoMembershipIds[demoPerson.id] = membership.id;

      const groupRole = GROUP_ROLE[membership.role as AppRole];
      const assignedGroupCount = await transaction.groupMembership.count({
        where: { schoolMembershipId: membership.id },
      });
      if (groupRole && assignedGroupCount === 0) {
        await transaction.groupMembership.upsert({
          where: {
            groupId_schoolMembershipId: {
              groupId: group.id,
              schoolMembershipId: membership.id,
            },
          },
          update: {},
          create: {
            groupId: group.id,
            schoolMembershipId: membership.id,
            role: groupRole,
          },
        });
      }
    }

    const initialPosts = [
      {
        id: `${viewer.schoolSlug}-welcome-notice`,
        authorId: demoActorIds["tutor-marta"] ?? null,
        type: "NOTICE" as const,
        title: "Sortida al Museu de la Ciència",
        message: "Recordeu portar l'autorització signada abans de divendres.",
      },
      {
        id: `${viewer.schoolSlug}-math-task`,
        authorId: demoActorIds["tutor-marta"] ?? null,
        type: "TASK" as const,
        title: "Matemàtiques · Funcions",
        message: "Exercicis 12, 13 i 16. Repassa abans l'exemple de la pàgina 84.",
      },
      {
        id: `${viewer.schoolSlug}-sports-activity`,
        authorId: demoActorIds["delegate-laia"] ?? null,
        type: "ACTIVITY" as const,
        title: "Torneig de futbol sala",
        message: "Inscripcions obertes! Equips de 5 persones. Parleu amb la delegada.",
      },
      {
        id: `${viewer.schoolSlug}-history-material`,
        authorId: demoActorIds["tutor-marta"] ?? null,
        type: "MATERIAL" as const,
        title: "Guia del projecte d'Història",
        message: "Ja teniu disponible la rúbrica i els materials de suport.",
      },
    ];
    for (const post of initialPosts) {
      await transaction.postIt.upsert({
        where: { id: post.id },
        update: {},
        create: {
          ...post,
          boardId: board.id,
        },
      });
    }

    const studentMembershipId = demoMembershipIds["student-marc"];
    if (studentMembershipId) {
      const now = Date.now();
      const demoTasks = [
        {
          id: `${viewer.schoolSlug}-task-functions`,
          title: "Funcions · exercicis 12, 13 i 16",
          subject: "Matemàtiques",
          status: "IN_PROGRESS" as const,
          dueAt: new Date(now + 24 * 60 * 60 * 1000),
          provider: "GOOGLE_CLASSROOM" as const,
          externalId: "demo-functions",
        },
        {
          id: `${viewer.schoolSlug}-task-history`,
          title: "Dossier de la Revolució Industrial",
          subject: "Història",
          status: "PENDING" as const,
          dueAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
          provider: "GOOGLE_CLASSROOM" as const,
          externalId: "demo-history",
        },
        {
          id: `${viewer.schoolSlug}-task-lab`,
          title: "Informe del laboratori de densitat",
          subject: "Ciències",
          status: "DELIVERED" as const,
          deliveredAt: new Date(now - 2 * 60 * 60 * 1000),
          provider: "GOOGLE_CLASSROOM" as const,
          externalId: "demo-lab",
        },
        {
          id: `${viewer.schoolSlug}-task-english`,
          title: "Audio: My neighbourhood",
          subject: "Anglès",
          status: "GRADED" as const,
          gradedAt: new Date(now - 24 * 60 * 60 * 1000),
          grade: 8.5,
          maximumGrade: 10,
          teacherFeedback: "Molt bona pronunciació. Revisa el ritme de les dues últimes frases.",
          provider: null,
          externalId: null,
        },
      ];
      for (const task of demoTasks) {
        await transaction.learningTask.upsert({
          where: { id: task.id },
          update: {},
          create: {
            ...task,
            schoolId: school.id,
            groupId: group.id,
            studentMembershipId,
          },
        });
      }
    }

    return school;
  });
}

function auditDetail(action: string, metadata: unknown) {
  const data = metadata && typeof metadata === "object"
    ? metadata as Record<string, unknown>
    : {};

  if (action === "USER_CREATED") return `Alta de ${String(data.email || "persona")}`;
  if (action === "USER_UPDATED") return `Canvi de perfil o estat de ${String(data.email || "persona")}`;
  if (action === "GROUP_CREATED") return `Creació del grup ${String(data.name || "")}`;
  if (action === "GROUP_INVITE_CREATED") return `Invitació creada per al grup ${String(data.groupName || "")}`;
  if (action === "GROUP_INVITE_REVOKED") return "Invitació de grup revocada";
  if (action === "GROUP_INVITE_ACCEPTED") return "Alumne incorporat mitjançant una invitació";
  if (action === "ACCOUNT_INVITATION_CREATED") return `Accés preparat per a ${String(data.email || "persona")}`;
  if (action === "ACCOUNT_ACTIVATED") return `Compte activat per ${String(data.email || "persona")}`;
  return "Canvi administratiu";
}

export async function getAdminSnapshot(viewer: DemoViewer): Promise<AdminSnapshot> {
  const school = await getSchoolForAdmin(viewer);
  const data = await db.school.findUniqueOrThrow({
    where: { id: school.id },
    include: {
      groups: {
        orderBy: { name: "asc" },
        include: { _count: { select: { members: true } } },
      },
      memberships: {
        orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
        include: {
          user: true,
          groupMemberships: {
            include: { group: true },
            orderBy: { group: { name: "asc" } },
          },
        },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { actor: true },
      },
    },
  });

  return {
    school: { id: data.id, name: data.name, slug: data.slug },
    groups: data.groups.map((group: SnapshotGroupRow) => ({
      id: group.id,
      name: group.name,
      stage: group.stage,
      section: group.section,
      academicYear: group.academicYear,
      memberCount: group._count.members,
    })),
    people: data.memberships.map((membership: SnapshotMembershipRow) => ({
      membershipId: membership.id,
      userId: membership.userId,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role as AppRole,
      roleLabel: ROLE_LABELS[membership.role as AppRole],
      status: membership.status,
      groups: membership.groupMemberships.map(({ group }: { group: { id: string; name: string } }) => ({
        id: group.id,
        name: group.name,
      })),
      permissions: permissionsForRole(membership.role as AppRole),
    })),
    audit: data.auditLogs.map((entry: SnapshotAuditRow) => ({
      id: entry.id,
      action: entry.action,
      actorName: entry.actor?.name || "Sistema",
      detail: auditDetail(entry.action, entry.metadata),
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function getSchoolForAdmin(viewer: DemoViewer) {
  const school = await getSchoolForViewer(viewer);
  const user = await db.user.findUnique({
    where: { email: viewer.email.toLowerCase() },
    select: { id: true },
  });
  if (!user) throw new Error("SCHOOL_MEMBERSHIP_REQUIRED");

  const membership = await db.schoolMembership.findFirst({
    where: {
      userId: user.id,
      role: "COORDINATOR",
      status: "ACTIVE",
      schoolId: school.id,
    },
    select: { schoolId: true },
  });
  if (!membership) throw new Error("SCHOOL_MEMBERSHIP_REQUIRED");

  return school;
}

export async function getSchoolForViewer(viewer: DemoViewer) {
  if (viewer.mode === "demo") return ensureDemoSchoolData(viewer);

  const user = await db.user.findUnique({
    where: { email: viewer.email.toLowerCase() },
    select: { id: true },
  });
  if (!user) throw new Error("SCHOOL_MEMBERSHIP_REQUIRED");

  const membership = await db.schoolMembership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      school: { slug: viewer.schoolSlug, active: true },
    },
    select: { schoolId: true },
  });
  if (!membership) throw new Error("SCHOOL_MEMBERSHIP_REQUIRED");

  return db.school.findUniqueOrThrow({ where: { id: membership.schoolId } });
}

export async function getActorId(viewer: DemoViewer) {
  const actor = await db.user.findUnique({
    where: { email: viewer.email.toLowerCase() },
    select: { id: true },
  });
  return actor?.id || null;
}
