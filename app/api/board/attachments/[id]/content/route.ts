import { getAttachment } from "@/lib/demo-board-store";
import { getDemoViewer } from "@/lib/demo-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getDemoViewer();
  if (!viewer) return new Response("Cal iniciar sessió.", { status: 401 });

  const { id } = await params;
  const attachment = getAttachment(viewer, id);
  if (!attachment) return new Response("Fitxer no trobat.", { status: 404 });

  return new Response(Buffer.from(attachment.content), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      "Content-Length": String(attachment.size),
      "Content-Type": attachment.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
