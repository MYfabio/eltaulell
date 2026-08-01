import Link from "next/link";
import { DEMO_VIEWERS, getDemoViewer } from "@/lib/demo-auth";
import { PERMISSION_LABELS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const roleDescriptions = {
  COORDINATOR: "Gestiona centres, persones, grups, permisos i integracions.",
  TUTOR: "Modera el tauler, acompanya el grup i publica avisos i tasques.",
  DELEGATE: "Representa el grup, proposa activitats i crea consultes.",
  STUDENT: "Consulta el tauler, les tasques i participa de manera segura.",
};

export default async function AccessPage() {
  const currentViewer = await getDemoViewer();

  return (
    <main className="access-page">
      <header className="access-header">
        <Link className="portal-brand" href="/">
          <span>T</span>
          <strong>El Taulell</strong>
        </Link>
        <span>Accés multi-centre</span>
      </header>

      <section className="access-hero">
        <p>VERSIÓ FUNCIONAL · MODE DEMOSTRACIÓ</p>
        <h1>Entra amb un perfil i comprova els permisos.</h1>
        <span>
          Aquests usuaris serveixen per validar els fluxos. L’accés real amb
          Google Workspace s’activarà quan el centre autoritzi l’aplicació.
        </span>
        {currentViewer && (
          <div className="current-session">
            Sessió activa com a <strong>{currentViewer.name}</strong>.
            <Link href="/taulell">Continuar</Link>
          </div>
        )}
      </section>

      <section className="role-grid" aria-label="Perfils de demostració">
        {DEMO_VIEWERS.map((viewer) => (
          <article className={`role-card role-${viewer.role.toLowerCase()}`} key={viewer.id}>
            <div className="role-avatar">{viewer.initials}</div>
            <span>{viewer.roleLabel}</span>
            <h2>{viewer.name}</h2>
            <p>{roleDescriptions[viewer.role]}</p>
            <div className="role-permissions" aria-label={`Permisos de ${viewer.roleLabel}`}>
              {viewer.permissions.slice(0, 3).map((permission) => (
                <span key={permission}>{PERMISSION_LABELS[permission]}</span>
              ))}
            </div>
            <small>{viewer.email}</small>
            <form action="/api/auth/demo" method="post">
              <input name="userId" type="hidden" value={viewer.id} />
              <button type="submit">Entrar com a {viewer.roleLabel.toLowerCase()}</button>
            </form>
          </article>
        ))}
      </section>

      <section className="real-access-card">
        <div>
          <span>ACCÉS REAL</span>
          <h2>Google Workspace for Education</h2>
          <p>
            L’estructura està preparada. Falta crear i autoritzar el client
            OAuth del centre abans d’activar aquest botó.
          </p>
        </div>
        <button disabled type="button">Pendent d’autorització</button>
      </section>
    </main>
  );
}
