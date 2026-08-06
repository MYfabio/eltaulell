import "server-only";

import { createCipheriv, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { objectStorageConfigured, putObject } from "@/lib/object-storage";

const DAY_MS = 24 * 60 * 60 * 1000;

function cutoff(days: number) {
  return new Date(Date.now() - Math.max(1, days) * DAY_MS);
}

export function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!secret || !supplied) return false;
  const left = Buffer.from(secret);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function ensureRetentionPolicies() {
  const schools = await db.school.findMany({ select: { id: true } }) as Array<{ id: string }>;
  await Promise.all(schools.map((school) => db.dataRetentionPolicy.upsert({
    where: { schoolId: school.id },
    create: {
      schoolId: school.id,
      taskRetentionDays: 730,
      aiUsageRetentionDays: Number(process.env.AI_RETENTION_DAYS || "90"),
      queryRetentionDays: 365,
      auditRetentionDays: 730,
    },
    update: {},
  })));
}

export async function runRetention() {
  await ensureRetentionPolicies();
  const policies = await db.dataRetentionPolicy.findMany({}) as Array<{
    schoolId: string;
    taskRetentionDays: number;
    aiUsageRetentionDays: number;
    queryRetentionDays: number;
    auditRetentionDays: number;
  }>;
  const totals = { tasks: 0, aiUsage: 0, queries: 0, audit: 0, errors: 0 };
  for (const policy of policies) {
    const [tasks, aiUsage, queries, audit] = await Promise.all([
      db.learningTask.deleteMany({
        where: { schoolId: policy.schoolId, updatedAt: { lt: cutoff(policy.taskRetentionDays) } },
      }),
      db.aiUsageEvent.deleteMany({
        where: { schoolId: policy.schoolId, createdAt: { lt: cutoff(policy.aiUsageRetentionDays) } },
      }),
      db.anonymousQuery.deleteMany({
        where: { schoolId: policy.schoolId, status: "CLOSED", closedAt: { lt: cutoff(policy.queryRetentionDays) } },
      }),
      db.auditLog.deleteMany({
        where: { schoolId: policy.schoolId, createdAt: { lt: cutoff(policy.auditRetentionDays) } },
      }),
    ]);
    totals.tasks += tasks.count;
    totals.aiUsage += aiUsage.count;
    totals.queries += queries.count;
    totals.audit += audit.count;
  }
  totals.errors = (await db.systemErrorLog.deleteMany({ where: { createdAt: { lt: cutoff(90) } } })).count;
  return totals;
}

function backupKey() {
  const encoded = process.env.BACKUP_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new Error("BACKUP_ENCRYPTION_KEY_NOT_CONFIGURED");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY_MUST_BE_32_BYTES");
  return key;
}

function encryptBackup(value: Uint8Array) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", backupKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([Buffer.from("ETB1"), iv, cipher.getAuthTag(), ciphertext]);
}

async function schoolBackup(school: { id: string; name: string; slug: string }) {
  const [groups, memberships, tasks, events, resources, queries, audit] = await Promise.all([
    db.group.findMany({ where: { schoolId: school.id } }),
    db.schoolMembership.findMany({ where: { schoolId: school.id }, include: { user: { select: { id: true, name: true, email: true } }, groupMemberships: true } }),
    db.learningTask.findMany({ where: { schoolId: school.id } }),
    db.calendarEvent.findMany({ where: { schoolId: school.id } }),
    db.externalResource.findMany({ where: { schoolId: school.id } }),
    db.anonymousQuery.findMany({ where: { schoolId: school.id }, orderBy: { createdAt: "desc" } }),
    db.auditLog.findMany({ where: { schoolId: school.id } }),
  ]);
  const anonymousQueries = await Promise.all((queries as Array<{ id: string }>).map(async (query) => ({
    ...query,
    messages: await db.anonymousQueryMessage.findMany({ where: { queryId: query.id }, orderBy: { createdAt: "asc" } }),
  })));
  return {
    format: "eltaulell-school-backup-v1",
    createdAt: new Date().toISOString(),
    school,
    groups,
    memberships,
    learningTasks: tasks,
    calendarEvents: events,
    externalResources: resources,
    anonymousQueries,
    auditLogs: audit,
  };
}

export async function createEncryptedBackups() {
  if (!objectStorageConfigured()) throw new Error("BACKUP_BUCKET_NOT_CONFIGURED");
  const schools = await db.school.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true },
  }) as Array<{ id: string; name: string; slug: string }>;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const results: Array<{ schoolId: string; key: string }> = [];
  for (const school of schools) {
    const payload = Buffer.from(JSON.stringify(await schoolBackup(school)), "utf8");
    const encrypted = encryptBackup(payload);
    const key = `backups/${school.slug}/${timestamp}.json.enc`;
    await putObject(key, encrypted, "application/octet-stream");
    results.push({ schoolId: school.id, key });
  }
  return results;
}
