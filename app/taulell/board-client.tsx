"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { DemoViewer } from "@/lib/demo-auth";
import {
  can,
  PERMISSIONS,
  type Permission,
  type PostKind,
} from "@/lib/permissions";
import "./taulell.css";

type NoteType = "Avisos" | "Tasques" | "Activitats" | "Materials";
type NoteColor = "yellow" | "blue" | "pink" | "green";

type Note = {
  id: string;
  type: NoteType;
  title: string;
  body: string;
  meta: string;
  color: NoteColor;
  icon: string;
  link?: string;
};

const initialNotes: Note[] = [
  {
    id: "1",
    type: "Avisos",
    title: "Sortida al Museu de la Ciència",
    body: "Recordeu portar l’autorització signada abans de divendres.",
    meta: "Marta · Tutora · fa 2 h",
    color: "yellow",
    icon: "🧪",
  },
  {
    id: "2",
    type: "Tasques",
    title: "Matemàtiques · Funcions",
    body: "Exercicis 12, 13 i 16. Repassa abans l’exemple de la pàgina 84.",
    meta: "Classroom · Entrega demà",
    color: "blue",
    icon: "📐",
    link: "Obrir a Classroom",
  },
  {
    id: "3",
    type: "Activitats",
    title: "Torneig de futbol sala",
    body: "Inscripcions obertes! Equips de 5 persones. Parleu amb la delegada.",
    meta: "Laia · Delegada · avui",
    color: "pink",
    icon: "⚽",
  },
  {
    id: "4",
    type: "Materials",
    title: "Guia del projecte d’Història",
    body: "Ja teniu disponible la rúbrica i els materials de suport.",
    meta: "Moodle · Actualitzat avui",
    color: "green",
    icon: "📚",
    link: "Veure a Moodle",
  },
];

const filters: Array<"Tot" | NoteType> = [
  "Tot",
  "Avisos",
  "Tasques",
  "Activitats",
  "Materials",
];

const noteStyles: Record<NoteType, { color: NoteColor; icon: string }> = {
  Avisos: { color: "yellow", icon: "📌" },
  Tasques: { color: "blue", icon: "📐" },
  Activitats: { color: "pink", icon: "🎯" },
  Materials: { color: "green", icon: "📚" },
};

const noteTypePermissions: Record<NoteType, Permission> = {
  Avisos: PERMISSIONS.CREATE_NOTICE,
  Tasques: PERMISSIONS.CREATE_TASK,
  Activitats: PERMISSIONS.CREATE_ACTIVITY,
  Materials: PERMISSIONS.CREATE_MATERIAL,
};

const noteKindByType: Record<NoteType, PostKind> = {
  Avisos: "NOTICE",
  Tasques: "TASK",
  Activitats: "ACTIVITY",
  Materials: "MATERIAL",
};

export default function BoardClient({ viewer }: { viewer: DemoViewer }) {
  const [notes, setNotes] = useState(initialNotes);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("Tot");
  const [chatOpen, setChatOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [pollChoice, setPollChoice] = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftType, setDraftType] = useState<NoteType>("Avisos");
  const [actionMessage, setActionMessage] = useState("");

  const availableNoteTypes = useMemo(
    () =>
      filters
        .slice(1)
        .filter((type): type is NoteType =>
          can(viewer, noteTypePermissions[type as NoteType]),
        ),
    [viewer],
  );

  const visibleNotes = useMemo(
    () =>
      activeFilter === "Tot"
        ? notes
        : notes.filter((note) => note.type === activeFilter),
    [activeFilter, notes],
  );

  function askBoard() {
    if (!query.trim()) return;
    const lower = query.toLowerCase();

    if (lower.includes("matem") || lower.includes("func")) {
      setAnswer(
        "Per començar, identifica quina és la variable independent. Mira l’exemple de la pàgina 84 i prova el primer exercici. Si m’expliques on t’encalles, et donaré una pista sense resoldre’l per tu.",
      );
    } else if (lower.includes("demà") || lower.includes("tasca")) {
      setAnswer(
        "Per demà tens els exercicis 12, 13 i 16 de Matemàtiques. També convé portar l’autorització de la sortida abans de divendres.",
      );
    } else {
      setAnswer(
        "Al tauler hi ha avisos, tasques de Classroom, materials de Moodle i activitats del grup. Pregunta’m per una matèria, una data o una publicació concreta.",
      );
    }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftTitle.trim() || !draftBody.trim()) return;

    if (!can(viewer, noteTypePermissions[draftType])) {
      setActionMessage("Aquest perfil no pot publicar aquest tipus de contingut.");
      return;
    }

    setActionMessage("");
    const response = await fetch("/api/board/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: noteKindByType[draftType],
        title: draftTitle,
        body: draftBody,
      }),
    });
    const result = (await response.json().catch(() => null)) as
      | { error?: string; post?: { id: string; meta: string } }
      | null;

    if (!response.ok || !result?.post) {
      setActionMessage(result?.error ?? "No s'ha pogut publicar el post-it.");
      return;
    }

    const createdPost = result.post;
    const style = noteStyles[draftType];
    setNotes((current) => [
      {
        id: createdPost.id,
        type: draftType,
        title: draftTitle.trim(),
        body: draftBody.trim(),
        meta: `${viewer.name} · ${viewer.roleLabel} · ara`,
        color: style.color,
        icon: style.icon,
      },
      ...current,
    ]);
    setDraftTitle("");
    setDraftBody("");
    setComposerOpen(false);
  }

  async function archiveNote(id: string) {
    setActionMessage("");
    const response = await fetch(`/api/board/posts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const result = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setActionMessage(result?.error ?? "No s'ha pogut arxivar el post-it.");
      return;
    }

    setNotes((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <div>
            <strong>El Taulell</strong>
            <span>Institut Can Roca</span>
          </div>
        </div>

        <nav aria-label="Navegació principal">
          <Link className="nav-active" href="/taulell">
            El meu tauler
          </Link>
          {can(viewer, PERMISSIONS.MANAGE_SCHOOL) && (
            <Link href="/coordinacio">Coordinació</Link>
          )}
          {can(viewer, PERMISSIONS.VIEW_GROUP_DASHBOARD) && (
            <Link href="/tutoria">Grup</Link>
          )}
          {can(viewer, PERMISSIONS.VIEW_OWN_SPACE) && (
            <Link href="/alumnat">El meu espai</Link>
          )}
          {can(viewer, PERMISSIONS.MANAGE_INTEGRATIONS) && (
            <Link href="/integracions">Integracions</Link>
          )}
        </nav>

        <div className="user-area">
          <button className="icon-button" aria-label="Notificacions" type="button">
            🔔<i>3</i>
          </button>
          <div className="avatar">{viewer.initials}</div>
          <div className="user-copy">
            <strong>{viewer.name}</strong>
            <span>{viewer.roleLabel} · {viewer.groupName}</span>
          </div>
          <Link className="session-exit" href="/api/auth/logout">Sortir</Link>
        </div>
      </header>

      <section className="welcome">
        <div>
          <p className="eyebrow">DILLUNS, 28 DE JULIOL</p>
          <h1>
            Bon dia, {viewer.firstName}! <span>👋</span>
          </h1>
          <p>Això és el més important del teu grup avui.</p>
        </div>

        <div className="today-card">
          <div className="date-block">
            <strong>28</strong>
            <span>JUL.</span>
          </div>
          <div>
            <strong>Avui</strong>
            <span>2 tasques · 1 activitat</span>
          </div>
          <div className="weather">
            ☀️ <strong>27°</strong>
          </div>
        </div>
      </section>

      <div className="workspace">
        <section className="board-wrap">
          <div className="board-tools">
            <div className="filters" aria-label="Filtrar publicacions">
              {filters.map((filter) => (
                <button
                  className={activeFilter === filter ? "active" : ""}
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="board-actions">
              {availableNoteTypes.length > 0 && (
                <button
                  className="new-note-button"
                  onClick={() => {
                    setDraftType(availableNoteTypes[0]);
                    setActionMessage("");
                    setComposerOpen(true);
                  }}
                  type="button"
                >
                  + Nou post-it
                </button>
              )}
              <button className="search-button" aria-label="Cercar" type="button">
                ⌕
              </button>
            </div>
          </div>

          {actionMessage && (
            <p className="action-message" role="status">{actionMessage}</p>
          )}

          <div className="corkboard">
            <div className="board-label">
              <span>📌</span> TAULER DE 3r B
            </div>
            <div className="notes-grid" aria-live="polite">
              {visibleNotes.map((note, index) => (
                <article
                  className={`note ${note.color} tilt-${(index % 3) + 1}`}
                  key={note.id}
                >
                  <span className="pin" />
                  {can(viewer, PERMISSIONS.MODERATE_BOARD) && (
                    <button
                      className="archive-note"
                      aria-label={`Arxivar ${note.title}`}
                      onClick={() => archiveNote(note.id)}
                      type="button"
                    >
                      ×
                    </button>
                  )}
                  <div className="note-icon">{note.icon}</div>
                  <span className="note-type">{note.type}</span>
                  <h2>{note.title}</h2>
                  <p>{note.body}</p>
                  {note.link && (
                    <button className="note-link" type="button">
                      {note.link} ↗
                    </button>
                  )}
                  <footer>{note.meta}</footer>
                </article>
              ))}

              {activeFilter === "Tot" && (
                <article className="poll-card">
                  <span className="tape" />
                  <span className="poll-label">CONSULTA ANÒNIMA</span>
                  <h2>Quina activitat preferiu per a la tutoria?</h2>
                  {[
                    "Dinàmica de grup",
                    "Debat sobre xarxes",
                    "Sortida al pati",
                  ].map((option, index) => (
                    <button
                      className={pollChoice === index ? "poll-selected" : ""}
                      disabled={!can(viewer, PERMISSIONS.VOTE_POLL)}
                      onClick={() =>
                        can(viewer, PERMISSIONS.VOTE_POLL) && setPollChoice(index)
                      }
                      key={option}
                      type="button"
                    >
                      <span>{pollChoice === index ? "●" : "○"}</span>
                      {option}
                    </button>
                  ))}
                  <small>El teu vot és completament anònim</small>
                </article>
              )}
            </div>
          </div>
        </section>

        <aside>
          <section className="agenda card">
            <div className="card-title">
              <div>
                <span>AVUI</span>
                <strong>La teva agenda</strong>
              </div>
              <button type="button">Veure tot</button>
            </div>
            <div className="timeline">
              <div>
                <time>10:15</time>
                <i className="dot blue-dot" />
                <p>
                  <strong>Entrega · Matemàtiques</strong>
                  <span>Classroom</span>
                </p>
              </div>
              <div>
                <time>12:30</time>
                <i className="dot orange-dot" />
                <p>
                  <strong>Tutoria de grup</strong>
                  <span>Aula 3.12</span>
                </p>
              </div>
              <div>
                <time>16:00</time>
                <i className="dot green-dot" />
                <p>
                  <strong>Entrenament de vòlei</strong>
                  <span>Gimnàs</span>
                </p>
              </div>
            </div>
          </section>

          <section className="platforms card">
            <span className="section-label">LES TEVES PLATAFORMES</span>
            <Link href={can(viewer, PERMISSIONS.MANAGE_INTEGRATIONS) ? "/integracions" : "/alumnat"}>
              <b className="classroom-logo">C</b>
              <p>
                <strong>Google Classroom</strong>
                <span>Connexió pendent</span>
              </p>
              <em>↗</em>
            </Link>
            <Link href={can(viewer, PERMISSIONS.MANAGE_INTEGRATIONS) ? "/integracions" : "/alumnat"}>
              <b className="moodle-logo">M</b>
              <p>
                <strong>Moodle</strong>
                <span>Servei no disponible</span>
              </p>
              <em>↗</em>
            </Link>
          </section>

          <section className="delegate card">
            <div className="delegate-photo">LC</div>
            <div>
              <span>DELEGADA DEL GRUP</span>
              <strong>Laia Canals</strong>
              <p>Pot publicar activitats i crear consultes anònimes.</p>
            </div>
          </section>
        </aside>
      </div>

      <button
        className="chat-launcher"
        hidden={!can(viewer, PERMISSIONS.USE_ASSISTANT)}
        onClick={() => setChatOpen((current) => !current)}
        type="button"
      >
        <span>✦</span>
        <div>
          <strong>Pregunta al Taulell</strong>
          <small>T’ajudo sense donar-te la resposta</small>
        </div>
      </button>

      {can(viewer, PERMISSIONS.USE_ASSISTANT) && chatOpen && (
        <section className="chat-panel" aria-label="Assistent del tauler">
          <header>
            <div>
              <span>✦</span>
              <p>
                <strong>Assistent del Taulell</strong>
                <small>En línia · t’acompanyo a aprendre</small>
              </p>
            </div>
            <button
              aria-label="Tancar assistent"
              onClick={() => setChatOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>
          <div className="chat-content">
            <div className="bot-message">
              Hola, Marc! Pregunta’m què hi ha al tauler o demana’m una pista per
              començar els deures.
            </div>
            {answer && <div className="bot-message answer">{answer}</div>}
          </div>
          <div className="chat-input">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && askBoard()}
              placeholder="Què necessites saber?"
              aria-label="Escriu una consulta"
            />
            <button aria-label="Enviar consulta" onClick={askBoard} type="button">
              ↑
            </button>
          </div>
        </section>
      )}

      {composerOpen && availableNoteTypes.length > 0 && (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-labelledby="new-note-title"
            aria-modal="true"
            className="composer-modal"
            role="dialog"
          >
            <button
              aria-label="Tancar"
              className="modal-close"
              onClick={() => setComposerOpen(false)}
              type="button"
            >
              ×
            </button>
            <span className="composer-pin" />
            <p className="eyebrow">NOU POST-IT</p>
            <h2 id="new-note-title">Què vols compartir?</h2>
            <form onSubmit={addNote}>
              <label>
                Tipus
                <select
                  value={draftType}
                  onChange={(event) => setDraftType(event.target.value as NoteType)}
                >
                  {availableNoteTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label>
                Títol
                <input
                  maxLength={70}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="Escriu un títol breu"
                  value={draftTitle}
                />
              </label>
              <label>
                Missatge
                <textarea
                  maxLength={240}
                  onChange={(event) => setDraftBody(event.target.value)}
                  placeholder="Escriu l’avís, la idea o la proposta…"
                  value={draftBody}
                />
              </label>
              <div className="composer-footer">
                <span>{draftBody.length}/240</span>
                <button
                  disabled={!draftTitle.trim() || !draftBody.trim()}
                  type="submit"
                >
                  Penjar al suro
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
