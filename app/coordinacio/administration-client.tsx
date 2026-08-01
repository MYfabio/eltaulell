"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ROLE_LABELS,
  STATUS_LABELS,
  type AdminGroup,
  type AdminMembershipStatus,
  type AdminPerson,
  type AdminSnapshot,
} from "@/lib/admin-types";
import { PERMISSION_LABELS, type AppRole } from "@/lib/permissions";

const ROLES = Object.keys(ROLE_LABELS) as AppRole[];
const STATUSES = Object.keys(STATUS_LABELS) as AdminMembershipStatus[];

async function responseMessage(response: Response) {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string" ? body.error : "No s'ha pogut completar l'acció.";
}

function PersonRow({ person, groups }: { person: AdminPerson; groups: AdminGroup[] }) {
  const router = useRouter();
  const [role, setRole] = useState(person.role);
  const [status, setStatus] = useState(person.status);
  const [groupId, setGroupId] = useState(person.groups[0]?.id || groups[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRole(person.role);
    setStatus(person.status);
    setGroupId(person.groups[0]?.id || groups[0]?.id || "");
  }, [person, groups]);

  async function save() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/users/${encodeURIComponent(person.membershipId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, status, groupId: role === "COORDINATOR" ? null : groupId }),
    });
    if (!response.ok) {
      setMessage(await responseMessage(response));
      setBusy(false);
      return;
    }
    setMessage("Canvis desats.");
    setBusy(false);
    router.refresh();
  }

  return (
    <tr>
      <td>
        <strong>{person.name}</strong>
        <br />
        <small>{person.email}</small>
      </td>
      <td>
        <select aria-label={`Perfil de ${person.name}`} value={role} onChange={(event) => setRole(event.target.value as AppRole)}>
          {ROLES.map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}
        </select>
      </td>
      <td>
        <select
          aria-label={`Grup de ${person.name}`}
          disabled={role === "COORDINATOR"}
          value={role === "COORDINATOR" ? "" : groupId}
          onChange={(event) => setGroupId(event.target.value)}
        >
          {role === "COORDINATOR" && <option value="">Tots els grups</option>}
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </td>
      <td>
        <select aria-label={`Estat de ${person.name}`} value={status} onChange={(event) => setStatus(event.target.value as AdminMembershipStatus)}>
          {STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
        </select>
      </td>
      <td>
        <div className="permission-chips compact-chips">
          {person.permissions.slice(0, 2).map((permission) => (
            <span key={permission}>{PERMISSION_LABELS[permission]}</span>
          ))}
          <span>+{Math.max(person.permissions.length - 2, 0)}</span>
        </div>
      </td>
      <td className="admin-row-action">
        <button disabled={busy} onClick={save} type="button">{busy ? "Desant…" : "Desar"}</button>
        {message && <small className={message === "Canvis desats." ? "form-success" : "form-error"}>{message}</small>}
      </td>
    </tr>
  );
}

function PersonForm({ groups }: { groups: AdminGroup[] }) {
  const router = useRouter();
  const [role, setRole] = useState<AppRole>("TUTOR");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setMessage("");
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        role,
        status: form.get("status"),
        groupId: role === "COORDINATOR" ? null : form.get("groupId"),
      }),
    });
    if (!response.ok) {
      setMessage(await responseMessage(response));
      setBusy(false);
      return;
    }
    formElement.reset();
    setRole("TUTOR");
    setMessage("Persona afegida correctament.");
    setBusy(false);
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label>Nom complet<input name="name" placeholder="Nom i cognoms" required /></label>
      <label>Correu electrònic<input name="email" placeholder="persona@centre.cat" required type="email" /></label>
      <div className="form-row">
        <label>Perfil
          <select name="role" value={role} onChange={(event) => setRole(event.target.value as AppRole)}>
            {ROLES.map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}
          </select>
        </label>
        <label>Estat inicial
          <select defaultValue="ACTIVE" name="status">
            <option value="ACTIVE">Actiu/iva</option>
            <option value="INVITED">Convidat/ada</option>
          </select>
        </label>
      </div>
      <label>Grup
        <select disabled={role === "COORDINATOR"} name="groupId" required={role !== "COORDINATOR"}>
          {role === "COORDINATOR" && <option value="">Tots els grups</option>}
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </label>
      <button className="admin-submit" disabled={busy || (role !== "COORDINATOR" && !groups.length)} type="submit">
        {busy ? "Afegint…" : "Afegir persona"}
      </button>
      {message && <p className={message.includes("correctament") ? "form-success" : "form-error"}>{message}</p>}
    </form>
  );
}

function GroupForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setMessage("");
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        stage: form.get("stage"),
        section: form.get("section"),
        academicYear: form.get("academicYear"),
      }),
    });
    if (!response.ok) {
      setMessage(await responseMessage(response));
      setBusy(false);
      return;
    }
    formElement.reset();
    setMessage("Grup creat correctament.");
    setBusy(false);
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label>Nom del grup<input name="name" placeholder="4t A" required /></label>
      <label>Etapa o nivell<input name="stage" placeholder="4t ESO" required /></label>
      <div className="form-row">
        <label>Secció<input name="section" placeholder="A" /></label>
        <label>Curs acadèmic<input defaultValue="2026-2027" name="academicYear" pattern="\d{4}-\d{4}" required /></label>
      </div>
      <button className="admin-submit" disabled={busy} type="submit">{busy ? "Creant…" : "Crear grup i tauler"}</button>
      {message && <p className={message.includes("correctament") ? "form-success" : "form-error"}>{message}</p>}
    </form>
  );
}

export default function AdministrationClient({ initialData }: { initialData: AdminSnapshot }) {
  return (
    <>
      <article className="portal-panel full">
        <p className="panel-label">PERSONES I PERMISOS</p>
        <h2>Gestiona els accessos del centre</h2>
        <p>Canvia el perfil, el grup o l'estat de cada persona. Els permisos s'apliquen automàticament segons el perfil.</p>
        <div className="table-scroll">
          <table className="portal-table admin-table">
            <thead><tr><th>Persona</th><th>Perfil</th><th>Grup</th><th>Estat</th><th>Permisos</th><th>Acció</th></tr></thead>
            <tbody>
              {initialData.people.map((person) => <PersonRow groups={initialData.groups} key={person.membershipId} person={person} />)}
            </tbody>
          </table>
        </div>
      </article>

      <article className="portal-panel wide">
        <p className="panel-label">NOVA PERSONA</p>
        <h2>Afegir un usuari al centre</h2>
        <p>El correu és únic i l'assignació queda limitada a aquest centre.</p>
        <PersonForm groups={initialData.groups} />
      </article>

      <article className="portal-panel">
        <p className="panel-label">NOU GRUP</p>
        <h2>Crear classe</h2>
        <p>En crear el grup també es prepara automàticament el seu tauler.</p>
        <GroupForm />
      </article>

      <article className="portal-panel full">
        <p className="panel-label">REGISTRE D'ACTIVITAT</p>
        <h2>Últims canvis administratius</h2>
        {initialData.audit.length ? (
          <ul className="audit-list">
            {initialData.audit.map((entry) => (
              <li key={entry.id}>
                <span><strong>{entry.detail}</strong><small>Fet per {entry.actorName}</small></span>
                <time dateTime={entry.createdAt}>{new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}</time>
              </li>
            ))}
          </ul>
        ) : <p>Encara no hi ha canvis administratius registrats.</p>}
      </article>
    </>
  );
}
