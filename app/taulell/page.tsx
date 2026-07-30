import BoardClient from "./board-client";
import { requireDemoViewer } from "@/lib/demo-auth";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const viewer = await requireDemoViewer();
  return <BoardClient viewer={viewer} />;
}
