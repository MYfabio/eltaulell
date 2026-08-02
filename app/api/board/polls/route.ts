import { NextResponse } from "next/server";
import { z } from "zod";
import { createPoll, listPolls } from "@/lib/demo-board-store";
import { getDemoViewer } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

const pollSchema = z.object({
  question: z.string().trim().min(5).max(140),
  options: z
    .array(z.string().trim().min(1).max(80))
    .min(2)
    .max(6)
    .refine(
      (options) => new Set(options.map((option) => option.toLowerCase())).size === options.length,
      "Les opcions no es poden repetir.",
    ),
  anonymous: z.boolean().default(true),
  closesAt: z.string().datetime().nullable().optional(),
});

export async function GET() {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }

  return NextResponse.json({
    polls: listPolls(viewer, can(viewer, PERMISSIONS.MANAGE_POLL_RESULTS)),
  });
}

export async function POST(request: Request) {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }

  if (!can(viewer, PERMISSIONS.CREATE_POLL)) {
    return NextResponse.json(
      { error: "Aquest perfil no pot crear enquestes." },
      { status: 403 },
    );
  }

  const parsed = pollSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "L'enquesta no és vàlida." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      poll: createPoll(viewer, {
        ...parsed.data,
        closesAt: parsed.data.closesAt ?? null,
      }),
    },
    { status: 201 },
  );
}
