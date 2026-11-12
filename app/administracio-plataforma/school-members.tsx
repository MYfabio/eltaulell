"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "COORDINATOR" | "TUTOR" | "DELEGATE" | "STUDENT";
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  groups: string[];
  isMe: boolean;
};
type Group = { id: string; name: string; academicYear: string };

const ROLE_LABEL: Record<Member["role"], string> = {
  COORDINATOR: "Coordinació",
  TUTOR: "Tutoria",
  DELEGATE: "Delegació",
  STUDENT: "Alumnat",
};
const STATUS_LABEL: Record<Member["status"], string> = {
  INVITED: "Convidada",
  ACTIVE: "Activa",
  SUSPENDED: "Suspesa",
};

async function errorOf(response: Response) {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string" ? body.error : "No s'ha pogut completar l'acció.";
}

/** Persones d'un centre: alta prèvia, suspendre o reactivar i esborrar. Només administració de plataforma. */
export default function SchoolMembers({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [activationLink, setActivationLink] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("TUTOR");
  const [groupId, setGroupId] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/platform/members?schoolId=${encodeURIComponent(schoolId)}`, { cache: "no-store" });
    if (!response.ok) {
      setMessage(await errorOf(response));
      setMembers([]);
      return;
    }
    const body = await response.json() as { members: Member[]; groups: Group[] };
    setMembers(body.members);
    setGroups(body.groups);
  }, [schoolId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setActivationLink("");
    const response = await fetch("/api/platform/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, name, email, role, groupId: role === "COORDINATOR" ? null : groupId || null }),
    });
    setBusy(false);
    if (!response.ok) return setMessage(await errorOf(response));
    const body = await response.json() as { activationPath: string };
    setActivationLink(new URL(body.activationPath, window.location.origin).toString());
    setMessage(`Alta desada. ${email} rebrà la invitació; també pots enviar-li l'enllaç d'activació.`);
    setName("");
    setEmail("");
    await load();
  }

  async function change(member: Member, mode: "suspendre" | "reactivar" | "esborrar") {
    if (mode === "esborrar" && !window.confirm(
      `Esborrar ${member.name} (${member.email}) de ${schoolName}?\n\n`
      + "Se'n van la seva pertinença, els seus grups, les seves sessions i, si és alumnat, les seves tasques. "
      + "Si no és de cap altre centre, també el compte. Els missatges i enquestes que va publicar es queden al tauler sense autor. "
      + "No es pot desfer. Si només vols que no entri, suspèn-la.",
    )) return;
    setBusy(true);
    setMessage("");
    setActivationLink("");
    const response = await fetch("/api/platform/members", {
      method: mode === "esborrar" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId: member.id, mode, confirm: mode === "esborrar" ? true : undefined }),
    });
    setBusy(false);
    if (!response.ok) return setMessage(await errorOf(response));
    setMessage(mode === "esborrar" ? `${member.email} esborrada.` : mode === "suspendre" ? `${member.email} suspesa.` : `${member.email} reactivada.`);
    await load();
  }

  return (
    <section className="platform-members" aria-label={`Persones de ${schoolName}`}>
      <form className="platform-members-new" onSubmit={create}>
        <strong>Donar d'alta una persona</strong>
        <p>Queda convidada al centre amb el seu perfil i grup; activa el compte amb l'enllaç. Si el correu ja existeix, no es toca.</p>
        <div className="platform-form-grid">
          <label>Nom<input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Correu<input required type="email" maxLength={160} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Perfil
            <select value={role} onChange={(event) => setRole(event.target.value as Member["role"])}>
              {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Grup
            <select disabled={role === "COORDINATOR"} value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">{role === "COORDINATOR" ? "No cal" : "Tria un grup"}</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.academicYear}</option>)}
            </select>
          </label>
        </div>
        <button disabled={busy} type="submit">{busy ? "Desant…" : "Donar d'alta"}</button>
      </form>

      {message && <p className="platform-inline-message" role="status">{message}</p>}
      {activationLink && (
        <div className="activation-link-result">
          <input aria-label="Enllaç d'activació" readOnly value={activationLink} />
          <button onClick={() => navigator.clipboard.writeText(activationLink)} type="button">Copiar enllaç</button>
        </div>
      )}

      {members === null ? <p className="platform-empty">Carregant persones…</p> : (
        <ul className="platform-members-list">
          {members.map((member) => (
            <li key={member.id} className={member.status === "SUSPENDED" ? "is-suspended" : ""}>
              <div>
                <strong>{member.name}</strong>
                <small>{member.email} · {ROLE_LABEL[member.role]}{member.groups.length ? ` · ${member.groups.join(", ")}` : ""}</small>
              </div>
              <span className={`platform-status ${member.status === "SUSPENDED" ? "suspended" : "active"}`}>{STATUS_LABEL[member.status]}</span>
              {!member.isMe && (
                <div className="platform-members-actions">
                  {member.status === "SUSPENDED"
                    ? <button disabled={busy} onClick={() => change(member, "reactivar")} type="button">Reactivar</button>
                    : <button disabled={busy} onClick={() => change(member, "suspendre")} type="button">Suspendre</button>}
                  <button className="danger-action" disabled={busy} onClick={() => change(member, "esborrar")} type="button">Esborrar</button>
                </div>
              )}
            </li>
          ))}
          {!members.length && <li><small>Encara no hi ha ningú en aquest centre.</small></li>}
        </ul>
      )}
    </section>
  );
}
