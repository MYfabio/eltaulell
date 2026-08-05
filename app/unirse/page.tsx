import Link from "next/link";
import JoinForm from "./join-form";
import { getDemoViewer } from "@/lib/demo-auth";
import { publicGroupInvite } from "@/lib/group-invites";

export const dynamic = "force-dynamic";

const unavailableMessages = {
  EXPIRED: "Aquesta invitació ha caducat. Demana'n una de nova a la tutora.",
  FULL: "Aquesta invitació ja ha arribat al límit d'accessos.",
  REVOKED: "Aquesta invitació ja no està activa.",
};

export default async function JoinGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const query = await searchParams;
  const inviteId = typeof query.invite === "string" ? query.invite : "";
  const [invite, viewer] = await Promise.all([
    inviteId ? publicGroupInvite(inviteId) : Promise.resolve(null),
    getDemoViewer(),
  ]);

  return (
    <main className="join-page">
      <Link className="join-brand" href="/"><span aria-hidden="true">T</span> EL TAULELL</Link>
      <section className="join-card">
        <p className="panel-label">INVITACIÓ DE GRUP</p>
        {!invite ? (
          <><h1>No trobem aquesta invitació</h1><p>Comprova que l&apos;enllaç sigui complet o demana&apos;n un de nou.</p></>
        ) : (
          <>
            <h1>Entra a {invite.groupName}</h1>
            <p className="join-school">{invite.schoolName}</p>
            {invite.status !== "ACTIVE" ? (
              <p className="join-unavailable">{unavailableMessages[invite.status]}</p>
            ) : !viewer ? (
              <div className="join-login">
                <p>Primer has d&apos;entrar amb el teu compte d&apos;alumne. Després torna a obrir aquest enllaç.</p>
                <Link href="/acces">Iniciar sessió</Link>
              </div>
            ) : viewer.role !== "STUDENT" ? (
              <p className="join-unavailable">Aquesta invitació només es pot acceptar amb un perfil d&apos;alumne.</p>
            ) : (
              <JoinForm inviteId={invite.id} />
            )}
          </>
        )}
      </section>
      <p className="join-security">L&apos;enllaç no és suficient: també cal el codi temporal que t&apos;ha donat la tutora.</p>
    </main>
  );
}
