import PortalShell from "@/app/components/portal-shell";
import ExternalIntegrationsClient from "@/app/integracions/external-integrations-client";
import IntegrationsClient from "@/app/integracions/integrations-client";
import { requireDemoPermission } from "@/lib/demo-auth";
import { getExternalIntegrationState } from "@/lib/external-integrations";
import { getGoogleIntegrationState } from "@/lib/google";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const viewer = await requireDemoPermission(PERMISSIONS.MANAGE_INTEGRATIONS);
  const [google, external] = await Promise.all([
    getGoogleIntegrationState(viewer),
    getExternalIntegrationState(viewer),
  ]);
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
          <h2>Google Classroom i Calendar</h2>
          <p>Importa grups, alumnat, tasques, notes i esdeveniments amb OAuth del centre.</p>
          <IntegrationsClient configured={google.configured} connected={googleConnected} />
        </article>

        <article className="portal-panel">
          <p className="panel-label">ESTAT</p>
          <h2>Google</h2>
          <span className={googleConnected ? "status-pill connected" : google.configured ? "status-pill pending" : "status-pill offline"}>
            {googleConnected ? "Connectat" : google.configured ? "Preparat per autoritzar" : "No configurat"}
          </span>
          <p>Autorització per centre amb els permisos mínims necessaris.</p>
        </article>

        <article className="portal-panel wide">
          <p className="panel-label">MOODLE</p>
          <h2>Serveis web de Moodle</h2>
          <p>Importa cursos, recursos i activitats amb els serveis web oficials del Moodle del centre.</p>
          <ExternalIntegrationsClient connected={external.MOODLE?.status === "CONNECTED"} initialBaseUrl={external.MOODLE?.baseUrl || ""} provider="MOODLE" />
        </article>

        <article className="portal-panel">
          <p className="panel-label">ESTAT</p>
          <h2>Moodle</h2>
          <span className={external.MOODLE?.status === "CONNECTED" ? "status-pill connected" : "status-pill offline"}>
            {external.MOODLE?.status === "CONNECTED" ? "Connectat" : "No connectat"}
          </span>
          <p>El token queda xifrat i mai es torna a mostrar.</p>
        </article>

        <article className="portal-panel wide">
          <p className="panel-label">IEDUCA</p>
          <h2>Connector estructurat iEduca</h2>
          <p>Connecta cursos, recursos i activitats amb les rutes d'API que faciliti iEduca per al centre.</p>
          <ExternalIntegrationsClient connected={external.IEDUCA?.status === "CONNECTED"} initialBaseUrl={external.IEDUCA?.baseUrl || ""} provider="IEDUCA" />
        </article>

        <article className="portal-panel">
          <p className="panel-label">ESTAT</p>
          <h2>iEduca</h2>
          <span className={external.IEDUCA?.status === "CONNECTED" ? "status-pill connected" : "status-pill offline"}>
            {external.IEDUCA?.status === "CONNECTED" ? "Connectat" : "No connectat"}
          </span>
          <p>Les rutes es configuren al servidor segons el contracte API facilitat al centre.</p>
        </article>

        <article className="portal-panel full">
          <p className="panel-label">SEGURETAT</p>
          <h2>Secrets fora del codi</h2>
          <p>Les claus i els tokens es xifren a la base de dades i es configuren amb variables protegides de Railway. Mai s'envien de tornada al navegador.</p>
        </article>
      </section>
    </PortalShell>
  );
}
