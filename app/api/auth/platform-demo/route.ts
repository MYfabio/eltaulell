import { NextResponse } from "next/server";
import {
  createPlatformDemoSession,
  DEMO_COOKIE,
  isPlatformDemoEnabled,
  PLATFORM_DEMO_COOKIE,
} from "@/lib/demo-auth";

export async function POST() {
  if (!isPlatformDemoEnabled()) {
    return NextResponse.json(
      { error: "L'accés de demostració de plataforma només està disponible en local." },
      { status: 404 },
    );
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/administracio-plataforma" },
  });
  response.cookies.set(PLATFORM_DEMO_COOKIE, createPlatformDemoSession(), {
    httpOnly: true,
    maxAge: 8 * 60 * 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  response.cookies.set(DEMO_COOKIE, "", { expires: new Date(0), path: "/" });
  return response;
}
