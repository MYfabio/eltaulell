import { NextResponse } from "next/server";
import {
  createPlatformDemoSession,
  DEMO_COOKIE,
  isPlatformDemoEnabled,
  PLATFORM_DEMO_COOKIE,
  SESSION_COOKIE,
} from "@/lib/demo-auth";
import { expireSecurityCookie, sessionCookieOptions } from "@/lib/security-cookies";

export async function POST() {
  if (!isPlatformDemoEnabled()) {
    return NextResponse.json(
      { error: "L'accés de demostració de plataforma només està disponible en local." },
      { status: 404 },
    );
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/administracio-plataforma" },
  });
  response.cookies.set(
    PLATFORM_DEMO_COOKIE,
    createPlatformDemoSession(),
    sessionCookieOptions(new Date(Date.now() + 8 * 60 * 60 * 1000)),
  );
  response.cookies.set(DEMO_COOKIE, "", expireSecurityCookie());
  response.cookies.set(SESSION_COOKIE, "", expireSecurityCookie());
  return response;
}
