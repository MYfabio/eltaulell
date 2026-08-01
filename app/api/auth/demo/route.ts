import { NextRequest, NextResponse } from "next/server";
import {
  createDemoSession,
  DEMO_COOKIE,
  DEMO_VIEWERS,
} from "@/lib/demo-auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const userId = String(formData.get("userId") || "");
  const viewer = DEMO_VIEWERS.find((candidate) => candidate.id === userId);

  if (!viewer) {
    return NextResponse.json({ error: "Usuari no vàlid" }, { status: 400 });
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/taulell" },
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
