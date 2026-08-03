import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

type Row = Record<string, any>;
type DbMethod = (args: any) => Promise<any>;

export interface DatabaseClient {
  $transaction<T>(operation: (transaction: DatabaseClient) => Promise<T>): Promise<T>;
  auditLog: { create: DbMethod };
  board: { findMany: DbMethod; upsert: DbMethod };
  boardAttachment: {
    count: DbMethod;
    create: DbMethod;
    deleteMany: DbMethod;
    findFirst: DbMethod;
    findMany: DbMethod;
  };
  boardPoll: {
    count: DbMethod;
    create: DbMethod;
    deleteMany: DbMethod;
    findFirst: DbMethod;
    findMany: DbMethod;
    updateMany: DbMethod;
  };
  boardPollVote: { create: DbMethod };
  group: { create: DbMethod; findFirst: DbMethod; upsert: DbMethod };
  groupMembership: {
    count: DbMethod;
    create: DbMethod;
    deleteMany: DbMethod;
    findMany: DbMethod;
    upsert: DbMethod;
  };
  school: { findUniqueOrThrow: DbMethod; upsert: DbMethod };
  schoolMembership: {
    count: DbMethod;
    create: DbMethod;
    findFirst: DbMethod;
    findUnique: DbMethod;
    update: DbMethod;
    upsert: DbMethod;
  };
  user: { findUnique: DbMethod; upsert: DbMethod };
}

type LocalState = {
  attachments: Row[];
  auditLogs: Row[];
  boards: Row[];
  groupMemberships: Row[];
  groups: Row[];
  memberships: Row[];
  pollOptions: Row[];
  polls: Row[];
  schools: Row[];
  users: Row[];
  votes: Row[];
};

function makeState(): LocalState {
  return {
    attachments: [],
    auditLogs: [],
    boards: [],
    groupMemberships: [],
    groups: [],
    memberships: [],
    pollOptions: [],
    polls: [],
    schools: [],
    users: [],
    votes: [],
  };
}

function readPersistedState(filePath: string | undefined) {
  if (!filePath || !existsSync(filePath)) return makeState();
  return JSON.parse(readFileSync(filePath, "utf8"), (_key, value) => {
    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    ) {
      return new Date(value);
    }
    if (value?.type === "Buffer" && Array.isArray(value.data)) {
      return Buffer.from(value.data);
    }
    return value;
  }) as LocalState;
}

function now() {
  return new Date();
}

function project(row: Row | null | undefined, select?: Row) {
  if (!row || !select) return row ?? null;
  return Object.fromEntries(
    Object.entries(select)
      .filter(([, included]) => included === true)
      .map(([key]) => [key, row[key]]),
  );
}

function uniqueError(message: string) {
  return Object.assign(new Error(message), { code: "P2002" });
}

export function createLocalDb(): DatabaseClient {
  const stateFile = process.env.ELTAULELL_LOCAL_STATE_FILE;
  let state = readPersistedState(stateFile);
  let client: DatabaseClient;

  function refreshState() {
    if (stateFile && existsSync(stateFile)) state = readPersistedState(stateFile);
  }

  function persistState() {
    if (stateFile) writeFileSync(stateFile, JSON.stringify(state), "utf8");
  }

  const userById = (id: string | null | undefined) =>
    state.users.find((user) => user.id === id) ?? null;
  const schoolById = (id: string | null | undefined) =>
    state.schools.find((school) => school.id === id) ?? null;
  const groupById = (id: string | null | undefined) =>
    state.groups.find((group) => group.id === id) ?? null;
  const boardByGroupId = (groupId: string) =>
    state.boards.find((board) => board.groupId === groupId) ?? null;

  function pollResult(poll: Row, voterKey?: string) {
    return {
      ...poll,
      createdBy: userById(poll.createdById),
      validatedBy: userById(poll.validatedById),
      options: state.pollOptions
        .filter((option) => option.pollId === poll.id)
        .sort((a, b) => a.position - b.position)
        .map((option) => ({
          ...option,
          _count: {
            votes: state.votes.filter((vote) => vote.optionId === option.id).length,
          },
        })),
      votes: state.votes
        .filter((vote) => vote.pollId === poll.id && (!voterKey || vote.voterKey === voterKey))
        .slice(0, 1)
        .map((vote) => ({ optionId: vote.optionId })),
    };
  }

  client = {
    async $transaction<T>(operation: (transaction: DatabaseClient) => Promise<T>) {
      return operation(client);
    },

    school: {
      async upsert({ where, create }: Row) {
        const existing = state.schools.find((school) => school.slug === where.slug);
        if (existing) return existing;
        const school = { id: randomUUID(), createdAt: now(), updatedAt: now(), ...create };
        state.schools.push(school);
        return school;
      },
      async findUniqueOrThrow({ where }: Row) {
        const school = schoolById(where.id);
        if (!school) throw new Error("School not found");
        return {
          ...school,
          groups: state.groups
            .filter((group) => group.schoolId === school.id)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((group) => ({
              ...group,
              _count: {
                members: state.groupMemberships.filter(
                  (membership) => membership.groupId === group.id,
                ).length,
              },
            })),
          memberships: (state.memberships
            .filter((membership) => membership.schoolId === school.id)
            .map((membership): Row => ({
              ...membership,
              user: userById(membership.userId),
              groupMemberships: state.groupMemberships
                .filter((assignment) => assignment.schoolMembershipId === membership.id)
                .map((assignment) => ({
                  ...assignment,
                  group: groupById(assignment.groupId),
                })),
            })) as Row[])
            .sort((a, b) =>
              `${a.role}-${a.user?.name}`.localeCompare(`${b.role}-${b.user?.name}`),
            ),
          auditLogs: state.auditLogs
            .filter((entry) => entry.schoolId === school.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 10)
            .map((entry) => ({ ...entry, actor: userById(entry.actorId) })),
        };
      },
    },

    user: {
      async upsert({ where, update, create }: Row) {
        const email = where.email.toLowerCase();
        const existing = state.users.find((user) => user.email === email);
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          return existing;
        }
        const user = {
          id: create.id ?? randomUUID(),
          createdAt: now(),
          updatedAt: now(),
          ...create,
          email: create.email.toLowerCase(),
        };
        state.users.push(user);
        return user;
      },
      async findUnique({ where, select }: Row) {
        const user = where.email
          ? state.users.find((candidate) => candidate.email === where.email.toLowerCase())
          : state.users.find((candidate) => candidate.id === where.id);
        return project(user, select);
      },
    },

    schoolMembership: {
      async upsert({ where, create }: Row) {
        const key = where.schoolId_userId;
        const existing = state.memberships.find(
          (membership) =>
            membership.schoolId === key.schoolId && membership.userId === key.userId,
        );
        if (existing) return existing;
        const membership = {
          id: randomUUID(),
          createdAt: now(),
          updatedAt: now(),
          status: "ACTIVE",
          ...create,
        };
        state.memberships.push(membership);
        return membership;
      },
      async findFirst({ where, select, include }: Row) {
        const membership = state.memberships.find((candidate) => {
          if (where.id && candidate.id !== where.id) return false;
          if (where.userId && candidate.userId !== where.userId) return false;
          if (where.schoolId && candidate.schoolId !== where.schoolId) return false;
          if (where.status && candidate.status !== where.status) return false;
          if (where.role && candidate.role !== where.role) return false;
          if (where.school?.slug && schoolById(candidate.schoolId)?.slug !== where.school.slug) {
            return false;
          }
          return true;
        });
        if (!membership) return null;
        if (include?.user) return { ...membership, user: userById(membership.userId) };
        return project(membership, select);
      },
      async findUnique({ where }: Row) {
        const key = where.schoolId_userId;
        return (
          state.memberships.find(
            (membership) =>
              membership.schoolId === key.schoolId && membership.userId === key.userId,
          ) ?? null
        );
      },
      async create({ data }: Row) {
        if (
          state.memberships.some(
            (membership) =>
              membership.schoolId === data.schoolId && membership.userId === data.userId,
          )
        ) {
          throw uniqueError("Membership already exists");
        }
        const membership = {
          id: randomUUID(),
          createdAt: now(),
          updatedAt: now(),
          status: "ACTIVE",
          ...data,
        };
        delete membership.groupMemberships;
        state.memberships.push(membership);
        const assignment = data.groupMemberships?.create;
        if (assignment) {
          state.groupMemberships.push({
            id: randomUUID(),
            schoolMembershipId: membership.id,
            createdAt: now(),
            ...assignment,
          });
        }
        return membership;
      },
      async update({ where, data }: Row) {
        const membership = state.memberships.find((candidate) => candidate.id === where.id);
        if (!membership) throw new Error("Membership not found");
        Object.assign(membership, data, { updatedAt: now() });
        return membership;
      },
      async count({ where }: Row) {
        return state.memberships.filter((membership) =>
          Object.entries(where).every(([key, value]) => membership[key] === value),
        ).length;
      },
    },

    group: {
      async upsert({ where, create }: Row) {
        const key = where.schoolId_academicYear_name;
        const existing = state.groups.find(
          (group) =>
            group.schoolId === key.schoolId &&
            group.academicYear === key.academicYear &&
            group.name === key.name,
        );
        if (existing) return existing;
        const group = { id: randomUUID(), createdAt: now(), updatedAt: now(), ...create };
        state.groups.push(group);
        return group;
      },
      async findFirst({ where }: Row) {
        return (
          state.groups.find(
            (group) => group.id === where.id && (!where.schoolId || group.schoolId === where.schoolId),
          ) ?? null
        );
      },
      async create({ data }: Row) {
        if (
          state.groups.some(
            (group) =>
              group.schoolId === data.schoolId &&
              group.academicYear === data.academicYear &&
              group.name === data.name,
          )
        ) {
          throw uniqueError("Group already exists");
        }
        const group = {
          id: randomUUID(),
          createdAt: now(),
          updatedAt: now(),
          ...data,
        };
        delete group.board;
        state.groups.push(group);
        if (data.board?.create) {
          state.boards.push({
            id: randomUUID(),
            groupId: group.id,
            createdAt: now(),
            updatedAt: now(),
            ...data.board.create,
          });
        }
        return group;
      },
    },

    board: {
      async upsert({ where, create }: Row) {
        const existing = boardByGroupId(where.groupId);
        if (existing) return existing;
        const board = { id: randomUUID(), createdAt: now(), updatedAt: now(), ...create };
        state.boards.push(board);
        return board;
      },
      async findMany({ where }: Row) {
        return state.boards
          .filter((board) => groupById(board.groupId)?.schoolId === where.group.schoolId)
          .map((board) => {
            const group = groupById(board.groupId)!;
            return { id: board.id, group: { id: group.id, name: group.name } };
          })
          .sort((a, b) => a.group.name.localeCompare(b.group.name));
      },
    },

    groupMembership: {
      async count({ where }: Row) {
        return state.groupMemberships.filter(
          (membership) => membership.schoolMembershipId === where.schoolMembershipId,
        ).length;
      },
      async upsert({ where, create }: Row) {
        const key = where.groupId_schoolMembershipId;
        const existing = state.groupMemberships.find(
          (membership) =>
            membership.groupId === key.groupId &&
            membership.schoolMembershipId === key.schoolMembershipId,
        );
        if (existing) return existing;
        const assignment = { id: randomUUID(), createdAt: now(), ...create };
        state.groupMemberships.push(assignment);
        return assignment;
      },
      async findMany({ where }: Row) {
        return state.groupMemberships
          .filter((membership) => membership.schoolMembershipId === where.schoolMembershipId)
          .map((membership) => {
            const group = groupById(membership.groupId)!;
            return {
              group: {
                id: group.id,
                name: group.name,
                board: boardByGroupId(group.id),
              },
            };
          })
          .sort((a, b) => a.group.name.localeCompare(b.group.name));
      },
      async deleteMany({ where }: Row) {
        const before = state.groupMemberships.length;
        state.groupMemberships = state.groupMemberships.filter(
          (membership) => membership.schoolMembershipId !== where.schoolMembershipId,
        );
        return { count: before - state.groupMemberships.length };
      },
      async create({ data }: Row) {
        const assignment = { id: randomUUID(), createdAt: now(), ...data };
        state.groupMemberships.push(assignment);
        return assignment;
      },
    },

    auditLog: {
      async create({ data }: Row) {
        const entry = { id: randomUUID(), createdAt: now(), ...data };
        state.auditLogs.push(entry);
        return entry;
      },
    },

    boardPoll: {
      async findMany({ where, include }: Row) {
        const voterKey = include?.votes?.where?.voterKey;
        return state.polls
          .filter((poll) => {
            if (poll.boardId !== where.boardId) return false;
            if (!where.OR) return true;
            return poll.status !== "PENDING_APPROVAL" || poll.createdById === where.OR[1].createdById;
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((poll) => pollResult(poll, voterKey));
      },
      async create({ data, include }: Row) {
        const poll = {
          id: randomUUID(),
          createdAt: now(),
          updatedAt: now(),
          validatedById: null,
          ...data,
        };
        delete poll.options;
        state.polls.push(poll);
        for (const option of data.options.create) {
          state.pollOptions.push({ id: randomUUID(), pollId: poll.id, ...option });
        }
        return pollResult(poll, include?.votes?.where?.voterKey);
      },
      async updateMany({ where, data }: Row) {
        const matches = state.polls.filter(
          (poll) =>
            poll.id === where.id && poll.boardId === where.boardId && poll.status === where.status,
        );
        matches.forEach((poll) => Object.assign(poll, data, { updatedAt: now() }));
        return { count: matches.length };
      },
      async count({ where }: Row) {
        return state.polls.filter(
          (poll) => poll.id === where.id && poll.boardId === where.boardId,
        ).length;
      },
      async findFirst({ where, select }: Row) {
        const poll = state.polls.find(
          (candidate) => candidate.id === where.id && candidate.boardId === where.boardId,
        );
        if (!poll) return null;
        return {
          id: poll.id,
          anonymous: poll.anonymous,
          status: poll.status,
          closesAt: poll.closesAt,
          options: state.pollOptions
            .filter(
              (option) => option.pollId === poll.id && option.id === select?.options?.where?.id,
            )
            .slice(0, 1)
            .map((option) => ({ id: option.id })),
        };
      },
      async deleteMany({ where }: Row) {
        const targets = state.polls.filter(
          (poll) => poll.id === where.id && poll.boardId === where.boardId,
        );
        const ids = new Set(targets.map((poll) => poll.id));
        state.polls = state.polls.filter((poll) => !ids.has(poll.id));
        state.pollOptions = state.pollOptions.filter((option) => !ids.has(option.pollId));
        state.votes = state.votes.filter((vote) => !ids.has(vote.pollId));
        return { count: targets.length };
      },
    },

    boardPollVote: {
      async create({ data }: Row) {
        if (
          state.votes.some(
            (vote) => vote.pollId === data.pollId && vote.voterKey === data.voterKey,
          )
        ) {
          throw uniqueError("Vote already exists");
        }
        const vote = { id: randomUUID(), createdAt: now(), ...data };
        state.votes.push(vote);
        return vote;
      },
    },

    boardAttachment: {
      async count({ where }: Row) {
        return state.attachments.filter((attachment) => attachment.boardId === where.boardId).length;
      },
      async create({ data, select }: Row) {
        const attachment = { id: randomUUID(), createdAt: now(), ...data };
        state.attachments.push(attachment);
        const selected = project(attachment, select) as Row;
        return {
          ...selected,
          uploadedBy: userById(attachment.uploadedById),
        };
      },
      async findMany({ where, select }: Row) {
        return state.attachments
          .filter((attachment) => attachment.boardId === where.boardId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((attachment) => ({
            ...project(attachment, select),
            uploadedBy: userById(attachment.uploadedById),
          }));
      },
      async findFirst({ where, select }: Row) {
        const attachment = state.attachments.find(
          (candidate) => candidate.id === where.id && candidate.boardId === where.boardId,
        );
        return project(attachment, select);
      },
      async deleteMany({ where }: Row) {
        const before = state.attachments.length;
        state.attachments = state.attachments.filter(
          (attachment) => !(attachment.id === where.id && attachment.boardId === where.boardId),
        );
        return { count: before - state.attachments.length };
      },
    },
  };

  const mutatingMethods = new Set(["create", "deleteMany", "update", "updateMany", "upsert"]);
  const persistedClient: Record<string, unknown> = {};

  for (const [modelName, model] of Object.entries(client)) {
    if (typeof model === "function") {
      persistedClient[modelName] = async (...args: unknown[]) => {
        refreshState();
        return model(...args);
      };
      continue;
    }

    persistedClient[modelName] = Object.fromEntries(
      Object.entries(model).map(([methodName, method]) => {
        if (typeof method !== "function") {
          throw new Error(`Mètode local no vàlid: ${modelName}.${methodName}`);
        }
        return [
          methodName,
          async (...args: unknown[]) => {
            refreshState();
            const result = await method(...args);
            if (mutatingMethods.has(methodName)) persistState();
            return result;
          },
        ];
      }),
    );
  }

  client = persistedClient as unknown as DatabaseClient;
  return client;
}
