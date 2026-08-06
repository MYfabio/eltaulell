import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetPassword } from "@/lib/password-reset";

const schema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(12).max(256),
  confirmation: z.string().min(12).max(256),
}).refine((value) => value.password === value.confirmation, { message: "PASSWORD_MISMATCH" });

export async function POST(request: NextRequest) {
  const form = Object.fromEntries((await request.formData()).entries());
  const parsed = schema.safeParse(form);
  if (!parsed.success) {
    const token = typeof form.token === "string" ? form.token : "";
    return NextResponse.redirect(new URL(`/restablir-contrasenya?token=${encodeURIComponent(token)}&error=password`, request.nextUrl.origin), 303);
  }
  const result = await resetPassword(parsed.data.token, parsed.data.password);
  if ("error" in result) {
    return NextResponse.redirect(new URL(`/restablir-contrasenya?token=${encodeURIComponent(parsed.data.token)}&error=${result.error === "WEAK_PASSWORD" ? "password" : "expired"}`, request.nextUrl.origin), 303);
  }
  return NextResponse.redirect(new URL("/acces?reset=success", request.nextUrl.origin), 303);
}
