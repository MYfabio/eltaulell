import { NextResponse } from "next/server";
import { DEMO_COOKIE, PLATFORM_DEMO_COOKIE } from "@/lib/demo-auth";

export async function GET() {
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
  return response;
}
