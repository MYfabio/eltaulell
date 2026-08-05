"use client";

import { useMemo, useState } from "react";
import type { GroupInviteSummary, InviteGroup } from "@/lib/group-invites";

type Props = {
  groups: InviteGroup[];
  initialInvitations: GroupInviteSummary[];
  googleConfigured: boolean;
};

const statusLabels: Record<GroupInviteSummary["status"], string> = {
  ACTIVE: "Activa",
  EXPIRED: "Caducada",
  FULL: "Límit assolit",
  REVOKED: "Revocada",
};

export default function GroupOnboarding({ groups, initialInvitations, googleConfigured }: Props) {
  const [groupId, setGroupId] = useState(groups[0]?.groupId || "");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState(30);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [created, setCreated] = useState<{ invite: GroupInviteSummary; code: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  const activeInvitations = useMemo(
    () => invitations.filter((invitation) => invitation.status === "ACTIVE"),
    [invitations],
  );

  function invitePath(inviteId: string) {
    return `/unirse?invite=${encodeURIComponent(inviteId)}`;
  }

  function absoluteInviteLink(inviteId: string) {
    if (typeof window === "undefined") return invitePath(inviteId);
    return `${window.location.origin}${invitePath(inviteId)}`;
  }

  async function copyValue(kind: "link" | "code", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setMessage("No s'ha pogut copiar automàticament. Selecciona i copia el text.");
    }
  }

  async function createInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupId) return;
    setBusy(true);
    setMessage("");
    setCreated(null);
    try {
      const response = await fetch("/api/tutoria/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId, expiresInDays, maxUses }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No s'ha pogut crear la invitació.");
      setCreated(payload);
      setInvitations((current) => [payload.invite, ...current]);
      setMessage("Invitació creada. El codi només es mostra ara.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No s'ha pogut crear la invitació.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvitation(inviteId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/tutoria/invitations?inviteId=${encodeURIComponent(inviteId)}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No s'ha pogut revocar la invitació.");
      setInvitations((current) => current.map((invitation) => (
        invitation.id === inviteId ? { ...invitation, status: "REVOKED" } : invitation
      )));
      if (created?.invite.id === inviteId) setCreated(null);
      setMessage("Invitació revocada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No s'ha pogut revocar la invitació.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="portal-panel full group-onboarding">
      <header className="section-heading-row">
        <div>
          <p className="panel-label">INCORPORACIÓ D&apos;ALUMNAT</p>
          <h2>Afegeix una classe sense altes una per una</h2>
          <p>Tria Classroom o comparteix un enllaç i un codi temporal del Taulell.</p>
        </div>
        <span className="onboarding-count">{activeInvitations.length} invitacions actives</span>
      </header>

      <div className="onboarding-methods">
        <section className="onboarding-card classroom-onboarding">
          <div className="onboarding-card-heading">
            <span className="method-icon" aria-hidden="true">C</span>
            <div><small>OPCIÓ 1</small><h3>Grup de Google Classroom</h3></div>
          </div>
          <p>
            La tutora autoritza Google, tria una classe, revisa l&apos;alumnat detectat i
            confirma quines persones s&apos;incorporen al grup del Taulell.
          </p>
          <ol className="onboarding-steps">
            <li>Connectar el compte docent</li>
            <li>Triar curs i revisar la llista</li>
            <li>Confirmar les incorporacions</li>
          </ol>
          <div className="integration-state">
            <strong>{googleConfigured ? "Credencials Google preparades" : "Connexió Google pendent"}</strong>
            <span>
              {googleConfigured
                ? "Falta completar l'autorització OAuth de Classroom abans d'importar dades reals."
                : "Cal configurar les credencials OAuth del centre. Encara no s'importa cap dada."}
            </span>
          </div>
          <button className="secondary-action" disabled type="button">Autorització OAuth pendent</button>
        </section>

        <section className="onboarding-card invite-onboarding">
          <div className="onboarding-card-heading">
            <span className="method-icon" aria-hidden="true">+</span>
            <div><small>OPCIÓ 2 · DISPONIBLE</small><h3>Enllaç i codi del Taulell</h3></div>
          </div>
          <p>Comparteix-los amb la classe. Només funcionen fins a la data i el límit que decideixis.</p>
          {groups.length ? (
            <form className="invite-form" onSubmit={createInvitation}>
              <label>
                Grup
                <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                  {groups.map((group) => <option key={group.groupId} value={group.groupId}>{group.groupName}</option>)}
                </select>
              </label>
              <label>
                Caduca en
                <select value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value))}>
                  <option value={1}>1 dia</option>
                  <option value={3}>3 dies</option>
                  <option value={7}>7 dies</option>
                  <option value={14}>14 dies</option>
                  <option value={30}>30 dies</option>
                </select>
              </label>
              <label>
                Màxim d&apos;accessos
                <input
                  max={100}
                  min={1}
                  onChange={(event) => setMaxUses(Number(event.target.value))}
                  type="number"
                  value={maxUses}
                />
              </label>
              <button disabled={busy} type="submit">{busy ? "Creant…" : "Crear invitació"}</button>
            </form>
          ) : <p className="empty-onboarding">No tens cap grup assignat per convidar alumnat.</p>}
        </section>
      </div>

      {created && (
        <section className="generated-invite" aria-live="polite">
          <header><div><small>INVITACIÓ NOVA · {created.invite.groupName}</small><h3>Comparteix aquestes dues dades</h3></div><span>Es mostra una sola vegada</span></header>
          <div className="generated-values">
            <div><span>Enllaç</span><strong>{invitePath(created.invite.id)}</strong><button onClick={() => copyValue("link", absoluteInviteLink(created.invite.id))} type="button">{copied === "link" ? "Copiat" : "Copiar enllaç"}</button></div>
            <div><span>Codi d&apos;accés</span><strong className="invite-code">{created.code}</strong><button onClick={() => copyValue("code", created.code)} type="button">{copied === "code" ? "Copiat" : "Copiar codi"}</button></div>
          </div>
        </section>
      )}

      {message && <p className="onboarding-message" role="status">{message}</p>}

      {invitations.length > 0 && (
        <section className="invitation-history">
          <h3>Invitacions creades</h3>
          <div className="invitation-list">
            {invitations.map((invitation) => (
              <article key={invitation.id}>
                <div>
                  <strong>{invitation.groupName}</strong>
                  <span>Caduca {new Date(invitation.expiresAt).toLocaleDateString("ca-ES")} · {invitation.useCount}/{invitation.maxUses} accessos</span>
                </div>
                <span className={`invite-status ${invitation.status.toLowerCase()}`}>{statusLabels[invitation.status]}</span>
                {invitation.status === "ACTIVE" && (
                  <button disabled={busy} onClick={() => revokeInvitation(invitation.id)} type="button">Revocar</button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
