import PortalShell from "@/app/components/portal-shell";
import { requireDemoPermission } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const students = [
  ["Marc Costa", "Alumne", "Al dia"],
  ["Laia Canals", "Delegada", "Al dia"],
  ["Aina Vidal", "Alumna", "1 tasca pendent"],
  ["Pau Serra", "Alumne", "Al dia"],
  ["Júlia Mas", "Alumna", "Revisar consulta"],
];

export default async function TutoringPage() {
  const viewer = await requireDemoPermission(PERMISSIONS.VIEW_GROUP_DASHBOARD);
  const isDelegate = viewer.role === "DELEGATE";
  const canViewFollowup = can(viewer, PERMISSIONS.VIEW_STUDENT_FOLLOWUP);
  const canViewAnonymousInbox = can(viewer, PERMISSIONS.VIEW_ANONYMOUS_INBOX);

  return (
    <PortalShell
      active="tutoring"
      description={
        isDelegate
          ? "Representa el grup, prepara propostes i consulta les activitats compartides."
          : "Acompanya el grup, modera el tauler i revisa les necessitats de l’alumnat."
      }
      eyebrow={`${viewer.school.toUpperCase()} · ${viewer.groupName.toUpperCase()}`}
      title={isDelegate ? "Espai de delegació" : "Tutoria de 3r B"}
      viewer={viewer}
    >
      <section className="portal-grid">
        <article className="portal-panel">
          <p className="panel-label">ALUMNAT</p>
          <div className="metric">
            <strong>28</strong>
            <span>96% actiu</span>
          </div>
          <p>26 alumnes han consultat el tauler aquesta setmana.</p>
        </article>

        {canViewAnonymousInbox ? (
          <article className="portal-panel">
            <p className="panel-label">CONSULTES</p>
            <div className="metric">
              <strong>3</strong>
              <span>Pendents de revisió</span>
            </div>
            <p>Només tutoria i coordinació poden revisar aquesta bústia.</p>
          </article>
        ) : (
          <article className="portal-panel">
            <p className="panel-label">PROPOSTES DEL GRUP</p>
            <div className="metric">
              <strong>4</strong>
              <span>Obertes</span>
            </div>
            <p>La delegació pot preparar activitats sense veure dades sensibles.</p>
          </article>
        )}

        <article className="portal-panel">
          <p className="panel-label">PROPERA TUTORIA</p>
          <div className="metric">
            <strong>12:30</strong>
            <span>Avui</span>
          </div>
          <p>Aula 3.12 · Dinàmica de grup i preparació de la sortida.</p>
        </article>

        {canViewFollowup ? (
          <article className="portal-panel wide">
            <p className="panel-label">GRUP 3r B · ACCÉS RESTRINGIT</p>
            <h2>Seguiment de persones</h2>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Funció</th>
                  <th>Seguiment</th>
                </tr>
              </thead>
              <tbody>
                {students.map(([name, role, status]) => (
                  <tr key={name}>
                    <td><strong>{name}</strong></td>
                    <td>{role}</td>
                    <td>
                      <span className={status === "Al dia" ? "status-pill" : "status-pill pending"}>
                        {status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ) : (
          <article className="portal-panel wide permission-summary">
            <p className="panel-label">VISTA DE DELEGACIÓ</p>
            <h2>Participació del grup</h2>
            <p>
              Pots veure les activitats i propostes compartides, però el seguiment
              individual i les consultes anònimes queden reservats a tutoria.
            </p>
            <div className="permission-chips">
              <span>Activitats del grup</span>
              <span>Consultes col·lectives</span>
              <span>Calendari compartit</span>
            </div>
          </article>
        )}

        <article className="portal-panel">
          <p className="panel-label">PERMISOS DEL PERFIL</p>
          <h2>{viewer.roleLabel}</h2>
          <div className="action-list">
            {can(viewer, PERMISSIONS.CREATE_ACTIVITY) && (
              <a href="/taulell">Publicar activitat</a>
            )}
            {can(viewer, PERMISSIONS.MODERATE_BOARD) && (
              <a href="/taulell">Moderar el tauler</a>
            )}
            {can(viewer, PERMISSIONS.CREATE_POLL) && (
              <a href="/taulell">Crear consulta de grup</a>
            )}
          </div>
        </article>
      </section>
    </PortalShell>
  );
}
