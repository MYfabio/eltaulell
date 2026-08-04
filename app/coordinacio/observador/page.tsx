import Link from "next/link";
import PortalShell from "@/app/components/portal-shell";
import {
  aiHistoryForStudent,
  studentById,
  tasksForStudent,
  type TaskStatus,
} from "@/lib/demo-insights";
import { requireDemoPermission } from "@/lib/demo-auth";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pendent",
  IN_PROGRESS: "En curs",
  DELIVERED: "Lliurada",
  GRADED: "Qualificada",
};

export default async function ObserverPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string | string[] }>;
}) {
  const viewer = await requireDemoPermission(PERMISSIONS.MANAGE_SCHOOL);
  const params = await searchParams;
  const requestedStudent = Array.isArray(params.student) ? params.student[0] : params.student;
  const student = studentById(requestedStudent);
  const tasks = tasksForStudent(student.id);
  const aiHistory = aiHistoryForStudent(student.id);

  return (
    <PortalShell
      active="coordination"
      description={`Consulta el progrés de ${student.name} sense modificar el seu espai ni actuar en nom seu.`}
      eyebrow={`${student.stage.toUpperCase()} · ${student.group.toUpperCase()} · MODE OBSERVADOR`}
      title={`Taulell de ${student.name}`}
      viewer={viewer}
    >
      <section className="portal-grid observer-page-grid">
        <article className="portal-panel full observer-toolbar">
          <div>
            <span className="observer-badge">Només lectura</span>
            <strong>Cap acció d'aquesta pantalla modifica el taulell de l'alumne.</strong>
          </div>
          <Link href="/coordinacio">← Tornar a tots els taulers</Link>
        </article>

        <article className="portal-panel">
          <p className="panel-label">ÚLTIMA CONNEXIÓ</p>
          <div className="metric"><strong>{student.lastActive}</strong></div>
          <p>Activitat registrada dins l'espai educatiu del centre.</p>
        </article>
        <article className="portal-panel">
          <p className="panel-label">PROGRÉS DE TASQUES</p>
          <div className="metric">
            <strong>{student.progressPercent}%</strong>
            <span>{student.inProgressTasks} en curs</span>
          </div>
          <p>{student.deliveredTasks} lliurades i {student.gradedTasks} qualificades.</p>
        </article>
        <article className="portal-panel">
          <p className="panel-label">ATENCIÓ</p>
          <div className="metric">
            <strong>{student.overdueTasks}</strong>
            <span className={student.overdueTasks ? "warning-copy" : ""}>endarrerides</span>
          </div>
          <p>{student.blocked ? "Hi ha un possible bloqueig detectat per la tutoria IA." : "Sense bloquejos detectats."}</p>
        </article>

        <article className="portal-panel full">
          <header className="section-heading-row compact-heading">
            <div>
              <p className="panel-label">ORGANITZACIÓ PERSONAL</p>
              <h2>Estat de les tasques</h2>
            </div>
            <small>La sincronització amb Classroom encara és una simulació local.</small>
          </header>
          <div className="observer-task-board">
            {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => (
              <section key={status}>
                <h3>{STATUS_LABELS[status]}</h3>
                {tasks.filter((task) => task.status === status).map((task) => (
                  <article className={task.overdue ? "observer-task overdue" : "observer-task"} key={task.id}>
                    <span>{task.subject}</span>
                    <strong>{task.title}</strong>
                    <small>{task.dueLabel}</small>
                    {task.classroomLinked && <em>Classroom</em>}
                    {typeof task.grade === "number" && <b>{task.grade.toFixed(1)}</b>}
                  </article>
                ))}
                {!tasks.some((task) => task.status === status) && <p>Cap tasca.</p>}
              </section>
            ))}
          </div>
        </article>

        <article className="portal-panel wide">
          <p className="panel-label">TUTORIA IA · RESUM DE PRIVACITAT</p>
          <h2>Tipus d'interacció</h2>
          <p>
            Coordinació veu indicadors i matèries, però el contingut complet de les
            converses queda reservat a la tutoria del grup.
          </p>
          <ul className="observer-ai-summary">
            {aiHistory.length ? aiHistory.map((exchange) => (
              <li key={exchange.id}>
                <span><strong>{exchange.subject}</strong><small>{exchange.task}</small></span>
                <span>{exchange.attemptsOnTask} peticions d'ajuda</span>
                <em className={exchange.blocked ? "blocked" : ""}>
                  {exchange.blocked ? "Possible bloqueig" : "Seguiment normal"}
                </em>
              </li>
            )) : <li>Encara no hi ha interaccions registrades.</li>}
          </ul>
        </article>

        <article className="portal-panel">
          <p className="panel-label">CONTEXT ACADÈMIC</p>
          <h2>{student.group}</h2>
          <div className="student-context-list">
            <p><span>Etapa</span><strong>{student.stage}</strong></p>
            <p><span>Tutoria</span><strong>{student.tutor}</strong></p>
            <p><span>Mitjana</span><strong>{student.averageGrade.toFixed(1)}</strong></p>
            <p><span>Interaccions IA</span><strong>{student.aiInteractions}</strong></p>
          </div>
        </article>
      </section>
    </PortalShell>
  );
}
