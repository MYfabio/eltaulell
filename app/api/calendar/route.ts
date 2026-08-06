import { NextResponse } from "next/server";
import { z } from "zod";
import { createCalendarEvent, listCalendarEvents } from "@/lib/calendar";
import { getDemoViewer } from "@/lib/demo-auth";

const eventSchema = z.object({
  groupId: z.string().trim().min(1).max(100).nullable(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1_000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
}).refine((value) => !value.endsAt || new Date(value.endsAt) > new Date(value.startsAt), {
  message: "End must be after start",
});

export async function GET(request: Request) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  return NextResponse.json({
    events: await listCalendarEvents(
      viewer,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    ),
  });
}

export async function POST(request: Request) {
  const viewer = await getDemoViewer();
  if (!viewer) return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa les dades i les dates." }, { status: 400 });
  try {
    const event = await createCalendarEvent(viewer, {
      ...parsed.data,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No tens permisos per crear aquest esdeveniment." }, { status: 403 });
  }
}
