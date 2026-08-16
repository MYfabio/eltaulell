import "server-only";

import { createHash } from "node:crypto";
import { getViewerAccessContext } from "@/lib/access-control";
import { callTutorModel } from "@/lib/ai-provider";
import { classifyAiRisk, socraticInstructions, urgentSafetyResponse } from "@/lib/ai-safety";
import { db } from "@/lib/db";
import type { DemoViewer } from "@/lib/demo-auth";

type TutorRequest = {
  groupId: string;
  message: string;
  sessionKey: string;
  taskId?: string;
};

type LearningTaskContext = {
  id: string;
  title: string;
  subject: string;
  status: string;
  dueAt: Date | null;
};

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function dailyLimit() {
  const parsed = Number(process.env.AI_DAILY_QUESTION_LIMIT || "40");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 40;
}

function sessionHash(membershipId: string, sessionKey: string) {
  return createHash("sha256")
    .update(`${membershipId}:${sessionKey}:${process.env.AUTH_SECRET || "local"}`)
    .digest("hex");
}

export async function askAiTutor(viewer: DemoViewer, request: TutorRequest) {
  const access = await getViewerAccessContext(viewer);
  if (!(["STUDENT", "DELEGATE"] as string[]).includes(access.role)) {
    throw new Error("AI_ROLE_FORBIDDEN");
  }
  if (!access.groupIds.includes(request.groupId)) throw new Error("AI_GROUP_FORBIDDEN");

  const usedToday = await db.aiUsageEvent.count({
    where: {
      studentMembershipId: access.membershipId,
      createdAt: { gte: startOfToday() },
    },
  });
  const limit = dailyLimit();
  if (usedToday >= limit) throw new Error("AI_DAILY_LIMIT_REACHED");

  const task = request.taskId
    ? await db.learningTask.findFirst({
        where: {
          id: request.taskId,
          schoolId: access.schoolId,
          groupId: request.groupId,
          studentMembershipId: access.membershipId,
        },
      }) as LearningTaskContext | null
    : null;
  const hash = sessionHash(access.membershipId, request.sessionKey);
  const recent = await db.aiUsageEvent.findMany({
    where: {
      studentMembershipId: access.membershipId,
      createdAt: { gte: new Date(Date.now() - 30 * 60_000) },
    },
  }) as Array<{ sessionKeyHash: string; taskId: string | null }>;
  const repeatedHelpSignal = recent.filter(
    (event) => event.sessionKeyHash === hash && event.taskId === (task?.id ?? null),
  ).length >= 4;
  const riskLevel = classifyAiRisk(request.message);

  let answer: string;
  const startedAt = Date.now();
  if (riskLevel === "URGENT") {
    answer = urgentSafetyResponse();
  } else {
    const context = task
      ? `Context de la tasca: matèria ${task.subject}; títol ${task.title}; estat ${task.status}; data límit ${task.dueAt?.toISOString() || "no indicada"}.\n\n`
      : "";
    answer = await callTutorModel({
      input: `${context}Missatge de l'alumne: ${request.message}`,
      instructions: socraticInstructions(riskLevel),
      safetyIdentifier: hash.slice(0, 64),
    });
  }
  const durationSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));

  await db.aiUsageEvent.create({
    data: {
      schoolId: access.schoolId,
      groupId: request.groupId,
      studentMembershipId: access.membershipId,
      sessionKeyHash: hash,
      subject: task?.subject ?? null,
      taskId: task?.id ?? null,
      questionCount: 1,
      durationSeconds,
      repeatedHelpSignal,
      riskLevel,
    },
  });

  return {
    answer,
    remaining: Math.max(0, limit - usedToday - 1),
    safety: riskLevel === "NONE" ? null : riskLevel,
  };
}
