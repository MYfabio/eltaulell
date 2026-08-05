import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateAccount } from "@/lib/account-auth";
import {
  createPersistentSession,
  DEMO_COOKIE,
  PLATFORM_DEMO_COOKIE,
  SESSION_COOKIE,
  type DemoRole,
} from "@/lib/demo-auth";

const loginSchema = z.object({
  email: z.string().trim().email().max(180),
  password: z.string().min(1).max(256),
  schoolSlug: z.string().trim().max(80).optional(),
});

const ROLE_HOME: Record<DemoRole, string> = {
  COORDINATOR: "/coordinacio",
  TUTOR: "/taulell",
  DELEGATE: "/taulell",
  STUDENT: "/taulell",
};

function forwardedOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return host && protocol ? `${protocol}://${host}` : request.nextUrl.origin;
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, forwardedOrigin(request)), 303);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== forwardedOrigin(request) && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origen no autoritzat." }, { status: 403 });
  }

  const parsed = loginSchema.safeParse(
    Object.fromEntries((await request.formData()).entries()),
  );
  if (!parsed.success) return redirectTo(request, "/acces?accountError=invalid");

  const result = await authenticateAccount(
    parsed.data.email,
    parsed.data.password,
    parsed.data.schoolSlug,
  );
  if ("error" in result) {
    const error = result.error === "LOCKED"
      ? "locked"
      : result.error === "CENTRE_REQUIRED"
        ? "centre"
        : result.error === "NO_ACTIVE_MEMBERSHIP"
          ? "inactive"
          : "invalid";
    await new Promise((resolve) => setTimeout(resolve, 350));
    return redirectTo(request, `/acces?accountError=${error}`);
  }

  const session = await createPersistentSession(result.userId, result.membership.id);
  const response = redirectTo(request, ROLE_HOME[result.membership.role]);
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
