import "server-only";

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

function redact(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/([?&](?:token|key|code)=)[^&\s]+/gi, "$1[redacted]")
    .slice(0, 500);
}

export function requestId(request?: Request) {
  return request?.headers.get("x-request-id")?.slice(0, 100) || randomUUID();
}

export async function logSystemError(input: {
  source: string;
  code: string;
  error?: unknown;
  schoolId?: string;
  requestId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const raw = input.error instanceof Error ? input.error.message : String(input.error || input.code);
  const entry = {
    schoolId: input.schoolId || null,
    requestId: input.requestId || null,
    source: input.source.slice(0, 100),
    code: input.code.slice(0, 100),
    message: redact(raw),
    metadata: input.metadata || null,
  };
  console.error(`[${entry.requestId || "no-request"}] ${entry.source}:${entry.code}`);
  await db.systemErrorLog.create({ data: entry }).catch(() => undefined);
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (endpoint) {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "eltaulell.error", timestamp: new Date().toISOString(), ...entry }),
      signal: AbortSignal.timeout(5_000),
    }).catch(() => undefined);
  }
}
