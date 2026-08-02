import { NextResponse } from "next/server";
import { createAttachment, listAttachments } from "@/lib/board-store";
import { getDemoViewer } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function GET() {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }

  return NextResponse.json({ attachments: await listAttachments(viewer) });
}

export async function POST(request: Request) {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }

  if (!can(viewer, PERMISSIONS.CREATE_ATTACHMENT)) {
    return NextResponse.json(
      { error: "Aquest perfil no pot adjuntar fitxers." },
      { status: 403 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const caption = String(formData?.get("caption") ?? "").trim().slice(0, 120);

  if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Només s'accepten fitxers JPG, PNG, WebP, GIF o PDF." },
      { status: 400 },
    );
  }

  if (file.size < 1 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "El fitxer ha de pesar menys de 5 MB." },
      { status: 400 },
    );
  }

  const attachment = await createAttachment(viewer, {
    fileName: file.name.slice(0, 140),
    mimeType: file.type,
    size: file.size,
    caption,
    content: new Uint8Array(await file.arrayBuffer()),
  });

  if (!attachment) {
    return NextResponse.json(
      { error: "El taulell ja té el màxim de 30 fitxers. Tutoria pot eliminar-ne algun." },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      attachment,
      storageMode: "postgresql",
    },
    {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
