import { NextResponse } from "next/server";
import { z } from "zod";
import { AccessControlError } from "@/lib/access-control";
import { archivePost, updatePost } from "@/lib/board-store";
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
  groupId: z.string().trim().min(1).max(100),
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

  try {
    const post = await updatePost(viewer, id, parsed.data, parsed.data.groupId);
    if (!post) {
      return NextResponse.json(
        { error: "No s'ha trobat la publicació d'aquest grup." },
        { status: 404 },
      );
    }
    return NextResponse.json({ post });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { error: "No tens accés al tauler d'aquest grup." },
        { status: error.status },
      );
    }
    throw error;
  }
}

export async function DELETE(
  request: Request,
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

  const groupId = new URL(request.url).searchParams.get("groupId");
  if (!groupId) {
    return NextResponse.json({ error: "Falta el grup del tauler." }, { status: 400 });
  }
  try {
    if (!(await archivePost(viewer, id, groupId))) {
      return NextResponse.json(
        { error: "No s'ha trobat la publicació d'aquest grup." },
        { status: 404 },
      );
    }
    return NextResponse.json({ archived: true, id });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { error: "No tens accés al tauler d'aquest grup." },
        { status: error.status },
      );
    }
    throw error;
  }
}
