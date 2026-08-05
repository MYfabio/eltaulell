import { NextResponse } from "next/server";
import { getDemoViewer, getViewerSession } from "@/lib/demo-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const persistentSession = await getViewerSession();
  const viewer = persistentSession?.viewer || await getDemoViewer();

  if (!viewer) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      viewer: {
        id: viewer.id,
        name: viewer.name,
        role: viewer.role,
        roleLabel: viewer.roleLabel,
        schoolSlug: viewer.schoolSlug,
        groupName: viewer.groupName,
        permissions: viewer.permissions,
      },
      session: persistentSession
        ? {
            persistent: true,
            expiresAt: persistentSession.expiresAt.toISOString(),
          }
        : { persistent: false },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
