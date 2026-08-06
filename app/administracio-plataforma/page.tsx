import Link from "next/link";
import PlatformAdministrationClient from "@/app/administracio-plataforma/platform-administration-client";
import { requirePlatformViewer } from "@/lib/platform-auth";
import { getPlatformSnapshot } from "@/lib/platform-admin";

export const dynamic = "force-dynamic";

export default async function PlatformAdministrationPage() {
  const viewer = await requirePlatformViewer();
  const snapshot = await getPlatformSnapshot(viewer);
  const activeSchools = snapshot.schools.filter((school) => school.active).length;
  const totalUsers = snapshot.schools.reduce((total, school) => total + school.userCount, 0);
  const totalGroups = snapshot.schools.reduce((total, school) => total + school.groupCount, 0);

  return (
    <main className="platform-page">
      <header className="platform-topbar">
        <Link className="portal-brand" href="/administracio-plataforma">
          <span>T</span>
          <strong>El Taulell</strong>
        </Link>
        <div className="platform-scope">
          <strong>Administració de plataforma</strong>
          <span>Tots els centres</span>
        </div>
        <div className="portal-user">
          <span>{viewer.initials}</span>
          <div>
            <strong>{viewer.name}</strong>
            <small>{viewer.roleLabel}</small>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit">Sortir</button>
          </form>
        </div>
      </header>

      <section className="platform-heading">
        <div>
          <p>CONTROL MULTI-CENTRE · ACCÉS PROTEGIT</p>
          <h1>Centres educatius</h1>
          <span>
            Dona d'alta centres, assigna la coordinació inicial i controla l'estat,
            el pla i els límits sense entrar a les dades pedagògiques de cada centre.
          </span>
        </div>
        <aside>
          <strong>Separació de responsabilitats</strong>
          <span>
            L'administració de plataforma gestiona el servei. La coordinació gestiona
            les persones, els grups i els taulells del seu centre.
          </span>
        </aside>
      </section>

      <section className="platform-metrics" aria-label="Resum de la plataforma">
        <article><span>Centres actius</span><strong>{activeSchools}</strong><small>de {snapshot.schools.length}</small></article>
        <article><span>Persones registrades</span><strong>{totalUsers}</strong><small>tots els centres</small></article>
        <article><span>Grups creats</span><strong>{totalGroups}</strong><small>amb dades separades</small></article>
      </section>

      <PlatformAdministrationClient initialData={snapshot} />
    </main>
  );
}
