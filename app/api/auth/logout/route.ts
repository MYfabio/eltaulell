import { NextRequest, NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/demo-auth";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/acces", request.url));
  response.cookies.set(DEMO_COOKIE, "", {
    expires: new Date(0),
    path: "/",
  });
  return response;
}
