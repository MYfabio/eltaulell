import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

type Row = Record<string, any>;
type DbMethod = (args: any) => Promise<any>;

export interface DatabaseClient {
  $transaction<T>(operation: (transaction: DatabaseClient) => Promise<T>): Promise<T>;
  auditLog: { create: DbMethod };
  platformAdmin: { findFirst: DbMethod; upsert: DbMethod };
  platformAuditLog: { create: DbMethod; findMany: DbMethod };
  demoRequest: {
    create: DbMethod;
    deleteMany: DbMethod;
    findMany: DbMethod;
    findUnique: DbMethod;
    update: DbMethod;
  };
  learningTask: {
    create: DbMethod;
    findFirst: DbMethod;
    findMany: DbMethod;
    updateMany: DbMethod;
    upsert: DbMethod;
  };
  aiUsageEvent: {
    count: DbMethod;
    create: DbMethod;
    deleteMany: DbMethod;
    findMany: DbMethod;
  };
  anonymousQuery: {
    create: DbMethod;
    findFirst: DbMethod;
    findMany: DbMethod;
    update: DbMethod;
  };
  anonymousQueryMessage: { create: DbMethod; findMany: DbMethod };
  integrationConnection: {
    findFirst: DbMethod;
    update: DbMethod;
    upsert: DbMethod;
  };
  integrationSyncJob: { create: DbMethod; update: DbMethod };
  externalCourse: { findMany: DbMethod; upsert: DbMethod };
  externalResource: { findMany: DbMethod; upsert: DbMethod };
  oauthAccount: { findFirst: DbMethod; upsert: DbMethod };
  calendarEvent: {
    create: DbMethod;
    deleteMany: DbMethod;
    findFirst: DbMethod;
    findMany: DbMethod;
    update: DbMethod;
  };
  emailDelivery: { create: DbMethod; update: DbMethod };
  passwordResetToken: {
    create: DbMethod;
    findUnique: DbMethod;
    update: DbMethod;
    updateMany: DbMethod;
  };
  board: { findMany: DbMethod; upsert: DbMethod };
  postIt: {
    create: DbMethod;
    findFirst: DbMethod;
    findMany: DbMethod;
    updateMany: DbMethod;
    upsert: DbMethod;
  };
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
  groupInvite: {
    create: DbMethod;
    findFirst: DbMethod;
    findMany: DbMethod;
    update: DbMethod;
    updateMany: DbMethod;
  };
  invitation: {
    create: DbMethod;
    findUnique: DbMethod;
    update: DbMethod;
    updateMany: DbMethod;
  };
  passwordCredential: {
    findUnique: DbMethod;
    update: DbMethod;
    upsert: DbMethod;
  };
  school: {
    create: DbMethod;
    findFirst: DbMethod;
    findMany: DbMethod;
    findUniqueOrThrow: DbMethod;
    update: DbMethod;
    upsert: DbMethod;
  };
  schoolMembership: {
    count: DbMethod;
    create: DbMethod;
    findFirst: DbMethod;
    findMany: DbMethod;
    findUnique: DbMethod;
    update: DbMethod;
    upsert: DbMethod;
  };
  session: {
    create: DbMethod;
    findMany: DbMethod;
    findUnique: DbMethod;
    update: DbMethod;
    updateMany: DbMethod;
  };
  user: { findUnique: DbMethod; upsert: DbMethod };
}

type LocalState = {
  attachments: Row[];
  auditLogs: Row[];
  boards: Row[];
  groupMemberships: Row[];
  groupInvites: Row[];
  invitations: Row[];
  groups: Row[];
  memberships: Row[];
  pollOptions: Row[];
  polls: Row[];
  posts: Row[];
  platformAdmins: Row[];
  platformAuditLogs: Row[];
  demoRequests: Row[];
  passwordCredentials: Row[];
  schools: Row[];
  sessions: Row[];
  users: Row[];
  votes: Row[];
  learningTasks: Row[];
  aiUsageEvents: Row[];
  anonymousQueries: Row[];
  anonymousQueryMessages: Row[];
  integrationConnections: Row[];
  syncJobs: Row[];
  externalCourses: Row[];
  externalResources: Row[];
  oauthAccounts: Row[];
  calendarEvents: Row[];
  emailDeliveries: Row[];
  passwordResetTokens: Row[];
};

function makeState(): LocalState {
  return {
    attachments: [],
    auditLogs: [],
    boards: [],
    groupMemberships: [],
    groupInvites: [],
    invitations: [],
    groups: [],
    memberships: [],
    pollOptions: [],
    polls: [],
    posts: [],
    platformAdmins: [],
    platformAuditLogs: [],
    demoRequests: [],
    passwordCredentials: [],
    schools: [],
    sessions: [],
    users: [],
    votes: [],
    learningTasks: [],
    aiUsageEvents: [],
    anonymousQueries: [],
    anonymousQueryMessages: [],
    integrationConnections: [],
    syncJobs: [],
    externalCourses: [],
    externalResources: [],
    oauthAccounts: [],
    calendarEvents: [],
    emailDeliveries: [],
    passwordResetTokens: [],
  };
}

function readPersistedState(filePath: string | undefined) {
  if (!filePath || !existsSync(filePath)) return makeState();
  const persisted = JSON.parse(readFileSync(filePath, "utf8"), (_key, value) => {
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
  }) as Partial<LocalState>;
  return { ...makeState(), ...persisted } as LocalState;
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
  const membershipById = (id: string | null | undefined) =>
    state.memberships.find((membership) => membership.id === id) ?? null;

  function sessionResult(session: Row) {
    const membership = membershipById(session.schoolMembershipId);
    const school = schoolById(membership?.schoolId);
    return {
      ...session,
      user: userById(session.userId),
      schoolMembership: membership && school
        ? {
            ...membership,
            school,
            groupMemberships: state.groupMemberships
              .filter((assignment) => assignment.schoolMembershipId === membership.id)
              .flatMap((assignment) => {
                const group = groupById(assignment.groupId);
                return group ? [{ group }] : [];
              })
              .sort((a, b) => a.group.name.localeCompare(b.group.name)),
          }
        : null,
    };
  }

  const postResult = (post: Row) => ({
    ...post,
    author: userById(post.authorId),
  });

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
      async upsert({ where, create, update }: Row) {
        const existing = state.schools.find((school) => school.slug === where.slug);
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          return existing;
        }
        const school = {
          id: randomUUID(),
          emailDomain: null,
          active: true,
          plan: "PILOT",
          maxUsers: 500,
          maxGroups: 30,
          createdAt: now(),
          updatedAt: now(),
          ...create,
        };
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
      async findFirst({ where, select }: Row) {
        const school = state.schools.find((candidate) => {
          if (where.id && candidate.id !== where.id) return false;
          if (where.slug && candidate.slug !== where.slug) return false;
          return true;
        });
        return project(school, select);
      },
      async findMany() {
        return state.schools
          .map((school): Row => ({
            ...school,
            memberships: state.memberships
              .filter(
                (membership) =>
                  membership.schoolId === school.id &&
                  membership.role === "COORDINATOR",
              )
              .map((membership) => ({
                ...membership,
                user: userById(membership.userId),
              })),
            _count: {
              memberships: state.memberships.filter(
                (membership) => membership.schoolId === school.id,
              ).length,
              groups: state.groups.filter((group) => group.schoolId === school.id).length,
            },
          }))
          .sort((a: Row, b: Row) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      async create({ data }: Row) {
        if (state.schools.some((school) => school.slug === data.slug)) {
          throw uniqueError("School slug already exists");
        }
        const school = {
          id: randomUUID(),
          active: true,
          plan: "PILOT",
          maxUsers: 500,
          maxGroups: 30,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        };
        state.schools.push(school);
        return school;
      },
      async update({ where, data }: Row) {
        const school = schoolById(where.id);
        if (!school) throw new Error("School not found");
        if (
          data.slug &&
          state.schools.some((candidate) => candidate.id !== school.id && candidate.slug === data.slug)
        ) {
          throw uniqueError("School slug already exists");
        }
        Object.assign(school, data, { updatedAt: now() });
        return school;
      },
    },

    platformAdmin: {
      async findFirst({ where }: Row) {
        return state.platformAdmins.find((admin) => {
          if (where.userId && admin.userId !== where.userId) return false;
          if (typeof where.active === "boolean" && admin.active !== where.active) return false;
          return true;
        }) ?? null;
      },
      async upsert({ where, create, update }: Row) {
        const existing = state.platformAdmins.find((admin) => admin.userId === where.userId);
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          persistState();
          return existing;
        }
        const admin = {
          id: randomUUID(),
          active: true,
          createdAt: now(),
          updatedAt: now(),
          ...create,
        };
        state.platformAdmins.push(admin);
        persistState();
        return admin;
      },
    },

    platformAuditLog: {
      async create({ data }: Row) {
        const entry = { id: randomUUID(), createdAt: now(), ...data };
        state.platformAuditLogs.push(entry);
        return entry;
      },
      async findMany() {
        return state.platformAuditLogs
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 20)
          .map((entry) => {
            const admin = state.platformAdmins.find(
              (candidate) => candidate.id === entry.platformAdminId,
            );
            return {
              ...entry,
              platformAdmin: admin ? { user: userById(admin.userId) } : null,
              school: schoolById(entry.schoolId),
            };
          });
      },
    },

    session: {
      async create({ data }: Row) {
        if (state.sessions.some((session) => session.tokenHash === data.tokenHash)) {
          throw uniqueError("Session token already exists");
        }
        const session = {
          id: randomUUID(),
          revokedAt: null,
          createdAt: now(),
          lastSeenAt: now(),
          ...data,
        };
        state.sessions.push(session);
        return session;
      },
      async findUnique({ where }: Row) {
        const session = state.sessions.find((candidate) =>
          where.id ? candidate.id === where.id : candidate.tokenHash === where.tokenHash,
        );
        return session ? sessionResult(session) : null;
      },
      async findMany({ where = {}, orderBy }: Row = {}) {
        const sessions = state.sessions.filter((session) => {
          if (
            where.schoolMembershipId?.in &&
            !where.schoolMembershipId.in.includes(session.schoolMembershipId)
          ) {
            return false;
          }
          if (where.revokedAt === null && session.revokedAt !== null) return false;
          return true;
        });
        if (orderBy?.lastSeenAt === "desc") {
          sessions.sort(
            (left, right) => right.lastSeenAt.getTime() - left.lastSeenAt.getTime(),
          );
        }
        return sessions;
      },
      async update({ where, data }: Row) {
        const session = state.sessions.find((candidate) => candidate.id === where.id);
        if (!session) throw new Error("Session not found");
        Object.assign(session, data);
        return session;
      },
      async updateMany({ where, data }: Row) {
        const matches = state.sessions.filter((session) => {
          if (where.tokenHash && session.tokenHash !== where.tokenHash) return false;
          if (where.schoolMembershipId && session.schoolMembershipId !== where.schoolMembershipId) {
            return false;
          }
          if (where.userId && session.userId !== where.userId) return false;
          if (where.revokedAt === null && session.revokedAt !== null) return false;
          return true;
        });
        matches.forEach((session) => Object.assign(session, data));
        return { count: matches.length };
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

    passwordCredential: {
      async findUnique({ where }: Row) {
        return state.passwordCredentials.find((credential) =>
          where.id ? credential.id === where.id : credential.userId === where.userId,
        ) ?? null;
      },
      async upsert({ where, update, create }: Row) {
        const existing = state.passwordCredentials.find(
          (credential) => credential.userId === where.userId,
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          return existing;
        }
        const credential = {
          id: randomUUID(),
          failedAttempts: 0,
          lockedUntil: null,
          passwordSetAt: now(),
          createdAt: now(),
          updatedAt: now(),
          ...create,
        };
        state.passwordCredentials.push(credential);
        return credential;
      },
      async update({ where, data }: Row) {
        const credential = state.passwordCredentials.find(
          (candidate) => candidate.id === where.id,
        );
        if (!credential) throw new Error("Credential not found");
        Object.assign(credential, data, { updatedAt: now() });
        return credential;
      },
    },

    demoRequest: {
      async create({ data }: Row) {
        const request = {
          id: randomUUID(),
          status: "PENDING",
          invitationExpiresAt: null,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        };
        state.demoRequests.push(request);
        persistState();
        return request;
      },
      async deleteMany({ where }: Row) {
        const before = state.demoRequests.length;
        state.demoRequests = state.demoRequests.filter((request) => {
          const olderThan = where.createdAt?.lt;
          return !olderThan || request.createdAt >= olderThan;
        });
        persistState();
        return { count: before - state.demoRequests.length };
      },
      async findMany({ orderBy, take }: Row = {}) {
        const requests = [...state.demoRequests];
        if (orderBy?.createdAt === "desc") {
          requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return typeof take === "number" ? requests.slice(0, take) : requests;
      },
      async findUnique({ where }: Row) {
        return state.demoRequests.find((request) => request.id === where.id) ?? null;
      },
      async update({ where, data }: Row) {
        const request = state.demoRequests.find((candidate) => candidate.id === where.id);
        if (!request) throw new Error("Demo request not found");
        Object.assign(request, data, { updatedAt: now() });
        persistState();
        return request;
      },
    },

    learningTask: {
      async upsert({ where, create, update }: Row) {
        const existing = state.learningTasks.find((task) =>
          where.id
            ? task.id === where.id
            : task.studentMembershipId === where.studentMembershipId_provider_externalId?.studentMembershipId
              && task.provider === where.studentMembershipId_provider_externalId?.provider
              && task.externalId === where.studentMembershipId_provider_externalId?.externalId,
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          persistState();
          return existing;
        }
        const task = {
          id: create.id ?? randomUUID(),
          status: "PENDING",
          createdAt: now(),
          updatedAt: now(),
          ...create,
        };
        state.learningTasks.push(task);
        persistState();
        return task;
      },
      async create({ data }: Row) {
        const task = {
          id: data.id ?? randomUUID(),
          status: "PENDING",
          createdAt: now(),
          updatedAt: now(),
          ...data,
        };
        state.learningTasks.push(task);
        persistState();
        return task;
      },
      async findFirst({ where }: Row) {
        return state.learningTasks.find((task) => {
          if (where.id && task.id !== where.id) return false;
          if (where.schoolId && task.schoolId !== where.schoolId) return false;
          if (where.groupId && task.groupId !== where.groupId) return false;
          if (where.studentMembershipId && task.studentMembershipId !== where.studentMembershipId) return false;
          return true;
        }) ?? null;
      },
      async findMany({ where = {}, orderBy }: Row = {}) {
        const tasks = state.learningTasks.filter((task) => {
          if (where.schoolId && task.schoolId !== where.schoolId) return false;
          if (typeof where.groupId === "string" && task.groupId !== where.groupId) return false;
          if (where.groupId?.in && !where.groupId.in.includes(task.groupId)) return false;
          if (typeof where.studentMembershipId === "string" && task.studentMembershipId !== where.studentMembershipId) return false;
          if (where.studentMembershipId?.in && !where.studentMembershipId.in.includes(task.studentMembershipId)) return false;
          if (where.status && task.status !== where.status) return false;
          return true;
        });
        if (orderBy?.dueAt === "asc") {
          tasks.sort((left, right) => (left.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (right.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER));
        }
        return tasks;
      },
      async updateMany({ where, data }: Row) {
        const matches = state.learningTasks.filter((task) => {
          if (where.id && task.id !== where.id) return false;
          if (where.schoolId && task.schoolId !== where.schoolId) return false;
          if (where.studentMembershipId && task.studentMembershipId !== where.studentMembershipId) return false;
          return true;
        });
        matches.forEach((task) => Object.assign(task, data, { updatedAt: now() }));
        persistState();
        return { count: matches.length };
      },
    },

    aiUsageEvent: {
      async create({ data }: Row) {
        const event = { id: randomUUID(), createdAt: now(), ...data };
        state.aiUsageEvents.push(event);
        persistState();
        return event;
      },
      async count({ where = {} }: Row = {}) {
        return state.aiUsageEvents.filter((event) => {
          if (where.studentMembershipId && event.studentMembershipId !== where.studentMembershipId) return false;
          if (typeof where.groupId === "string" && event.groupId !== where.groupId) return false;
          if (where.sessionKeyHash && event.sessionKeyHash !== where.sessionKeyHash) return false;
          if (where.createdAt?.gte && event.createdAt < where.createdAt.gte) return false;
          return true;
        }).length;
      },
      async findMany({ where = {} }: Row = {}) {
        return state.aiUsageEvents.filter((event) => {
          if (where.schoolId && event.schoolId !== where.schoolId) return false;
          if (typeof where.groupId === "string" && event.groupId !== where.groupId) return false;
          if (where.groupId?.in && !where.groupId.in.includes(event.groupId)) return false;
          if (where.studentMembershipId && event.studentMembershipId !== where.studentMembershipId) return false;
          if (where.createdAt?.gte && event.createdAt < where.createdAt.gte) return false;
          return true;
        });
      },
      async deleteMany({ where = {} }: Row = {}) {
        const before = state.aiUsageEvents.length;
        state.aiUsageEvents = state.aiUsageEvents.filter((event) =>
          !(where.createdAt?.lt && event.createdAt < where.createdAt.lt),
        );
        persistState();
        return { count: before - state.aiUsageEvents.length };
      },
    },

    anonymousQuery: {
      async create({ data }: Row) {
        if (state.anonymousQueries.some((item) => item.publicReference === data.publicReference)) {
          throw uniqueError("Anonymous query reference already exists");
        }
        if (state.anonymousQueries.some((item) => item.accessTokenHash === data.accessTokenHash)) {
          throw uniqueError("Anonymous query token already exists");
        }
        const query = {
          id: randomUUID(),
          status: "OPEN",
          assignedRole: null,
          closedAt: null,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        };
        state.anonymousQueries.push(query);
        persistState();
        return query;
      },
      async findFirst({ where = {} }: Row = {}) {
        return state.anonymousQueries.find((query) => {
          if (where.id && query.id !== where.id) return false;
          if (where.schoolId && query.schoolId !== where.schoolId) return false;
          if (where.groupId && query.groupId !== where.groupId) return false;
          if (where.publicReference && query.publicReference !== where.publicReference) return false;
          if (where.accessTokenHash && query.accessTokenHash !== where.accessTokenHash) return false;
          return true;
        }) ?? null;
      },
      async findMany({ where = {}, orderBy }: Row = {}) {
        const queries = state.anonymousQueries.filter((query) => {
          if (where.schoolId && query.schoolId !== where.schoolId) return false;
          if (typeof where.groupId === "string" && query.groupId !== where.groupId) return false;
          if (where.groupId?.in && !where.groupId.in.includes(query.groupId)) return false;
          if (where.status && query.status !== where.status) return false;
          return true;
        });
        if (orderBy?.createdAt === "desc") {
          queries.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
        }
        return queries;
      },
      async update({ where, data }: Row) {
        const query = state.anonymousQueries.find((item) => item.id === where.id);
        if (!query) throw new Error("Anonymous query not found");
        Object.assign(query, data, { updatedAt: now() });
        persistState();
        return query;
      },
    },

    anonymousQueryMessage: {
      async create({ data }: Row) {
        const message = { id: randomUUID(), createdAt: now(), ...data };
        state.anonymousQueryMessages.push(message);
        persistState();
        return message;
      },
      async findMany({ where, orderBy }: Row) {
        const messages = state.anonymousQueryMessages.filter(
          (message) => !where?.queryId || message.queryId === where.queryId,
        );
        if (orderBy?.createdAt === "asc") {
          messages.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
        }
        return messages;
      },
    },

    integrationConnection: {
      async findFirst({ where }: Row) {
        return state.integrationConnections.find((connection) => {
          if (where.id && connection.id !== where.id) return false;
          if (where.schoolId && connection.schoolId !== where.schoolId) return false;
          if (where.provider && connection.provider !== where.provider) return false;
          if (where.status && connection.status !== where.status) return false;
          return true;
        }) ?? null;
      },
      async upsert({ where, create, update }: Row) {
        const key = where.schoolId_provider;
        const existing = state.integrationConnections.find(
          (connection) => connection.schoolId === key.schoolId && connection.provider === key.provider,
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          persistState();
          return existing;
        }
        const connection = {
          id: randomUUID(),
          status: "DISCONNECTED",
          createdAt: now(),
          updatedAt: now(),
          ...create,
        };
        state.integrationConnections.push(connection);
        persistState();
        return connection;
      },
      async update({ where, data }: Row) {
        const connection = state.integrationConnections.find((item) => item.id === where.id);
        if (!connection) throw new Error("Integration connection not found");
        Object.assign(connection, data, { updatedAt: now() });
        persistState();
        return connection;
      },
    },

    integrationSyncJob: {
      async create({ data }: Row) {
        const job = {
          id: randomUUID(),
          status: "PENDING",
          processedCount: 0,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        };
        state.syncJobs.push(job);
        persistState();
        return job;
      },
      async update({ where, data }: Row) {
        const job = state.syncJobs.find((item) => item.id === where.id);
        if (!job) throw new Error("Sync job not found");
        Object.assign(job, data, { updatedAt: now() });
        persistState();
        return job;
      },
    },

    externalCourse: {
      async upsert({ where, create, update }: Row) {
        const key = where.provider_externalId;
        const existing = state.externalCourses.find(
          (course) => course.provider === key.provider && course.externalId === key.externalId,
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          persistState();
          return existing;
        }
        const course = { id: randomUUID(), createdAt: now(), updatedAt: now(), ...create };
        state.externalCourses.push(course);
        persistState();
        return course;
      },
      async findMany({ where = {} }: Row = {}) {
        return state.externalCourses.filter((course) => {
          if (where.groupId && course.groupId !== where.groupId) return false;
          if (where.provider && course.provider !== where.provider) return false;
          return true;
        });
      },
    },

    externalResource: {
      async upsert({ where, create, update }: Row) {
        const key = where.provider_externalId;
        const existing = state.externalResources.find(
          (resource) => resource.provider === key.provider && resource.externalId === key.externalId,
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          persistState();
          return existing;
        }
        const resource = { id: randomUUID(), createdAt: now(), updatedAt: now(), ...create };
        state.externalResources.push(resource);
        persistState();
        return resource;
      },
      async findMany({ where = {} }: Row = {}) {
        return state.externalResources.filter((resource) => {
          if (where.schoolId && resource.schoolId !== where.schoolId) return false;
          if (where.groupId && resource.groupId !== where.groupId) return false;
          if (where.provider && resource.provider !== where.provider) return false;
          return true;
        });
      },
    },

    oauthAccount: {
      async findFirst({ where }: Row) {
        return state.oauthAccounts.find((account) => {
          if (where.userId && account.userId !== where.userId) return false;
          if (where.provider && account.provider !== where.provider) return false;
          return true;
        }) ?? null;
      },
      async upsert({ where, create, update }: Row) {
        const key = where.provider_providerAccountId;
        const existing = state.oauthAccounts.find(
          (account) => account.provider === key.provider && account.providerAccountId === key.providerAccountId,
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          persistState();
          return existing;
        }
        const account = { id: randomUUID(), createdAt: now(), updatedAt: now(), ...create };
        state.oauthAccounts.push(account);
        persistState();
        return account;
      },
    },

    calendarEvent: {
      async findFirst({ where }: Row) {
        return state.calendarEvents.find((event) => {
          if (where.id && event.id !== where.id) return false;
          if (where.schoolId && event.schoolId !== where.schoolId) return false;
          if (where.provider && event.provider !== where.provider) return false;
          if (where.externalId && event.externalId !== where.externalId) return false;
          return true;
        }) ?? null;
      },
      async findMany({ where = {}, orderBy }: Row = {}) {
        const events = state.calendarEvents.filter((event) => {
          if (where.schoolId && event.schoolId !== where.schoolId) return false;
          if (where.groupId && event.groupId !== where.groupId) return false;
          if (where.provider === null && event.provider != null) return false;
          if (typeof where.provider === "string" && event.provider !== where.provider) return false;
          if (where.startsAt?.gte && event.startsAt < where.startsAt.gte) return false;
          if (where.startsAt?.lte && event.startsAt > where.startsAt.lte) return false;
          return true;
        });
        if (orderBy?.startsAt === "asc") events.sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
        return events;
      },
      async create({ data }: Row) {
        const event = { id: randomUUID(), createdAt: now(), updatedAt: now(), ...data };
        state.calendarEvents.push(event);
        persistState();
        return event;
      },
      async update({ where, data }: Row) {
        const event = state.calendarEvents.find((item) => item.id === where.id);
        if (!event) throw new Error("Calendar event not found");
        Object.assign(event, data, { updatedAt: now() });
        persistState();
        return event;
      },
      async deleteMany({ where }: Row) {
        const before = state.calendarEvents.length;
        state.calendarEvents = state.calendarEvents.filter((event) => {
          if (where.id && event.id !== where.id) return true;
          if (where.schoolId && event.schoolId !== where.schoolId) return true;
          return false;
        });
        persistState();
        return { count: before - state.calendarEvents.length };
      },
    },

    emailDelivery: {
      async create({ data }: Row) {
        const delivery = {
          id: randomUUID(),
          status: "PENDING",
          providerId: null,
          errorMessage: null,
          sentAt: null,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        };
        state.emailDeliveries.push(delivery);
        persistState();
        return delivery;
      },
      async update({ where, data }: Row) {
        const delivery = state.emailDeliveries.find((item) => item.id === where.id);
        if (!delivery) throw new Error("Email delivery not found");
        Object.assign(delivery, data, { updatedAt: now() });
        persistState();
        return delivery;
      },
    },

    passwordResetToken: {
      async create({ data }: Row) {
        const token = { id: randomUUID(), usedAt: null, createdAt: now(), ...data };
        state.passwordResetTokens.push(token);
        persistState();
        return token;
      },
      async findUnique({ where, include }: Row) {
        const token = state.passwordResetTokens.find((item) =>
          where.id ? item.id === where.id : item.tokenHash === where.tokenHash,
        );
        if (!token) return null;
        const user = state.users.find((item) => item.id === token.userId);
        return include?.user ? { ...token, user } : token;
      },
      async update({ where, data }: Row) {
        const token = state.passwordResetTokens.find((item) => item.id === where.id);
        if (!token) throw new Error("Password reset token not found");
        Object.assign(token, data);
        persistState();
        return token;
      },
      async updateMany({ where, data }: Row) {
        const matches = state.passwordResetTokens.filter((item) => {
          if (where.userId && item.userId !== where.userId) return false;
          if (where.usedAt === null && item.usedAt !== null) return false;
          return true;
        });
        matches.forEach((item) => Object.assign(item, data));
        persistState();
        return { count: matches.length };
      },
    },

    invitation: {
      async create({ data }: Row) {
        if (state.invitations.some((invitation) => invitation.tokenHash === data.tokenHash)) {
          throw uniqueError("Invitation token already exists");
        }
        const invitation = {
          id: randomUUID(),
          acceptedAt: null,
          acceptedById: null,
          createdAt: now(),
          ...data,
        };
        state.invitations.push(invitation);
        return invitation;
      },
      async findUnique({ where, include }: Row) {
        const invitation = state.invitations.find((candidate) =>
          where.id ? candidate.id === where.id : candidate.tokenHash === where.tokenHash,
        );
        if (!invitation) return null;
        return include?.school
          ? { ...invitation, school: schoolById(invitation.schoolId) }
          : invitation;
      },
      async update({ where, data }: Row) {
        const invitation = state.invitations.find((candidate) => candidate.id === where.id);
        if (!invitation) throw new Error("Invitation not found");
        Object.assign(invitation, data);
        return invitation;
      },
      async updateMany({ where, data }: Row) {
        const matches = state.invitations.filter((invitation) => {
          if (where.schoolId && invitation.schoolId !== where.schoolId) return false;
          if (where.email && invitation.email !== where.email) return false;
          if (where.acceptedAt === null && invitation.acceptedAt !== null) return false;
          return true;
        });
        matches.forEach((invitation) => Object.assign(invitation, data));
        return { count: matches.length };
      },
    },

    schoolMembership: {
      async upsert({ where, create, update }: Row) {
        const key = where.schoolId_userId;
        const existing = state.memberships.find(
          (membership) =>
            membership.schoolId === key.schoolId && membership.userId === key.userId,
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          return existing;
        }
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
          if (
            where.school?.active !== undefined &&
            schoolById(candidate.schoolId)?.active !== where.school.active
          ) {
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
      async findMany({ where = {}, include }: Row = {}) {
        return state.memberships
          .filter((membership) => {
            if (where.schoolId && membership.schoolId !== where.schoolId) return false;
            if (where.userId && membership.userId !== where.userId) return false;
            if (where.status && membership.status !== where.status) return false;
            if (typeof where.role === "string" && membership.role !== where.role) return false;
            if (where.role?.in && !where.role.in.includes(membership.role)) return false;
            const school = schoolById(membership.schoolId);
            if (where.school?.active !== undefined && school?.active !== where.school.active) {
              return false;
            }
            if (where.school?.slug && school?.slug !== where.school.slug) return false;
            return true;
          })
          .map((membership) => {
            const base: Row = {
              ...membership,
              school: schoolById(membership.schoolId),
            };
            if (include?.user) base.user = userById(membership.userId);
            if (include?.groupMemberships) {
              base.groupMemberships = state.groupMemberships
                .filter((assignment) => assignment.schoolMembershipId === membership.id)
                .map((assignment) => ({
                  ...assignment,
                  group: groupById(assignment.groupId),
                }));
            }
            return base;
          })
          .sort((left, right) =>
            String(left.school?.name || "").localeCompare(String(right.school?.name || "")),
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
            (group) =>
              (!where.id || group.id === where.id)
              && (!where.schoolId || group.schoolId === where.schoolId)
              && (!where.name || group.name === where.name),
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

    postIt: {
      async upsert({ where, create }: Row) {
        const existing = state.posts.find((post) => post.id === where.id);
        if (existing) return postResult(existing);
        const post = {
          id: where.id || randomUUID(),
          status: "OPEN",
          anonymous: false,
          createdAt: now(),
          updatedAt: now(),
          ...create,
        };
        state.posts.push(post);
        return postResult(post);
      },
      async findMany({ where }: Row) {
        return state.posts
          .filter(
            (post) =>
              post.boardId === where.boardId &&
              (!where.status || post.status === where.status),
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map(postResult);
      },
      async create({ data }: Row) {
        const post = {
          id: randomUUID(),
          status: "OPEN",
          anonymous: false,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        };
        state.posts.push(post);
        return postResult(post);
      },
      async findFirst({ where }: Row) {
        const post = state.posts.find(
          (candidate) =>
            candidate.id === where.id &&
            candidate.boardId === where.boardId &&
            (!where.status || candidate.status === where.status),
        );
        return post ? postResult(post) : null;
      },
      async updateMany({ where, data }: Row) {
        const matches = state.posts.filter(
          (post) =>
            post.id === where.id &&
            post.boardId === where.boardId &&
            (!where.status || post.status === where.status),
        );
        matches.forEach((post) => Object.assign(post, data, { updatedAt: now() }));
        return { count: matches.length };
      },
    },

    groupMembership: {
      async count({ where }: Row) {
        return state.groupMemberships.filter((membership) =>
          Object.entries(where).every(([key, value]) => membership[key] === value),
        ).length;
      },
      async upsert({ where, create, update }: Row) {
        const key = where.groupId_schoolMembershipId;
        const existing = state.groupMemberships.find(
          (membership) =>
            membership.groupId === key.groupId &&
            membership.schoolMembershipId === key.schoolMembershipId,
        );
        if (existing) {
          Object.assign(existing, update);
          persistState();
          return existing;
        }
        const assignment = { id: randomUUID(), createdAt: now(), ...create };
        state.groupMemberships.push(assignment);
        persistState();
        return assignment;
      },
      async findMany({ where = {}, include, select }: Row) {
        return state.groupMemberships
          .filter((membership) => {
            if (where.schoolMembershipId && membership.schoolMembershipId !== where.schoolMembershipId) return false;
            if (where.groupId && membership.groupId !== where.groupId) return false;
            if (where.role && membership.role !== where.role) return false;
            return true;
          })
          .map((membership) => {
            const group = groupById(membership.groupId)!;
            const schoolMembership = state.memberships.find(
              (item) => item.id === membership.schoolMembershipId,
            );
            if (select?.group) {
              return {
                group: {
                  id: group.id,
                  name: group.name,
                  schoolId: group.schoolId,
                  board: boardByGroupId(group.id),
                },
              };
            }
            return {
              ...membership,
              ...(include?.group ? { group } : {}),
              ...(include?.schoolMembership ? { schoolMembership } : {}),
            };
          })
          .sort((a, b) => (a.group?.name || "").localeCompare(b.group?.name || ""));
      },
      async deleteMany({ where }: Row) {
        const before = state.groupMemberships.length;
        state.groupMemberships = state.groupMemberships.filter(
          (membership) => membership.schoolMembershipId !== where.schoolMembershipId,
        );
        persistState();
        return { count: before - state.groupMemberships.length };
      },
      async create({ data }: Row) {
        if (
          state.groupMemberships.some(
            (membership) =>
              membership.groupId === data.groupId &&
              membership.schoolMembershipId === data.schoolMembershipId,
          )
        ) {
          throw uniqueError("Group membership already exists");
        }
        const assignment = { id: randomUUID(), createdAt: now(), ...data };
        state.groupMemberships.push(assignment);
        return assignment;
      },
    },

    groupInvite: {
      async create({ data }: Row) {
        if (state.groupInvites.some((invite) => invite.codeHash === data.codeHash)) {
          throw uniqueError("Invite code already exists");
        }
        const invite = {
          id: data.id ?? randomUUID(),
          active: true,
          maxUses: 30,
          useCount: 0,
          createdAt: now(),
          updatedAt: now(),
          ...data,
        };
        state.groupInvites.push(invite);
        return invite;
      },
      async findMany({ where }: Row) {
        return state.groupInvites
          .filter((invite) =>
            Object.entries(where ?? {}).every(([key, value]) => invite[key] === value),
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      async findFirst({ where, select }: Row) {
        const invite = state.groupInvites.find((candidate) =>
          Object.entries(where ?? {}).every(([key, value]) => candidate[key] === value),
        );
        return project(invite, select);
      },
      async update({ where, data }: Row) {
        const invite = state.groupInvites.find((candidate) => candidate.id === where.id);
        if (!invite) throw new Error("Group invite not found");
        const update = { ...data };
        if (typeof data.useCount === "object" && data.useCount?.increment) {
          update.useCount = invite.useCount + data.useCount.increment;
        }
        Object.assign(invite, update, { updatedAt: now() });
        return invite;
      },
      async updateMany({ where, data }: Row) {
        const matches = state.groupInvites.filter((invite) => {
          if (where.id && invite.id !== where.id) return false;
          if (typeof where.active === "boolean" && invite.active !== where.active) return false;
          if (where.expiresAt?.gt && invite.expiresAt.getTime() <= where.expiresAt.gt.getTime()) {
            return false;
          }
          if (typeof where.useCount?.lt === "number" && invite.useCount >= where.useCount.lt) {
            return false;
          }
          return true;
        });
        for (const invite of matches) {
          const update = { ...data };
          if (typeof data.useCount === "object" && data.useCount?.increment) {
            update.useCount = invite.useCount + data.useCount.increment;
          }
          Object.assign(invite, update, { updatedAt: now() });
        }
        return { count: matches.length };
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
