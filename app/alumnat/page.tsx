import PortalShell from "@/app/components/portal-shell";
import { requireDemoPermission } from "@/lib/demo-auth";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const viewer = await requireDemoPermission(PERMISSIONS.VIEW_OWN_SPACE);

  return (
    <PortalShell
      active="student"
      description="Tasques, activitats, materials i avisos importants del teu grup."
      eyebrow={`${viewer.school.toUpperCase()} · ${viewer.groupName.toUpperCase()}`}
      title={`Hola, ${viewer.firstName}`}
      viewer={viewer}
    >
      <section className="portal-grid">
        <article className="portal-panel">
          <p className="panel-label">TASQUES PENDENTS</p>
          <div className="metric">
            <strong>2</strong>
            <span>1 per demà</span>
          </div>
          <p>Matemàtiques i projecte d’Història.</p>
        </article>

        <article className="portal-panel">
          <p className="panel-label">ACTIVITATS</p>
          <div className="metric">
            <strong>1</strong>
            <span>Inscripció oberta</span>
          </div>
          <p>Torneig de futbol sala organitzat per la delegada.</p>
        </article>

        <article className="portal-panel">
          <p className="panel-label">CONSULTES</p>
          <div className="metric">
            <strong>100%</strong>
            <span>Anònimes</span>
          </div>
          <p>Pots demanar ajuda sense mostrar la identitat davant del grup.</p>
        </article>

        <article className="portal-panel wide">
          <p className="panel-label">AQUESTA SETMANA</p>
          <h2>La teva agenda</h2>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Dia</th>
                <th>Activitat</th>
                <th>Origen</th>
                <th>Estat</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Demà</td>
                <td><strong>Exercicis de funcions</strong></td>
                <td>Classroom</td>
                <td><span className="status-pill pending">Pendent</span></td>
              </tr>
              <tr>
                <td>Divendres</td>
                <td><strong>Autorització del museu</strong></td>
                <td>Tutoria</td>
                <td><span className="status-pill">Preparada</span></td>
              </tr>
              <tr>
                <td>Dilluns</td>
                <td><strong>Projecte d’Història</strong></td>
                <td>Moodle</td>
                <td><span className="status-pill offline">Moodle inactiu</span></td>
              </tr>
            </tbody>
          </table>
        </article>

        <article className="portal-panel">
          <p className="panel-label">ASSISTENT</p>
          <h2>Aprendre amb pistes</h2>
          <p>
            L’assistent t’ajuda a entendre el primer pas, però no entrega la
            resposta ni resol l’activitat per tu.
          </p>
          <div className="action-list">
            <a href="/taulell">Preguntar al Taulell</a>
          </div>
        </article>
      </section>
    </PortalShell>
  );
}
