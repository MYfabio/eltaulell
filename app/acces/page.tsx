import Link from "next/link";
import { isCentreAdminLoginConfigured } from "@/lib/centre-admin-auth";
import {
  getDemoViewer,
  isPlatformDemoEnabled,
  PLATFORM_DEMO_ADMIN,
} from "@/lib/demo-auth";
import { getPlatformViewer, isPlatformAdminConfigured } from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

type AccessParams = {
  error?: string | string[];
  accountError?: string | string[];
  platformError?: string | string[];
  reset?: string | string[];
  administracio?: string | string[];
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccessPage({ searchParams }: { searchParams: Promise<AccessParams> }) {
  const [currentViewer, currentPlatformViewer, params] = await Promise.all([
    getDemoViewer(),
    getPlatformViewer(),
    searchParams,
  ]);
  const platformAdminEnabled = isPlatformDemoEnabled();
  const platformAdminConfigured = isPlatformAdminConfigured();
  const centreAdminEnabled = isCentreAdminLoginConfigured();
  const accountError = first(params.accountError);
  const platformError = first(params.platformError);
  const loginError = first(params.error);
  const requestedAdmin = first(params.administracio);
  const adminMode = requestedAdmin === "plataforma" || requestedAdmin === "centre"
    ? requestedAdmin
    : null;

  return (
    <main className="access-page access-page-simple">
      <header className="access-header">
        <Link className="portal-brand" href="/">
          <span>T</span>
          <strong>El Taulell</strong>
        </Link>
        <Link className="demo-back-link" href="/demo">Veure el taulell d&apos;alumne</Link>
      </header>

      <section className="access-simple-intro">
        <div>
          <p>ACCÉS AL CENTRE</p>
          <h1>Entra a El Taulell.</h1>
          <span>Obriràs directament l&apos;espai corresponent al teu perfil.</span>
        </div>
        {currentViewer && (
          <div className="current-session">
            Sessió activa com a <strong>{currentViewer.name}</strong>.
            <Link href={currentViewer.role === "COORDINATOR" ? "/coordinacio" : "/taulell"}>Continuar</Link>
          </div>
        )}
        {currentPlatformViewer && (
          <div className="current-session platform-session">
            Sessió activa com a <strong>{currentPlatformViewer.name}</strong>.
            <Link href="/administracio-plataforma">Continuar</Link>
          </div>
        )}
      </section>

      {!adminMode && (
        <section className="account-access-card account-access-card-simple">
          <div>
            <h2>Correu i contrasenya</h2>
            <p>Coordinació, tutoria, delegació i alumnat entren des del mateix lloc.</p>
          </div>
          <form action="/api/auth/account" method="post">
            {first(params.reset) === "success" && (
              <p className="current-session" role="status">Contrasenya actualitzada. Ja pots iniciar sessió.</p>
            )}
            <label>Correu electrònic<input autoComplete="username" name="email" required type="email" /></label>
            <label>Contrasenya<input autoComplete="current-password" name="password" required type="password" /></label>
            {accountError === "centre" && (
              <label>Codi del centre<input name="schoolSlug" placeholder="nom-del-centre" required /></label>
            )}
            {accountError && (
              <p className="centre-admin-login-error" role="alert">
                {accountError === "locked"
                  ? "Massa intents. Torna-ho a provar d'aquí a quinze minuts."
                  : accountError === "inactive"
                    ? "El compte no té cap accés actiu. Contacta amb la coordinació."
                    : accountError === "centre"
                      ? "Indica el codi del centre que vols obrir."
                      : "El correu o la contrasenya no són correctes."}
              </p>
            )}
            <button type="submit">Entrar</button>
            <Link href="/recuperar-contrasenya">He oblidat la contrasenya</Link>
          </form>
        </section>
      )}

      {adminMode === "plataforma" && platformAdminConfigured && (
        <section className="platform-access-card">
          <div className="platform-access-avatar">SA</div>
          <div><span>SUPERADMIN · AUTENTICACIÓ REFORÇADA</span><h2>Administració general</h2></div>
          <form action="/api/auth/platform" method="post">
            <label>Correu electrònic<input autoComplete="username" name="email" required type="email" /></label>
            <label>Contrasenya<input autoComplete="current-password" name="password" required type="password" /></label>
            <label>Codi de 6 dígits<input autoComplete="one-time-code" inputMode="numeric" maxLength={6} name="totp" pattern="[0-9]{6}" required /></label>
            {platformError && <p className="centre-admin-login-error" role="alert">Accés no autoritzat o bloquejat temporalment.</p>}
            <button type="submit">Entrar com a SuperAdmin</button>
          </form>
        </section>
      )}

      {adminMode === "plataforma" && platformAdminEnabled && !platformAdminConfigured && (
        <section className="platform-access-card">
          <div className="platform-access-avatar">{PLATFORM_DEMO_ADMIN.initials}</div>
          <div><span>ADMINISTRACIÓ GENERAL · DEMO LOCAL</span><h2>Gestiona els centres</h2></div>
          <form action="/api/auth/platform-demo" method="post">
            <button type="submit">Entrar a l&apos;administració general</button>
          </form>
        </section>
      )}

      {adminMode === "centre" && centreAdminEnabled && (
        <section className="centre-admin-access-card">
          <div><span>RESPONSABLE DEL CENTRE</span><h2>Administració inicial</h2></div>
          <form action="/api/auth/centre-admin" method="post">
            <label>Correu electrònic<input autoComplete="username" name="email" required type="email" /></label>
            <label>Contrasenya<input autoComplete="current-password" minLength={8} name="password" required type="password" /></label>
            {loginError && <p className="centre-admin-login-error" role="alert">El correu o la contrasenya no són correctes.</p>}
            <button type="submit">Entrar a l&apos;administració del centre</button>
          </form>
        </section>
      )}

      <footer className="access-simple-footer">
        {adminMode ? <Link href="/acces">Accés del centre</Link> : <Link href="/demo">Demo d&apos;alumne</Link>}
        {(platformAdminConfigured || platformAdminEnabled) && <Link href="/acces?administracio=plataforma">Administració</Link>}
        {centreAdminEnabled && <Link href="/acces?administracio=centre">Alta inicial</Link>}
        <Link href="/privacitat">Privacitat</Link>
        <Link href="/cookies">Galetes</Link>
        <Link href="/termes">Termes</Link>
      </footer>
    </main>
  );
}
