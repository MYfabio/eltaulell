import { NextRequest, NextResponse } from "next/server";
import { ensureDemoSchoolData } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  createPersistentSession,
  canUsePublicDemoRole,
  DEMO_COOKIE,
  DEMO_VIEWERS,
  isDemoAccessEnabled,
  PLATFORM_DEMO_COOKIE,
  SESSION_COOKIE,
  type DemoRole,
} from "@/lib/demo-auth";
import { expireSecurityCookie, sessionCookieOptions } from "@/lib/security-cookies";

const ROLE_HOME: Record<DemoRole, string> = {
  COORDINATOR: "/coordinacio",
  TUTOR: "/taulell",
  DELEGATE: "/taulell",
  STUDENT: "/taulell",
};

async function openDemo(viewer: (typeof DEMO_VIEWERS)[number], returnTo?: string) {
  if (!isDemoAccessEnabled()) {
    return NextResponse.json(
      { error: "La demostració no està disponible en aquest entorn." },
      { status: 404 },
    );
  }
  if (!canUsePublicDemoRole(viewer.role)) {
    return NextResponse.json({ error: "Usuari no vàlid" }, { status: 400 });
  }

  await ensureDemoSchoolData(viewer);
  const user = await db.user.findUnique({
    where: { email: viewer.email.toLowerCase() },
    select: { id: true },
  });
  const membership = user
    ? await db.schoolMembership.findFirst({
        where: {
          userId: user.id,
          role: viewer.role,
          status: "ACTIVE",
          school: { slug: viewer.schoolSlug, active: true },
        },
        select: { id: true },
      })
    : null;

  if (!user || !membership) {
    return NextResponse.json(
      { error: "Aquest perfil no té una matrícula activa." },
      { status: 403 },
    );
  }

  const session = await createPersistentSession(user.id, membership.id);
  const destination = returnTo === "/demo" ? "/demo" : ROLE_HOME[viewer.role];
  const response = new NextResponse(null, {
    status: 303,
    headers: { "Cache-Control": "no-store", Location: destination },
  });
  response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
  response.cookies.set(DEMO_COOKIE, "", expireSecurityCookie());
  response.cookies.set(PLATFORM_DEMO_COOKIE, "", expireSecurityCookie());
  return response;
}

export async function GET(request: NextRequest) {
  const viewer = DEMO_VIEWERS.find((candidate) => candidate.role === "STUDENT");
  if (!viewer) return NextResponse.json({ error: "Demo no disponible" }, { status: 404 });
  return openDemo(viewer, request.nextUrl.searchParams.get("returnTo") || undefined);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const userId = String(formData.get("userId") || "");
  const viewer = DEMO_VIEWERS.find((candidate) => candidate.id === userId);
  if (!viewer) return NextResponse.json({ error: "Usuari no vàlid" }, { status: 400 });
  return openDemo(viewer, String(formData.get("returnTo") || ""));
}
