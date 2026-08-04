import Link from "next/link";
import PortalShell from "@/app/components/portal-shell";
import AdministrationClient from "@/app/coordinacio/administration-client";
import CoordinationOverview from "@/app/coordinacio/coordination-overview";
import { getAdminSnapshot } from "@/lib/admin";
import { requireDemoPermission } from "@/lib/demo-auth";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function CoordinationPage() {
  const viewer = await requireDemoPermission(PERMISSIONS.MANAGE_SCHOOL);
  const snapshot = await getAdminSnapshot(viewer);
  const activePeople = snapshot.people.filter((person) => person.status === "ACTIVE").length;
  const pendingPeople = snapshot.people.filter((person) => person.status === "INVITED").length;

  return (
    <PortalShell
      active="coordination"
      description="Gestiona les persones, els perfils i els grups del centre amb permisos verificats al servidor."
      eyebrow={`${snapshot.school.name.toUpperCase()} · CURS 2026-2027`}
      title="Coordinació del centre"
      viewer={viewer}
    >
      <section className="portal-grid">
        <article className="portal-panel">
          <p className="panel-label">PERSONES ACTIVES</p>
          <div className="metric">
            <strong>{activePeople}</strong>
            <span>{pendingPeople ? `${pendingPeople} pendents` : "Tothom al dia"}</span>
          </div>
          <p>Coordinació, tutories, delegats i alumnat registrats en aquest centre.</p>
        </article>

        <article className="portal-panel">
          <p className="panel-label">GRUPS</p>
          <div className="metric">
            <strong>{snapshot.groups.length}</strong>
            <span>Amb tauler propi</span>
          </div>
          <p>Cada grup manté les seves persones, el seu tauler i el seu calendari separats.</p>
        </article>

        <article className="portal-panel">
          <p className="panel-label">ÀMBIT D'ADMINISTRACIÓ</p>
          <div className="metric">
            <strong>1</strong>
            <span>{snapshot.school.name}</span>
          </div>
          <p>La coordinació només pot administrar les dades del centre on està assignada.</p>
        </article>

        <CoordinationOverview />

        <AdministrationClient initialData={snapshot} />

        <article className="portal-panel">
          <p className="panel-label">ACCIONS RÀPIDES</p>
          <h2>Altres espais</h2>
          <div className="action-list">
            <Link href="/tutoria">Revisar els grups</Link>
            <Link href="/integracions">Configurar integracions</Link>
            <Link href="/taulell">Obrir el tauler</Link>
          </div>
        </article>

        <article className="portal-panel wide">
          <p className="panel-label">SEGURETAT I ESCALABILITAT</p>
          <h2>Permisos vinculats al centre i al grup</h2>
          <div className="security-points">
            <p><strong>Centre</strong><span>Cap canvi pot afectar persones o grups d'un altre centre.</span></p>
            <p><strong>Grup</strong><span>Tutories, delegats i alumnat queden assignats al seu grup.</span></p>
            <p><strong>Auditoria</strong><span>Les altes i els canvis de perfil queden registrats.</span></p>
          </div>
        </article>
      </section>
    </PortalShell>
  );
}
