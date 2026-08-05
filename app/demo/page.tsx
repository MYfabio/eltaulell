import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_VIEWERS, isDemoAccessEnabled } from "@/lib/demo-auth";
import {
  PERMISSION_LABELS,
  PERMISSIONS,
  type AppRole,
  type Permission,
} from "@/lib/permissions";

export const dynamic = "force-dynamic";

const roleDescriptions: Record<AppRole, string> = {
  COORDINATOR: "Gestiona persones, grups, permisos i integracions del centre de prova.",
  TUTOR: "Modera el taulell, acompanya el grup i publica avisos i tasques.",
  DELEGATE: "Representa el grup, proposa activitats i crea consultes.",
  STUDENT: "Consulta el taulell, organitza les tasques i utilitza l'assistent.",
};

const featuredPermissions: Record<AppRole, Permission[]> = {
  COORDINATOR: [
    PERMISSIONS.MANAGE_SCHOOL,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_GROUPS,
  ],
  TUTOR: [
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.MODERATE_BOARD,
    PERMISSIONS.VIEW_STUDENT_FOLLOWUP,
  ],
  DELEGATE: [
    PERMISSIONS.ARRANGE_BOARD,
    PERMISSIONS.CREATE_ACTIVITY,
    PERMISSIONS.CREATE_POLL,
  ],
  STUDENT: [
    PERMISSIONS.ARRANGE_BOARD,
    PERMISSIONS.VOTE_POLL,
    PERMISSIONS.USE_ASSISTANT,
  ],
};

export default function DemoAccessPage() {
  if (!isDemoAccessEnabled()) notFound();

  return (
    <main className="access-page demo-access-page">
      <header className="access-header">
        <Link className="portal-brand" href="/">
          <span>T</span>
          <strong>El Taulell</strong>
        </Link>
        <Link className="demo-back-link" href="/acces">
          Tornar a l'accés real
        </Link>
      </header>

      <section className="access-hero">
        <p>ENTORN DE PROVA · DADES SEPARADES</p>
        <h1>Tria un perfil i prova El Taulell.</h1>
        <span>
          Explora els permisos de cada rol sense utilitzar dades personals ni
          afectar cap centre real.
        </span>
      </section>

      <section className="role-grid" aria-label="Perfils de demostració">
        {DEMO_VIEWERS.map((viewer) => (
          <article className={`role-card role-${viewer.role.toLowerCase()}`} key={viewer.id}>
            <div className="role-avatar">{viewer.initials}</div>
            <span>{viewer.roleLabel}</span>
            <h2>{viewer.name}</h2>
            <p>{roleDescriptions[viewer.role]}</p>
            <div className="role-permissions" aria-label={`Permisos de ${viewer.roleLabel}`}>
              {featuredPermissions[viewer.role].map((permission) => (
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
    </main>
  );
}
