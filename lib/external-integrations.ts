import "server-only";

import { getViewerAccessContext } from "@/lib/access-control";
import { db } from "@/lib/db";
import type { DemoViewer } from "@/lib/demo-auth";
import { sendSystemNoticeEmail } from "@/lib/email";
import { decryptSecret, encryptSecret, isSecretEncryptionConfigured } from "@/lib/secret-box";

type ExternalProvider = "MOODLE" | "IEDUCA";
type ConnectionRow = {
  id: string;
  schoolId: string;
  provider: ExternalProvider;
  status: string;
  baseUrl: string | null;
  accessTokenCiphertext: string | null;
  settings: Record<string, unknown> | null;
  lastSyncedAt: Date | null;
};

function academicYear() {
  const now = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

function safeExternalUrl(raw?: string | null) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    url.searchParams.delete("token");
    url.searchParams.delete("wstoken");
    return url.toString();
  } catch {
    return null;
  }
}

async function schoolConnection(viewer: DemoViewer, provider: ExternalProvider) {
  const access = await getViewerAccessContext(viewer);
  if (access.role !== "COORDINATOR") throw new Error("COORDINATOR_REQUIRED");
  const connection = await db.integrationConnection.findFirst({
    where: { schoolId: access.schoolId, provider },
  }) as ConnectionRow | null;
  return { access, connection };
}

export async function getExternalIntegrationState(viewer: DemoViewer) {
  const access = await getViewerAccessContext(viewer);
  const connections = await Promise.all((["MOODLE", "IEDUCA"] as const).map(async (provider) => {
    const connection = await db.integrationConnection.findFirst({
      where: { schoolId: access.schoolId, provider },
    }) as ConnectionRow | null;
    return [provider, connection ? {
      status: connection.status,
      baseUrl: connection.baseUrl,
      lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
    } : null] as const;
  }));
  return Object.fromEntries(connections) as Record<ExternalProvider, { status: string; baseUrl: string | null; lastSyncedAt: string | null } | null>;
}

export async function configureExternalIntegration(
  viewer: DemoViewer,
  input: { provider: ExternalProvider; baseUrl: string; apiToken: string },
) {
  const access = await getViewerAccessContext(viewer);
  if (access.role !== "COORDINATOR") throw new Error("COORDINATOR_REQUIRED");
  if (!isSecretEncryptionConfigured()) throw new Error("ENCRYPTION_NOT_CONFIGURED");
  const baseUrl = new URL(input.baseUrl).toString().replace(/\/$/, "");
  await db.integrationConnection.upsert({
    where: { schoolId_provider: { schoolId: access.schoolId, provider: input.provider } },
    create: {
      schoolId: access.schoolId,
      provider: input.provider,
      status: "CONNECTED",
      baseUrl,
      accessTokenCiphertext: encryptSecret(input.apiToken),
      settings: input.provider === "IEDUCA" ? {
        coursesPath: process.env.IEDUCA_COURSES_PATH || "/api/v1/courses",
        resourcesPath: process.env.IEDUCA_RESOURCES_PATH || "/api/v1/resources",
        activitiesPath: process.env.IEDUCA_ACTIVITIES_PATH || "/api/v1/activities",
      } : null,
    },
    update: {
      status: "CONNECTED",
      baseUrl,
      accessTokenCiphertext: encryptSecret(input.apiToken),
      settings: input.provider === "IEDUCA" ? {
        coursesPath: process.env.IEDUCA_COURSES_PATH || "/api/v1/courses",
        resourcesPath: process.env.IEDUCA_RESOURCES_PATH || "/api/v1/resources",
        activitiesPath: process.env.IEDUCA_ACTIVITIES_PATH || "/api/v1/activities",
      } : null,
    },
  });
}

async function ensureCourseGroup(
  schoolId: string,
  provider: ExternalProvider,
  course: { id: string | number; name: string; stage?: string; section?: string; url?: string },
) {
  const group = await db.group.upsert({
    where: { schoolId_academicYear_name: { schoolId, academicYear: academicYear(), name: course.name } },
    create: {
      schoolId,
      name: course.name,
      stage: course.stage || "Importat",
      section: course.section || null,
      academicYear: academicYear(),
    },
    update: {},
  });
  await db.board.upsert({
    where: { groupId: group.id },
    create: { groupId: group.id, title: course.name, description: `Tauler importat de ${provider}` },
    update: {},
  });
  const externalCourse = await db.externalCourse.upsert({
    where: { provider_externalId: { provider, externalId: String(course.id) } },
    create: {
      groupId: group.id,
      provider,
      externalId: String(course.id),
      name: course.name,
      url: safeExternalUrl(course.url),
      lastSyncedAt: new Date(),
    },
    update: {
      groupId: group.id,
      name: course.name,
      url: safeExternalUrl(course.url),
      lastSyncedAt: new Date(),
    },
  });
  return { group, externalCourse };
}

async function activeStudents(groupId: string) {
  const assignments = await db.groupMembership.findMany({
    where: { groupId },
    include: { schoolMembership: true },
  }) as Array<{ schoolMembershipId: string; role: string; schoolMembership?: { status: string; role: string } }>;
  return assignments.filter((assignment) =>
    ["STUDENT", "DELEGATE"].includes(assignment.role)
    && assignment.schoolMembership?.status === "ACTIVE",
  );
}

async function upsertActivity(input: {
  schoolId: string;
  groupId: string;
  externalCourseId: string;
  provider: ExternalProvider;
  id: string | number;
  title: string;
  subject: string;
  dueAt?: Date | null;
  url?: string | null;
}) {
  const students = await activeStudents(input.groupId);
  for (const student of students) {
    await db.learningTask.upsert({
      where: {
        studentMembershipId_provider_externalId: {
          studentMembershipId: student.schoolMembershipId,
          provider: input.provider,
          externalId: String(input.id),
        },
      },
      create: {
        schoolId: input.schoolId,
        groupId: input.groupId,
        studentMembershipId: student.schoolMembershipId,
        externalCourseId: input.externalCourseId,
        provider: input.provider,
        externalId: String(input.id),
        title: input.title,
        subject: input.subject,
        status: "PENDING",
        dueAt: input.dueAt || null,
        resourceUrl: safeExternalUrl(input.url),
        lastSyncedAt: new Date(),
      },
      update: {
        title: input.title,
        subject: input.subject,
        dueAt: input.dueAt || null,
        resourceUrl: safeExternalUrl(input.url),
        lastSyncedAt: new Date(),
      },
    });
  }
  return students.length;
}

async function upsertResource(input: {
  schoolId: string;
  groupId: string;
  externalCourseId: string;
  provider: ExternalProvider;
  id: string | number;
  title: string;
  description?: string | null;
  type?: string;
  url?: string | null;
  metadata?: unknown;
}) {
  await db.externalResource.upsert({
    where: { provider_externalId: { provider: input.provider, externalId: String(input.id) } },
    create: {
      schoolId: input.schoolId,
      groupId: input.groupId,
      externalCourseId: input.externalCourseId,
      provider: input.provider,
      externalId: String(input.id),
      title: input.title,
      description: input.description || null,
      resourceType: input.type || "resource",
      url: safeExternalUrl(input.url),
      metadata: input.metadata || null,
      lastSyncedAt: new Date(),
    },
    update: {
      groupId: input.groupId,
      externalCourseId: input.externalCourseId,
      title: input.title,
      description: input.description || null,
      resourceType: input.type || "resource",
      url: safeExternalUrl(input.url),
      metadata: input.metadata || null,
      lastSyncedAt: new Date(),
    },
  });
}

async function moodleCall<T>(connection: ConnectionRow, functionName: string, parameters: Record<string, string> = {}) {
  if (!connection.baseUrl || !connection.accessTokenCiphertext) throw new Error("MOODLE_NOT_CONFIGURED");
  const response = await fetch(`${connection.baseUrl}/webservice/rest/server.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      wstoken: decryptSecret(connection.accessTokenCiphertext),
      wsfunction: functionName,
      moodlewsrestformat: "json",
      ...parameters,
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`MOODLE_HTTP_${response.status}`);
  const payload = await response.json() as T & { exception?: string; errorcode?: string };
  if (payload && typeof payload === "object" && payload.exception) {
    throw new Error(`MOODLE_${payload.errorcode || "API_ERROR"}`);
  }
  return payload;
}

async function syncMoodle(schoolId: string, connection: ConnectionRow) {
  const courses = await moodleCall<Array<{ id: number; fullname: string; shortname: string }>>(connection, "core_course_get_courses");
  let processed = 0;
  for (const course of courses.filter((item) => item.id > 1)) {
    const mapped = await ensureCourseGroup(schoolId, "MOODLE", {
      id: course.id,
      name: course.fullname,
      section: course.shortname,
      url: `${connection.baseUrl}/course/view.php?id=${course.id}`,
    });
    processed += 1;
    const [sections, assignmentResponse] = await Promise.all([
      moodleCall<Array<{ id: number; name: string; modules?: Array<{ id: number; name: string; modname: string; description?: string; url?: string }> }>>(
        connection,
        "core_course_get_contents",
        { courseid: String(course.id) },
      ),
      moodleCall<{ courses?: Array<{ id: number; assignments?: Array<{ id: number; name: string; intro?: string; duedate?: number; cmid?: number }> }> }>(
        connection,
        "mod_assign_get_assignments",
        { "courseids[0]": String(course.id) },
      ),
    ]);
    for (const section of sections) {
      for (const module of section.modules || []) {
        await upsertResource({
          schoolId,
          groupId: mapped.group.id,
          externalCourseId: mapped.externalCourse.id,
          provider: "MOODLE",
          id: module.id,
          title: module.name,
          description: module.description,
          type: module.modname,
          url: module.url,
          metadata: { section: section.name },
        });
        processed += 1;
      }
    }
    const assignments = assignmentResponse.courses?.flatMap((item) => item.assignments || []) || [];
    for (const assignment of assignments) {
      processed += await upsertActivity({
        schoolId,
        groupId: mapped.group.id,
        externalCourseId: mapped.externalCourse.id,
        provider: "MOODLE",
        id: assignment.id,
        title: assignment.name,
        subject: course.fullname,
        dueAt: assignment.duedate ? new Date(assignment.duedate * 1000) : null,
        url: assignment.cmid ? `${connection.baseUrl}/mod/assign/view.php?id=${assignment.cmid}` : null,
      });
    }
  }
  return processed;
}

function asArray<T>(payload: T[] | { data?: T[] }) {
  return Array.isArray(payload) ? payload : payload.data || [];
}

async function ieducaGet<T>(connection: ConnectionRow, path: string) {
  if (!connection.baseUrl || !connection.accessTokenCiphertext) throw new Error("IEDUCA_NOT_CONFIGURED");
  const response = await fetch(new URL(path, `${connection.baseUrl}/`), {
    headers: { Authorization: `Bearer ${decryptSecret(connection.accessTokenCiphertext)}`, Accept: "application/json" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`IEDUCA_HTTP_${response.status}`);
  return response.json() as Promise<T>;
}

async function syncIeduca(schoolId: string, connection: ConnectionRow) {
  const settings = connection.settings || {};
  type Course = { id: string | number; name: string; stage?: string; section?: string; academicYear?: string; url?: string };
  type Resource = { id: string | number; courseId: string | number; title: string; description?: string; type?: string; url?: string };
  type Activity = { id: string | number; courseId: string | number; title: string; dueAt?: string; url?: string };
  const [coursePayload, resourcePayload, activityPayload] = await Promise.all([
    ieducaGet<Course[] | { data?: Course[] }>(connection, String(settings.coursesPath || process.env.IEDUCA_COURSES_PATH || "/api/v1/courses")),
    ieducaGet<Resource[] | { data?: Resource[] }>(connection, String(settings.resourcesPath || process.env.IEDUCA_RESOURCES_PATH || "/api/v1/resources")),
    ieducaGet<Activity[] | { data?: Activity[] }>(connection, String(settings.activitiesPath || process.env.IEDUCA_ACTIVITIES_PATH || "/api/v1/activities")),
  ]);
  const courseMap = new Map<string, Awaited<ReturnType<typeof ensureCourseGroup>>>();
  let processed = 0;
  for (const course of asArray(coursePayload)) {
    const mapped = await ensureCourseGroup(schoolId, "IEDUCA", course);
    courseMap.set(String(course.id), mapped);
    processed += 1;
  }
  for (const resource of asArray(resourcePayload)) {
    const mapped = courseMap.get(String(resource.courseId));
    if (!mapped) continue;
    await upsertResource({ schoolId, groupId: mapped.group.id, externalCourseId: mapped.externalCourse.id, provider: "IEDUCA", ...resource });
    processed += 1;
  }
  for (const activity of asArray(activityPayload)) {
    const mapped = courseMap.get(String(activity.courseId));
    if (!mapped) continue;
    processed += await upsertActivity({
      schoolId,
      groupId: mapped.group.id,
      externalCourseId: mapped.externalCourse.id,
      provider: "IEDUCA",
      id: activity.id,
      title: activity.title,
      subject: mapped.externalCourse.name,
      dueAt: activity.dueAt ? new Date(activity.dueAt) : null,
      url: activity.url,
    });
  }
  return processed;
}

export async function syncExternalIntegration(viewer: DemoViewer, provider: ExternalProvider) {
  const { access, connection } = await schoolConnection(viewer, provider);
  if (!connection || connection.status !== "CONNECTED") throw new Error(`${provider}_NOT_CONFIGURED`);
  const job = await db.integrationSyncJob.create({
    data: {
      schoolId: access.schoolId,
      connectionId: connection.id,
      provider,
      direction: "PULL",
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
  try {
    const processedCount = provider === "MOODLE"
      ? await syncMoodle(access.schoolId, connection)
      : await syncIeduca(access.schoolId, connection);
    await Promise.all([
      db.integrationSyncJob.update({
        where: { id: job.id },
        data: { status: "SUCCESS", processedCount, completedAt: new Date() },
      }),
      db.integrationConnection.update({
        where: { id: connection.id },
        data: { status: "CONNECTED", lastSyncedAt: new Date() },
      }),
    ]);
    return { processedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SYNC_FAILED";
    await Promise.all([
      db.integrationSyncJob.update({
        where: { id: job.id },
        data: { status: "ERROR", errorCode: message.slice(0, 100), errorMessage: message.slice(0, 500), completedAt: new Date() },
      }),
      db.integrationConnection.update({ where: { id: connection.id }, data: { status: "ERROR" } }),
    ]);
    const coordinators = await db.schoolMembership.findMany({
      where: { schoolId: access.schoolId, role: "COORDINATOR", status: "ACTIVE" },
      include: { user: { select: { id: true, email: true } } },
    }) as Array<{ user: { id: string; email: string } }>;
    await Promise.all(coordinators.map((coordinator) => sendSystemNoticeEmail({
      to: coordinator.user.email,
      userId: coordinator.user.id,
      title: `Error de sincronització ${provider}`,
      message: `La darrera sincronització amb ${provider} no s'ha pogut completar. Codi tècnic: ${message.slice(0, 120)}.`,
    })));
    throw error;
  }
}
