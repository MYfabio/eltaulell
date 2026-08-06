import Link from "next/link";
import {
  getDemoViewer,
  isDemoAccessEnabled,
  isPlatformDemoEnabled,
  PLATFORM_DEMO_ADMIN,
} from "@/lib/demo-auth";
import { isCentreAdminLoginConfigured } from "@/lib/centre-admin-auth";
import { getPlatformViewer, isPlatformAdminConfigured } from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    accountError?: string | string[];
    platformError?: string | string[];
  }>;
}) {
  const currentViewer = await getDemoViewer();
  const currentPlatformViewer = await getPlatformViewer();
  const demoAccessEnabled = isDemoAccessEnabled();
  const platformAdminEnabled = isPlatformDemoEnabled();
  const platformAdminConfigured = isPlatformAdminConfigured();
  const centreAdminEnabled = isCentreAdminLoginConfigured();
  const params = await searchParams;
  const loginError = Array.isArray(params.error) ? params.error[0] : params.error;
  const accountError = Array.isArray(params.accountError)
    ? params.accountError[0]
    : params.accountError;
  const platformError = Array.isArray(params.platformError)
    ? params.platformError[0]
    : params.platformError;

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
        <p>ACCÉS SEGUR</p>
        <h1>Entra al taulell del teu centre.</h1>
        <span>
          Cada persona accedeix únicament al centre, el grup i les funcions que té assignats.
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

      {demoAccessEnabled && (
        <section className="demo-entry-card">
          <div>
            <span>ENTORN DE PROVA</span>
            <h2>Vols veure com funciona El Taulell?</h2>
            <p>
              Entra directament al taulell d'un alumne i descobreix què pot fer
              cada rol. Les dades de prova estan separades dels centres reals.
            </p>
          </div>
          <Link className="demo-entry-button" href="/demo">
            Provar la demo
          </Link>
        </section>
      )}

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

      {platformAdminConfigured && (
        <section className="platform-access-card">
          <div className="platform-access-avatar">SA</div>
          <div>
            <span>SUPERADMIN · AUTENTICACIÓ REFORÇADA</span>
            <h2>Administració general de la plataforma</h2>
            <p>Accés protegit amb contrasenya, codi temporal TOTP, bloqueig d'intents i sessió revocable.</p>
          </div>
          <form action="/api/auth/platform" method="post">
            <label>Correu electrònic<input autoComplete="username" name="email" required type="email" /></label>
            <label>Contrasenya<input autoComplete="current-password" name="password" required type="password" /></label>
            <label>Codi de 6 dígits<input autoComplete="one-time-code" inputMode="numeric" maxLength={6} name="totp" pattern="[0-9]{6}" required /></label>
            {platformError && (
              <p className="centre-admin-login-error" role="alert">
                {platformError === "locked"
                  ? "Accés bloquejat temporalment per massa intents."
                  : platformError === "ip"
                    ? "Aquesta xarxa no està autoritzada."
                    : platformError === "config"
                      ? "La compte SuperAdmin encara no està configurada."
                      : "Credencials o codi temporal incorrectes."}
              </p>
            )}
            <button type="submit">Entrar com a SuperAdmin</button>
          </form>
        </section>
      )}

      {platformAdminEnabled && !platformAdminConfigured && (
        <section className="platform-access-card">
          <div className="platform-access-avatar">{PLATFORM_DEMO_ADMIN.initials}</div>
          <div>
            <span>ADMINISTRACIÓ GENERAL · DEMO LOCAL</span>
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
