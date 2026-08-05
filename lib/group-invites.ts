import "server-only";

import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { getActorId, getSchoolForViewer } from "@/lib/admin";
import { listBoardChoices } from "@/lib/board-store";
import { db } from "@/lib/db";
import type { DemoViewer } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type InviteRow = {
  id: string;
  schoolId: string;
  groupId: string;
  createdById: string | null;
  codeHash: string;
  expiresAt: Date;
  maxUses: number;
  useCount: number;
  active: boolean;
  createdAt: Date;
};

export type InviteGroup = {
  groupId: string;
  groupName: string;
};

export type GroupInviteSummary = {
  id: string;
  groupId: string;
  groupName: string;
  expiresAt: string;
  maxUses: number;
  useCount: number;
  status: "ACTIVE" | "EXPIRED" | "FULL" | "REVOKED";
  createdAt: string;
};

function inviteSecret() {
  return process.env.AUTH_SECRET || process.env.DATABASE_URL || "eltaulell-local-development-only";
}

function normalizeCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashCode(inviteId: string, code: string) {
  return createHmac("sha256", inviteSecret())
    .update(`${inviteId}:${normalizeCode(code)}`)
    .digest("hex");
}

function verifyCode(inviteId: string, code: string, expectedHash: string) {
  const supplied = Buffer.from(hashCode(inviteId, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function generateCode() {
  const bytes = randomBytes(8);
  const characters = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]);
  return `${characters.slice(0, 4).join("")}-${characters.slice(4).join("")}`;
}

function statusFor(invite: InviteRow): GroupInviteSummary["status"] {
  if (!invite.active) return "REVOKED";
  if (invite.expiresAt.getTime() <= Date.now()) return "EXPIRED";
  if (invite.useCount >= invite.maxUses) return "FULL";
  return "ACTIVE";
}

export async function inviteGroupsFor(viewer: DemoViewer): Promise<InviteGroup[]> {
  if (!can(viewer, PERMISSIONS.MANAGE_GROUP_INVITES)) return [];
  const boards = await listBoardChoices(viewer);
  return boards.map(({ groupId, groupName }) => ({ groupId, groupName }));
}

async function assertManageableGroup(viewer: DemoViewer, groupId: string) {
  const groups = await inviteGroupsFor(viewer);
  const group = groups.find((candidate) => candidate.groupId === groupId);
  if (!group) throw new Error("GROUP_FORBIDDEN");
  return group;
}

function summarizeInvite(invite: InviteRow, groupName: string): GroupInviteSummary {
  return {
    id: invite.id,
    groupId: invite.groupId,
    groupName,
    expiresAt: invite.expiresAt.toISOString(),
    maxUses: invite.maxUses,
    useCount: invite.useCount,
    status: statusFor(invite),
    createdAt: invite.createdAt.toISOString(),
  };
}

export async function listGroupInvites(viewer: DemoViewer) {
  const school = await getSchoolForViewer(viewer);
  const groups = await inviteGroupsFor(viewer);
  const rows = await Promise.all(
    groups.map(async (group) => ({
      group,
      invites: await db.groupInvite.findMany({
        where: { schoolId: school.id, groupId: group.groupId },
        orderBy: { createdAt: "desc" },
      }) as InviteRow[],
    })),
  );
  return rows
    .flatMap(({ group, invites }) => invites.map((invite) => summarizeInvite(invite, group.groupName)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createGroupInvite(
  viewer: DemoViewer,
  input: { groupId: string; expiresInDays: number; maxUses: number },
) {
  const group = await assertManageableGroup(viewer, input.groupId);
  const school = await getSchoolForViewer(viewer);
  const createdById = await getActorId(viewer);
  const id = randomUUID();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);

  const invite = await db.$transaction(async (transaction) => {
    const created = await transaction.groupInvite.create({
      data: {
        id,
        schoolId: school.id,
        groupId: group.groupId,
        createdById,
        codeHash: hashCode(id, code),
        expiresAt,
        maxUses: input.maxUses,
      },
    }) as InviteRow;
    await transaction.auditLog.create({
      data: {
        schoolId: school.id,
        actorId: createdById,
        action: "GROUP_INVITE_CREATED",
        entityType: "GroupInvite",
        entityId: id,
        metadata: { groupId: group.groupId, groupName: group.groupName, expiresAt, maxUses: input.maxUses },
      },
    });
    return created;
  });

  return { invite: summarizeInvite(invite, group.groupName), code };
}

export async function revokeGroupInvite(viewer: DemoViewer, inviteId: string) {
  const school = await getSchoolForViewer(viewer);
  const invite = await db.groupInvite.findFirst({
    where: { id: inviteId, schoolId: school.id },
  }) as InviteRow | null;
  if (!invite) throw new Error("INVITE_NOT_FOUND");
  await assertManageableGroup(viewer, invite.groupId);
  const actorId = await getActorId(viewer);

  await db.$transaction(async (transaction) => {
    await transaction.groupInvite.update({ where: { id: invite.id }, data: { active: false } });
    await transaction.auditLog.create({
      data: {
        schoolId: school.id,
        actorId,
        action: "GROUP_INVITE_REVOKED",
        entityType: "GroupInvite",
        entityId: invite.id,
        metadata: { groupId: invite.groupId },
      },
    });
  });
}

export async function publicGroupInvite(inviteId: string) {
  const invite = await db.groupInvite.findFirst({ where: { id: inviteId } }) as InviteRow | null;
  if (!invite) return null;
  const group = await db.group.findFirst({ where: { id: invite.groupId, schoolId: invite.schoolId } });
  if (!group) return null;
  const school = await db.school.findUniqueOrThrow({ where: { id: invite.schoolId } });
  return {
    id: invite.id,
    schoolName: school.name as string,
    groupName: group.name as string,
    expiresAt: invite.expiresAt.toISOString(),
    status: statusFor(invite),
  };
}

export async function acceptGroupInvite(viewer: DemoViewer, inviteId: string, code: string) {
  if (viewer.role !== "STUDENT") throw new Error("STUDENT_REQUIRED");
  const school = await getSchoolForViewer(viewer);
  const invite = await db.groupInvite.findFirst({
    where: { id: inviteId, schoolId: school.id },
  }) as InviteRow | null;
  if (!invite) throw new Error("INVITE_NOT_FOUND");
  const status = statusFor(invite);
  if (status !== "ACTIVE") throw new Error(`INVITE_${status}`);
  if (!verifyCode(invite.id, code, invite.codeHash)) throw new Error("INVALID_CODE");

  const user = await db.user.findUnique({
    where: { email: viewer.email.toLowerCase() },
    select: { id: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  const membership = await db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
  });
  if (!membership || membership.status !== "ACTIVE" || membership.role !== "STUDENT") {
    throw new Error("STUDENT_MEMBERSHIP_REQUIRED");
  }

  const existing = await db.groupMembership.count({
    where: { groupId: invite.groupId, schoolMembershipId: membership.id },
  });
  if (!existing) {
    await db.$transaction(async (transaction) => {
      const reserved = await transaction.groupInvite.updateMany({
        where: {
          id: invite.id,
          active: true,
          expiresAt: { gt: new Date() },
          useCount: { lt: invite.maxUses },
        },
        data: { useCount: { increment: 1 } },
      });
      if (!reserved.count) throw new Error("INVITE_NO_LONGER_AVAILABLE");
      await transaction.groupMembership.create({
        data: {
          groupId: invite.groupId,
          schoolMembershipId: membership.id,
          role: "STUDENT",
        },
      });
      await transaction.auditLog.create({
        data: {
          schoolId: school.id,
          actorId: user.id,
          action: "GROUP_INVITE_ACCEPTED",
          entityType: "GroupInvite",
          entityId: invite.id,
          metadata: { groupId: invite.groupId },
        },
      });
    });
  }

  const group = await db.group.findFirst({ where: { id: invite.groupId, schoolId: school.id } });
  return { groupId: invite.groupId, groupName: String(group?.name || "Grup"), alreadyMember: Boolean(existing) };
}
