import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getViewerAccessContext } from "@/lib/access-control";
import { db } from "@/lib/db";
import type { DemoViewer } from "@/lib/demo-auth";
import { decryptSecret, encryptSecret, isSecretEncryptionConfigured } from "@/lib/secret-box";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_API = "https://www.googleapis.com";

type GoogleState = { userId: string; schoolId: string; nonce: string; exp: number };
type GoogleToken = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
};

type ConnectionRow = {
  id: string;
  schoolId: string;
  provider: "GOOGLE_CLASSROOM" | "GOOGLE_CALENDAR";
  accessTokenCiphertext: string | null;
  refreshTokenCiphertext: string | null;
  tokenExpiresAt: Date | null;
};

type OAuthRow = {
  id: string;
  userId: string;
  providerAccountId: string;
  accessTokenCiphertext: string | null;
  refreshTokenCiphertext: string | null;
  accessTokenExpiresAt: Date | null;
};

function requiredConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  const authSecret = process.env.AUTH_SECRET?.trim();
  if (!clientId || !clientSecret || !redirectUri || !authSecret || !isSecretEncryptionConfigured()) {
    throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  }
  return { clientId, clientSecret, redirectUri, authSecret };
}

export function isGoogleConfigured() {
  try {
    requiredConfig();
    return true;
  } catch {
    return false;
  }
}

export async function getGoogleIntegrationState(viewer: DemoViewer) {
  const access = await getViewerAccessContext(viewer);
  const [classroom, calendar] = await Promise.all([
    db.integrationConnection.findFirst({ where: { schoolId: access.schoolId, provider: "GOOGLE_CLASSROOM" } }),
    db.integrationConnection.findFirst({ where: { schoolId: access.schoolId, provider: "GOOGLE_CALENDAR" } }),
  ]);
  return {
    configured: isGoogleConfigured(),
    classroom: classroom ? { status: classroom.status as string, lastSyncedAt: classroom.lastSyncedAt?.toISOString() ?? null } : null,
    calendar: calendar ? { status: calendar.status as string, lastSyncedAt: calendar.lastSyncedAt?.toISOString() ?? null } : null,
  };
}

function signState(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function createGoogleAuthorization(viewer: DemoViewer) {
  const config = requiredConfig();
  const access = await getViewerAccessContext(viewer);
  const state: GoogleState = {
    userId: access.userId,
    schoolId: access.schoolId,
    nonce: randomBytes(18).toString("base64url"),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  const signedState = `${payload}.${signState(payload, config.authSecret)}`;
  const scopes = process.env.GOOGLE_OAUTH_SCOPES?.trim()
    || "openid email profile https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.rosters.readonly https://www.googleapis.com/auth/classroom.coursework.me https://www.googleapis.com/auth/classroom.coursework.students https://www.googleapis.com/auth/calendar.events";
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", signedState);
  return { url: url.toString(), state: signedState };
}

export function verifyGoogleState(signedState: string): GoogleState | null {
  const config = requiredConfig();
  const [payload, signature] = signedState.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(signState(payload, config.authSecret));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleState;
    return state.exp > Date.now() ? state : null;
  } catch {
    return null;
  }
}

async function exchangeCode(code: string) {
  const config = requiredConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) throw new Error(`GOOGLE_TOKEN_EXCHANGE_${response.status}`);
  return await response.json() as GoogleToken;
}

async function refreshAccessToken(refreshToken: string) {
  const config = requiredConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`GOOGLE_TOKEN_REFRESH_${response.status}`);
  return await response.json() as GoogleToken;
}

async function userInfo(accessToken: string) {
  const response = await fetch(`${GOOGLE_API}/oauth2/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`GOOGLE_USERINFO_${response.status}`);
  return await response.json() as { id: string; email: string; name?: string; hd?: string };
}

export async function completeGoogleAuthorization(
  viewer: DemoViewer,
  code: string,
  signedState: string,
) {
  const state = verifyGoogleState(signedState);
  if (!state) throw new Error("GOOGLE_STATE_INVALID");
  const access = await getViewerAccessContext(viewer);
  if (state.userId !== access.userId || state.schoolId !== access.schoolId) {
    throw new Error("GOOGLE_STATE_SUBJECT_MISMATCH");
  }
  const tokens = await exchangeCode(code);
  const profile = await userInfo(tokens.access_token);
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);
  const encryptedAccess = encryptSecret(tokens.access_token);
  const encryptedRefresh = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : undefined;
  await db.oauthAccount.upsert({
    where: { provider_providerAccountId: { provider: "GOOGLE", providerAccountId: profile.id } },
    update: {
      userId: access.userId,
      accessTokenCiphertext: encryptedAccess,
      ...(encryptedRefresh ? { refreshTokenCiphertext: encryptedRefresh } : {}),
      accessTokenExpiresAt: expiresAt,
      scopes: tokens.scope,
    },
    create: {
      userId: access.userId,
      provider: "GOOGLE",
      providerAccountId: profile.id,
      accessTokenCiphertext: encryptedAccess,
      refreshTokenCiphertext: encryptedRefresh,
      accessTokenExpiresAt: expiresAt,
      scopes: tokens.scope,
    },
  });
  if (access.role === "COORDINATOR") {
    for (const provider of ["GOOGLE_CLASSROOM", "GOOGLE_CALENDAR"] as const) {
      await db.integrationConnection.upsert({
        where: { schoolId_provider: { schoolId: access.schoolId, provider } },
        update: {
          status: "CONNECTED",
          externalTenantId: profile.hd || profile.email.split("@")[1] || profile.id,
          accessTokenCiphertext: encryptedAccess,
          ...(encryptedRefresh ? { refreshTokenCiphertext: encryptedRefresh } : {}),
          tokenExpiresAt: expiresAt,
          settings: { authorizedBy: profile.email, scopes: tokens.scope || "" },
        },
        create: {
          schoolId: access.schoolId,
          provider,
          status: "CONNECTED",
          externalTenantId: profile.hd || profile.email.split("@")[1] || profile.id,
          accessTokenCiphertext: encryptedAccess,
          refreshTokenCiphertext: encryptedRefresh,
          tokenExpiresAt: expiresAt,
          settings: { authorizedBy: profile.email, scopes: tokens.scope || "" },
        },
      });
    }
  }
  return { email: profile.email, coordinatorConnection: access.role === "COORDINATOR" };
}

async function connectionToken(schoolId: string, provider: ConnectionRow["provider"]) {
  const connection = await db.integrationConnection.findFirst({
    where: { schoolId, provider, status: "CONNECTED" },
  }) as ConnectionRow | null;
  if (!connection?.accessTokenCiphertext) throw new Error(`${provider}_NOT_CONNECTED`);
  if (connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() > Date.now() + 60_000) {
    return { connection, token: decryptSecret(connection.accessTokenCiphertext) };
  }
  if (!connection.refreshTokenCiphertext) throw new Error("GOOGLE_REFRESH_TOKEN_MISSING");
  const refreshed = await refreshAccessToken(decryptSecret(connection.refreshTokenCiphertext));
  const tokenExpiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000);
  await db.integrationConnection.update({
    where: { id: connection.id },
    data: { accessTokenCiphertext: encryptSecret(refreshed.access_token), tokenExpiresAt },
  });
  return { connection: { ...connection, tokenExpiresAt }, token: refreshed.access_token };
}

async function userToken(userId: string) {
  const account = await db.oauthAccount.findFirst({ where: { userId, provider: "GOOGLE" } }) as OAuthRow | null;
  if (!account?.accessTokenCiphertext) throw new Error("GOOGLE_USER_NOT_CONNECTED");
  if (account.accessTokenExpiresAt && account.accessTokenExpiresAt.getTime() > Date.now() + 60_000) {
    return decryptSecret(account.accessTokenCiphertext);
  }
  if (!account.refreshTokenCiphertext) throw new Error("GOOGLE_USER_REFRESH_TOKEN_MISSING");
  const refreshed = await refreshAccessToken(decryptSecret(account.refreshTokenCiphertext));
  await db.oauthAccount.upsert({
    where: { provider_providerAccountId: { provider: "GOOGLE", providerAccountId: account.providerAccountId } },
    update: {
      accessTokenCiphertext: encryptSecret(refreshed.access_token),
      accessTokenExpiresAt: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000),
    },
    create: {
      userId: account.userId,
      provider: "GOOGLE",
      providerAccountId: account.providerAccountId,
      accessTokenCiphertext: encryptSecret(refreshed.access_token),
      refreshTokenCiphertext: account.refreshTokenCiphertext,
      accessTokenExpiresAt: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000),
    },
  });
  return refreshed.access_token;
}

async function googleJson<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${GOOGLE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(`GOOGLE_API_${response.status}_${path}`);
  return response.status === 204 ? ({} as T) : await response.json() as T;
}

async function paged<T>(token: string, path: string, field: string): Promise<T[]> {
  const items: T[] = [];
  let pageToken = "";
  do {
    const separator = path.includes("?") ? "&" : "?";
    const response = await googleJson<Record<string, unknown>>(token, `${path}${pageToken ? `${separator}pageToken=${encodeURIComponent(pageToken)}` : ""}`);
    items.push(...((response[field] as T[] | undefined) ?? []));
    pageToken = String(response.nextPageToken || "");
  } while (pageToken);
  return items;
}

function classroomDueAt(work: { dueDate?: { year: number; month: number; day: number }; dueTime?: { hours?: number; minutes?: number } }) {
  if (!work.dueDate) return null;
  return new Date(Date.UTC(
    work.dueDate.year,
    work.dueDate.month - 1,
    work.dueDate.day,
    work.dueTime?.hours ?? 23,
    work.dueTime?.minutes ?? 59,
  ));
}

function submissionStatus(submission: { state?: string; assignedGrade?: number }) {
  if (typeof submission.assignedGrade === "number") return "GRADED" as const;
  if (submission.state === "TURNED_IN" || submission.state === "RETURNED") return "DELIVERED" as const;
  if (submission.state === "CREATED" || submission.state === "RECLAIMED_BY_STUDENT") return "IN_PROGRESS" as const;
  return "PENDING" as const;
}

export async function syncGoogleClassroom(viewer: DemoViewer) {
  const access = await getViewerAccessContext(viewer);
  if (access.role !== "COORDINATOR") throw new Error("COORDINATOR_REQUIRED");
  const { connection, token } = await connectionToken(access.schoolId, "GOOGLE_CLASSROOM");
  const job = await db.integrationSyncJob.create({
    data: {
      schoolId: access.schoolId,
      connectionId: connection.id,
      provider: "GOOGLE_CLASSROOM",
      direction: "BIDIRECTIONAL",
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
  let processedCount = 0;
  try {
    const courses = await paged<{ id: string; name: string; section?: string; alternateLink?: string }>(
      token,
      "/classroom/v1/courses?courseStates=ACTIVE",
      "courses",
    );
    for (const course of courses) {
      const group = await db.group.upsert({
        where: { schoolId_academicYear_name: { schoolId: access.schoolId, academicYear: "2026-2027", name: course.name } },
        update: {},
        create: {
          schoolId: access.schoolId,
          name: course.name,
          stage: course.section || "Classroom",
          section: course.section || null,
          academicYear: "2026-2027",
        },
      });
      await db.board.upsert({
        where: { groupId: group.id },
        update: {},
        create: { groupId: group.id, title: `Taulell de ${course.name}` },
      });
      const externalCourse = await db.externalCourse.upsert({
        where: { provider_externalId: { provider: "GOOGLE_CLASSROOM", externalId: course.id } },
        update: { groupId: group.id, name: course.name, url: course.alternateLink, lastSyncedAt: new Date() },
        create: {
          groupId: group.id,
          provider: "GOOGLE_CLASSROOM",
          externalId: course.id,
          name: course.name,
          url: course.alternateLink,
          lastSyncedAt: new Date(),
        },
      });
      const students = await paged<{ userId: string; profile: { name: { fullName: string }; emailAddress: string } }>(
        token,
        `/classroom/v1/courses/${encodeURIComponent(course.id)}/students`,
        "students",
      );
      const membershipByGoogleId = new Map<string, string>();
      for (const student of students) {
        if (!student.profile.emailAddress) continue;
        const user = await db.user.upsert({
          where: { email: student.profile.emailAddress.toLowerCase() },
          update: { name: student.profile.name.fullName },
          create: { name: student.profile.name.fullName, email: student.profile.emailAddress.toLowerCase() },
        });
        const membership = await db.schoolMembership.upsert({
          where: { schoolId_userId: { schoolId: access.schoolId, userId: user.id } },
          update: {},
          create: { schoolId: access.schoolId, userId: user.id, role: "STUDENT", status: "INVITED" },
        });
        await db.groupMembership.upsert({
          where: { groupId_schoolMembershipId: { groupId: group.id, schoolMembershipId: membership.id } },
          update: { role: "STUDENT" },
          create: { groupId: group.id, schoolMembershipId: membership.id, role: "STUDENT" },
        });
        membershipByGoogleId.set(student.userId, membership.id);
        processedCount += 1;
      }
      const works = await paged<{
        id: string;
        title: string;
        description?: string;
        alternateLink?: string;
        maxPoints?: number;
        dueDate?: { year: number; month: number; day: number };
        dueTime?: { hours?: number; minutes?: number };
      }>(token, `/classroom/v1/courses/${encodeURIComponent(course.id)}/courseWork?courseWorkStates=PUBLISHED`, "courseWork");
      for (const work of works) {
        const submissions = await paged<{
          id: string;
          userId: string;
          state?: string;
          assignedGrade?: number;
          draftGrade?: number;
        }>(
          token,
          `/classroom/v1/courses/${encodeURIComponent(course.id)}/courseWork/${encodeURIComponent(work.id)}/studentSubmissions`,
          "studentSubmissions",
        );
        for (const submission of submissions) {
          const studentMembershipId = membershipByGoogleId.get(submission.userId);
          if (!studentMembershipId) continue;
          await db.learningTask.upsert({
            where: {
              studentMembershipId_provider_externalId: {
                studentMembershipId,
                provider: "GOOGLE_CLASSROOM",
                externalId: `${course.id}:${work.id}`,
              },
            },
            update: {
              title: work.title,
              description: work.description,
              subject: course.name,
              status: submissionStatus(submission),
              dueAt: classroomDueAt(work),
              grade: submission.assignedGrade ?? submission.draftGrade,
              maximumGrade: work.maxPoints,
              resourceUrl: work.alternateLink,
              externalSubmissionId: submission.id,
              externalCourseId: externalCourse.id,
              lastSyncedAt: new Date(),
            },
            create: {
              schoolId: access.schoolId,
              groupId: group.id,
              studentMembershipId,
              externalCourseId: externalCourse.id,
              provider: "GOOGLE_CLASSROOM",
              externalId: `${course.id}:${work.id}`,
              externalSubmissionId: submission.id,
              title: work.title,
              description: work.description,
              subject: course.name,
              status: submissionStatus(submission),
              dueAt: classroomDueAt(work),
              grade: submission.assignedGrade ?? submission.draftGrade,
              maximumGrade: work.maxPoints,
              resourceUrl: work.alternateLink,
              lastSyncedAt: new Date(),
            },
          });
          processedCount += 1;
        }
      }
    }
    await Promise.all([
      db.integrationSyncJob.update({ where: { id: job.id }, data: { status: "SUCCESS", processedCount, completedAt: new Date() } }),
      db.integrationConnection.update({ where: { id: connection.id }, data: { status: "CONNECTED", lastSyncedAt: new Date() } }),
    ]);
    return { processedCount, courseCount: courses.length };
  } catch (error) {
    await Promise.all([
      db.integrationSyncJob.update({
        where: { id: job.id },
        data: { status: "ERROR", processedCount, errorCode: "GOOGLE_CLASSROOM_SYNC", errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Unknown error", completedAt: new Date() },
      }),
      db.integrationConnection.update({ where: { id: connection.id }, data: { status: "ERROR" } }),
    ]);
    throw error;
  }
}

export async function updateGoogleSubmission(
  viewer: DemoViewer,
  task: { id: string; externalId?: string | null; externalSubmissionId?: string | null },
  action: "turnIn" | "reclaim",
) {
  const access = await getViewerAccessContext(viewer);
  const stored = await db.learningTask.findFirst({
    where: { id: task.id, schoolId: access.schoolId, studentMembershipId: access.membershipId },
  });
  if (!stored?.externalId || !stored.externalSubmissionId || stored.provider !== "GOOGLE_CLASSROOM") {
    return { synchronized: false };
  }
  const [courseId, courseWorkId] = stored.externalId.split(":");
  const token = await userToken(access.userId);
  await googleJson(
    token,
    `/classroom/v1/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseWorkId)}/studentSubmissions/${encodeURIComponent(stored.externalSubmissionId)}:${action}`,
    { method: "POST", body: "{}" },
  );
  return { synchronized: true };
}

export async function syncGoogleCalendar(viewer: DemoViewer) {
  const access = await getViewerAccessContext(viewer);
  if (access.role !== "COORDINATOR") throw new Error("COORDINATOR_REQUIRED");
  const { connection, token } = await connectionToken(access.schoolId, "GOOGLE_CALENDAR");
  const remoteEvents = await paged<{
    id: string;
    summary?: string;
    description?: string;
    start: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  }>(
    token,
    `/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())}`,
    "items",
  );
  let processedCount = 0;
  for (const remote of remoteEvents) {
    const startsAt = new Date(remote.start.dateTime || `${remote.start.date}T00:00:00Z`);
    const endsAt = remote.end ? new Date(remote.end.dateTime || `${remote.end.date}T00:00:00Z`) : null;
    const existing = await db.calendarEvent.findFirst({
      where: { schoolId: access.schoolId, provider: "GOOGLE_CALENDAR", externalId: remote.id },
    });
    const data = {
      title: remote.summary || "Esdeveniment de Google Calendar",
      description: remote.description,
      startsAt,
      endsAt,
      provider: "GOOGLE_CALENDAR",
      externalId: remote.id,
    };
    if (existing) await db.calendarEvent.update({ where: { id: existing.id }, data });
    else await db.calendarEvent.create({ data: { ...data, schoolId: access.schoolId } });
    processedCount += 1;
  }
  const localEvents = await db.calendarEvent.findMany({ where: { schoolId: access.schoolId, provider: null } });
  for (const event of localEvents) {
    const created = await googleJson<{ id: string }>(token, "/calendar/v3/calendars/primary/events", {
      method: "POST",
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        start: { dateTime: event.startsAt.toISOString() },
        end: { dateTime: (event.endsAt || new Date(event.startsAt.getTime() + 60 * 60 * 1000)).toISOString() },
      }),
    });
    await db.calendarEvent.update({
      where: { id: event.id },
      data: { provider: "GOOGLE_CALENDAR", externalId: created.id },
    });
    processedCount += 1;
  }
  await db.integrationConnection.update({ where: { id: connection.id }, data: { status: "CONNECTED", lastSyncedAt: new Date() } });
  return { processedCount };
}
