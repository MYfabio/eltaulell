import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getViewerAccessContext, requireBoardAccess } from "@/lib/access-control";
import { db } from "@/lib/db";
import type { DemoViewer } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

type QueryRow = {
  id: string;
  schoolId: string;
  groupId: string;
  publicReference: string;
  accessTokenHash: string;
  subject: string;
  status: "OPEN" | "ASSIGNED" | "CLOSED";
  assignedRole: "TUTOR" | "COORDINATOR" | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MessageRow = {
  id: string;
  queryId: string;
  authorKind: "STUDENT_ANONYMOUS" | "TUTOR" | "COORDINATOR" | "SYSTEM";
  body: string;
  createdAt: Date;
};

function hashAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function serializeQuery(query: QueryRow) {
  const messages = await db.anonymousQueryMessage.findMany({
    where: { queryId: query.id },
    orderBy: { createdAt: "asc" },
  }) as MessageRow[];
  const group = await db.group.findFirst({ where: { id: query.groupId } }) as { name?: string } | null;
  return {
    id: query.id,
    reference: query.publicReference,
    groupId: query.groupId,
    groupName: group?.name || "Grup",
    subject: query.subject,
    status: query.status,
    assignedRole: query.assignedRole,
    createdAt: query.createdAt.toISOString(),
    updatedAt: query.updatedAt.toISOString(),
    messages: messages.map((message) => ({
      id: message.id,
      author: message.authorKind,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export async function createAnonymousQuery(
  viewer: DemoViewer,
  input: { groupId: string; subject: string; message: string },
) {
  if (!can(viewer, PERMISSIONS.SUBMIT_ANONYMOUS_QUERY)) throw new Error("QUERY_FORBIDDEN");
  const board = await requireBoardAccess(viewer, input.groupId);
  const token = randomBytes(32).toString("base64url");
  const reference = `Q-${randomBytes(5).toString("hex").toUpperCase()}`;
  const query = await db.anonymousQuery.create({
    data: {
      schoolId: board.access.schoolId,
      groupId: board.groupId,
      publicReference: reference,
      accessTokenHash: hashAccessToken(token),
      subject: input.subject,
    },
  }) as QueryRow;
  await db.anonymousQueryMessage.create({
    data: {
      queryId: query.id,
      authorKind: "STUDENT_ANONYMOUS",
      responderId: null,
      body: input.message,
    },
  });
  return { query: await serializeQuery(query), accessToken: token };
}

export async function readAnonymousQuery(reference: string, accessToken: string) {
  const query = await db.anonymousQuery.findFirst({
    where: { publicReference: reference, accessTokenHash: hashAccessToken(accessToken) },
  }) as QueryRow | null;
  if (!query) throw new Error("QUERY_NOT_FOUND");
  return serializeQuery(query);
}

async function requireStaffQuery(viewer: DemoViewer, id: string) {
  if (!can(viewer, PERMISSIONS.VIEW_ANONYMOUS_INBOX)) throw new Error("QUERY_FORBIDDEN");
  const access = await getViewerAccessContext(viewer);
  const query = await db.anonymousQuery.findFirst({
    where: { id, schoolId: access.schoolId },
  }) as QueryRow | null;
  if (!query || (access.role === "TUTOR" && !access.groupIds.includes(query.groupId))) {
    throw new Error("QUERY_NOT_FOUND");
  }
  return { access, query };
}

export async function listAnonymousInbox(viewer: DemoViewer) {
  if (!can(viewer, PERMISSIONS.VIEW_ANONYMOUS_INBOX)) throw new Error("QUERY_FORBIDDEN");
  const access = await getViewerAccessContext(viewer);
  const queries = await db.anonymousQuery.findMany({
    where: {
      schoolId: access.schoolId,
      ...(access.role === "TUTOR" ? { groupId: { in: access.groupIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
  }) as QueryRow[];
  return Promise.all(queries.map(serializeQuery));
}

export async function addAnonymousQueryMessage(
  viewer: DemoViewer,
  id: string,
  body: string,
  accessToken?: string,
) {
  if (accessToken) {
    const query = await db.anonymousQuery.findFirst({
      where: { id, accessTokenHash: hashAccessToken(accessToken) },
    }) as QueryRow | null;
    if (!query) throw new Error("QUERY_NOT_FOUND");
    if (query.status === "CLOSED") throw new Error("QUERY_CLOSED");
    await db.anonymousQueryMessage.create({
      data: { queryId: id, authorKind: "STUDENT_ANONYMOUS", responderId: null, body },
    });
    await db.anonymousQuery.update({ where: { id }, data: {} });
    return serializeQuery(query);
  }

  const { access, query } = await requireStaffQuery(viewer, id);
  if (query.status === "CLOSED") throw new Error("QUERY_CLOSED");
  const authorKind = access.role === "COORDINATOR" ? "COORDINATOR" : "TUTOR";
  await db.anonymousQueryMessage.create({
    data: { queryId: id, authorKind, responderId: access.userId, body },
  });
  const updated = await db.anonymousQuery.update({
    where: { id },
    data: {
      status: "ASSIGNED",
      assignedRole: query.assignedRole || access.role,
    },
  }) as QueryRow;
  return serializeQuery(updated);
}

export async function updateAnonymousQuery(
  viewer: DemoViewer,
  id: string,
  input: { status?: "ASSIGNED" | "CLOSED"; assignedRole?: "TUTOR" | "COORDINATOR" },
) {
  const { access, query } = await requireStaffQuery(viewer, id);
  const data: Record<string, unknown> = {};
  if (input.assignedRole) {
    data.assignedRole = input.assignedRole;
    data.status = "ASSIGNED";
  }
  if (input.status) {
    data.status = input.status;
    data.closedAt = input.status === "CLOSED" ? new Date() : null;
  }
  const updated = await db.anonymousQuery.update({ where: { id }, data }) as QueryRow;
  await db.anonymousQueryMessage.create({
    data: {
      queryId: id,
      authorKind: "SYSTEM",
      responderId: access.userId,
      body: input.status === "CLOSED"
        ? "La consulta s'ha tancat."
        : `La consulta s'ha derivat a ${input.assignedRole === "COORDINATOR" ? "coordinació" : "tutoria"}.`,
    },
  });
  return serializeQuery(updated || query);
}
