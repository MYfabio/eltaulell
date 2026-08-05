import { NextResponse } from "next/server";
import { z } from "zod";
import { createPoll, listPolls, managePoll, votePoll } from "@/lib/board-store";
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

const actionSchema = z.object({
  pollId: z.string().min(1).max(100),
  action: z.enum(["APPROVE", "CLOSE", "PUBLISH", "DELETE"]),
});

const voteSchema = z.object({
  pollId: z.string().min(1).max(100),
  optionId: z.string().min(1).max(100),
});

export async function GET(request: Request) {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }

  const groupId = new URL(request.url).searchParams.get("groupId");
  return NextResponse.json({
    polls: await listPolls(
      viewer,
      can(viewer, PERMISSIONS.MANAGE_POLL_RESULTS),
      groupId,
    ),
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

  const groupId = new URL(request.url).searchParams.get("groupId");

  const parsed = pollSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "L'enquesta no és vàlida." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      poll: await createPoll(
        viewer,
        {
          ...parsed.data,
          closesAt: parsed.data.closesAt ?? null,
        },
        groupId,
      ),
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }
  if (!can(viewer, PERMISSIONS.MANAGE_POLL_RESULTS)) {
    return NextResponse.json(
      { error: "Només tutoria i coordinació poden validar resultats." },
      { status: 403 },
    );
  }

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "L'acció no és vàlida." }, { status: 400 });
  }

  const groupId = new URL(request.url).searchParams.get("groupId");
  const result = await managePoll(
    viewer,
    parsed.data.pollId,
    parsed.data.action,
    groupId,
  );
  if ("error" in result) {
    return NextResponse.json(
      {
        error:
          result.error === "NOT_FOUND"
            ? "No s'ha trobat l'enquesta d'aquest grup."
            : "Aquesta acció no correspon amb l'estat actual de l'enquesta.",
      },
      { status: result.error === "NOT_FOUND" ? 404 : 409 },
    );
  }

  return NextResponse.json({
    id: parsed.data.pollId,
    action: parsed.data.action,
    ...result,
  });
}

export async function PUT(request: Request) {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }
  if (!can(viewer, PERMISSIONS.VOTE_POLL)) {
    return NextResponse.json({ error: "Aquest perfil no pot votar." }, { status: 403 });
  }

  const parsed = voteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "El vot no és vàlid." }, { status: 400 });
  }

  const groupId = new URL(request.url).searchParams.get("groupId");
  const result = await votePoll(
    viewer,
    parsed.data.pollId,
    parsed.data.optionId,
    groupId,
  );
  if ("error" in result && result.error) {
    const message = {
      NOT_FOUND: "No s'ha trobat l'enquesta d'aquest grup.",
      NOT_OPEN: "La votació ja no està oberta.",
      ALREADY_VOTED: "Ja has votat en aquesta enquesta.",
      OPTION_NOT_FOUND: "Aquesta opció no existeix.",
    }[result.error];
    return NextResponse.json(
      { error: message },
      { status: result.error === "NOT_FOUND" ? 404 : 409 },
    );
  }

  return NextResponse.json({ ...result, pollId: parsed.data.pollId });
}
