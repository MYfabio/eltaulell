"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  type PlatformSchool,
  type PlatformSchoolPlan,
  type PlatformSnapshot,
} from "@/lib/platform-admin-types";

async function responseMessage(response: Response) {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string" ? body.error : "No s'ha pogut completar l'acció.";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function SchoolRow({ school }: { school: PlatformSchool }) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlatformSchoolPlan>(school.plan);
  const [maxUsers, setMaxUsers] = useState(school.maxUsers);
  const [maxGroups, setMaxGroups] = useState(school.maxGroups);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPlan(school.plan);
    setMaxUsers(school.maxUsers);
    setMaxGroups(school.maxGroups);
  }, [school]);

  async function update(payload: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/platform/schools/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId: school.id, ...payload }),
    });
    if (!response.ok) {
      setMessage(await responseMessage(response));
      setBusy(false);
      return;
    }
    setMessage(successMessage);
    setBusy(false);
    router.refresh();
  }

  return (
    <article className={`platform-school-card ${school.active ? "" : "is-suspended"}`}>
      <header>
        <div className="platform-school-identity">
          <span>{school.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{school.name}</strong>
            <small>{school.slug}</small>
          </div>
        </div>
        <span className={`platform-status ${school.active ? "active" : "suspended"}`}>
          {school.active ? "Actiu" : "Suspès"}
        </span>
      </header>

      <div className="platform-school-facts">
        <p><span>Domini</span><strong>{school.emailDomain || "Pendent"}</strong></p>
        <p><span>Coordinació</span><strong>{school.coordinators[0]?.name || "Sense assignar"}</strong></p>
        <p><span>Persones</span><strong>{school.userCount} / {school.maxUsers}</strong></p>
        <p><span>Grups</span><strong>{school.groupCount} / {school.maxGroups}</strong></p>
      </div>

      <div className="platform-school-settings">
        <label>
          Pla
          <select disabled={busy} value={plan} onChange={(event) => setPlan(event.target.value as PlatformSchoolPlan)}>
            <option value="PILOT">Pilot</option>
            <option value="STANDARD">Estàndard</option>
          </select>
        </label>
        <label>
          Límit de persones
          <input disabled={busy} min="10" max="10000" type="number" value={maxUsers} onChange={(event) => setMaxUsers(Number(event.target.value))} />
        </label>
        <label>
          Límit de grups
          <input disabled={busy} min="1" max="1000" type="number" value={maxGroups} onChange={(event) => setMaxGroups(Number(event.target.value))} />
        </label>
      </div>

      <footer>
        <button
          disabled={busy}
          onClick={() => update({ plan, maxUsers, maxGroups }, "Configuració desada.")}
          type="button"
        >
          Desar configuració
        </button>
        <button
          className={school.active ? "danger-action" : "restore-action"}
          disabled={busy}
          onClick={() => update({ active: !school.active }, school.active ? "Centre suspès." : "Centre activat.")}
          type="button"
        >
          {school.active ? "Suspendre centre" : "Activar centre"}
        </button>
      </footer>
      {message && <p className="platform-inline-message" role="status">{message}</p>}
    </article>
  );
}

export default function PlatformAdministrationClient({ initialData }: { initialData: PlatformSnapshot }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [emailDomain, setEmailDomain] = useState("");
  const [plan, setPlan] = useState<PlatformSchoolPlan>("PILOT");
  const [maxUsers, setMaxUsers] = useState(500);
  const [maxGroups, setMaxGroups] = useState(30);
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const schools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return initialData.schools;
    return initialData.schools.filter((school) =>
      [school.name, school.slug, school.emailDomain || "", school.coordinators[0]?.email || ""]
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [initialData.schools, query]);

  function changeName(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function createSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/platform/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        emailDomain,
        plan,
        maxUsers,
        maxGroups,
        coordinatorName,
        coordinatorEmail,
      }),
    });
    if (!response.ok) {
      setMessage(await responseMessage(response));
      setBusy(false);
      return;
    }
    setName("");
    setSlug("");
    setSlugEdited(false);
    setEmailDomain("");
    setPlan("PILOT");
    setMaxUsers(500);
    setMaxGroups(30);
    setCoordinatorName("");
    setCoordinatorEmail("");
    setMessage("Centre creat i coordinació inicial assignada.");
    setBusy(false);
    setShowCreate(false);
    router.refresh();
  }

  return (
    <section className="platform-workspace">
      <div className="platform-toolbar">
        <div>
          <p>CENTRES REGISTRATS</p>
          <h2>Gestió del servei</h2>
        </div>
        <label className="platform-search">
          <span>Cercar</span>
          <input placeholder="Centre, domini o coordinació" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button className="platform-primary-action" onClick={() => setShowCreate((value) => !value)} type="button">
          {showCreate ? "Tancar formulari" : "+ Donar d'alta un centre"}
        </button>
      </div>

      {showCreate && (
        <form className="platform-create-form" onSubmit={createSchool}>
          <header>
            <div><span>NOU CENTRE</span><h3>Alta i coordinació inicial</h3></div>
            <p>El centre queda actiu, amb dades separades i sense cap grup creat.</p>
          </header>
          <div className="platform-form-grid">
            <label>Nom del centre<input required maxLength={120} value={name} onChange={(event) => changeName(event.target.value)} /></label>
            <label>Identificador web<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value.toLowerCase()); }} /></label>
            <label>Domini de correu<input placeholder="centre.cat" value={emailDomain} onChange={(event) => setEmailDomain(event.target.value)} /></label>
            <label>Pla<select value={plan} onChange={(event) => setPlan(event.target.value as PlatformSchoolPlan)}><option value="PILOT">Pilot</option><option value="STANDARD">Estàndard</option></select></label>
            <label>Límit de persones<input required min="10" max="10000" type="number" value={maxUsers} onChange={(event) => setMaxUsers(Number(event.target.value))} /></label>
            <label>Límit de grups<input required min="1" max="1000" type="number" value={maxGroups} onChange={(event) => setMaxGroups(Number(event.target.value))} /></label>
            <label>Nom de coordinació<input required maxLength={100} value={coordinatorName} onChange={(event) => setCoordinatorName(event.target.value)} /></label>
            <label>Correu de coordinació<input required type="email" value={coordinatorEmail} onChange={(event) => setCoordinatorEmail(event.target.value)} /></label>
          </div>
          <footer>
            <button disabled={busy} type="submit">{busy ? "Creant…" : "Crear centre"}</button>
            <span>La coordinació podrà gestionar persones i grups només dins d'aquest centre.</span>
          </footer>
          {message && <p className="platform-form-message" role="status">{message}</p>}
        </form>
      )}

      {!showCreate && message && <p className="platform-form-message" role="status">{message}</p>}

      <div className="platform-school-list">
        {schools.map((school) => <SchoolRow key={school.id} school={school} />)}
        {!schools.length && <p className="platform-empty">No hi ha centres que coincideixin amb la cerca.</p>}
      </div>

      <section className="platform-audit-panel">
        <header><div><p>REGISTRE GLOBAL</p><h2>Auditoria de plataforma</h2></div><span>{initialData.audit.length} accions recents</span></header>
        <div className="platform-audit-list">
          {initialData.audit.map((entry) => (
            <article key={entry.id}>
              <span>{entry.action === "SCHOOL_CREATED" ? "+" : "✓"}</span>
              <div><strong>{entry.schoolName || "Plataforma"}</strong><p>{entry.detail}</p></div>
              <small>{entry.actorName}<time>{new Date(entry.createdAt).toLocaleString("ca-ES")}</time></small>
            </article>
          ))}
          {!initialData.audit.length && <p className="platform-empty">Encara no hi ha accions d'administració.</p>}
        </div>
      </section>
    </section>
  );
}
