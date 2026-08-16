import { NextRequest, NextResponse } from "next/server";
import {
  DEMO_COOKIE,
  PLATFORM_DEMO_COOKIE,
  revokePersistentSession,
  SESSION_COOKIE,
} from "@/lib/demo-auth";
import { PLATFORM_SESSION_COOKIE, revokePlatformSession } from "@/lib/platform-auth";
import { expireSecurityCookie } from "@/lib/security-cookies";

export async function POST(request: NextRequest) {
  await revokePersistentSession(request.cookies.get(SESSION_COOKIE)?.value);
  await revokePlatformSession(request.cookies.get(PLATFORM_SESSION_COOKIE)?.value);
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/acces" },
  });
  response.cookies.set(DEMO_COOKIE, "", expireSecurityCookie());
  response.cookies.set(PLATFORM_DEMO_COOKIE, "", expireSecurityCookie());
  response.cookies.set(SESSION_COOKIE, "", expireSecurityCookie());
  response.cookies.set(PLATFORM_SESSION_COOKIE, "", expireSecurityCookie());
  return response;
}
