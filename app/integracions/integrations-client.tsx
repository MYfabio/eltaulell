"use client";

import { useState } from "react";

export default function IntegrationsClient({ configured, connected }: { configured: boolean; connected: boolean }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function synchronize(target: "classroom" | "calendar") {
    setLoading(target);
    setMessage("");
    const response = await fetch("/api/integrations/google/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
    const body = await response.json().catch(() => null) as { error?: string; processedCount?: number } | null;
    setLoading(null);
    setMessage(response.ok
      ? `Sincronització completada: ${body?.processedCount ?? 0} elements processats.`
      : body?.error || "No s'ha pogut sincronitzar.");
  }

  return (
    <div className="action-list">
      {configured
        ? <a href="/api/auth/google/start">{connected ? "Renovar autorització de Google" : "Connectar Google Workspace"}</a>
        : <button disabled type="button">Pendent de credencials de Google Cloud</button>}
      {connected && (
        <>
          <button disabled={Boolean(loading)} onClick={() => void synchronize("classroom")} type="button">
            {loading === "classroom" ? "Sincronitzant…" : "Sincronitzar Classroom"}
          </button>
          <button disabled={Boolean(loading)} onClick={() => void synchronize("calendar")} type="button">
            {loading === "calendar" ? "Sincronitzant…" : "Sincronitzar Calendar"}
          </button>
        </>
      )}
      {message && <p aria-live="polite" role="status">{message}</p>}
    </div>
  );
}
