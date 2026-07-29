"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import "./taulell.css";

type NoteColor = "yellow" | "blue" | "green" | "pink";
type Note = {
  id: string;
  message: string;
  author: string;
  role: "Tutor/a" | "Delegat/da" | "Alumne/a";
  color: NoteColor;
  createdAt: string;
};

const initialNotes: Note[] = [
  { id: "1", message: "Recordeu portar el llibre de lectura dijous.", author: "Marta", role: "Tutor/a", color: "yellow", createdAt: "Avui, 09:10" },
  { id: "2", message: "Podem reservar deu minuts per preparar la sortida?", author: "Pau", role: "Delegat/da", color: "blue", createdAt: "Avui, 10:25" },
  { id: "3", message: "Proposta: fer un grup d'estudi abans de l'examen de mates.", author: "Aina", role: "Alumne/a", color: "green", createdAt: "Avui, 11:40" },
  { id: "4", message: "Divendres acaba el termini per lliurar el projecte de ciències.", author: "Marta", role: "Tutor/a", color: "pink", createdAt: "Ahir, 16:05" }
];

const colors: NoteColor[] = ["yellow", "blue", "green", "pink"];

export default function BoardPage() {
  const [notes, setNotes] = useState(initialNotes);
  const [message, setMessage] = useState("");
  const [author, setAuthor] = useState("Aina");
  const [role, setRole] = useState<Note["role"]>("Alumne/a");
  const [filter, setFilter] = useState<"Tots" | Note["role"]>("Tots");

  const visibleNotes = useMemo(
    () => filter === "Tots" ? notes : notes.filter((note) => note.role === filter),
    [filter, notes]
  );

  function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanMessage = message.trim();
    if (!cleanMessage) return;

    setNotes((current) => [{
      id: crypto.randomUUID(),
      message: cleanMessage,
      author: author.trim() || "Usuari",
      role,
      color: colors[current.length % colors.length],
      createdAt: "Ara"
    }, ...current]);
    setMessage("");
  }

  return (
    <main className="board-shell">
      <header className="board-header">
        <div>
          <Link className="back-link" href="/">← El Taulell</Link>
          <p className="eyebrow">3R ESO · GRUP A</p>
          <h1>Suro de classe</h1>
          <p className="board-intro">Avisos, idees i propostes compartides pel grup.</p>
        </div>
        <div className="class-status"><span />18 persones connectades</div>
      </header>

      <section className="composer" aria-labelledby="new-note-title">
        <div>
          <p className="eyebrow">NOU POST-IT</p>
          <h2 id="new-note-title">Què vols compartir?</h2>
        </div>
        <form onSubmit={addNote}>
          <textarea
            aria-label="Missatge del post-it"
            maxLength={240}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Escriu un avís, una idea o una proposta…"
            value={message}
          />
          <div className="composer-row">
            <label>Nom<input value={author} onChange={(event) => setAuthor(event.target.value)} /></label>
            <label>Rol<select value={role} onChange={(event) => setRole(event.target.value as Note["role"])}><option>Alumne/a</option><option>Delegat/da</option><option>Tutor/a</option></select></label>
            <span className="character-count">{message.length}/240</span>
            <button disabled={!message.trim()} type="submit">Penjar al suro</button>
          </div>
        </form>
      </section>

      <section className="board-toolbar" aria-label="Filtres del suro">
        <div>
          {(["Tots", "Tutor/a", "Delegat/da", "Alumne/a"] as const).map((item) => (
            <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)} type="button">{item}</button>
          ))}
        </div>
        <strong>{visibleNotes.length} post-its</strong>
      </section>

      <section className="note-grid" aria-live="polite">
        {visibleNotes.map((note) => (
          <article className={`note note-${note.color}`} key={note.id}>
            <div className="note-meta"><span>{note.role}</span><time>{note.createdAt}</time></div>
            <p>{note.message}</p>
            <footer><strong>{note.author}</strong><button aria-label={`Arxivar post-it de ${note.author}`} onClick={() => setNotes((current) => current.filter((item) => item.id !== note.id))} type="button">Arxivar</button></footer>
          </article>
        ))}
      </section>
    </main>
  );
}
