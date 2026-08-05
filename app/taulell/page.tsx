import BoardClient from "./board-client";
import { listBoardChoices } from "@/lib/board-store";
import { requireDemoPermission } from "@/lib/demo-auth";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string | string[] }>;
}) {
  const viewer = await requireDemoPermission(PERMISSIONS.VIEW_BOARD);
  const params = await searchParams;
  const requestedGroupId = Array.isArray(params.groupId)
    ? params.groupId[0]
    : params.groupId;
  const boards = await listBoardChoices(viewer);
  const selectedBoard =
    boards.find((board) => board.groupId === requestedGroupId) ?? boards[0];
  if (!selectedBoard) {
    throw new Error("Aquest perfil encara no té cap taulell assignat.");
  }

  return (
    <BoardClient
      boards={boards}
      selectedBoard={selectedBoard}
      viewer={viewer}
    />
  );
}
