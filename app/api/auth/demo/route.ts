import { NextRequest, NextResponse } from "next/server";
import {
  createDemoSession,
  DEMO_COOKIE,
  DEMO_VIEWERS,
  type DemoRole,
} from "@/lib/demo-auth";

const ROLE_HOME: Record<DemoRole, string> = {
  COORDINATOR: "/coordinacio",
  TUTOR: "/tutoria",
  DELEGATE: "/tutoria",
  STUDENT: "/alumnat",
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const userId = String(formData.get("userId") || "");
  const viewer = DEMO_VIEWERS.find((candidate) => candidate.id === userId);

  if (!viewer) {
    return NextResponse.json({ error: "Usuari no vàlid" }, { status: 400 });
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: ROLE_HOME[viewer.role] },
  });
  response.cookies.set(DEMO_COOKIE, createDemoSession(viewer.id), {
    httpOnly: true,
    maxAge: 8 * 60 * 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
