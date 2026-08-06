import "server-only";

import { AccessControlError, getViewerAccessContext } from "@/lib/access-control";
import { db } from "@/lib/db";
import type { DemoViewer } from "@/lib/demo-auth";
import type {
  AiGroupUsage,
  LearningDashboard,
  LearningTaskItem,
  StudentInsight,
  SubjectInsight,
  TaskStatus,
} from "@/lib/learning-types";

type TaskRow = {
  id: string;
  studentMembershipId: string;
  title: string;
  subject: string;
  status: TaskStatus;
  dueAt: Date | null;
  provider: string | null;
  resourceUrl: string | null;
  grade: number | null;
  maximumGrade: number | null;
  teacherFeedback: string | null;
};

type MembershipRow = {
  id: string;
  role: "COORDINATOR" | "TUTOR" | "DELEGATE" | "STUDENT";
  updatedAt: Date;
  user: { name: string };
  groupMemberships: Array<{
    group: { id: string; name: string; stage: string };
  }>;
};

type SessionRow = {
  schoolMembershipId: string | null;
  lastSeenAt: Date;
};

type AiUsageRow = {
  groupId: string;
  sessionKeyHash: string;
  subject: string | null;
  questionCount: number;
  durationSeconds: number;
  repeatedHelpSignal: boolean;
  createdAt: Date;
};

function subjectIcon(subject: string) {
  const normalized = subject.toLocaleLowerCase("ca");
  if (normalized.includes("matem")) return "∑";
  if (normalized.includes("hist")) return "⌛";
  if (normalized.includes("cièn") || normalized.includes("cien")) return "⚗";
  if (normalized.includes("angl")) return "A";
  return subject.trim().slice(0, 1).toUpperCase() || "•";
}

function dueLabel(task: TaskRow) {
  if (task.status === "GRADED") return "Qualificada";
  if (task.status === "DELIVERED") return "Lliurada";
  if (!task.dueAt) return "Sense data límit";
  const formatter = new Intl.DateTimeFormat("ca-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(task.dueAt);
}

function serializeTask(task: TaskRow): LearningTaskItem {
  return {
    id: task.id,
    studentMembershipId: task.studentMembershipId,
    title: task.title,
    subject: task.subject,
    subjectIcon: subjectIcon(task.subject),
    status: task.status,
    dueLabel: dueLabel(task),
    dueAt: task.dueAt?.toISOString() ?? null,
    overdue:
      Boolean(task.dueAt) &&
      task.dueAt!.getTime() < Date.now() &&
      !["DELIVERED", "GRADED"].includes(task.status),
    classroomLinked: task.provider === "GOOGLE_CLASSROOM",
    ...(task.resourceUrl ? { resourceUrl: task.resourceUrl } : {}),
    ...(typeof task.grade === "number" ? { grade: task.grade } : {}),
    ...(typeof task.maximumGrade === "number"
      ? { maximumGrade: task.maximumGrade }
      : {}),
    ...(task.teacherFeedback ? { teacherFeedback: task.teacherFeedback } : {}),
  };
}

export async function listOwnLearningTasks(
  viewer: DemoViewer,
  groupId: string,
): Promise<LearningTaskItem[]> {
  const access = await getViewerAccessContext(viewer);
  if (!access.groupIds.includes(groupId) && access.role !== "COORDINATOR") {
    throw new AccessControlError("GROUP_FORBIDDEN");
  }
  if (access.role !== "STUDENT" && access.role !== "DELEGATE") return [];
  const tasks = (await db.learningTask.findMany({
    where: {
      schoolId: access.schoolId,
      groupId,
      studentMembershipId: access.membershipId,
    },
    orderBy: { dueAt: "asc" },
  })) as TaskRow[];
  return tasks.map(serializeTask);
}

export async function listStudentLearningTasksForStaff(
  viewer: DemoViewer,
  studentMembershipId: string,
): Promise<LearningTaskItem[]> {
  const access = await getViewerAccessContext(viewer);
  if (access.role !== "TUTOR" && access.role !== "COORDINATOR") {
    throw new AccessControlError("ROLE_MISMATCH");
  }
  const tasks = (await db.learningTask.findMany({
    where: {
      schoolId: access.schoolId,
      studentMembershipId,
      ...(access.role === "TUTOR" ? { groupId: { in: access.groupIds } } : {}),
    },
    orderBy: { dueAt: "asc" },
  })) as TaskRow[];
  if (!tasks.length) {
    const dashboard = await getLearningDashboard(viewer);
    if (!dashboard.students.some((student) => student.id === studentMembershipId)) {
      throw new AccessControlError("GROUP_FORBIDDEN", 404);
    }
  }
  return tasks.map(serializeTask);
}

const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  PENDING: ["IN_PROGRESS"],
  IN_PROGRESS: ["DELIVERED"],
  DELIVERED: ["IN_PROGRESS"],
  GRADED: [],
};

export async function updateOwnLearningTaskStatus(
  viewer: DemoViewer,
  taskId: string,
  status: TaskStatus,
) {
  const access = await getViewerAccessContext(viewer);
  if (access.role !== "STUDENT" && access.role !== "DELEGATE") {
    throw new AccessControlError("ROLE_MISMATCH");
  }
  const task = (await db.learningTask.findFirst({
    where: {
      id: taskId,
      schoolId: access.schoolId,
      studentMembershipId: access.membershipId,
    },
  })) as TaskRow | null;
  if (!task) throw new AccessControlError("GROUP_FORBIDDEN", 404);
  if (!ALLOWED_TRANSITIONS[task.status].includes(status)) {
    throw new Error("INVALID_TASK_TRANSITION");
  }
  const data: Record<string, unknown> = { status };
  if (status === "IN_PROGRESS" && task.status === "PENDING") data.openedAt = new Date();
  if (status === "DELIVERED") data.deliveredAt = new Date();
  if (task.status === "DELIVERED" && status === "IN_PROGRESS") data.deliveredAt = null;
  const result = await db.learningTask.updateMany({
    where: {
      id: taskId,
      schoolId: access.schoolId,
      studentMembershipId: access.membershipId,
    },
    data,
  });
  if (result.count !== 1) throw new Error("TASK_UPDATE_FAILED");
  return { ...task, ...data, status };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function relativeActivity(date: Date | undefined) {
  if (!date) return "Sense activitat";
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (minutes < 2) return "Ara mateix";
  if (minutes < 60) return `Fa ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Fa ${hours} h`;
  return `Fa ${Math.round(hours / 24)} dies`;
}

function aggregateAiUsage(
  events: AiUsageRow[],
  groupName: string,
): AiGroupUsage {
  const totalQuestions = events.reduce((sum, event) => sum + event.questionCount, 0);
  const totalSeconds = events.reduce((sum, event) => sum + event.durationSeconds, 0);
  const sessions = new Set(events.map((event) => event.sessionKeyHash));
  const subjectTotals = new Map<string, { questions: number; seconds: number; sessions: Set<string> }>();
  const hourTotals = new Map<number, number>();
  for (const event of events) {
    const subject = event.subject || "General";
    const current = subjectTotals.get(subject) ?? {
      questions: 0,
      seconds: 0,
      sessions: new Set<string>(),
    };
    current.questions += event.questionCount;
    current.seconds += event.durationSeconds;
    current.sessions.add(event.sessionKeyHash);
    subjectTotals.set(subject, current);
    const hour = event.createdAt.getHours();
    hourTotals.set(hour, (hourTotals.get(hour) ?? 0) + event.questionCount);
  }
  const busiestHour = [...hourTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    group: groupName,
    period: "Últims 7 dies",
    totalQuestions,
    totalMinutes: Math.round(totalSeconds / 60),
    activeSessions: sessions.size,
    repeatedHelpSignals: events.filter((event) => event.repeatedHelpSignal).length,
    busiestTime:
      typeof busiestHour === "number"
        ? `${String(busiestHour).padStart(2, "0")}:00–${String((busiestHour + 1) % 24).padStart(2, "0")}:00`
        : "Sense activitat",
    subjects: [...subjectTotals.entries()]
      .map(([subject, totals]) => ({
        subject,
        questions: totals.questions,
        minutes: Math.round(totals.seconds / 60),
        activeSessions: totals.sessions.size,
        sharePercent: totalQuestions
          ? Math.round((totals.questions / totalQuestions) * 100)
          : 0,
      }))
      .sort((left, right) => right.questions - left.questions),
  };
}

export async function getLearningDashboard(viewer: DemoViewer): Promise<LearningDashboard> {
  const access = await getViewerAccessContext(viewer);
  if (access.role !== "TUTOR" && access.role !== "COORDINATOR") {
    throw new AccessControlError("ROLE_MISMATCH");
  }
  const allowedGroupIds = access.role === "COORDINATOR" ? null : access.groupIds;
  const [memberships, tasks, aiEvents] = await Promise.all([
    db.schoolMembership.findMany({
      where: { schoolId: access.schoolId, status: "ACTIVE" },
      include: { user: true, groupMemberships: { include: { group: true } } },
    }) as Promise<MembershipRow[]>,
    db.learningTask.findMany({
      where: {
        schoolId: access.schoolId,
        ...(allowedGroupIds ? { groupId: { in: allowedGroupIds } } : {}),
      },
    }) as Promise<TaskRow[]>,
    db.aiUsageEvent.findMany({
      where: {
        schoolId: access.schoolId,
        ...(allowedGroupIds ? { groupId: { in: allowedGroupIds } } : {}),
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }) as Promise<AiUsageRow[]>,
  ]);
  const visibleMemberships = memberships.filter((membership) =>
    membership.groupMemberships.some(
      ({ group }) => !allowedGroupIds || allowedGroupIds.includes(group.id),
    ),
  );
  const learners = visibleMemberships.filter((membership) =>
    membership.role === "STUDENT" || membership.role === "DELEGATE",
  );
  const sessions = (await db.session.findMany({
    where: { schoolMembershipId: { in: learners.map((learner) => learner.id) }, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
  })) as SessionRow[];
  const latestSession = new Map<string, Date>();
  for (const session of sessions) {
    if (session.schoolMembershipId && !latestSession.has(session.schoolMembershipId)) {
      latestSession.set(session.schoolMembershipId, session.lastSeenAt);
    }
  }
  const tutorByGroup = new Map<string, string>();
  for (const membership of visibleMemberships.filter((item) => item.role === "TUTOR")) {
    for (const assignment of membership.groupMemberships) {
      tutorByGroup.set(assignment.group.id, membership.user.name);
    }
  }
  const students: StudentInsight[] = learners.flatMap((membership) => {
    const assignment = membership.groupMemberships.find(
      ({ group }) => !allowedGroupIds || allowedGroupIds.includes(group.id),
    );
    if (!assignment) return [];
    const ownTasks = tasks.filter((task) => task.studentMembershipId === membership.id);
    const graded = ownTasks.filter((task) => typeof task.grade === "number");
    const advanced = ownTasks.filter((task) => task.status !== "PENDING").length;
    return [{
      id: membership.id,
      name: membership.user.name,
      initials: initials(membership.user.name),
      group: assignment.group.name,
      groupId: assignment.group.id,
      stage: assignment.group.stage,
      tutor: tutorByGroup.get(assignment.group.id) || "Sense tutoria assignada",
      subjects: [...new Set(ownTasks.map((task) => task.subject))].sort(),
      lastActive: relativeActivity(latestSession.get(membership.id) ?? membership.updatedAt),
      progressPercent: ownTasks.length ? Math.round((advanced / ownTasks.length) * 100) : 0,
      overdueTasks: ownTasks.filter(
        (task) => task.dueAt && task.dueAt.getTime() < Date.now() && !["DELIVERED", "GRADED"].includes(task.status),
      ).length,
      pendingTasks: ownTasks.filter((task) => task.status === "PENDING").length,
      inProgressTasks: ownTasks.filter((task) => task.status === "IN_PROGRESS").length,
      deliveredTasks: ownTasks.filter((task) => task.status === "DELIVERED").length,
      gradedTasks: ownTasks.filter((task) => task.status === "GRADED").length,
      averageGrade: graded.length
        ? graded.reduce((sum, task) => sum + (task.grade ?? 0), 0) / graded.length
        : null,
    }];
  });
  const tasksBySubject = new Map<string, TaskRow[]>();
  for (const task of tasks) {
    tasksBySubject.set(task.subject, [...(tasksBySubject.get(task.subject) ?? []), task]);
  }
  const subjects: SubjectInsight[] = [...tasksBySubject.entries()].map(([subject, subjectTasks]) => {
    const graded = subjectTasks.filter((task) => typeof task.grade === "number");
    const completed = subjectTasks.filter((task) => ["DELIVERED", "GRADED"].includes(task.status));
    return {
      subject,
      completionPercent: subjectTasks.length
        ? Math.round((completed.length / subjectTasks.length) * 100)
        : 0,
      averageGrade: graded.length
        ? graded.reduce((sum, task) => sum + (task.grade ?? 0), 0) / graded.length
        : null,
      overdueTasks: subjectTasks.filter(
        (task) => task.dueAt && task.dueAt.getTime() < Date.now() && !["DELIVERED", "GRADED"].includes(task.status),
      ).length,
      activeStudents: new Set(subjectTasks.map((task) => task.studentMembershipId)).size,
    };
  });
  const groupNames = [...new Set(students.map((student) => student.group))];
  return {
    students,
    subjects,
    aiUsage: aggregateAiUsage(aiEvents, groupNames.join(", ") || "Sense grup"),
  };
}
