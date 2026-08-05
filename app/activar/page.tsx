import Link from "next/link";
import { inspectAccountInvitation } from "@/lib/account-auth";

export const dynamic = "force-dynamic";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token || "";
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const invitation = await inspectAccountInvitation(token);

  return (
    <main className="activation-page">
      <Link className="portal-brand" href="/">
        <span>T</span><strong>El Taulell</strong>
      </Link>
      <section className="activation-card">
        {!invitation?.available ? (
          <>
            <p className="panel-label">INVITACIÓ NO DISPONIBLE</p>
            <h1>Aquest enllaç ha caducat o ja s&apos;ha utilitzat.</h1>
            <p>Demana a la coordinació del centre que generi un accés nou.</p>
            <Link className="button" href="/acces">Tornar a l&apos;accés</Link>
          </>
        ) : (
          <>
            <p className="panel-label">ACTIVACIÓ DEL COMPTE</p>
            <h1>Benvingut/da a {invitation.schoolName}</h1>
            <p>
              Activa el compte <strong>{invitation.email}</strong>. Després entraràs
              directament a l&apos;espai que correspon al teu perfil.
            </p>
            <form action="/api/auth/activate" method="post">
              <input name="token" type="hidden" value={token} />
              <label>
                Contrasenya
                <input autoComplete="new-password" minLength={12} name="password" required type="password" />
              </label>
              <label>
                Repeteix la contrasenya
                <input autoComplete="new-password" minLength={12} name="confirmation" required type="password" />
              </label>
              <small>Mínim 12 caràcters, amb lletres i almenys un número.</small>
              {error === "mismatch" && <p className="form-error">Les dues contrasenyes no coincideixen.</p>}
              {error === "password" && <p className="form-error">La contrasenya no compleix els requisits.</p>}
              {error === "expired" && <p className="form-error">La invitació ja no està disponible.</p>}
              <button type="submit">Activar i entrar</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
