import { NextResponse } from "next/server";
import { getDemoViewer } from "@/lib/demo-auth";
import { createGoogleAuthorization, isGoogleConfigured } from "@/lib/google";

export async function GET() {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.redirect(new URL("/acces", process.env.APP_BASE_URL || "http://127.0.0.1:3000"));
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: "Google OAuth no està configurat." }, { status: 503 });
  }
  const authorization = await createGoogleAuthorization(viewer);
  const response = NextResponse.redirect(authorization.url);
  response.cookies.set("eltaulell_google_oauth_state", authorization.state, {
    httpOnly: true,
    maxAge: 10 * 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google/callback",
  });
  return response;
}
