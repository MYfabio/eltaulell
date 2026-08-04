"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { BoardChoice } from "@/lib/board-store";
import {
  BOARD_THEMES,
  tasksForStudent,
  type BoardTheme,
  type LearningTask,
  type TaskStatus,
} from "@/lib/demo-insights";
import type { DemoViewer } from "@/lib/demo-auth";
import {
  can,
  PERMISSIONS,
  type Permission,
  type PostKind,
} from "@/lib/permissions";
import BoardExtras from "./board-extras";
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

type CardPosition = {
  x: number;
  y: number;
};

type CardDragState = {
  cardKey: string;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  nextX: number;
  nextY: number;
  rect: DOMRect;
};

type MovableCardStyle = CSSProperties & {
  "--card-x": string;
  "--card-y": string;
};

function isCardPosition(value: unknown): value is CardPosition {
  if (!value || typeof value !== "object") return false;
  const position = value as Partial<CardPosition>;
  return Number.isFinite(position.x) && Number.isFinite(position.y);
}

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

const noteActionLabels: Record<NoteType, string> = {
  Avisos: "Avís",
  Tasques: "Tasca",
  Activitats: "Activitat",
  Materials: "Material",
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

const taskStatusLabels: Record<TaskStatus, string> = {
  PENDING: "Pendent",
  IN_PROGRESS: "En curs",
  DELIVERED: "Lliurada",
  GRADED: "Qualificada",
};

export default function BoardClient({
  boards,
  selectedBoard,
  viewer,
}: {
  boards: BoardChoice[];
  selectedBoard: BoardChoice;
  viewer: DemoViewer;
}) {
  const taskOwnerId = viewer.id === "student-marc" ? "marc-costa" : viewer.id;
  const taskStorageKey = `eltaulell-learning-tasks-${taskOwnerId}`;
  const cardPositionStorageKey =
    `eltaulell-card-positions-${viewer.id}-${selectedBoard.groupId}`;
  const canArrangeBoard = viewer.role === "STUDENT";
  const boardRef = useRef<HTMLDivElement>(null);
  const cardDragRef = useRef<CardDragState | null>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("Tot");
  const [chatOpen, setChatOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftType, setDraftType] = useState<NoteType>("Avisos");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [boardTheme, setBoardTheme] = useState<BoardTheme>("cork");
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [learningTasks, setLearningTasks] = useState<LearningTask[]>(() =>
    tasksForStudent(taskOwnerId),
  );
  const [classroomNotice, setClassroomNotice] = useState("");
  const [tasksHydrated, setTasksHydrated] = useState(false);
  const [feedbackTaskId, setFeedbackTaskId] = useState<string | null>(null);
  const [cardPositions, setCardPositions] = useState<Record<string, CardPosition>>({});
  const [loadedCardPositionKey, setLoadedCardPositionKey] = useState<string | null>(null);
  const [draggingCardKey, setDraggingCardKey] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("eltaulell-board-theme");
    if (BOARD_THEMES.some((theme) => theme.id === savedTheme)) {
      setBoardTheme(savedTheme as BoardTheme);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("eltaulell-board-theme", boardTheme);
  }, [boardTheme]);

  useEffect(() => {
    try {
      const savedTasks = window.sessionStorage.getItem(taskStorageKey);
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks) as LearningTask[];
        if (Array.isArray(parsedTasks)) setLearningTasks(parsedTasks);
      }
    } catch {
      window.sessionStorage.removeItem(taskStorageKey);
    } finally {
      setTasksHydrated(true);
    }
  }, [taskStorageKey]);

  useEffect(() => {
    if (!tasksHydrated) return;
    window.sessionStorage.setItem(taskStorageKey, JSON.stringify(learningTasks));
  }, [learningTasks, taskStorageKey, tasksHydrated]);

  useEffect(() => {
    if (!canArrangeBoard) {
      setCardPositions({});
      setLoadedCardPositionKey(null);
      return;
    }

    try {
      const savedPositions = window.localStorage.getItem(cardPositionStorageKey);
      const parsedPositions = savedPositions
        ? (JSON.parse(savedPositions) as Record<string, unknown>)
        : {};
      setCardPositions(
        Object.fromEntries(
          Object.entries(parsedPositions).filter((entry) => isCardPosition(entry[1])),
        ) as Record<string, CardPosition>,
      );
    } catch {
      window.localStorage.removeItem(cardPositionStorageKey);
      setCardPositions({});
    } finally {
      setLoadedCardPositionKey(cardPositionStorageKey);
    }
  }, [canArrangeBoard, cardPositionStorageKey]);

  useEffect(() => {
    if (!canArrangeBoard || loadedCardPositionKey !== cardPositionStorageKey) return;
    window.localStorage.setItem(cardPositionStorageKey, JSON.stringify(cardPositions));
  }, [canArrangeBoard, cardPositionStorageKey, cardPositions, loadedCardPositionKey]);

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

  function openNewNote(type: NoteType) {
    setEditingNoteId(null);
    setDraftType(type);
    setDraftTitle("");
    setDraftBody("");
    setActionMessage("");
    setComposerOpen(true);
  }

  function openEditNote(note: Note) {
    setEditingNoteId(note.id);
    setDraftType(note.type);
    setDraftTitle(note.title);
    setDraftBody(note.body);
    setActionMessage("");
    setComposerOpen(true);
  }

  function closeComposer() {
    setComposerOpen(false);
    setEditingNoteId(null);
  }

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

  async function updateNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingNoteId || !draftTitle.trim() || !draftBody.trim()) return;

    if (
      !can(viewer, PERMISSIONS.MODERATE_BOARD) ||
      !can(viewer, noteTypePermissions[draftType])
    ) {
      setActionMessage("Aquest perfil no pot editar el tauler.");
      return;
    }

    setActionMessage("");
    const response = await fetch(
      `/api/board/posts/${encodeURIComponent(editingNoteId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: noteKindByType[draftType],
          title: draftTitle,
          body: draftBody,
        }),
      },
    );
    const result = (await response.json().catch(() => null)) as
      | { error?: string; post?: { id: string; meta: string } }
      | null;

    if (!response.ok || !result?.post) {
      setActionMessage(result?.error ?? "No s'ha pogut desar el post-it.");
      return;
    }

    const updatedPost = result.post;
    const style = noteStyles[draftType];
    setNotes((current) =>
      current.map((note) =>
        note.id === editingNoteId
          ? {
              ...note,
              type: draftType,
              title: draftTitle.trim(),
              body: draftBody.trim(),
              meta: updatedPost.meta,
              color: style.color,
              icon: style.icon,
            }
          : note,
      ),
    );
    setActionMessage("Canvis desats al tauler.");
    setDraftTitle("");
    setDraftBody("");
    closeComposer();
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

  function cardPositionStyle(cardKey: string): MovableCardStyle | undefined {
    if (!canArrangeBoard) return undefined;
    const position = cardPositions[cardKey] ?? { x: 0, y: 0 };
    return {
      "--card-x": `${position.x}px`,
      "--card-y": `${position.y}px`,
    };
  }

  function startCardDrag(event: ReactPointerEvent<HTMLElement>, cardKey: string) {
    if (!canArrangeBoard || event.button !== 0) return;
    const interactiveTarget = (event.target as HTMLElement).closest(
      "button, a, input, textarea, select, label",
    );
    if (interactiveTarget) return;

    const position = cardPositions[cardKey] ?? { x: 0, y: 0 };
    cardDragRef.current = {
      cardKey,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      nextX: position.x,
      nextY: position.y,
      rect: event.currentTarget.getBoundingClientRect(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setDraggingCardKey(cardKey);
  }

  function moveCard(event: ReactPointerEvent<HTMLElement>) {
    const dragState = cardDragRef.current;
    const board = boardRef.current;
    if (
      !canArrangeBoard ||
      !dragState ||
      !board ||
      dragState.pointerId !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();
    const boardRect = board.getBoundingClientRect();
    const horizontalMove = event.clientX - dragState.startX;
    const verticalMove = event.clientY - dragState.startY;
    const edgeSpace = 12;
    const left = Math.min(
      Math.max(dragState.rect.left + horizontalMove, boardRect.left + edgeSpace),
      boardRect.right - dragState.rect.width - edgeSpace,
    );
    const top = Math.min(
      Math.max(dragState.rect.top + verticalMove, boardRect.top + edgeSpace),
      boardRect.bottom - dragState.rect.height - edgeSpace,
    );
    dragState.nextX = Math.round(dragState.originX + left - dragState.rect.left);
    dragState.nextY = Math.round(dragState.originY + top - dragState.rect.top);
    event.currentTarget.style.setProperty("--card-x", `${dragState.nextX}px`);
    event.currentTarget.style.setProperty("--card-y", `${dragState.nextY}px`);
  }

  function finishCardDrag(event: ReactPointerEvent<HTMLElement>) {
    const dragState = cardDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setCardPositions((current) => ({
      ...current,
      [dragState.cardKey]: { x: dragState.nextX, y: dragState.nextY },
    }));
    cardDragRef.current = null;
    setDraggingCardKey(null);
  }

  function resetCardPositions() {
    window.localStorage.removeItem(cardPositionStorageKey);
    setCardPositions({});
  }

  function updateTaskStatus(taskId: string, status: TaskStatus) {
    const task = learningTasks.find((item) => item.id === taskId);
    if (!task || viewer.role !== "STUDENT") return;

    setLearningTasks((current) =>
      current.map((item) => (item.id === taskId ? { ...item, status } : item)),
    );

  }

  function startTask(task: LearningTask) {
    if (task.status === "PENDING") updateTaskStatus(task.id, "IN_PROGRESS");
    setQuery(`Ajuda'm a començar: ${task.title}`);
    setAnswer(
      `Comencem per entendre què et demana la tasca de ${task.subject}. Quina part tens clara i quin seria el primer pas més petit que podries fer?`,
    );
    setChatOpen(true);
    setClassroomNotice(
      task.classroomLinked
        ? "S'ha obert el Tutor IA per començar. El document de Classroom s'obrirà aquí quan el centre autoritzi Google Workspace."
        : "S'ha obert el Tutor IA amb el context d'aquesta tasca.",
    );
  }

  function deliverTask(task: LearningTask) {
    updateTaskStatus(task.id, "DELIVERED");
    setFeedbackTaskId(null);
    setClassroomNotice(
      task.classroomLinked
        ? "Tasca marcada com a lliurada en aquesta demo local. Encara no s'ha enviat a Classroom perquè falta l'autorització OAuth."
        : "Tasca marcada com a lliurada en aquesta demo local.",
    );
  }

  function reclaimTask(task: LearningTask) {
    updateTaskStatus(task.id, "IN_PROGRESS");
    setClassroomNotice(
      task.classroomLinked
        ? "Lliurament anul·lat en aquesta demo local. La recuperació real a Classroom s'activarà amb OAuth."
        : "La tasca torna a estar en procés.",
    );
  }

  return (
    <main className={`dashboard theme-${boardTheme}`}>
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

      <div className={resourcesOpen ? "workspace resources-open" : "workspace resources-collapsed"}>
        <section className="board-wrap">
          {boards.length > 1 && (
            <nav aria-label="Seleccionar el tauler del grup" className="board-switcher">
              <span>TAULERS DEL CENTRE</span>
              <div>
                {boards.map((board) => (
                  <Link
                    className={board.groupId === selectedBoard.groupId ? "active" : ""}
                    href={`/taulell?groupId=${encodeURIComponent(board.groupId)}`}
                    key={board.boardId}
                  >
                    {board.groupName}
                  </Link>
                ))}
              </div>
            </nav>
          )}
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
              <label className="theme-control">
                <span>Estil</span>
                <select
                  aria-label="Estil visual del taulell"
                  onChange={(event) => setBoardTheme(event.target.value as BoardTheme)}
                  value={boardTheme}
                >
                  {BOARD_THEMES.map((theme) => (
                    <option key={theme.id} value={theme.id}>{theme.label}</option>
                  ))}
                </select>
              </label>
              <button
                aria-expanded={resourcesOpen}
                className="resource-toggle"
                onClick={() => setResourcesOpen((current) => !current)}
                type="button"
              >
                {resourcesOpen ? "Tancar recursos" : "Obrir recursos"}
              </button>
              {canArrangeBoard && Object.keys(cardPositions).length > 0 && (
                <button
                  className="layout-reset"
                  onClick={resetCardPositions}
                  type="button"
                >
                  Restablir ordre
                </button>
              )}
              <button className="search-button" aria-label="Cercar" type="button">
                ⌕
              </button>
            </div>
          </div>

          {availableNoteTypes.length > 0 && (
            <section className="board-editor" aria-label="Accions sobre el tauler">
              <div className="board-editor-copy">
                <span>
                  {viewer.role === "TUTOR"
                    ? "EINES DE TUTORIA"
                    : viewer.role === "DELEGATE"
                      ? "EINES DE DELEGACIÓ"
                      : "EINES DEL TAULER"}
                </span>
                <strong>Publica directament al taulell</strong>
                <small>Tria el tipus i escriu. No cal sortir d'aquesta pantalla.</small>
              </div>
              <div className="board-editor-actions">
                {availableNoteTypes.map((type) => (
                  <button
                    className={`quick-note quick-note-${noteStyles[type].color}`}
                    key={type}
                    onClick={() => openNewNote(type)}
                    type="button"
                  >
                    <span>{noteStyles[type].icon}</span>
                    + {noteActionLabels[type]}
                  </button>
                ))}
              </div>
            </section>
          )}

          {actionMessage && (
            <p className="action-message" role="status">{actionMessage}</p>
          )}

          <div
            className={`corkboard${canArrangeBoard ? " student-arrangeable" : ""}`}
            ref={boardRef}
          >
            <div className="board-label">
              <span>📌</span> TAULER DE {selectedBoard.groupName.toUpperCase()}
            </div>

          {viewer.role === "STUDENT" && (
            <section className="task-workflow board-task-workflow" aria-label="Seguiment visual de tasques">
              <div className="task-columns">
                {(Object.keys(taskStatusLabels) as TaskStatus[]).map((status) => (
                  <section key={status}>
                    <h2>{taskStatusLabels[status]}</h2>
                    {learningTasks.filter((task) => task.status === status).map((task) => (
                      <article
                        className={`learning-task status-${status.toLowerCase().replace("_", "-")}${task.overdue ? " overdue" : ""}${canArrangeBoard ? " board-card-movable" : ""}${draggingCardKey === `task:${task.id}` ? " is-dragging" : ""}`}
                        data-board-card-key={`task:${task.id}`}
                        key={task.id}
                        onPointerCancel={finishCardDrag}
                        onPointerDown={(event) => startCardDrag(event, `task:${task.id}`)}
                        onPointerMove={moveCard}
                        onPointerUp={finishCardDrag}
                        style={cardPositionStyle(`task:${task.id}`)}
                      >
                        <header className="task-card-heading">
                          <span aria-hidden="true" className="task-subject-icon">{task.subjectIcon}</span>
                          <div>
                            <span>{task.subject}</span>
                            <strong>{task.title}</strong>
                          </div>
                        </header>

                        <div className="task-due-date">
                          <span>Data límit</span>
                          <strong>{task.dueLabel}</strong>
                        </div>

                        <div className="task-card-badges">
                          {task.classroomLinked && <em>Classroom · OAuth pendent</em>}
                          {status === "IN_PROGRESS" && <b>En procés</b>}
                          {status === "DELIVERED" && <b>Esperant qualificació</b>}
                        </div>

                        {status === "GRADED" && typeof task.grade === "number" && (
                          <div className="task-grade-badge">
                            <span>Qualificació</span>
                            <strong>
                              {task.grade.toFixed(1)} / {task.maximumGrade ?? 10}
                            </strong>
                          </div>
                        )}

                        {feedbackTaskId === task.id && task.teacherFeedback && (
                          <div className="teacher-feedback" role="status">
                            <span>Comentari del professorat</span>
                            <p>{task.teacherFeedback}</p>
                          </div>
                        )}

                        <footer className="task-card-actions">
                          {status === "PENDING" && (
                            <button className="task-primary-action" onClick={() => startTask(task)} type="button">
                              Començar
                            </button>
                          )}
                          {status === "IN_PROGRESS" && (
                            <>
                              <button className="task-secondary-action" onClick={() => startTask(task)} type="button">
                                Continuar amb Tutor IA
                              </button>
                              <button className="task-primary-action" onClick={() => deliverTask(task)} type="button">
                                Lliurar
                              </button>
                            </>
                          )}
                          {status === "DELIVERED" && (
                            <button className="task-secondary-action" onClick={() => reclaimTask(task)} type="button">
                              Anul·lar lliurament
                            </button>
                          )}
                          {status === "GRADED" && task.teacherFeedback && (
                            <button
                              aria-expanded={feedbackTaskId === task.id}
                              className="task-feedback-action"
                              onClick={() => setFeedbackTaskId((current) => current === task.id ? null : task.id)}
                              type="button"
                            >
                              {feedbackTaskId === task.id ? "Amagar comentari" : "Llegir comentari"}
                            </button>
                          )}
                        </footer>
                      </article>
                    ))}
                    {!learningTasks.some((task) => task.status === status) && <p>Cap tasca.</p>}
                  </section>
                ))}
              </div>
            </section>
          )}

            {activeFilter === "Tot" && (
              <BoardExtras groupId={selectedBoard.groupId} viewer={viewer} />
            )}
            <div className="notes-grid" aria-live="polite">
              {visibleNotes.map((note, index) => (
                <article
                  className={`note ${note.color} tilt-${(index % 3) + 1}${canArrangeBoard ? " board-card-movable" : ""}${draggingCardKey === `note:${note.id}` ? " is-dragging" : ""}`}
                  data-board-card-key={`note:${note.id}`}
                  key={note.id}
                  onPointerCancel={finishCardDrag}
                  onPointerDown={(event) => startCardDrag(event, `note:${note.id}`)}
                  onPointerMove={moveCard}
                  onPointerUp={finishCardDrag}
                  style={cardPositionStyle(`note:${note.id}`)}
                >
                  <span className="pin" />
                  {can(viewer, PERMISSIONS.MODERATE_BOARD) && (
                    <button
                      className="edit-note"
                      onClick={() => openEditNote(note)}
                      type="button"
                    >
                      Editar
                    </button>
                  )}
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
            </div>
          </div>
        </section>

        {resourcesOpen && <aside aria-label="Recursos i agenda desplegables">
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
        </aside>}
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
              onClick={closeComposer}
              type="button"
            >
              ×
            </button>
            <span className="composer-pin" />
            <p className="eyebrow">NOU POST-IT</p>
            <h2 id="new-note-title">Què vols compartir?</h2>
            {editingNoteId && (
              <p className="editing-hint">Estàs editant aquest post-it.</p>
            )}
            <form onSubmit={editingNoteId ? updateNote : addNote}>
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
                  {editingNoteId ? "Desar canvis" : "Penjar al suro"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
