import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/password-reset";

const schema = z.object({ email: z.string().trim().email().max(180) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (parsed.success) await requestPasswordReset(parsed.data.email);
  return NextResponse.redirect(new URL("/recuperar-contrasenya?sent=1", request.nextUrl.origin), 303);
}
