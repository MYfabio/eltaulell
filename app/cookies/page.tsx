import Link from "next/link";

export const metadata = { title: "Galetes tècniques i de seguretat · El Taulell" };

export default function CookiesPage() {
  return (
    <main className="legal-page">
      <header>
        <Link className="portal-brand" href="/"><span>T</span><strong>El Taulell</strong></Link>
        <Link href="/acces">Accés</Link>
      </header>
      <article>
        <p className="panel-label">TRANSPARÈNCIA I SEGURETAT</p>
        <h1>Galetes tècniques i de seguretat</h1>
        <p className="legal-updated">Versió de 16 d&apos;agost de 2026</p>
        <section>
          <h2>1. Què utilitza El Taulell</h2>
          <p>
            Només fem servir galetes estrictament necessàries per autenticar
            persones usuàries, mantenir la sessió, evitar accessos indeguts i
            completar connexions OAuth autoritzades. No utilitzem galetes
            publicitàries, de perfilatge ni d&apos;analítica de tercers per defecte.
          </p>
        </section>
        <section>
          <h2>2. Galetes de sessió</h2>
          <p>
            <code>eltaulell_session</code> manté l&apos;accés al centre i
            <code> eltaulell_platform_session</code> protegeix l&apos;administració
            general. Caduquen amb la sessió autoritzada i es revoquen en sortir.
            Les versions de demostració utilitzen identificadors separats.
          </p>
        </section>
        <section>
          <h2>3. Connexions de Google</h2>
          <p>
            <code>eltaulell_google_oauth_state</code> és temporal i comprova que
            el retorn de Google Workspace correspon a una connexió iniciada des
            d&apos;El Taulell. Caduca al cap de deu minuts.
          </p>
        </section>
        <section>
          <h2>4. Proteccions aplicades</h2>
          <p>
            Les galetes d&apos;autenticació són <code>HttpOnly</code>, utilitzen
            <code> Secure</code> en producció, limiten l&apos;enviament entre llocs
            amb <code>SameSite</code>, tenen una ruta restringida quan correspon
            i reben prioritat alta al navegador.
          </p>
        </section>
        <section>
          <h2>5. Gestió</h2>
          <p>
            Com que són imprescindibles per prestar el servei i protegir el
            compte, no es poden desactivar des d&apos;El Taulell. Es poden eliminar
            des del navegador, però això tancarà la sessió o interromprà una
            connexió en curs. Consulta també la <Link href="/privacitat">política de privacitat</Link>.
          </p>
        </section>
      </article>
    </main>
  );
}
