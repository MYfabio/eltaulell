import Link from "next/link";
import PortalShell from "@/app/components/portal-shell";
import TutoringDashboard from "@/app/tutoria/tutoring-dashboard";
import { requireDemoPermission } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function TutoringPage() {
  const viewer = await requireDemoPermission(PERMISSIONS.VIEW_GROUP_DASHBOARD);
  const isDelegate = viewer.role === "DELEGATE";
  const canViewFollowup = can(viewer, PERMISSIONS.VIEW_STUDENT_FOLLOWUP);

  return (
    <PortalShell
      active="tutoring"
      description={
        isDelegate
          ? "Representa el grup, prepara propostes i consulta les activitats compartides."
          : "Revisa l'evolució de les tasques, els resultats i els possibles bloquejos del grup."
      }
      eyebrow={`${viewer.school.toUpperCase()} · ${viewer.groupName.toUpperCase()}`}
      title={isDelegate ? "Espai de delegació" : `Tutoria de ${viewer.groupName}`}
      viewer={viewer}
    >
      <section className="portal-grid">
        <article className="portal-panel">
          <p className="panel-label">ALUMNAT</p>
          <div className="metric"><strong>28</strong><span>96% actiu</span></div>
          <p>26 alumnes han consultat el taulell aquesta setmana.</p>
        </article>

        <article className="portal-panel">
          <p className="panel-label">PROPERA TUTORIA</p>
          <div className="metric"><strong>12:30</strong><span>Avui</span></div>
          <p>Aula 3.12 · Dinàmica de grup i preparació de la sortida.</p>
        </article>

        <article className="portal-panel">
          <p className="panel-label">PERMISOS DEL PERFIL</p>
          <h2>{viewer.roleLabel}</h2>
          <div className="action-list">
            {can(viewer, PERMISSIONS.CREATE_ACTIVITY) && <Link href="/taulell">Publicar activitat</Link>}
            {can(viewer, PERMISSIONS.MODERATE_BOARD) && <Link href="/taulell">Moderar el tauler</Link>}
            {can(viewer, PERMISSIONS.CREATE_POLL) && <Link href="/taulell">Crear consulta de grup</Link>}
          </div>
        </article>

        {canViewFollowup ? (
          <TutoringDashboard />
        ) : (
          <article className="portal-panel full permission-summary">
            <p className="panel-label">VISTA DE DELEGACIÓ</p>
            <h2>Participació del grup</h2>
            <p>
              Pots veure les activitats i propostes compartides, però el seguiment
              individual, les notes i l'historial de la IA queden reservats a tutoria.
            </p>
            <div className="permission-chips">
              <span>Activitats del grup</span>
              <span>Consultes col·lectives</span>
              <span>Calendari compartit</span>
            </div>
          </article>
        )}
      </section>
    </PortalShell>
  );
}
