import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteCalendarEvent, updateCalendarEvent } from "@/lib/calendar";
import { getDemoViewer } from "@/lib/demo-auth";

const updateSchema = z.object({
  groupId: z.string().trim().min(1).max(100).nullable().optional(),
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1_000).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dades no vàlides." }, { status: 400 });
  try {
    const { eventId } = await params;
    const event = await updateCalendarEvent(viewer, eventId, {
      groupId: parsed.data.groupId,
      title: parsed.data.title,
      description: parsed.data.description,
      ...(parsed.data.startsAt ? { startsAt: new Date(parsed.data.startsAt) } : {}),
      ...(parsed.data.endsAt !== undefined
        ? { endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null }
        : {}),
    });
    return NextResponse.json({ event });
  } catch {
    return NextResponse.json({ error: "Esdeveniment no trobat o no editable." }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  try {
    const { eventId } = await params;
    await deleteCalendarEvent(viewer, eventId);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Esdeveniment no trobat o no editable." }, { status: 404 });
  }
}
