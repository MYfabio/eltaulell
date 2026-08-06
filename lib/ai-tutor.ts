import "server-only";

import { createHash } from "node:crypto";
import { getViewerAccessContext } from "@/lib/access-control";
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

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text.trim();
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text!.trim())
    .filter(Boolean)
    .join("\n");
}

async function callTutorModel(
  input: string,
  riskLevel: "NONE" | "CONCERN",
  safetyIdentifier: string,
) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol",
      instructions: socraticInstructions(riskLevel),
      input,
      max_output_tokens: 350,
      store: false,
      safety_identifier: safetyIdentifier,
    }),
    signal: AbortSignal.timeout(25_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const code = (payload as { error?: { code?: string } } | null)?.error?.code;
    throw new Error(code ? `OPENAI_${code}` : `OPENAI_HTTP_${response.status}`);
  }
  const answer = extractResponseText(payload);
  if (!answer) throw new Error("OPENAI_EMPTY_RESPONSE");
  return answer;
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
  if (riskLevel === "URGENT") {
    answer = urgentSafetyResponse();
  } else {
    const context = task
      ? `Context de la tasca: matèria ${task.subject}; títol ${task.title}; estat ${task.status}; data límit ${task.dueAt?.toISOString() || "no indicada"}.\n\n`
      : "";
    answer = await callTutorModel(
      `${context}Missatge de l'alumne: ${request.message}`,
      riskLevel,
      hash.slice(0, 64),
    );
  }

  await db.aiUsageEvent.create({
    data: {
      schoolId: access.schoolId,
      groupId: request.groupId,
      studentMembershipId: access.membershipId,
      sessionKeyHash: hash,
      subject: task?.subject ?? null,
      taskId: task?.id ?? null,
      questionCount: 1,
      durationSeconds: 0,
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
