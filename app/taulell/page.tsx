import { redirect } from "next/navigation";
import BoardClient from "./board-client";
import { listBoardChoices, listPosts } from "@/lib/board-store";
import { requireDemoPermission } from "@/lib/demo-auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listOwnLearningTasks } from "@/lib/learning";
import { listCalendarEvents } from "@/lib/calendar";

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
  const selectedBoard = requestedGroupId
    ? boards.find((board) => board.groupId === requestedGroupId)
    : boards[0];
  if (requestedGroupId && !selectedBoard) redirect("/sense-permis");
  if (!selectedBoard) {
    throw new Error("Aquest perfil encara no té cap taulell assignat.");
  }
  const [initialPosts, initialLearningTasks, initialCalendarEvents] = await Promise.all([
    listPosts(viewer, selectedBoard.groupId),
    listOwnLearningTasks(viewer, selectedBoard.groupId),
    listCalendarEvents(viewer, new Date(), new Date(Date.now() + 14 * 24 * 60 * 60_000)),
  ]);

  return (
    <BoardClient
      boards={boards}
      initialCalendarEvents={initialCalendarEvents}
      initialLearningTasks={initialLearningTasks}
      initialPosts={initialPosts}
      key={selectedBoard.boardId}
      selectedBoard={selectedBoard}
      viewer={viewer}
    />
  );
}
