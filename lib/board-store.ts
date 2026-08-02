import "server-only";

import { createHmac } from "node:crypto";
import { ensureDemoSchoolData } from "@/lib/admin";
import { db } from "@/lib/db";
import type { DemoViewer } from "@/lib/demo-auth";

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
  uploadedByRole: string;
  uploadedBy: { name: string } | null;
};

async function boardContext(viewer: DemoViewer) {
  const groupName = viewer.role === "COORDINATOR" ? "3r B" : viewer.groupName;
  async function findContext() {
    const [board, actor] = await Promise.all([
      db.board.findFirst({
        where: {
          group: {
            name: groupName,
            school: { slug: viewer.schoolSlug },
          },
        },
        select: { id: true },
      }),
      db.user.findUnique({
        where: { email: viewer.email.toLowerCase() },
        select: { id: true },
      }),
    ]);
    return board && actor ? { boardId: board.id, actorId: actor.id } : null;
  }

  const existing = await findContext();
  if (existing) return existing;

  await ensureDemoSchoolData(viewer);
  const prepared = await findContext();
  if (!prepared) throw new Error("No s'ha pogut preparar el taulell del grup.");
  return prepared;
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

async function ensureInitialPoll(boardId: string) {
  const tutor = await db.user.findUnique({
    where: { id: "tutor-marta" },
    select: { id: true },
  });
  const pollId = `demo-poll-${boardId}`;
  const poll = await db.boardPoll.upsert({
    where: { id: pollId },
    update: {},
    create: {
      id: pollId,
      boardId,
      question: "Quina activitat preferiu per a la tutoria?",
      anonymous: true,
      status: "OPEN",
      createdById: tutor?.id,
      createdByRole: "Tutora",
      options: {
        create: [
          { label: "Dinàmica de grup", position: 0 },
          { label: "Debat sobre xarxes", position: 1 },
          { label: "Sortida al pati", position: 2 },
        ],
      },
    },
    include: { options: { orderBy: { position: "asc" } } },
  });

  const seedVotes = [9, 12, 4].flatMap((count, optionIndex) =>
    Array.from({ length: count }, (_, voteIndex) => ({
      pollId: poll.id,
      optionId: poll.options[optionIndex].id,
      voterKey: `demo-${optionIndex}-${voteIndex}`,
    })),
  );
  await db.boardPollVote.createMany({ data: seedVotes, skipDuplicates: true });
}

export async function listPolls(viewer: DemoViewer, canManage: boolean) {
  const { boardId, actorId } = await boardContext(viewer);
  await ensureInitialPoll(boardId);
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
) {
  const { boardId, actorId } = await boardContext(viewer);
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
) {
  const { boardId, actorId } = await boardContext(viewer);

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
) {
  const { boardId, actorId } = await boardContext(viewer);
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

function serializeAttachment(attachment: AttachmentRow) {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.sizeBytes,
    caption: attachment.caption ?? "",
    url: `/api/board/attachments/${encodeURIComponent(attachment.id)}/content`,
    uploadedBy: attachment.uploadedBy?.name ?? "Usuari eliminat",
    uploadedByRole: attachment.uploadedByRole,
  };
}

const attachmentSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  caption: true,
  uploadedByRole: true,
  uploadedBy: { select: { name: true } },
};

export async function listAttachments(viewer: DemoViewer) {
  const { boardId } = await boardContext(viewer);
  const attachments = await db.boardAttachment.findMany({
    where: { boardId },
    select: attachmentSelect,
    orderBy: { createdAt: "desc" },
  });
  return attachments.map((attachment: AttachmentRow) => serializeAttachment(attachment));
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
) {
  const { boardId, actorId } = await boardContext(viewer);
  const count = await db.boardAttachment.count({ where: { boardId } });
  if (count >= 30) return null;

  const attachment = await db.boardAttachment.create({
    data: {
      boardId,
      fileName: data.fileName,
      mimeType: data.mimeType,
      sizeBytes: data.size,
      caption: data.caption || null,
      content: Buffer.from(data.content),
      uploadedById: actorId,
      uploadedByRole: viewer.roleLabel,
    },
    select: attachmentSelect,
  });
  return serializeAttachment(attachment as AttachmentRow);
}

export async function getAttachment(viewer: DemoViewer, id: string) {
  const { boardId } = await boardContext(viewer);
  return db.boardAttachment.findFirst({
    where: { id, boardId },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      content: true,
    },
  });
}

export async function deleteAttachment(viewer: DemoViewer, id: string) {
  const { boardId } = await boardContext(viewer);
  const deleted = await db.boardAttachment.deleteMany({ where: { id, boardId } });
  return deleted.count > 0;
}
