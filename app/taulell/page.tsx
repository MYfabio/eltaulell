import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/app/components/portal-shell";
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
    const isCoordinator = viewer.role === "COORDINATOR";

    return (
      <PortalShell
        active="board"
        description="El taulell apareixerà automàticament quan el centre tingui el primer grup preparat."
        eyebrow={`${viewer.school.toUpperCase()} · CURS 2026-2027`}
        title="Encara no hi ha cap taulell."
        viewer={viewer}
      >
        <section className="portal-grid">
          <article className="portal-panel full">
            <p className="panel-label">PRIMERA CONFIGURACIÓ</p>
            <h2>{isCoordinator ? "Crea el primer grup del centre" : "Encara no tens cap grup assignat"}</h2>
            <p>
              {isCoordinator
                ? "Quan creïs una classe, també es crearà el seu taulell i ja hi podràs incorporar tutors, delegats i alumnes."
                : "La coordinació del centre t'assignarà un grup. Quan estigui preparat, el veuràs aquí sense haver de fer res més."}
            </p>
            <div className="action-list">
              <Link href={isCoordinator ? "/coordinacio" : "/acces"}>
                {isCoordinator ? "Anar a crear el primer grup" : "Tornar a l'accés"}
              </Link>
            </div>
          </article>
        </section>
      </PortalShell>
    );
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
