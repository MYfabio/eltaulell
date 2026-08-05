"use client";

import { useState } from "react";
import type { DemoRequestItem } from "@/lib/demo-requests";

const roleLabels = {
  COORDINATOR: "Coordinació",
  TUTOR: "Tutoria",
  DELEGATE: "Delegació",
  STUDENT: "Alumnat",
};

const statusLabels = {
  PENDING: "Pendent",
  INVITED: "Enllaç generat",
  CLOSED: "Tancada",
};

export default function DemoRequestsClient({
  initialRequests,
}: {
  initialRequests: DemoRequestItem[];
}) {
  const [busyId, setBusyId] = useState("");
  const [links, setLinks] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function createAccess(requestId: string) {
    setBusyId(requestId);
    setMessages((current) => ({ ...current, [requestId]: "" }));
    const response = await fetch(`/api/demo-requests/${requestId}/invite`, {
      method: "POST",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessages((current) => ({
        ...current,
        [requestId]: typeof body.error === "string" ? body.error : "No s'ha pogut generar l'accés.",
      }));
      setBusyId("");
      return;
    }
    const link = new URL(body.activationPath, window.location.origin).toString();
    setLinks((current) => ({ ...current, [requestId]: link }));
    setMessages((current) => ({
      ...current,
      [requestId]: "Enllaç preparat. Copia'l i envia'l a la persona sol·licitant.",
    }));
    setBusyId("");
  }

  return (
    <section className="demo-request-workspace">
      <div className="demo-request-summary">
        <div>
          <span>SOL·LICITUDS REBUDES</span>
          <strong>{initialRequests.length}</strong>
        </div>
        <p>
          L'enllaç és d'un sol ús i permet que cada persona creï la seva
          contrasenya. No enviïs contrasenyes compartides per correu.
        </p>
      </div>

      <div className="demo-request-list">
        {initialRequests.map((request) => (
          <article key={request.id}>
            <header>
              <div>
                <span>{roleLabels[request.requestedRole]}</span>
                <h2>{request.name}</h2>
                <p>{request.schoolName}</p>
              </div>
              <span className={`demo-request-status status-${request.status.toLowerCase()}`}>
                {statusLabels[request.status]}
              </span>
            </header>
            <dl>
              <div><dt>Correu</dt><dd>{request.email}</dd></div>
              <div><dt>Rebuda</dt><dd>{new Date(request.createdAt).toLocaleString("ca-ES")}</dd></div>
            </dl>
            {request.message && <p className="demo-request-message">{request.message}</p>}
            <footer>
              <button
                disabled={busyId === request.id}
                onClick={() => createAccess(request.id)}
                type="button"
              >
                {busyId === request.id ? "Preparant…" : "Generar enllaç d'activació"}
              </button>
              {links[request.id] && (
                <div className="activation-link-result">
                  <input aria-label={`Enllaç per a ${request.name}`} readOnly value={links[request.id]} />
                  <button onClick={() => navigator.clipboard.writeText(links[request.id])} type="button">
                    Copiar enllaç
                  </button>
                </div>
              )}
              {messages[request.id] && (
                <p className={links[request.id] ? "form-success" : "form-error"} role="status">
                  {messages[request.id]}
                </p>
              )}
            </footer>
          </article>
        ))}
        {!initialRequests.length && (
          <p className="platform-empty">Encara no hi ha cap sol·licitud de demo.</p>
        )}
      </div>
    </section>
  );
}
