import Link from "next/link";
import {
  DEMO_VIEWERS,
  getDemoViewer,
  getPlatformDemoViewer,
  isDemoAccessEnabled,
  isPlatformDemoEnabled,
  PLATFORM_DEMO_ADMIN,
} from "@/lib/demo-auth";
import { isCentreAdminLoginConfigured } from "@/lib/centre-admin-auth";
import {
  PERMISSION_LABELS,
  PERMISSIONS,
  type AppRole,
  type Permission,
} from "@/lib/permissions";

export const dynamic = "force-dynamic";

const roleDescriptions = {
  COORDINATOR: "Gestiona persones, grups, permisos i integracions del seu centre.",
  TUTOR: "Modera el taulell, acompanya el grup i publica avisos i tasques.",
  DELEGATE: "Representa el grup, proposa activitats i crea consultes.",
  STUDENT: "Consulta el taulell, les tasques i participa de manera segura.",
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

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    accountError?: string | string[];
  }>;
}) {
  const currentViewer = await getDemoViewer();
  const currentPlatformViewer = await getPlatformDemoViewer();
  const demoAccessEnabled = isDemoAccessEnabled();
  const platformAdminEnabled = isPlatformDemoEnabled();
  const centreAdminEnabled = isCentreAdminLoginConfigured();
  const params = await searchParams;
  const loginError = Array.isArray(params.error) ? params.error[0] : params.error;
  const accountError = Array.isArray(params.accountError)
    ? params.accountError[0]
    : params.accountError;

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
        <p>{demoAccessEnabled ? "ENTORN LOCAL · DEMOSTRACIÓ" : "ACCÉS SEGUR"}</p>
        <h1>{demoAccessEnabled ? "Prova els perfils d'El Taulell." : "Entra al taulell del teu centre."}</h1>
        <span>
          {demoAccessEnabled
            ? "Els perfils de prova permeten validar els permisos sense utilitzar dades reals."
            : "Cada persona accedeix únicament al centre, el grup i les funcions que té assignats."}
        </span>
        {currentViewer && (
          <div className="current-session">
            Sessió activa com a <strong>{currentViewer.name}</strong>.
            <Link href={currentViewer.role === "COORDINATOR" ? "/coordinacio" : "/taulell"}>
              Continuar
            </Link>
          </div>
        )}
        {currentPlatformViewer && (
          <div className="current-session platform-session">
            Sessió activa com a <strong>{currentPlatformViewer.name}</strong>.
            <Link href="/administracio-plataforma">Continuar</Link>
          </div>
        )}
      </section>

      <section className="account-access-card">
        <div>
          <span>PERSONES DEL CENTRE</span>
          <h2>Accés al teu taulell</h2>
          <p>
            Entra amb el correu i la contrasenya que vas crear des de la invitació
            del centre.
          </p>
        </div>
        <form action="/api/auth/account" method="post">
          <label>
            Correu electrònic
            <input autoComplete="username" name="email" required type="email" />
          </label>
          <label>
            Contrasenya
            <input autoComplete="current-password" name="password" required type="password" />
          </label>
          {accountError === "centre" && (
            <label>
              Codi del centre
              <input name="schoolSlug" placeholder="nom-del-centre" required />
            </label>
          )}
          {accountError === "invalid" && (
            <p className="centre-admin-login-error" role="alert">
              El correu o la contrasenya no són correctes.
            </p>
          )}
          {accountError === "inactive" && (
            <p className="centre-admin-login-error" role="alert">
              El compte no té cap accés actiu. Contacta amb la coordinació.
            </p>
          )}
          {accountError === "locked" && (
            <p className="centre-admin-login-error" role="alert">
              Massa intents. Torna-ho a provar d'aquí a quinze minuts.
            </p>
          )}
          {accountError === "centre" && (
            <p className="centre-admin-login-error" role="alert">
              Aquest compte pertany a més d'un centre. Indica quin vols obrir.
            </p>
          )}
          <button type="submit">Entrar</button>
        </form>
      </section>

      {platformAdminEnabled && (
        <section className="platform-access-card">
          <div className="platform-access-avatar">{PLATFORM_DEMO_ADMIN.initials}</div>
          <div>
            <span>ADMINISTRACIÓ GENERAL · NOMÉS LOCAL</span>
            <h2>Gestiona els centres de la plataforma</h2>
            <p>
              Crea centres, assigna la primera coordinació, defineix límits i
              suspèn l'accés al servei sense entrar als taulells del centre.
            </p>
          </div>
          <form action="/api/auth/platform-demo" method="post">
            <button type="submit">Entrar a l'administració general</button>
          </form>
        </section>
      )}

      {centreAdminEnabled && (
        <section className="centre-admin-access-card">
          <div>
            <span>RESPONSABLE DEL CENTRE</span>
            <h2>Administració inicial del centre</h2>
            <p>
              Accés de coordinació per preparar els grups, convidar les persones
              i configurar el centre.
            </p>
          </div>
          <form action="/api/auth/centre-admin" method="post">
            <label>
              Correu electrònic
              <input autoComplete="username" name="email" required type="email" />
            </label>
            <label>
              Contrasenya
              <input autoComplete="current-password" minLength={8} name="password" required type="password" />
            </label>
            {loginError === "invalid" && (
              <p className="centre-admin-login-error" role="alert">
                El correu o la contrasenya no són correctes.
              </p>
            )}
            {loginError === "locked" && (
              <p className="centre-admin-login-error" role="alert">
                Massa intents. Torna-ho a provar d'aquí a quinze minuts.
              </p>
            )}
            <button type="submit">Entrar a l'administració del centre</button>
          </form>
        </section>
      )}

      {demoAccessEnabled && (
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
      )}

      <section className="real-access-card">
        <div>
          <span>PROPERA INTEGRACIÓ</span>
          <h2>Google Workspace for Education</h2>
          <p>
            Aquest accés amb correu i contrasenya permet fer el pilot. La connexió
            institucional amb Google s'activarà quan el centre autoritzi OAuth.
          </p>
        </div>
        <button disabled type="button">Autorització pendent</button>
      </section>
    </main>
  );
}
