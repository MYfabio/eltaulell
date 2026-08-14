import { notFound, redirect } from "next/navigation";
import BoardClient from "@/app/taulell/board-client";
import { listBoardChoices, listPosts } from "@/lib/board-store";
import { listCalendarEvents } from "@/lib/calendar";
import { getDemoViewer, isDemoAccessEnabled } from "@/lib/demo-auth";
import { listOwnLearningTasks } from "@/lib/learning";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  if (!isDemoAccessEnabled()) notFound();

  const viewer = await getDemoViewer();
  if (!viewer) redirect("/api/auth/demo?returnTo=/demo");
  if (viewer.role !== "STUDENT") redirect("/taulell");

  const boards = await listBoardChoices(viewer);
  const selectedBoard = boards[0];
  if (!selectedBoard) throw new Error("La demo encara no té cap taulell assignat.");

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
