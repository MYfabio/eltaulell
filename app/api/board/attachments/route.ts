import { NextResponse } from "next/server";
import { createAttachment, listAttachments } from "@/lib/board-store";
import { getDemoViewer } from "@/lib/demo-auth";
import { ObjectStorageConfigurationError } from "@/lib/object-storage";
import { can, PERMISSIONS } from "@/lib/permissions";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function GET(request: Request) {
  const viewer = await getDemoViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Cal iniciar sessió." }, { status: 401 });
  }

  const groupId = new URL(request.url).searchParams.get("groupId");
  return NextResponse.json({ attachments: await listAttachments(viewer, groupId) });
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
  const groupId = new URL(request.url).searchParams.get("groupId");
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

  let attachment: Awaited<ReturnType<typeof createAttachment>>;
  try {
    attachment = await createAttachment(
      viewer,
      {
        fileName: file.name.slice(0, 140),
        mimeType: file.type,
        size: file.size,
        caption,
        content: new Uint8Array(await file.arrayBuffer()),
      },
      groupId,
    );
  } catch (error) {
    if (error instanceof ObjectStorageConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  if (!attachment) {
    return NextResponse.json(
      { error: "El taulell ja té el màxim de 30 fitxers. Tutoria pot eliminar-ne algun." },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      attachment,
      storageMode: attachment.storageMode,
    },
    {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
