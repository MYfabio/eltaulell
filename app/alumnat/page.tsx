import Link from "next/link";
import PortalShell from "@/app/components/portal-shell";
import { listAccessibleBoards } from "@/lib/access-control";
import { listCalendarEvents } from "@/lib/calendar";
import { requireDemoPermission } from "@/lib/demo-auth";
import { listOwnLearningTasks } from "@/lib/learning";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const viewer = await requireDemoPermission(PERMISSIONS.VIEW_OWN_SPACE);
  const boards = await listAccessibleBoards(viewer);
  const groupId = boards[0]?.groupId;
  const [tasks, events] = groupId
    ? await Promise.all([
        listOwnLearningTasks(viewer, groupId),
        listCalendarEvents(viewer, new Date(), new Date(Date.now() + 14 * 24 * 60 * 60_000)),
      ])
    : [[], []];
  const pending = tasks.filter((task) => task.status === "PENDING" || task.status === "IN_PROGRESS");
  const completed = tasks.filter((task) => task.status === "DELIVERED" || task.status === "GRADED");
  const dueSoon = pending.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < Date.now() + 48 * 60 * 60_000);
  const agenda = [
    ...events.map((event) => ({ id: `event-${event.id}`, at: event.startsAt, title: event.title, source: event.source.replaceAll("_", " "), status: "Agenda" })),
    ...pending.filter((task) => task.dueAt).map((task) => ({ id: `task-${task.id}`, at: task.dueAt!, title: task.title, source: task.classroomLinked ? "Classroom" : "El Taulell", status: task.status === "PENDING" ? "Pendent" : "En curs" })),
  ].sort((left, right) => left.at.localeCompare(right.at)).slice(0, 8);

  return (
    <PortalShell
      active="student"
      description="Tasques, activitats, materials i avisos importants del teu grup."
      eyebrow={`${viewer.school.toUpperCase()} · ${viewer.groupName.toUpperCase()}`}
      title={`Hola, ${viewer.firstName}`}
      viewer={viewer}
    >
      <section className="portal-grid">
        <article className="portal-panel"><p className="panel-label">TASQUES PENDENTS</p><div className="metric"><strong>{pending.length}</strong><span>{dueSoon.length} en les pròximes 48 h</span></div><p>Informació desada al teu perfil i sincronitzada amb les plataformes connectades.</p></article>
        <article className="portal-panel"><p className="panel-label">COMPLETADES</p><div className="metric"><strong>{completed.length}</strong><span>lliurades o qualificades</span></div><p>{tasks.length ? `${Math.round((completed.length / tasks.length) * 100)}% del total de tasques.` : "Encara no hi ha tasques assignades."}</p></article>
        <article className="portal-panel"><p className="panel-label">CONSULTES</p><div className="metric"><strong>100%</strong><span>anònimes</span></div><p>La consulta no desa el teu identificador d'usuari ni el teu nom.</p><div className="action-list"><Link href="/consultes">Demanar ajuda</Link></div></article>

        <article className="portal-panel wide"><p className="panel-label">PRÒXIMS ELEMENTS</p><h2>La teva agenda</h2>{agenda.length > 0 && <table className="portal-table"><thead><tr><th>Data</th><th>Activitat</th><th>Origen</th><th>Estat</th></tr></thead><tbody>{agenda.map((item) => <tr key={item.id}><td>{new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.at))}</td><td><strong>{item.title}</strong></td><td>{item.source}</td><td><span className="status-pill pending">{item.status}</span></td></tr>)}</tbody></table>}</article>

        <article className="portal-panel"><p className="panel-label">ASSISTENT</p><h2>Aprendre amb pistes</h2><p>L'assistent t'ajuda a entendre el primer pas, però no entrega la resposta ni resol l'activitat per tu.</p><div className="action-list"><Link href="/taulell">Preguntar al Taulell</Link></div></article>
      </section>
    </PortalShell>
  );
}
