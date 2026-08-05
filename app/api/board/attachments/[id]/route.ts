import { NextResponse } from "next/server";
import { boardAccessErrorResponse } from "@/lib/access-http";
import { deleteAttachment } from "@/lib/board-store";
import { getDemoViewer } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }

  if (!can(viewer, PERMISSIONS.DELETE_ATTACHMENT)) {
    return NextResponse.json(
      { error: "Només tutoria i coordinació poden eliminar fitxers." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const groupId = new URL(request.url).searchParams.get("groupId");
  if (!id) {
    return NextResponse.json({ error: "Falta el fitxer." }, { status: 400 });
  }

  let deleted: boolean;
  try {
    deleted = await deleteAttachment(viewer, id, groupId);
  } catch (error) {
    const response = boardAccessErrorResponse(error);
    if (response) return response;
    throw error;
  }
  if (!deleted) {
    return NextResponse.json(
      { error: "No s'ha trobat el fitxer d'aquest grup." },
      { status: 404 },
    );
  }

  return NextResponse.json({ deleted: true, id });
}
