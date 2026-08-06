"use client";

import { FormEvent, useEffect, useState } from "react";

type QueryItem = {
  id: string;
  reference: string;
  groupId: string;
  groupName: string;
  subject: string;
  status: "OPEN" | "ASSIGNED" | "CLOSED";
  assignedRole: "TUTOR" | "COORDINATOR" | null;
  createdAt: string;
  messages: Array<{ id: string; author: string; body: string; createdAt: string }>;
};

type StoredAccess = { id: string; reference: string; token: string };

export default function QueriesClient({
  groups,
  initialQueries,
  staff,
}: {
  groups: Array<{ groupId: string; groupName: string }>;
  initialQueries: QueryItem[];
  staff: boolean;
}) {
  const [queries, setQueries] = useState(initialQueries);
  const [groupId, setGroupId] = useState(groups[0]?.groupId || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (staff) return;
    const stored = JSON.parse(window.localStorage.getItem("eltaulell-anonymous-queries") || "[]") as StoredAccess[];
    void Promise.all(stored.map(async (access) => {
      const response = await fetch(`/api/anonymous-queries?reference=${encodeURIComponent(access.reference)}&token=${encodeURIComponent(access.token)}`);
      const body = await response.json().catch(() => null) as { query?: QueryItem } | null;
      return body?.query || null;
    })).then((items) => setQueries(items.filter((item): item is QueryItem => Boolean(item))));
  }, [staff]);

  async function submitQuery(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/anonymous-queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, subject, message }),
    });
    const body = await response.json().catch(() => null) as
      | { query?: QueryItem; accessToken?: string; error?: string }
      | null;
    if (!response.ok || !body?.query || !body.accessToken) {
      setNotice(body?.error || "No s'ha pogut enviar.");
      return;
    }
    const stored = JSON.parse(window.localStorage.getItem("eltaulell-anonymous-queries") || "[]") as StoredAccess[];
    stored.unshift({ id: body.query.id, reference: body.query.reference, token: body.accessToken });
    window.localStorage.setItem("eltaulell-anonymous-queries", JSON.stringify(stored.slice(0, 20)));
    setQueries((current) => [body.query!, ...current]);
    setSubject("");
    setMessage("");
    setNotice(`Consulta enviada. Guarda la referència ${body.query.reference}.`);
  }

  async function act(id: string, payload: Record<string, string>) {
    const response = await fetch(`/api/anonymous-queries/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null) as { query?: QueryItem; error?: string } | null;
    if (body?.query) setQueries((current) => current.map((item) => item.id === id ? body.query! : item));
    else setNotice(body?.error || "No s'ha pogut actualitzar.");
  }

  async function sendReply(query: QueryItem) {
    const bodyText = reply[query.id]?.trim();
    if (!bodyText) return;
    let accessToken: string | undefined;
    if (!staff) {
      const stored = JSON.parse(window.localStorage.getItem("eltaulell-anonymous-queries") || "[]") as StoredAccess[];
      accessToken = stored.find((item) => item.id === query.id)?.token;
    }
    const response = await fetch(`/api/anonymous-queries/${encodeURIComponent(query.id)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: bodyText, ...(accessToken ? { accessToken } : {}) }),
    });
    const body = await response.json().catch(() => null) as { query?: QueryItem; error?: string } | null;
    if (body?.query) {
      setQueries((current) => current.map((item) => item.id === query.id ? body.query! : item));
      setReply((current) => ({ ...current, [query.id]: "" }));
    } else setNotice(body?.error || "No s'ha pogut enviar la resposta.");
  }

  return (
    <section className="portal-grid">
      {!staff && (
        <form className="portal-panel portal-form" onSubmit={submitQuery}>
          <p className="panel-label">NOVA CONSULTA</p>
          <label>Grup<select value={groupId} onChange={(event) => setGroupId(event.target.value)}>{groups.map((group) => <option key={group.groupId} value={group.groupId}>{group.groupName}</option>)}</select></label>
          <label>Tema<input maxLength={100} required value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
          <label>Què necessites?<textarea maxLength={2000} required rows={5} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
          <button type="submit">Enviar de forma anònima</button>
          <small>No es desa el teu identificador d'usuari en aquesta consulta.</small>
        </form>
      )}
      <div className={staff ? "query-list full" : "query-list wide"}>
        {notice && <p className="form-notice" role="status">{notice}</p>}
        {queries.length === 0 && <article className="portal-panel full"><p>No hi ha consultes obertes.</p></article>}
        {queries.map((query) => (
          <article className="portal-panel full query-thread" key={query.id}>
            <header><div><span className={`status-pill ${query.status === "CLOSED" ? "offline" : "pending"}`}>{query.status}</span><h2>{query.subject}</h2><small>{query.reference} · {query.groupName}</small></div></header>
            <div className="query-messages">{query.messages.map((item) => <p className={item.author === "STUDENT_ANONYMOUS" ? "student" : "staff"} key={item.id}><strong>{item.author === "STUDENT_ANONYMOUS" ? "Alumne anònim" : item.author === "SYSTEM" ? "Sistema" : "Equip educatiu"}</strong>{item.body}</p>)}</div>
            {query.status !== "CLOSED" && <div className="query-reply"><textarea aria-label="Resposta" rows={3} value={reply[query.id] || ""} onChange={(event) => setReply((current) => ({ ...current, [query.id]: event.target.value }))} /><button onClick={() => void sendReply(query)} type="button">Respondre</button></div>}
            {staff && query.status !== "CLOSED" && <div className="action-list"><button onClick={() => void act(query.id, { assignedRole: "TUTOR" })} type="button">Derivar a tutoria</button><button onClick={() => void act(query.id, { assignedRole: "COORDINATOR" })} type="button">Derivar a coordinació</button><button onClick={() => void act(query.id, { status: "CLOSED" })} type="button">Tancar</button></div>}
          </article>
        ))}
      </div>
    </section>
  );
}
