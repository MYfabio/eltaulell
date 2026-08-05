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

const ROLE_HOME: Record<DemoRole, string> = {
  COORDINATOR: "/coordinacio",
  TUTOR: "/taulell",
  DELEGATE: "/taulell",
  STUDENT: "/taulell",
};

export async function POST(request: NextRequest) {
  if (!isDemoAccessEnabled()) {
    return NextResponse.json(
      { error: "La demostració no està disponible en aquest entorn." },
      { status: 404 },
    );
  }
  const formData = await request.formData();
  const userId = String(formData.get("userId") || "");
  const viewer = DEMO_VIEWERS.find((candidate) => candidate.id === userId);

  if (!viewer || !canUsePublicDemoRole(viewer.role)) {
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
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: ROLE_HOME[viewer.role] },
  });
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
