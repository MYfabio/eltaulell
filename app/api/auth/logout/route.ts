import { NextRequest, NextResponse } from "next/server";
import {
  DEMO_COOKIE,
  PLATFORM_DEMO_COOKIE,
  revokePersistentSession,
  SESSION_COOKIE,
} from "@/lib/demo-auth";

export async function POST(request: NextRequest) {
  await revokePersistentSession(request.cookies.get(SESSION_COOKIE)?.value);
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/acces" },
  });
  response.cookies.set(DEMO_COOKIE, "", {
    expires: new Date(0),
    path: "/",
  });
  response.cookies.set(PLATFORM_DEMO_COOKIE, "", {
    expires: new Date(0),
    path: "/",
  });
  response.cookies.set(SESSION_COOKIE, "", {
    expires: new Date(0),
    path: "/",
  });
  return response;
}
