"use client";

import { FormEvent, useState } from "react";

type Provider = "MOODLE" | "IEDUCA";

export default function ExternalIntegrationsClient({ provider, initialBaseUrl, connected }: { provider: Provider; initialBaseUrl: string; connected: boolean }) {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [apiToken, setApiToken] = useState("");
  const [isConnected, setConnected] = useState(connected);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function connect(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/integrations/external", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, baseUrl, apiToken }) });
    const body = await response.json().catch(() => null) as { error?: string } | null;
    setBusy(false);
    if (response.ok) { setConnected(true); setApiToken(""); setMessage("Connexió xifrada i desada."); }
    else setMessage(body?.error || "No s'ha pogut connectar.");
  }

  async function synchronize() {
    setBusy(true);
    const response = await fetch("/api/integrations/external/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider }) });
    const body = await response.json().catch(() => null) as { processedCount?: number; error?: string } | null;
    setBusy(false);
    setMessage(response.ok ? `${body?.processedCount || 0} elements sincronitzats.` : body?.error || "Ha fallat la sincronització.");
  }

  return <form className="portal-form integration-form" onSubmit={connect}>
    <label>URL base<input onChange={(event) => setBaseUrl(event.target.value)} placeholder={provider === "MOODLE" ? "https://moodle.centre.cat" : "https://centre.ieduca.com"} required type="url" value={baseUrl} /></label>
    <label>Token d'API<input autoComplete="off" minLength={8} onChange={(event) => setApiToken(event.target.value)} placeholder={isConnected ? "Introdueix-lo només per renovar-lo" : "Token del servei"} required={!isConnected} type="password" value={apiToken} /></label>
    <div className="action-list"><button disabled={busy || !apiToken} type="submit">{busy ? "Processant…" : isConnected ? "Renovar credencial" : "Connectar"}</button>{isConnected && <button disabled={busy} onClick={() => void synchronize()} type="button">Sincronitzar ara</button>}</div>
    {message && <p aria-live="polite" role="status">{message}</p>}
  </form>;
}
