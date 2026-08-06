import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_COOKIE, PLATFORM_DEMO_COOKIE, SESSION_COOKIE } from "@/lib/demo-auth";
import {
  authenticatePlatformAdmin,
  createPlatformSession,
  PLATFORM_SESSION_COOKIE,
  platformRequestIp,
} from "@/lib/platform-auth";

const loginSchema = z.object({
  email: z.string().trim().email().max(180),
  password: z.string().min(1).max(256),
  totp: z.string().trim().regex(/^\d{6}$/),
});

function publicOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
    || request.headers.get("host")?.trim();
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
    || request.nextUrl.protocol.replace(":", "");
  return host ? `${protocol}://${host}` : request.nextUrl.origin;
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, publicOrigin(request)), 303);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin && origin !== publicOrigin(request)) {
    return NextResponse.json({ error: "Origen no autoritzat." }, { status: 403 });
  }
  const parsed = loginSchema.safeParse(
    Object.fromEntries((await request.formData()).entries()),
  );
  if (!parsed.success) return redirectTo(request, "/acces?platformError=invalid");
  const result = await authenticatePlatformAdmin({
    ...parsed.data,
    ip: platformRequestIp(request.headers),
  });
  if ("error" in result) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    const error = result.error === "LOCKED"
      ? "locked"
      : result.error === "IP_FORBIDDEN"
        ? "ip"
        : result.error === "NOT_CONFIGURED"
          ? "config"
          : "invalid";
    return redirectTo(request, `/acces?platformError=${error}`);
  }
  const session = await createPlatformSession(result.userId);
  const response = redirectTo(request, "/administracio-plataforma");
  response.cookies.set(PLATFORM_SESSION_COOKIE, session.token, {
    httpOnly: true,
    maxAge: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  response.cookies.set(DEMO_COOKIE, "", { expires: new Date(0), path: "/" });
  response.cookies.set(PLATFORM_DEMO_COOKIE, "", { expires: new Date(0), path: "/" });
  response.cookies.set(SESSION_COOKIE, "", { expires: new Date(0), path: "/" });
  return response;
}
