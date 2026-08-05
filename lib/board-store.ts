import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import { ensureDemoSchoolData } from "@/lib/admin";
import {
  listAccessibleBoards,
  requireBoardAccess,
} from "@/lib/access-control";
import { db } from "@/lib/db";
import type { DemoViewer } from "@/lib/demo-auth";
import type { PostKind } from "@/lib/permissions";
import {
  deleteObject,
  getObject,
  ObjectStorageConfigurationError,
  objectStorageConfigured,
  putObject,
} from "@/lib/object-storage";

export type StoredPollStatus =
  | "PENDING_APPROVAL"
  | "OPEN"
  | "CLOSED"
  | "PUBLISHED";

type PollRow = {
  id: string;
  question: string;
  anonymous: boolean;
  closesAt: Date | null;
  status: StoredPollStatus;
  createdByRole: string;
  createdBy: { name: string } | null;
  validatedBy: { name: string } | null;
  options: Array<{
    id: string;
    label: string;
    _count: { votes: number };
  }>;
  votes: Array<{ optionId: string }>;
};

type AttachmentRow = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  storageProvider: string;
  uploadedByRole: string;
  uploadedBy: { name: string } | null;
};

export type BoardChoice = {
  boardId: string;
  groupId: string;
  groupName: string;
};

async function accessContext(viewer: DemoViewer) {
  async function findAccess() {
    const actor = await db.user.findUnique({
      where: { email: viewer.email.toLowerCase() },
      select: { id: true },
    });
    if (!actor) return null;

    const membership = await db.schoolMembership.findFirst({
      where: {
        userId: actor.id,
        status: "ACTIVE",
        school: { slug: viewer.schoolSlug },
      },
      select: { id: true, role: true, schoolId: true },
    });
    return membership ? { actorId: actor.id, membership } : null;
  }

  const existing = await findAccess();
  if (existing) return existing;
  await ensureDemoSchoolData(viewer);
  const prepared = await findAccess();
  if (!prepared) throw new Error("No s'ha pogut preparar l'accés al centre.");
  return prepared;
}

export async function listBoardChoices(viewer: DemoViewer): Promise<BoardChoice[]> {
  return listAccessibleBoards(viewer);
}

async function boardContext(viewer: DemoViewer, requestedGroupId?: string | null) {
  return requireBoardAccess(viewer, requestedGroupId);
}

type PostRow = {
  id: string;
  title: string;
  message: string;
  type: PostKind;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string } | null;
};

export type StoredBoardPost = {
  id: string;
  kind: PostKind;
  title: string;
  body: string;
  meta: string;
};

const postInclude = { author: { select: { name: true } } };

function serializePost(post: PostRow): StoredBoardPost {
  const changed = post.updatedAt.getTime() > post.createdAt.getTime();
  return {
    id: post.id,
    kind: post.type,
    title: post.title,
    body: post.message,
    meta: `${post.author?.name ?? "Usuari eliminat"} · ${changed ? "editat" : "publicat"}`,
  };
}

export async function listPosts(viewer: DemoViewer, groupId?: string | null) {
  const { boardId } = await boardContext(viewer, groupId);
  const posts = await db.postIt.findMany({
    where: { boardId, status: "OPEN" },
    include: postInclude,
    orderBy: { createdAt: "desc" },
  });
  return posts.map((post: PostRow) => serializePost(post));
}

export async function createPost(
  viewer: DemoViewer,
  data: { kind: PostKind; title: string; body: string },
  groupId?: string | null,
) {
  const { boardId, actorId, access } = await boardContext(viewer, groupId);
  const post = await db.$transaction(async (transaction) => {
    const created = await transaction.postIt.create({
      data: {
        boardId,
        authorId: actorId,
        type: data.kind,
        title: data.title,
        message: data.body,
      },
      include: postInclude,
    });
    await transaction.auditLog.create({
      data: {
        schoolId: access.schoolId,
        actorId,
        action: "BOARD_POST_CREATED",
        entityType: "PostIt",
        entityId: created.id,
        metadata: { boardId, groupId, type: data.kind },
      },
    });
    return created;
  });
  return serializePost(post as PostRow);
}

export async function updatePost(
  viewer: DemoViewer,
  postId: string,
  data: { kind: PostKind; title: string; body: string },
  groupId?: string | null,
) {
  const { boardId, actorId, access } = await boardContext(viewer, groupId);
  return db.$transaction(async (transaction) => {
    const updated = await transaction.postIt.updateMany({
      where: { id: postId, boardId, status: "OPEN" },
      data: { type: data.kind, title: data.title, message: data.body },
    });
    if (!updated.count) return null;

    const post = await transaction.postIt.findFirst({
      where: { id: postId, boardId, status: "OPEN" },
      include: postInclude,
    });
    await transaction.auditLog.create({
      data: {
        schoolId: access.schoolId,
        actorId,
        action: "BOARD_POST_UPDATED",
        entityType: "PostIt",
        entityId: postId,
        metadata: { boardId, groupId, type: data.kind },
      },
    });
    return post ? serializePost(post as PostRow) : null;
  });
}

export async function archivePost(
  viewer: DemoViewer,
  postId: string,
  groupId?: string | null,
) {
  const { boardId, actorId, access } = await boardContext(viewer, groupId);
  return db.$transaction(async (transaction) => {
    const updated = await transaction.postIt.updateMany({
      where: { id: postId, boardId, status: "OPEN" },
      data: { status: "ARCHIVED" },
    });
    if (!updated.count) return false;

    await transaction.auditLog.create({
      data: {
        schoolId: access.schoolId,
        actorId,
        action: "BOARD_POST_ARCHIVED",
        entityType: "PostIt",
        entityId: postId,
        metadata: { boardId, groupId },
      },
    });
    return true;
  });
}

function anonymousVoterKey(viewer: DemoViewer) {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.DATABASE_URL ||
    "eltaulell-local-development-only";
  return createHmac("sha256", secret).update(viewer.id).digest("hex");
}

function pollInclude(voterKey: string) {
  return {
    createdBy: { select: { name: true } },
    validatedBy: { select: { name: true } },
    options: {
      orderBy: { position: "asc" as const },
      include: { _count: { select: { votes: true } } },
    },
    votes: {
      where: { voterKey },
      select: { optionId: true },
      take: 1,
    },
  };
}

function serializePoll(poll: PollRow, includeResults: boolean) {
  return {
    id: poll.id,
    question: poll.question,
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      votes: includeResults ? option._count.votes : 0,
    })),
    anonymous: poll.anonymous,
    closesAt: poll.closesAt?.toISOString() ?? null,
    status: poll.status,
    createdBy: poll.createdBy?.name ?? "Usuari eliminat",
    createdByRole: poll.createdByRole,
    validatedBy: poll.validatedBy?.name,
    voterChoice: poll.votes[0]?.optionId,
  };
}

export async function listPolls(
  viewer: DemoViewer,
  canManage: boolean,
  groupId?: string | null,
) {
  const { boardId, actorId } = await boardContext(viewer, groupId);
  const voterKey = anonymousVoterKey(viewer);
  const polls = await db.boardPoll.findMany({
    where: {
      boardId,
      ...(canManage
        ? {}
        : {
            OR: [
              { status: { not: "PENDING_APPROVAL" as const } },
              { createdById: actorId },
            ],
          }),
    },
    include: pollInclude(voterKey),
    orderBy: { createdAt: "desc" },
  });

  return polls.map((poll: PollRow) =>
    serializePoll(poll, canManage || poll.status === "PUBLISHED"),
  );
}

export async function createPoll(
  viewer: DemoViewer,
  data: {
    question: string;
    options: string[];
    anonymous: boolean;
    closesAt: string | null;
  },
  groupId?: string | null,
) {
  const { boardId, actorId } = await boardContext(viewer, groupId);
  const voterKey = anonymousVoterKey(viewer);
  const poll = await db.boardPoll.create({
    data: {
      boardId,
      question: data.question,
      anonymous: data.anonymous,
      closesAt: data.closesAt ? new Date(data.closesAt) : null,
      status: viewer.role === "DELEGATE" ? "PENDING_APPROVAL" : "OPEN",
      createdById: actorId,
      createdByRole: viewer.roleLabel,
      options: {
        create: data.options.map((label, position) => ({ label, position })),
      },
    },
    include: pollInclude(voterKey),
  });

  return serializePoll(
    poll as PollRow,
    viewer.role === "TUTOR" || viewer.role === "COORDINATOR",
  );
}

const validStatusForAction = {
  APPROVE: "PENDING_APPROVAL",
  CLOSE: "OPEN",
  PUBLISH: "CLOSED",
} as const;

const nextStatusForAction = {
  APPROVE: "OPEN",
  CLOSE: "CLOSED",
  PUBLISH: "PUBLISHED",
} as const;

export async function managePoll(
  viewer: DemoViewer,
  pollId: string,
  action: "APPROVE" | "CLOSE" | "PUBLISH" | "DELETE",
  groupId?: string | null,
) {
  const { boardId, actorId } = await boardContext(viewer, groupId);

  if (action === "DELETE") {
    const deleted = await db.boardPoll.deleteMany({ where: { id: pollId, boardId } });
    return deleted.count ? ({ status: "DELETED" } as const) : ({ error: "NOT_FOUND" } as const);
  }

  const updated = await db.boardPoll.updateMany({
    where: {
      id: pollId,
      boardId,
      status: validStatusForAction[action],
    },
    data: {
      status: nextStatusForAction[action],
      validatedById: actorId,
    },
  });
  if (updated.count) {
    return {
      status: nextStatusForAction[action],
      validatedBy: viewer.name,
    } as const;
  }

  const exists = await db.boardPoll.count({ where: { id: pollId, boardId } });
  return { error: exists ? "INVALID_TRANSITION" : "NOT_FOUND" } as const;
}

export async function votePoll(
  viewer: DemoViewer,
  pollId: string,
  optionId: string,
  groupId?: string | null,
) {
  const { boardId, actorId } = await boardContext(viewer, groupId);
  const poll = await db.boardPoll.findFirst({
    where: { id: pollId, boardId },
    select: {
      id: true,
      anonymous: true,
      status: true,
      closesAt: true,
      options: { where: { id: optionId }, select: { id: true }, take: 1 },
    },
  });
  if (!poll) return { error: "NOT_FOUND" } as const;
  if (poll.status !== "OPEN") return { error: "NOT_OPEN" } as const;

  if (poll.closesAt && poll.closesAt.getTime() <= Date.now()) {
    await db.boardPoll.updateMany({
      where: { id: poll.id, status: "OPEN" },
      data: { status: "CLOSED" },
    });
    return { error: "NOT_OPEN" } as const;
  }
  if (!poll.options[0]) return { error: "OPTION_NOT_FOUND" } as const;

  try {
    await db.boardPollVote.create({
      data: {
        pollId: poll.id,
        optionId: poll.options[0].id,
        voterKey: anonymousVoterKey(viewer),
        voterId: poll.anonymous ? null : actorId,
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { error: "ALREADY_VOTED" } as const;
    }
    throw error;
  }

  return { accepted: true, optionId } as const;
}

function serializeAttachment(attachment: AttachmentRow, groupId: string) {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.sizeBytes,
    caption: attachment.caption ?? "",
    url:
      `/api/board/attachments?groupId=${encodeURIComponent(groupId)}` +
      `&attachmentId=${encodeURIComponent(attachment.id)}`,
    uploadedBy: attachment.uploadedBy?.name ?? "Usuari eliminat",
    uploadedByRole: attachment.uploadedByRole,
    storageMode: attachment.storageProvider,
  };
}

const attachmentSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  caption: true,
  storageProvider: true,
  uploadedByRole: true,
  uploadedBy: { select: { name: true } },
};

export async function listAttachments(viewer: DemoViewer, groupId?: string | null) {
  const { boardId, groupId: selectedGroupId } = await boardContext(viewer, groupId);
  const attachments = await db.boardAttachment.findMany({
    where: { boardId },
    select: attachmentSelect,
    orderBy: { createdAt: "desc" },
  });
  return attachments.map((attachment: AttachmentRow) =>
    serializeAttachment(attachment, selectedGroupId),
  );
}

export async function createAttachment(
  viewer: DemoViewer,
  data: {
    fileName: string;
    mimeType: string;
    size: number;
    caption: string;
    content: Uint8Array;
  },
  groupId?: string | null,
) {
  const { boardId, actorId, groupId: selectedGroupId } = await boardContext(
    viewer,
    groupId,
  );
  const count = await db.boardAttachment.count({ where: { boardId } });
  if (count >= 30) return null;

  const useBucket = objectStorageConfigured();
  if (!useBucket && process.env.NODE_ENV === "production") {
    throw new ObjectStorageConfigurationError(
      "Cal connectar un Railway Bucket abans de pujar fitxers.",
    );
  }
  const storageKey = useBucket
    ? `boards/${boardId}/${randomUUID()}`
    : null;
  if (storageKey) await putObject(storageKey, data.content, data.mimeType);

  try {
    const attachment = await db.boardAttachment.create({
      data: {
        boardId,
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: data.size,
        caption: data.caption || null,
        storageKey,
        storageProvider: storageKey ? "RAILWAY_BUCKET" : "POSTGRESQL",
        content: storageKey ? null : Buffer.from(data.content),
        uploadedById: actorId,
        uploadedByRole: viewer.roleLabel,
      },
      select: attachmentSelect,
    });
    return serializeAttachment(attachment as AttachmentRow, selectedGroupId);
  } catch (error) {
    if (storageKey) await deleteObject(storageKey).catch(() => undefined);
    throw error;
  }
}

export async function getAttachment(
  viewer: DemoViewer,
  id: string,
  groupId?: string | null,
) {
  const { boardId } = await boardContext(viewer, groupId);
  const attachment = await db.boardAttachment.findFirst({
    where: { id, boardId },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      storageKey: true,
      content: true,
    },
  });
  if (!attachment) return null;
  if (attachment.storageKey && !objectStorageConfigured()) {
    throw new Error("El bucket de fitxers no està configurat.");
  }

  const content = attachment.storageKey
    ? await getObject(attachment.storageKey)
    : attachment.content
      ? new Uint8Array(attachment.content)
      : null;
  if (!content) return null;
  return { ...attachment, content };
}

export async function deleteAttachment(
  viewer: DemoViewer,
  id: string,
  groupId?: string | null,
) {
  const { boardId } = await boardContext(viewer, groupId);
  const attachment = await db.boardAttachment.findFirst({
    where: { id, boardId },
    select: { storageKey: true },
  });
  if (!attachment) return false;
  if (attachment.storageKey) {
    if (!objectStorageConfigured()) {
      throw new Error("El bucket de fitxers no està configurat.");
    }
    await deleteObject(attachment.storageKey);
  }
  const deleted = await db.boardAttachment.deleteMany({ where: { id, boardId } });
  return deleted.count > 0;
}
