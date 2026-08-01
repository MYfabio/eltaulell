import BoardClient from "./board-client";
import { requireDemoPermission } from "@/lib/demo-auth";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const viewer = await requireDemoPermission(PERMISSIONS.VIEW_BOARD);
  return <BoardClient viewer={viewer} />;
}
