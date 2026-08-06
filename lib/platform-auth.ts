import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { passwordMatches } from "@/lib/credential-policy";
import { db } from "@/lib/db";
import { getPlatformDemoViewer, type PlatformDemoViewer } from "@/lib/demo-auth";
import { verifyTotp } from "@/lib/totp";

export const PLATFORM_SESSION_COOKIE = "eltaulell_platform_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export type PlatformViewer = PlatformDemoViewer & { mode: "account" | "demo" };

type PlatformAdminConfig = {
  email: string;
  passwordHash: string;
  name: string;
  totpSecret: string;
  allowedIps: string[];
};

function sameText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function platformAdminConfig(): PlatformAdminConfig | null {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.PLATFORM_ADMIN_PASSWORD_HASH?.trim();
  const totpSecret = process.env.PLATFORM_ADMIN_TOTP_SECRET?.replace(/\s+/g, "").toUpperCase();
  if (!email || !passwordHash || !totpSecret) return null;
  return {
    email,
    passwordHash,
    name: process.env.PLATFORM_ADMIN_NAME?.trim() || "Administració El Taulell",
    totpSecret,
    allowedIps: (process.env.PLATFORM_ADMIN_ALLOWED_IPS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  };
}

export function isPlatformAdminConfigured() {
  return Boolean(platformAdminConfig());
}

export function platformRequestIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")?.trim()
    || "unknown";
}

async function ensureConfiguredPlatformAdmin(config: PlatformAdminConfig) {
  const user = await db.user.upsert({
    where: { email: config.email },
    update: { name: config.name },
    create: { name: config.name, email: config.email },
  });
  await db.passwordCredential.upsert({
    where: { userId: user.id },
    update: { passwordHash: config.passwordHash },
    create: { userId: user.id, passwordHash: config.passwordHash },
  });
  const admin = await db.platformAdmin.upsert({
    where: { userId: user.id },
    update: { active: true, mfaEnabled: true },
    create: { userId: user.id, active: true, mfaEnabled: true },
  });
  return { user, admin };
}

export async function authenticatePlatformAdmin(input: {
  email: string;
  password: string;
  totp: string;
  ip: string;
}) {
  const config = platformAdminConfig();
  if (!config) return { error: "NOT_CONFIGURED" as const };
  if (config.allowedIps.length && !config.allowedIps.includes(input.ip)) {
    return { error: "IP_FORBIDDEN" as const };
  }
  const { user } = await ensureConfiguredPlatformAdmin(config);
  const credential = await db.passwordCredential.findUnique({ where: { userId: user.id } });
  if (credential?.lockedUntil && credential.lockedUntil.getTime() > Date.now()) {
    return { error: "LOCKED" as const };
  }
  const valid =
    sameText(input.email.trim().toLowerCase(), config.email)
    && passwordMatches(input.password, config.passwordHash)
    && verifyTotp(config.totpSecret, input.totp);
  if (!valid) {
    const failedAttempts = (credential?.failedAttempts ?? 0) + 1;
    await db.passwordCredential.update({
      where: { id: credential.id },
      data: {
        failedAttempts,
        lockedUntil: failedAttempts >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOCK_DURATION_MS)
          : null,
      },
    });
    return { error: failedAttempts >= MAX_FAILED_ATTEMPTS ? "LOCKED" as const : "INVALID" as const };
  }
  await Promise.all([
    db.passwordCredential.update({
      where: { id: credential.id },
      data: { failedAttempts: 0, lockedUntil: null },
    }),
    db.platformAdmin.upsert({
      where: { userId: user.id },
      update: { active: true, mfaEnabled: true, lastLoginAt: new Date() },
      create: { userId: user.id, active: true, mfaEnabled: true, lastLoginAt: new Date() },
    }),
  ]);
  return { userId: user.id as string, name: user.name as string, email: user.email as string };
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export async function createPlatformSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.session.create({
    data: { userId, schoolMembershipId: null, tokenHash: tokenHash(token), expiresAt },
  });
  return { token, expiresAt };
}

async function readPlatformSession(token: string): Promise<PlatformViewer | null> {
  const session = await db.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: true },
  });
  if (
    !session ||
    session.schoolMembershipId ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    return null;
  }
  const admin = await db.platformAdmin.findFirst({
    where: { userId: session.userId, active: true },
  });
  if (!admin) return null;
  if (Date.now() - session.lastSeenAt.getTime() >= SESSION_TOUCH_INTERVAL_MS) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }
  const name = session.user.name as string;
  return {
    id: session.user.id as string,
    name,
    firstName: name.split(/\s+/)[0] || name,
    initials: name.split(/\s+/).slice(0, 2).map((part: string) => part[0]?.toUpperCase()).join(""),
    email: session.user.email as string,
    roleLabel: "SuperAdmin de plataforma",
    mode: "account",
  };
}

export async function getPlatformViewer(): Promise<PlatformViewer | null> {
  const cookieStore = await cookies();
  const persistent = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value;
  if (persistent) return readPlatformSession(persistent);
  const demo = await getPlatformDemoViewer();
  return demo ? { ...demo, mode: "demo" } : null;
}

export async function requirePlatformViewer() {
  const viewer = await getPlatformViewer();
  if (!viewer) redirect("/acces");
  return viewer;
}

export async function revokePlatformSession(token?: string) {
  if (!token) return;
  await db.session.updateMany({
    where: { tokenHash: tokenHash(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
