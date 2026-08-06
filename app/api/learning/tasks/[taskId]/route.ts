import { NextResponse } from "next/server";
import { z } from "zod";
import { AccessControlError } from "@/lib/access-control";
import { getDemoViewer } from "@/lib/demo-auth";
import { updateOwnLearningTaskStatus } from "@/lib/learning";

const statusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "DELIVERED"]),
});

function allowedOrigins(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  return new Set([url.origin, ...(host ? [`${protocol}://${host}`] : [])]);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins(request).has(origin)) {
    return NextResponse.json({ error: "Origen no permès." }, { status: 403 });
  }
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "L'estat de la tasca no és vàlid." }, { status: 400 });
  }
  const { taskId } = await params;
  try {
    const task = await updateOwnLearningTaskStatus(viewer, taskId, parsed.data.status);
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json({ error: "No tens accés a aquesta tasca." }, { status: error.status });
    }
    if (error instanceof Error && error.message === "INVALID_TASK_TRANSITION") {
      return NextResponse.json({ error: "Aquest canvi d'estat no està permès." }, { status: 409 });
    }
    throw error;
  }
}
