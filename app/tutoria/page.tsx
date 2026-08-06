import Link from "next/link";
import PortalShell from "@/app/components/portal-shell";
import GroupOnboarding from "@/app/tutoria/group-onboarding";
import TutoringDashboard from "@/app/tutoria/tutoring-dashboard";
import { requireDemoPermission } from "@/lib/demo-auth";
import { inviteGroupsFor, listGroupInvites } from "@/lib/group-invites";
import { can, PERMISSIONS } from "@/lib/permissions";
import { getLearningDashboard } from "@/lib/learning";

export const dynamic = "force-dynamic";

export default async function TutoringPage() {
  const viewer = await requireDemoPermission(PERMISSIONS.VIEW_GROUP_DASHBOARD);
  const isDelegate = viewer.role === "DELEGATE";
  const canViewFollowup = can(viewer, PERMISSIONS.VIEW_STUDENT_FOLLOWUP);
  const canManageInvitations = can(viewer, PERMISSIONS.MANAGE_GROUP_INVITES);
  const [inviteGroups, invitations] = canManageInvitations
    ? await Promise.all([inviteGroupsFor(viewer), listGroupInvites(viewer)])
    : [[], []];
  const dashboard = canViewFollowup ? await getLearningDashboard(viewer) : null;
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <PortalShell
      active="tutoring"
      description={
        isDelegate
          ? "Representa el grup, prepara propostes i consulta les activitats compartides."
          : "Revisa l'evolució de les tasques, els resultats i el consum anònim de la Tutoria IA."
      }
      eyebrow={`${viewer.school.toUpperCase()} · ${viewer.groupName.toUpperCase()}`}
      title={isDelegate ? "Espai de delegació" : `Tutoria de ${viewer.groupName}`}
      viewer={viewer}
    >
      <section className="portal-grid">
        <article className="portal-panel">
          <p className="panel-label">ALUMNAT</p>
          <div className="metric"><strong>{dashboard?.students.length ?? 0}</strong><span>amb accés actiu</span></div>
          <p>Alumnat real assignat als grups d'aquesta tutoria.</p>
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

        {canManageInvitations && (
          <GroupOnboarding
            googleConfigured={googleConfigured}
            groups={inviteGroups}
            initialInvitations={invitations}
          />
        )}

        {dashboard ? (
          <TutoringDashboard dashboard={dashboard} />
        ) : (
          <article className="portal-panel full permission-summary">
            <p className="panel-label">VISTA DE DELEGACIÓ</p>
            <h2>Participació del grup</h2>
            <p>
              Pots veure les activitats i propostes compartides, però el seguiment
              individual i les notes queden reservats a tutoria. Les converses amb
              la IA són privades i només generen estadístiques anònimes del grup.
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
