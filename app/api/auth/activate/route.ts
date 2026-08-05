import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { activateAccount } from "@/lib/account-auth";
import { createPersistentSession, SESSION_COOKIE, type DemoRole } from "@/lib/demo-auth";

const activationSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(12).max(256),
  confirmation: z.string().min(12).max(256),
}).refine((value) => value.password === value.confirmation, {
  path: ["confirmation"],
  message: "PASSWORD_MISMATCH",
});

const ROLE_HOME: Record<DemoRole, string> = {
  COORDINATOR: "/coordinacio",
  TUTOR: "/taulell",
  DELEGATE: "/taulell",
  STUDENT: "/taulell",
};

function publicOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return host && protocol ? `${protocol}://${host}` : request.nextUrl.origin;
}

function redirectToActivation(request: NextRequest, token: string, error: string) {
  const target = new URL("/activar", publicOrigin(request));
  target.searchParams.set("token", token);
  target.searchParams.set("error", error);
  return NextResponse.redirect(target, 303);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== publicOrigin(request) && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origen no autoritzat." }, { status: 403 });
  }

  const form = Object.fromEntries((await request.formData()).entries());
  const token = typeof form.token === "string" ? form.token : "";
  const parsed = activationSchema.safeParse(form);
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((issue) => issue.message === "PASSWORD_MISMATCH");
    return redirectToActivation(request, token, mismatch ? "mismatch" : "password");
  }

  const result = await activateAccount(parsed.data.token, parsed.data.password);
  if ("error" in result) {
    return redirectToActivation(
      request,
      token,
      result.error === "WEAK_PASSWORD" ? "password" : "expired",
    );
  }

  const session = await createPersistentSession(result.userId, result.membershipId);
  const response = NextResponse.redirect(
    new URL(ROLE_HOME[result.role], publicOrigin(request)),
    303,
  );
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    maxAge: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
