import "server-only";

import { ensureDemoSchoolData } from "@/lib/admin";
import { canAccessGroup, type AccessSubject } from "@/lib/access-policy";
import { db } from "@/lib/db";
import type { DemoViewer } from "@/lib/demo-auth";

export type BoardAccess = {
  boardId: string;
  groupId: string;
  groupName: string;
};

export type ViewerAccessContext = AccessSubject & {
  membershipId: string;
};

export class AccessControlError extends Error {
  constructor(
    public readonly code:
      | "MEMBERSHIP_REQUIRED"
      | "ROLE_MISMATCH"
      | "GROUP_FORBIDDEN"
      | "BOARD_REQUIRED",
    public readonly status = 403,
  ) {
    super(code);
    this.name = "AccessControlError";
  }
}

type MembershipRow = {
  id: string;
  role: AccessSubject["role"];
  status: AccessSubject["status"];
  schoolId: string;
};

async function findMembership(viewer: DemoViewer) {
  const user = await db.user.findUnique({
    where: { email: viewer.email.toLowerCase() },
    select: { id: true },
  });
  if (!user) return null;

  const membership = await db.schoolMembership.findFirst({
    where: {
      userId: user.id,
      school: { slug: viewer.schoolSlug },
    },
    select: { id: true, role: true, status: true, schoolId: true },
  }) as MembershipRow | null;
  if (!membership) return null;
  return { userId: user.id as string, membership };
}

export async function getViewerAccessContext(
  viewer: DemoViewer,
): Promise<ViewerAccessContext> {
  let access = await findMembership(viewer);
  if (!access && viewer.mode === "demo") {
    await ensureDemoSchoolData(viewer);
    access = await findMembership(viewer);
  }
  if (!access || access.membership.status !== "ACTIVE") {
    throw new AccessControlError("MEMBERSHIP_REQUIRED");
  }
  if (access.membership.role !== viewer.role) {
    throw new AccessControlError("ROLE_MISMATCH");
  }

  const assignments = await db.groupMembership.findMany({
    where: { schoolMembershipId: access.membership.id },
    select: { group: { select: { id: true } } },
  });

  return {
    membershipId: access.membership.id,
    role: access.membership.role,
    status: access.membership.status,
    schoolId: access.membership.schoolId,
    userId: access.userId,
    groupIds: assignments.map(
      (assignment: { group: { id: string } }) => assignment.group.id,
    ),
  };
}

async function boardsForAccess(access: ViewerAccessContext): Promise<BoardAccess[]> {
  if (access.role === "COORDINATOR") {
    const boards = await db.board.findMany({
      where: { group: { schoolId: access.schoolId } },
      select: { id: true, group: { select: { id: true, name: true } } },
      orderBy: { group: { name: "asc" } },
    });
    return boards.map(
      (board: { id: string; group: { id: string; name: string } }) => ({
        boardId: board.id,
        groupId: board.group.id,
        groupName: board.group.name,
      }),
    );
  }

  const assignments = await db.groupMembership.findMany({
    where: { schoolMembershipId: access.membershipId },
    select: {
      group: {
        select: { id: true, name: true, schoolId: true, board: { select: { id: true } } },
      },
    },
    orderBy: { group: { name: "asc" } },
  });
  return assignments.flatMap(
    (assignment: {
      group: {
        id: string;
        name: string;
        schoolId?: string;
        board: { id: string } | null;
      };
    }) => {
      const group = assignment.group;
      if (
        !group.board ||
        !canAccessGroup(access, {
          schoolId: group.schoolId ?? access.schoolId,
          groupId: group.id,
        })
      ) {
        return [];
      }
      return [{ boardId: group.board.id, groupId: group.id, groupName: group.name }];
    },
  );
}

export async function listAccessibleBoards(
  viewer: DemoViewer,
): Promise<BoardAccess[]> {
  return boardsForAccess(await getViewerAccessContext(viewer));
}

export async function requireBoardAccess(
  viewer: DemoViewer,
  requestedGroupId?: string | null,
) {
  const access = await getViewerAccessContext(viewer);
  const boards = await boardsForAccess(access);
  if (requestedGroupId) {
    const selected = boards.find((board) => board.groupId === requestedGroupId);
    if (!selected) throw new AccessControlError("GROUP_FORBIDDEN");
    return { ...selected, actorId: access.userId, access };
  }

  const selected = boards[0];
  if (!selected) throw new AccessControlError("BOARD_REQUIRED", 404);
  return { ...selected, actorId: access.userId, access };
}
