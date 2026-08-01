import { NextResponse } from "next/server";
import { getDemoViewer } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

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
