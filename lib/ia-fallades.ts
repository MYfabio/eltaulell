import { createHmac } from "node:crypto";

/**
 * Avís a n8n quan la IA del tutor falla (contracte comú d'aulaia.cat, tipus
 * «error» amb { on: "ia" }). Si es repeteix, aulaia.cat envia un correu.
 * Mai hi va el missatge de l'alumne, cap nom ni el text sencer de l'error:
 * només el motiu i el model. Mai llança ni fa esperar: si n8n no respon en
 * 3 segons o falten N8N_WEBHOOK_URL / AULAIA_WEBHOOK_SECRET, no passa res.
 */
export type MotiuFallada = "cupo-dia" | "cupo-minut" | "model" | "temps" | "buida" | "format" | "servei";

/** OpenAI: 429 «insufficient_quota» = sense crèdit (no es resol esperant); altres 429 = límit per minut. */
export function motiuDeResposta(status: number, codi?: string | null): MotiuFallada {
  if (status === 429) return codi === "insufficient_quota" ? "cupo-dia" : "cupo-minut";
  if (status === 404 || codi === "model_not_found") return "model";
  if (status === 408 || status === 504) return "temps";
  return "servei";
}

export function motiuDeExcepcio(e: unknown): MotiuFallada {
  const nom = e instanceof Error ? e.name : "";
  return nom === "TimeoutError" || nom === "AbortError" ? "temps" : "servei";
}

const darrer = new Map<MotiuFallada, number>();

export function calAvisar(motiu: MotiuFallada, ara = Date.now()): boolean {
  if (ara - (darrer.get(motiu) ?? 0) < 60_000) return false;
  darrer.set(motiu, ara);
  return true;
}

export async function enviarAvisIA(motiu: MotiuFallada, model: string | null): Promise<boolean> {
  const url = process.env.N8N_WEBHOOK_URL;
  const secret = process.env.AULAIA_WEBHOOK_SECRET;
  if (!url || !secret) return false;
  const cos = JSON.stringify({
    app: "eltaulell",
    tipus: "error",
    centre: null,
    datos: { on: "ia", motiu, proveidor: "openai", model },
    data: new Date().toISOString(),
  });
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Aulaia-Signature": createHmac("sha256", secret).update(cos).digest("hex") },
      body: cos,
      signal: AbortSignal.timeout(3000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Un avís per motiu i minut, en segon pla. */
export function avisarFallada(motiu: MotiuFallada, model: string | null): void {
  if (!calAvisar(motiu)) return;
  void enviarAvisIA(motiu, model).catch(() => false);
}
