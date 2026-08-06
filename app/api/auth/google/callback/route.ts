import { NextRequest, NextResponse } from "next/server";
import { getDemoViewer } from "@/lib/demo-auth";
import { completeGoogleAuthorization } from "@/lib/google";

function publicOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
    || request.headers.get("host")?.trim();
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
    || request.nextUrl.protocol.replace(":", "");
  return host ? `${protocol}://${host}` : request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.redirect(new URL("/acces", publicOrigin(request)));
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get("eltaulell_google_oauth_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/integracions?google=state", publicOrigin(request)));
  }
  try {
    await completeGoogleAuthorization(viewer, code, state);
    const response = NextResponse.redirect(new URL("/integracions?google=connected", publicOrigin(request)));
    response.cookies.set("eltaulell_google_oauth_state", "", { expires: new Date(0), path: "/api/auth/google/callback" });
    return response;
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return NextResponse.redirect(new URL("/integracions?google=error", publicOrigin(request)));
  }
}
