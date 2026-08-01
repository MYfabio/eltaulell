import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDemoViewer } from "@/lib/demo-auth";
import { canCreatePost, type PostKind } from "@/lib/permissions";

const postSchema = z.object({
  kind: z.enum(["NOTICE", "TASK", "ACTIVITY", "MATERIAL"]),
  title: z.string().trim().min(1).max(70),
  body: z.string().trim().min(1).max(240),
});

export async function POST(request: NextRequest) {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "La publicació no és vàlida." }, { status: 400 });
  }

  if (!canCreatePost(viewer, parsed.data.kind as PostKind)) {
    return NextResponse.json(
      { error: "Aquest perfil no pot publicar aquest tipus de contingut." },
      { status: 403 },
    );
  }

  return NextResponse.json(
    {
      post: {
        id: randomUUID(),
        kind: parsed.data.kind,
        title: parsed.data.title,
        body: parsed.data.body,
        meta: `${viewer.name} · ${viewer.roleLabel} · ara`,
      },
    },
    { status: 201 },
  );
}
