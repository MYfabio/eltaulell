import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoViewer } from "@/lib/demo-auth";
import {
  can,
  canCreatePost,
  PERMISSIONS,
  type PostKind,
} from "@/lib/permissions";

const postSchema = z.object({
  kind: z.enum(["NOTICE", "TASK", "ACTIVITY", "MATERIAL"]),
  title: z.string().trim().min(1).max(70),
  body: z.string().trim().min(1).max(240),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "La publicació no és vàlida." },
      { status: 400 },
    );
  }

  if (
    !can(viewer, PERMISSIONS.MODERATE_BOARD) ||
    !canCreatePost(viewer, parsed.data.kind as PostKind)
  ) {
    return NextResponse.json(
      { error: "Aquest perfil no pot editar el tauler." },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Falta la publicació." }, { status: 400 });
  }

  return NextResponse.json({
    post: {
      id,
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body,
      meta: `${viewer.name} · ${viewer.roleLabel} · editat ara`,
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }

  if (!can(viewer, PERMISSIONS.MODERATE_BOARD)) {
    return NextResponse.json(
      { error: "Aquest perfil no pot moderar el tauler." },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Falta la publicació." }, { status: 400 });
  }

  return NextResponse.json({ archived: true, id });
}
