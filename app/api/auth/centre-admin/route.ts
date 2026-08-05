import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureCentreAdmin,
  verifyCentreAdminCredentials,
} from "@/lib/centre-admin-auth";
import {
  createPersistentSession,
  DEMO_COOKIE,
  PLATFORM_DEMO_COOKIE,
  SESSION_COOKIE,
} from "@/lib/demo-auth";

const loginSchema = z.object({
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(256),
});

const attempts = new Map<string, { count: number; resetAt: number }>();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function attemptKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

function isLocked(key: string) {
  const attempt = attempts.get(key);
  if (!attempt || attempt.resetAt <= Date.now()) {
    attempts.delete(key);
    return false;
  }
  return attempt.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const current = attempts.get(key);
  if (!current || current.resetAt <= Date.now()) {
    attempts.set(key, { count: 1, resetAt: Date.now() + ATTEMPT_WINDOW_MS });
    return;
  }
  current.count += 1;
}

function requestOrigins(request: NextRequest) {
  const origins = new Set([request.nextUrl.origin]);
  const forwardedHost = request.headers.get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  if (forwardedHost && forwardedProto) {
    origins.add(`${forwardedProto}://${forwardedHost}`);
  }

  return origins;
}

function redirectToAccess(request: NextRequest, error: "invalid" | "locked") {
  return NextResponse.redirect(new URL(`/acces?error=${error}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && !requestOrigins(request).has(origin)) {
    return NextResponse.json({ error: "Origen no autoritzat." }, { status: 403 });
  }

  const key = attemptKey(request);
  if (isLocked(key)) return redirectToAccess(request, "locked");

  const parsed = loginSchema.safeParse(
    Object.fromEntries((await request.formData()).entries()),
  );
  if (!parsed.success) {
    recordFailure(key);
    return redirectToAccess(request, "invalid");
  }

  const config = verifyCentreAdminCredentials(parsed.data.email, parsed.data.password);
  if (!config) {
    recordFailure(key);
    await new Promise((resolve) => setTimeout(resolve, 350));
    return redirectToAccess(request, "invalid");
  }

  attempts.delete(key);
  const subject = await ensureCentreAdmin(config);
  const session = await createPersistentSession(subject.userId, subject.membershipId);
  const response = NextResponse.redirect(new URL("/coordinacio", request.url), 303);
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    maxAge: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  response.cookies.set(DEMO_COOKIE, "", { expires: new Date(0), path: "/" });
  response.cookies.set(PLATFORM_DEMO_COOKIE, "", { expires: new Date(0), path: "/" });
  return response;
}

