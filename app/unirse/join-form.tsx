"use client";

import Link from "next/link";
import { useState } from "react";

export default function JoinForm({ inviteId }: { inviteId: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState<{ groupId: string; groupName: string; alreadyMember: boolean } | null>(null);

  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteId, code }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No s'ha pogut entrar al grup.");
      setJoined(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No s'ha pogut entrar al grup.");
    } finally {
      setBusy(false);
    }
  }

  if (joined) {
    return (
      <div className="join-success" role="status">
        <span aria-hidden="true">✓</span>
        <h2>{joined.alreadyMember ? "Ja formes part del grup" : "Ja ets dins del grup"}</h2>
        <p>Pots entrar directament al taulell de <strong>{joined.groupName}</strong>.</p>
        <Link href={`/taulell?groupId=${encodeURIComponent(joined.groupId)}`}>Obrir el meu taulell</Link>
      </div>
    );
  }

  return (
    <form className="join-form" onSubmit={join}>
      <label htmlFor="invite-code">Codi d&apos;accés</label>
      <input
        autoCapitalize="characters"
        autoComplete="one-time-code"
        id="invite-code"
        maxLength={9}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="XXXX-XXXX"
        required
        value={code}
      />
      <button disabled={busy} type="submit">{busy ? "Comprovant…" : "Entrar al grup"}</button>
      {error && <p className="join-error" role="alert">{error}</p>}
    </form>
  );
}
