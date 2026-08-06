import PortalShell from "@/app/components/portal-shell";
import { requireDemoPermission } from "@/lib/demo-auth";
import { PERMISSIONS } from "@/lib/permissions";
import IntegrationsClient from "@/app/integracions/integrations-client";
import { getGoogleIntegrationState } from "@/lib/google";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const viewer = await requireDemoPermission(PERMISSIONS.MANAGE_INTEGRATIONS);
  const google = await getGoogleIntegrationState(viewer);
  const googleConnected = google.classroom?.status === "CONNECTED";

  return (
    <PortalShell
      active="integrations"
      description="Cada centre administra les seves connexions sense compartir credencials ni dades amb altres centres."
      eyebrow={`${viewer.school.toUpperCase()} · CONFIGURACIÓ`}
      title="Integracions educatives"
      viewer={viewer}
    >
      <section className="portal-grid">
        <article className="portal-panel wide">
          <p className="panel-label">GOOGLE WORKSPACE</p>
          <h2>Google Classroom</h2>
          <p>
            Importarà cursos, tasques, materials i dates quan l’administrador
            del domini autoritzi l’aplicació a Google Cloud i Workspace.
          </p>
          <IntegrationsClient configured={google.configured} connected={googleConnected} />
        </article>

        <article className="portal-panel">
          <p className="panel-label">ESTAT</p>
          <h2>Classroom</h2>
          <span className={googleConnected ? "status-pill connected" : google.configured ? "status-pill pending" : "status-pill offline"}>
            {googleConnected ? "Connectat" : google.configured ? "Preparat per autoritzar" : "No connectat"}
          </span>
          <p>La connexió es farà per centre i amb els permisos mínims necessaris.</p>
        </article>

        <article className="portal-panel wide">
          <p className="panel-label">MOODLE</p>
          <h2>moodle.escolaindustrial.org</h2>
          <p>
            El servei encara no està actiu. Conservem només la URL base i no
            guardem enllaços temporals amb claus d’accés.
          </p>
          <div className="action-list">
            <button disabled type="button">Esperant activació de Moodle</button>
          </div>
        </article>

        <article className="portal-panel">
          <p className="panel-label">ESTAT</p>
          <h2>Moodle</h2>
          <span className="status-pill offline">Servei inactiu</span>
          <p>Quan estigui disponible, admetrà OAuth, LTI o serveis web.</p>
        </article>

        <article className="portal-panel full">
          <p className="panel-label">SEGURETAT</p>
          <h2>Secrets fora del codi</h2>
          <p>
            Les claus de Google i Moodle es configuraran com a variables
            protegides de Railway. Els tokens d’usuari s’emmagatzemaran xifrats
            i mai es mostraran al navegador.
          </p>
        </article>
      </section>
    </PortalShell>
  );
}
