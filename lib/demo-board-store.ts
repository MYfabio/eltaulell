import "server-only";

import { randomUUID } from "node:crypto";
import type { DemoViewer } from "@/lib/demo-auth";

export type StoredPollStatus =
  | "PENDING_APPROVAL"
  | "OPEN"
  | "CLOSED"
  | "PUBLISHED";

export type StoredPoll = {
  id: string;
  boardKey: string;
  question: string;
  options: Array<{ id: string; label: string; votes: number }>;
  anonymous: boolean;
  closesAt: string | null;
  status: StoredPollStatus;
  createdBy: string;
  createdByRole: string;
  validatedBy?: string;
  createdAt: string;
  voterChoices: Map<string, string>;
};

export type StoredAttachment = {
  id: string;
  boardKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  caption: string;
  content: Uint8Array;
  uploadedBy: string;
  uploadedByRole: string;
  createdAt: string;
};

type DemoBoardStore = {
  polls: Map<string, StoredPoll>;
  attachments: Map<string, StoredAttachment>;
  seededBoards: Set<string>;
};

declare global {
  var __eltaulellDemoBoardStore: DemoBoardStore | undefined;
}

const store: DemoBoardStore = globalThis.__eltaulellDemoBoardStore ?? {
  polls: new Map(),
  attachments: new Map(),
  seededBoards: new Set(),
};

globalThis.__eltaulellDemoBoardStore = store;

export function boardKeyFor(viewer: DemoViewer) {
  const groupName = viewer.role === "COORDINATOR" ? "3r B" : viewer.groupName;
  return `${viewer.schoolSlug}:${groupName.toLowerCase()}`;
}

function seedPoll(boardKey: string) {
  if (store.seededBoards.has(boardKey)) return;
  store.seededBoards.add(boardKey);

  const id = `poll-tutoria-${boardKey}`;
  store.polls.set(id, {
    id,
    boardKey,
    question: "Quina activitat preferiu per a la tutoria?",
    options: [
      { id: `${id}-a`, label: "Dinàmica de grup", votes: 9 },
      { id: `${id}-b`, label: "Debat sobre xarxes", votes: 12 },
      { id: `${id}-c`, label: "Sortida al pati", votes: 4 },
    ],
    anonymous: true,
    closesAt: null,
    status: "OPEN",
    createdBy: "Marta Puig",
    createdByRole: "Tutora",
    createdAt: new Date().toISOString(),
    voterChoices: new Map(),
  });
}

export function serializePoll(
  poll: StoredPoll,
  viewerId: string,
  includeResults = false,
) {
  return {
    id: poll.id,
    question: poll.question,
    options: poll.options.map((option) => ({
      ...option,
      votes: includeResults ? option.votes : 0,
    })),
    anonymous: poll.anonymous,
    closesAt: poll.closesAt,
    status: poll.status,
    createdBy: poll.createdBy,
    createdByRole: poll.createdByRole,
    validatedBy: poll.validatedBy,
    voterChoice: poll.voterChoices.get(viewerId),
  };
}

export function listPolls(viewer: DemoViewer, canManage: boolean) {
  const boardKey = boardKeyFor(viewer);
  seedPoll(boardKey);
  return [...store.polls.values()]
    .filter(
      (poll) =>
        poll.boardKey === boardKey &&
        (poll.status !== "PENDING_APPROVAL" || canManage || poll.createdBy === viewer.name),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((poll) =>
      serializePoll(poll, viewer.id, canManage || poll.status === "PUBLISHED"),
    );
}

export function createPoll(
  viewer: DemoViewer,
  data: {
    question: string;
    options: string[];
    anonymous: boolean;
    closesAt: string | null;
  },
) {
  const poll: StoredPoll = {
    id: randomUUID(),
    boardKey: boardKeyFor(viewer),
    question: data.question,
    options: data.options.map((label) => ({ id: randomUUID(), label, votes: 0 })),
    anonymous: data.anonymous,
    closesAt: data.closesAt,
    status: viewer.role === "DELEGATE" ? "PENDING_APPROVAL" : "OPEN",
    createdBy: viewer.name,
    createdByRole: viewer.roleLabel,
    createdAt: new Date().toISOString(),
    voterChoices: new Map(),
  };
  store.polls.set(poll.id, poll);
  return serializePoll(
    poll,
    viewer.id,
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

export function managePoll(
  viewer: DemoViewer,
  pollId: string,
  action: "APPROVE" | "CLOSE" | "PUBLISH" | "DELETE",
) {
  const poll = store.polls.get(pollId);
  if (!poll || poll.boardKey !== boardKeyFor(viewer)) return { error: "NOT_FOUND" } as const;

  if (action === "DELETE") {
    store.polls.delete(pollId);
    return { status: "DELETED" } as const;
  }

  if (poll.status !== validStatusForAction[action]) {
    return { error: "INVALID_TRANSITION" } as const;
  }

  poll.status = nextStatusForAction[action];
  poll.validatedBy = viewer.name;
  return { status: poll.status, validatedBy: poll.validatedBy } as const;
}

export function votePoll(viewer: DemoViewer, pollId: string, optionId: string) {
  const poll = store.polls.get(pollId);
  if (!poll || poll.boardKey !== boardKeyFor(viewer)) return { error: "NOT_FOUND" } as const;
  if (poll.status !== "OPEN") return { error: "NOT_OPEN" } as const;

  if (poll.closesAt && new Date(poll.closesAt).getTime() <= Date.now()) {
    poll.status = "CLOSED";
    return { error: "NOT_OPEN" } as const;
  }

  if (poll.voterChoices.has(viewer.id)) return { error: "ALREADY_VOTED" } as const;
  const option = poll.options.find((candidate) => candidate.id === optionId);
  if (!option) return { error: "OPTION_NOT_FOUND" } as const;

  option.votes += 1;
  poll.voterChoices.set(viewer.id, optionId);
  return { accepted: true, optionId } as const;
}

function attachmentJson(attachment: StoredAttachment) {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    caption: attachment.caption,
    url: `/api/board/attachments/${encodeURIComponent(attachment.id)}/content`,
    uploadedBy: attachment.uploadedBy,
    uploadedByRole: attachment.uploadedByRole,
  };
}

export function listAttachments(viewer: DemoViewer) {
  const boardKey = boardKeyFor(viewer);
  return [...store.attachments.values()]
    .filter((attachment) => attachment.boardKey === boardKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(attachmentJson);
}

export function createAttachment(
  viewer: DemoViewer,
  data: {
    fileName: string;
    mimeType: string;
    size: number;
    caption: string;
    content: Uint8Array;
  },
) {
  const boardKey = boardKeyFor(viewer);
  const boardAttachmentCount = [...store.attachments.values()].filter(
    (attachment) => attachment.boardKey === boardKey,
  ).length;
  if (boardAttachmentCount >= 30) return null;

  const attachment: StoredAttachment = {
    id: randomUUID(),
    boardKey,
    ...data,
    uploadedBy: viewer.name,
    uploadedByRole: viewer.roleLabel,
    createdAt: new Date().toISOString(),
  };
  store.attachments.set(attachment.id, attachment);
  return attachmentJson(attachment);
}

export function getAttachment(viewer: DemoViewer, id: string) {
  const attachment = store.attachments.get(id);
  return attachment?.boardKey === boardKeyFor(viewer) ? attachment : null;
}

export function deleteAttachment(viewer: DemoViewer, id: string) {
  const attachment = getAttachment(viewer, id);
  if (!attachment) return false;
  return store.attachments.delete(id);
}
