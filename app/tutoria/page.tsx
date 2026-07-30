import PortalShell from "@/app/components/portal-shell";
import { requireDemoViewer } from "@/lib/demo-auth";

export const dynamic = "force-dynamic";

const students = [
  ["Marc Costa", "Alumne", "Al dia"],
  ["Laia Canals", "Delegada", "Al dia"],
  ["Aina Vidal", "Alumna", "1 tasca pendent"],
  ["Pau Serra", "Alumne", "Al dia"],
  ["Júlia Mas", "Alumna", "Revisar consulta"],
];

export default async function TutoringPage() {
  const viewer = await requireDemoViewer(["COORDINATOR", "TUTOR", "DELEGATE"]);
  const isDelegate = viewer.role === "DELEGATE";

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

        <article className="portal-panel">
          <p className="panel-label">CONSULTES</p>
          <div className="metric">
            <strong>3</strong>
            <span>Pendents de revisió</span>
          </div>
          <p>Les identitats es mantenen ocultes davant del grup.</p>
        </article>

        <article className="portal-panel">
          <p className="panel-label">PROPERA TUTORIA</p>
          <div className="metric">
            <strong>12:30</strong>
            <span>Avui</span>
          </div>
          <p>Aula 3.12 · Dinàmica de grup i preparació de la sortida.</p>
        </article>

        <article className="portal-panel wide">
          <p className="panel-label">GRUP 3r B</p>
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

        <article className="portal-panel">
          <p className="panel-label">PERMISOS DEL PERFIL</p>
          <h2>{viewer.roleLabel}</h2>
          <div className="action-list">
            <button type="button">Publicar activitat</button>
            {!isDelegate && <button type="button">Moderar el tauler</button>}
            <button type="button">Crear consulta anònima</button>
          </div>
        </article>
      </section>
    </PortalShell>
  );
}
