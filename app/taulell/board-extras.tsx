"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import type { DemoViewer } from "@/lib/demo-auth";
import { can, PERMISSIONS } from "@/lib/permissions";

type PollStatus = "PENDING_APPROVAL" | "OPEN" | "CLOSED" | "PUBLISHED";

type PollOption = {
  id: string;
  label: string;
  votes: number;
};

type BoardPoll = {
  id: string;
  question: string;
  options: PollOption[];
  anonymous: boolean;
  closesAt: string | null;
  status: PollStatus;
  createdBy: string;
  createdByRole: string;
  voterChoice?: string;
  validatedBy?: string;
};

type BoardAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  caption: string;
  url: string;
  uploadedBy: string;
  uploadedByRole: string;
};

const initialPolls: BoardPoll[] = [];

const statusLabels: Record<PollStatus, string> = {
  PENDING_APPROVAL: "Pendent de validació",
  OPEN: "Votació oberta",
  CLOSED: "Pendent de publicar",
  PUBLISHED: "Resultats validats",
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BoardExtras({
  groupId,
  viewer,
}: {
  groupId: string;
  viewer: DemoViewer;
}) {
  const [polls, setPolls] = useState(initialPolls);
  const [attachments, setAttachments] = useState<BoardAttachment[]>([]);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<BoardAttachment | null>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", "", ""]);
  const [pollAnonymous, setPollAnonymous] = useState(true);
  const [pollClosesAt, setPollClosesAt] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentCaption, setAttachmentCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const canCreatePoll = can(viewer, PERMISSIONS.CREATE_POLL);
  const canManagePolls = can(viewer, PERMISSIONS.MANAGE_POLL_RESULTS);
  const canAttach = can(viewer, PERMISSIONS.CREATE_ATTACHMENT);
  const canDeleteAttachments = can(viewer, PERMISSIONS.DELETE_ATTACHMENT);
  const groupQuery = `?groupId=${encodeURIComponent(groupId)}`;

  function boardApiUrl(path: string) {
    return `${path}${groupQuery}`;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadBoardExtras() {
      const [pollResponse, attachmentResponse] = await Promise.all([
        fetch(boardApiUrl("/api/board/polls"), { cache: "no-store" }),
        fetch(boardApiUrl("/api/board/attachments"), { cache: "no-store" }),
      ]);
      const pollResult = (await pollResponse.json().catch(() => null)) as
        | { polls?: BoardPoll[] }
        | null;
      const attachmentResult = (await attachmentResponse.json().catch(() => null)) as
        | { attachments?: BoardAttachment[] }
        | null;

      if (cancelled) return;
      if (pollResponse.ok && pollResult?.polls) setPolls(pollResult.polls);
      if (attachmentResponse.ok && attachmentResult?.attachments) {
        setAttachments(attachmentResult.attachments);
      }
    }

    loadBoardExtras().catch(() => {
      if (!cancelled) setMessage("No s'han pogut actualitzar els recursos del taulell.");
    });
    return () => {
      cancelled = true;
    };
  }, [groupQuery]);

  const visiblePolls = useMemo(
    () =>
      polls.filter(
        (poll) =>
          poll.status !== "PENDING_APPROVAL" ||
          canManagePolls ||
          poll.createdBy === viewer.name,
      ),
    [canManagePolls, polls, viewer.name],
  );

  function updatePollOption(index: number, value: string) {
    setPollOptions((current) =>
      current.map((option, optionIndex) => (optionIndex === index ? value : option)),
    );
  }

  function addPollOption() {
    setPollOptions((current) => (current.length < 6 ? [...current, ""] : current));
  }

  function removePollOption(index: number) {
    setPollOptions((current) =>
      current.length > 2 ? current.filter((_, optionIndex) => optionIndex !== index) : current,
    );
  }

  async function createPoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2) return;

    setBusy(true);
    setMessage("");
    const response = await fetch(boardApiUrl("/api/board/polls"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: pollQuestion,
        options,
        anonymous: pollAnonymous,
        closesAt: pollClosesAt ? new Date(pollClosesAt).toISOString() : null,
      }),
    });
    const result = (await response.json().catch(() => null)) as
      | { error?: string; poll?: BoardPoll }
      | null;
    setBusy(false);

    if (!response.ok || !result?.poll) {
      setMessage(result?.error ?? "No s'ha pogut crear l'enquesta.");
      return;
    }

    setPolls((current) => [result.poll!, ...current]);
    setPollQuestion("");
    setPollOptions(["", "", ""]);
    setPollClosesAt("");
    setPollAnonymous(true);
    setPollModalOpen(false);
    setMessage(
      result.poll.status === "PENDING_APPROVAL"
        ? "Proposta enviada. Tutoria l'ha de validar abans d'obrir la votació."
        : "Enquesta publicada i votació oberta.",
    );
  }

  async function votePoll(pollId: string, optionId: string) {
    const poll = polls.find((candidate) => candidate.id === pollId);
    if (!poll || poll.status !== "OPEN" || poll.voterChoice) return;

    setMessage("");
    const response = await fetch(boardApiUrl("/api/board/polls"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId, optionId }),
    });
    const result = (await response.json().catch(() => null)) as
      | { accepted?: boolean; error?: string }
      | null;

    if (!response.ok || !result?.accepted) {
      setMessage(result?.error ?? "No s'ha pogut registrar el vot.");
      return;
    }

    setPolls((current) =>
      current.map((candidate) =>
        candidate.id === pollId
          ? {
              ...candidate,
              voterChoice: optionId,
              options: candidate.options.map((option) =>
                option.id === optionId ? { ...option, votes: option.votes + 1 } : option,
              ),
            }
          : candidate,
      ),
    );
    setMessage("Vot registrat de manera anònima.");
  }

  async function managePoll(
    pollId: string,
    action: "APPROVE" | "CLOSE" | "PUBLISH" | "DELETE",
  ) {
    setBusy(true);
    setMessage("");
    const response = await fetch(boardApiUrl("/api/board/polls"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId, action }),
    });
    const result = (await response.json().catch(() => null)) as
      | { error?: string; status?: PollStatus | "DELETED"; validatedBy?: string }
      | null;
    setBusy(false);

    if (!response.ok || !result?.status) {
      setMessage(result?.error ?? "No s'ha pogut gestionar l'enquesta.");
      return;
    }

    if (result.status === "DELETED") {
      setPolls((current) => current.filter((poll) => poll.id !== pollId));
      setMessage("Enquesta eliminada del tauler.");
      return;
    }

    setPolls((current) =>
      current.map((poll) =>
        poll.id === pollId
          ? { ...poll, status: result.status as PollStatus, validatedBy: result.validatedBy }
          : poll,
      ),
    );
    setMessage(
      action === "APPROVE"
        ? "Enquesta validada. La votació ja és oberta."
        : action === "CLOSE"
          ? "Votació tancada. Revisa els resultats abans de publicar-los."
          : "Resultats validats i visibles per a tot el grup.",
    );
  }

  function selectAttachment(event: ChangeEvent<HTMLInputElement>) {
    setAttachmentFile(event.target.files?.[0] ?? null);
    setMessage("");
  }

  async function uploadAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attachmentFile) return;

    setBusy(true);
    setMessage("");
    const formData = new FormData();
    formData.set("file", attachmentFile);
    formData.set("caption", attachmentCaption);

    const response = await fetch(boardApiUrl("/api/board/attachments"), {
      method: "POST",
      body: formData,
    });
    const result = (await response.json().catch(() => null)) as
      | { attachment?: BoardAttachment; error?: string }
      | null;
    setBusy(false);

    if (!response.ok || !result?.attachment) {
      setMessage(result?.error ?? "No s'ha pogut pujar el fitxer.");
      return;
    }

    setAttachments((current) => [result.attachment!, ...current]);
    setAttachmentFile(null);
    setAttachmentCaption("");
    setAttachmentModalOpen(false);
    setMessage("Fitxer afegit al tauler.");
  }

  async function deleteAttachment(id: string) {
    setBusy(true);
    setMessage("");
    const response = await fetch(
      `/api/board/attachments?groupId=${encodeURIComponent(groupId)}` +
        `&attachmentId=${encodeURIComponent(id)}`,
      {
      method: "DELETE",
      },
    );
    const result = (await response.json().catch(() => null)) as
      | { deleted?: boolean; error?: string }
      | null;
    setBusy(false);

    if (!response.ok || !result?.deleted) {
      setMessage(result?.error ?? "No s'ha pogut eliminar el fitxer.");
      return;
    }

    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
    setPreviewAttachment((current) => (current?.id === id ? null : current));
    setMessage("Fitxer eliminat del tauler.");
  }

  return (
    <section className="board-extras" aria-label="Enquestes i fitxers del tauler">
      {(canCreatePoll || canAttach) && (
        <div className="extras-toolbar">
          <div>
            <span>PARTICIPACIÓ I RECURSOS</span>
            <strong>Enquestes, imatges i PDF</strong>
          </div>
          <div>
            {canCreatePoll && (
              <button onClick={() => setPollModalOpen(true)} type="button">
                + Enquesta
              </button>
            )}
            {canAttach && (
              <button onClick={() => setAttachmentModalOpen(true)} type="button">
                + Imatge o PDF
              </button>
            )}
          </div>
        </div>
      )}

      {message && <p className="extras-message" role="status">{message}</p>}

      <div className="board-extras-grid">
        {!visiblePolls.length && !attachments.length && (
          <p className="board-extras-empty">
            Encara no hi ha enquestes ni fitxers en aquest taulell.
          </p>
        )}
        {visiblePolls.map((poll) => {
          const totalVotes = poll.options.reduce((total, option) => total + option.votes, 0);
          const showResults =
            poll.status === "PUBLISHED" ||
            (canManagePolls && poll.status !== "PENDING_APPROVAL");

          return (
            <article className="managed-poll-card" key={poll.id}>
              <div className="poll-heading">
                <span className={`poll-status poll-status-${poll.status.toLowerCase()}`}>
                  {statusLabels[poll.status]}
                </span>
                <small>{poll.anonymous ? "Anònima" : "Identificada"}</small>
              </div>
              <h2>{poll.question}</h2>

              {poll.status === "PENDING_APPROVAL" ? (
                <p className="poll-awaiting">
                  La proposta no serà visible per votar fins que tutoria la validi.
                </p>
              ) : poll.status === "CLOSED" && !canManagePolls ? (
                <p className="poll-awaiting">La votació està tancada. Tutoria publicarà els resultats.</p>
              ) : showResults ? (
                <div className="poll-results" aria-label="Resultats de l'enquesta">
                  {poll.options.map((option) => {
                    const percent = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0;
                    return (
                      <div key={option.id}>
                        <span><strong>{option.label}</strong><em>{percent}%</em></span>
                        <i><b style={{ width: `${percent}%` }} /></i>
                      </div>
                    );
                  })}
                  <small>{totalVotes} vots registrats</small>
                </div>
              ) : (
                <div className="poll-voting">
                  {poll.options.map((option) => (
                    <button
                      className={poll.voterChoice === option.id ? "poll-selected" : ""}
                      disabled={Boolean(poll.voterChoice) || !can(viewer, PERMISSIONS.VOTE_POLL)}
                      key={option.id}
                      onClick={() => votePoll(poll.id, option.id)}
                      type="button"
                    >
                      <span>{poll.voterChoice === option.id ? "✓" : "○"}</span>
                      {option.label}
                    </button>
                  ))}
                  <small>{poll.voterChoice ? "Vot registrat" : "Una resposta per persona"}</small>
                </div>
              )}

              <footer>
                <span>{poll.createdBy} · {poll.createdByRole}</span>
                {poll.status === "PUBLISHED" && poll.validatedBy && (
                  <strong>Validat per {poll.validatedBy}</strong>
                )}
              </footer>

              {canManagePolls && (
                <div className="poll-management">
                  {poll.status === "PENDING_APPROVAL" && (
                    <button disabled={busy} onClick={() => managePoll(poll.id, "APPROVE")} type="button">
                      Validar i obrir
                    </button>
                  )}
                  {poll.status === "OPEN" && (
                    <button disabled={busy} onClick={() => managePoll(poll.id, "CLOSE")} type="button">
                      Tancar votació
                    </button>
                  )}
                  {poll.status === "CLOSED" && (
                    <button disabled={busy} onClick={() => managePoll(poll.id, "PUBLISH")} type="button">
                      Mostrar resultats
                    </button>
                  )}
                  <button
                    className="danger-action"
                    disabled={busy}
                    onClick={() => managePoll(poll.id, "DELETE")}
                    type="button"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </article>
          );
        })}

        {attachments.map((attachment) => {
          const isPdf = attachment.mimeType === "application/pdf";
          return (
            <article className="attachment-card" key={attachment.id}>
              <button
                className="attachment-preview"
                onClick={() => setPreviewAttachment(attachment)}
                title={isPdf ? "Obrir PDF" : "Ampliar imatge"}
                type="button"
              >
                {isPdf ? (
                  <span className="pdf-preview"><b>PDF</b><small>Obrir document</small></span>
                ) : (
                  <img alt={attachment.caption || attachment.fileName} src={attachment.url} />
                )}
              </button>
              <div className="attachment-copy">
                <strong>{attachment.caption || attachment.fileName}</strong>
                <span>{attachment.fileName} · {formatSize(attachment.size)}</span>
                <small>{attachment.uploadedBy} · {attachment.uploadedByRole}</small>
              </div>
              {canDeleteAttachments && (
                <button
                  aria-label={`Eliminar ${attachment.fileName}`}
                  className="delete-attachment"
                  disabled={busy}
                  onClick={() => deleteAttachment(attachment.id)}
                  type="button"
                >
                  Eliminar
                </button>
              )}
            </article>
          );
        })}
      </div>

      {pollModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section aria-labelledby="poll-modal-title" aria-modal="true" className="extras-modal" role="dialog">
            <button className="modal-close" onClick={() => setPollModalOpen(false)} type="button" aria-label="Tancar">×</button>
            <p className="eyebrow">NOVA ENQUESTA</p>
            <h2 id="poll-modal-title">Què vols preguntar al grup?</h2>
            {viewer.role === "DELEGATE" && (
              <p className="approval-notice">La proposta quedarà pendent de validació de tutoria.</p>
            )}
            <form onSubmit={createPoll}>
              <label>
                Pregunta
                <input
                  maxLength={140}
                  onChange={(event) => setPollQuestion(event.target.value)}
                  placeholder="Escriu una pregunta clara"
                  value={pollQuestion}
                />
              </label>
              <fieldset>
                <legend>Opcions de resposta</legend>
                {pollOptions.map((option, index) => (
                  <div className="poll-option-field" key={index}>
                    <input
                      maxLength={80}
                      onChange={(event) => updatePollOption(index, event.target.value)}
                      placeholder={`Opció ${index + 1}`}
                      value={option}
                    />
                    {pollOptions.length > 2 && (
                      <button aria-label={`Eliminar opció ${index + 1}`} onClick={() => removePollOption(index)} type="button">×</button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <button className="add-option" onClick={addPollOption} type="button">+ Afegir opció</button>
                )}
              </fieldset>
              <label>
                Data de tancament (opcional)
                <input onChange={(event) => setPollClosesAt(event.target.value)} type="datetime-local" value={pollClosesAt} />
              </label>
              <label className="check-label">
                <input checked={pollAnonymous} onChange={(event) => setPollAnonymous(event.target.checked)} type="checkbox" />
                Votació anònima
              </label>
              <button className="extras-submit" disabled={busy || !pollQuestion.trim() || pollOptions.filter((option) => option.trim()).length < 2} type="submit">
                {viewer.role === "DELEGATE" ? "Enviar per validar" : "Publicar enquesta"}
              </button>
            </form>
          </section>
        </div>
      )}

      {attachmentModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section aria-labelledby="attachment-modal-title" aria-modal="true" className="extras-modal" role="dialog">
            <button className="modal-close" onClick={() => setAttachmentModalOpen(false)} type="button" aria-label="Tancar">×</button>
            <p className="eyebrow">NOU FITXER</p>
            <h2 id="attachment-modal-title">Afegeix una imatge o un PDF</h2>
            <form onSubmit={uploadAttachment}>
              <label className="file-drop">
                Fitxer JPG, PNG, WebP, GIF o PDF · màxim 5 MB
                <input
                  accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  onChange={selectAttachment}
                  type="file"
                />
                <span>{attachmentFile?.name ?? "Selecciona un fitxer"}</span>
              </label>
              <label>
                Títol o descripció breu
                <input
                  maxLength={120}
                  onChange={(event) => setAttachmentCaption(event.target.value)}
                  placeholder="Què mostra aquest fitxer?"
                  value={attachmentCaption}
                />
              </label>
              <p className="approval-notice">
                Tutoria pot eliminar qualsevol fitxer. La delegació pot publicar, però no esborrar.
              </p>
              <button className="extras-submit" disabled={busy || !attachmentFile} type="submit">
                Pujar al taulell
              </button>
            </form>
          </section>
        </div>
      )}

      {previewAttachment && (
        <div className="attachment-viewer" role="presentation">
          <section aria-label={previewAttachment.fileName} aria-modal="true" role="dialog">
            <header>
              <strong>{previewAttachment.caption || previewAttachment.fileName}</strong>
              <button aria-label="Tancar previsualització" onClick={() => setPreviewAttachment(null)} type="button">×</button>
            </header>
            {previewAttachment.mimeType === "application/pdf" ? (
              <iframe src={previewAttachment.url} title={previewAttachment.fileName} />
            ) : (
              <img alt={previewAttachment.caption || previewAttachment.fileName} src={previewAttachment.url} />
            )}
          </section>
        </div>
      )}
    </section>
  );
}
