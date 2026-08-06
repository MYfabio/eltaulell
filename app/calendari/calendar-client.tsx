"use client";

import { FormEvent, useState } from "react";

type EventItem = { id: string; groupId: string | null; title: string; description: string | null; startsAt: string; endsAt: string | null; source: string; editable: boolean };

export default function CalendarClient({ initialEvents, groups, canManage }: { initialEvents: EventItem[]; groups: Array<{ groupId: string; groupName: string }>; canManage: boolean }) {
  const [events, setEvents] = useState(initialEvents);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [groupId, setGroupId] = useState(groups[0]?.groupId || "");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [notice, setNotice] = useState("");

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId: groupId || null, title, description, startsAt: new Date(startsAt).toISOString(), endsAt: endsAt ? new Date(endsAt).toISOString() : null }) });
    const body = await response.json().catch(() => null) as { event?: EventItem; error?: string } | null;
    if (body?.event) {
      setEvents((current) => [...current, body.event!].sort((left, right) => left.startsAt.localeCompare(right.startsAt)));
      setTitle(""); setDescription(""); setStartsAt(""); setEndsAt(""); setNotice("Esdeveniment creat.");
    } else setNotice(body?.error || "No s'ha pogut crear.");
  }

  async function removeEvent(id: string) {
    const response = await fetch(`/api/calendar/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) setEvents((current) => current.filter((event) => event.id !== id));
    else setNotice("No s'ha pogut eliminar.");
  }

  return <section className="portal-grid">
    {canManage && <form className="portal-panel portal-form" onSubmit={createEvent}>
      <p className="panel-label">NOU ESDEVENIMENT</p>
      <label>Títol<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Grup<select value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Tot el centre</option>{groups.map((group) => <option key={group.groupId} value={group.groupId}>{group.groupName}</option>)}</select></label>
      <label>Inici<input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
      <label>Final<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>
      <label>Descripció<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <button type="submit">Afegir al calendari</button>
    </form>}
    <div className={canManage ? "calendar-list wide" : "calendar-list full"}>
      {notice && <p className="form-notice" role="status">{notice}</p>}
      {events.length === 0 && <article className="portal-panel full"><p>No hi ha esdeveniments programats.</p></article>}
      {events.map((event) => <article className="portal-panel full calendar-event" key={event.id}><time dateTime={event.startsAt}>{new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.startsAt))}</time><div><h2>{event.title}</h2>{event.description && <p>{event.description}</p>}<small>{event.source === "EL_TAULELL" ? "El Taulell" : event.source.replaceAll("_", " ")}</small></div>{canManage && event.editable && <button onClick={() => void removeEvent(event.id)} type="button">Eliminar</button>}</article>)}
    </div>
  </section>;
}
