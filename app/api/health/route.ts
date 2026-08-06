import { db } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { objectStorageConfigured } from "@/lib/object-storage";
import { requestId } from "@/lib/observability";

export async function GET(request: Request) {
  const id = requestId(request);
  const startedAt = Date.now();
  try {
    await db.school.findMany({ take: 1, select: { id: true } });
    const recentErrors = await db.systemErrorLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 15 * 60_000) } },
    });
    return Response.json({
      status: "ok",
      service: "eltaulell",
      requestId: id,
      database: "connected",
      storage: objectStorageConfigured() ? "configured" : "not-configured",
      email: isEmailConfigured() ? "configured" : "not-configured",
      recentErrors,
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store", "X-Request-Id": id } });
  } catch {
    return Response.json({
      status: "error",
      service: "eltaulell",
      requestId: id,
      database: "unavailable",
      timestamp: new Date().toISOString(),
    }, { status: 503, headers: { "Cache-Control": "no-store", "X-Request-Id": id } });
  }
}
