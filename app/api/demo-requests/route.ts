import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDemoRequest } from "@/lib/demo-requests";

const requestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(180),
  schoolName: z.string().trim().min(2).max(140),
  requestedRole: z.enum(["COORDINATOR", "TUTOR", "DELEGATE", "STUDENT"]),
  message: z.string().trim().max(800).optional(),
  privacyAccepted: z.literal("on"),
  website: z.string().max(200).optional(),
});

const attempts = new Map<string, { count: number; resetAt: number }>();
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function requestKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

function forwardedOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return host && protocol ? `${protocol}://${host}` : null;
}

function redirectToDemo(request: NextRequest, result: "sent" | "invalid" | "limited") {
  const url = new URL("/demo", forwardedOrigin(request) ?? request.nextUrl.origin);
  url.searchParams.set("contact", result);
  url.hash = "sollicitar-demo";
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const key = requestKey(request);
  const current = attempts.get(key);
  if (current && current.resetAt > Date.now() && current.count >= MAX_ATTEMPTS) {
    return redirectToDemo(request, "limited");
  }
  if (!current || current.resetAt <= Date.now()) {
    attempts.set(key, { count: 1, resetAt: Date.now() + ATTEMPT_WINDOW_MS });
  } else {
    current.count += 1;
  }

  const form = Object.fromEntries((await request.formData()).entries());
  if (String(form.website || "").trim()) return redirectToDemo(request, "sent");
  const parsed = requestSchema.safeParse(form);
  if (!parsed.success) return redirectToDemo(request, "invalid");

  const result = await createDemoRequest(parsed.data);
  if ("error" in result && result.error !== "DUPLICATE") {
    return redirectToDemo(request, "invalid");
  }
  return redirectToDemo(request, "sent");
}
