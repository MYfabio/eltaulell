import { db } from "@/lib/db";
import { construirDominis, hiHaActivitat, horesTancades, type Domini, type FilaActius } from "./activitat-xifres";

/**
 * Informe d'activitat cap a aulaia.cat (docs/informe-activitat.md d'aulaia-cat):
 * cada hora, quanta gent ha fet alguna cosa a El Taulell, per domini del centre.
 * Les xifres surten d'entrades i sessions actives, del registre d'accions i de
 * l'ús del tutor d'IA. Només recomptes: cap nom ni correu.
 * Sense AULAIA_ACTIVITAT_CLAU (o en la vista local) no fa res.
 */
const URL_INFORME = process.env.AULAIA_ACTIVITAT_URL || "https://www.aulaia.cat/api/activitat";
const HORA_MS = 3_600_000;

/** Les 0:00 de Catalunya del dia de `inici`. */
export function iniciDia(inici: Date): Date {
  const local = new Date(inici.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const desfasament = local.getTime() - inici.getTime();
  local.setHours(0, 0, 0, 0);
  return new Date(local.getTime() - desfasament);
}

export const CONSULTA_ACTIUS = `
  WITH accions AS (
    SELECT s."userId" AS qui, s."createdAt" AS quan, m."schoolId" AS escola FROM "Session" s
      LEFT JOIN "SchoolMembership" m ON m.id = s."schoolMembershipId" WHERE s."createdAt" >= $2 AND s."createdAt" < $3
    UNION ALL SELECT s."userId", s."lastSeenAt", m."schoolId" FROM "Session" s
      LEFT JOIN "SchoolMembership" m ON m.id = s."schoolMembershipId" WHERE s."lastSeenAt" >= $2 AND s."lastSeenAt" < $3
    UNION ALL SELECT a."actorId", a."createdAt", a."schoolId" FROM "AuditLog" a
      WHERE a."actorId" IS NOT NULL AND a."createdAt" >= $2 AND a."createdAt" < $3
    UNION ALL SELECT m."userId", e."createdAt", e."schoolId" FROM "AiUsageEvent" e
      JOIN "SchoolMembership" m ON m.id = e."studentMembershipId" WHERE e."createdAt" >= $2 AND e."createdAt" < $3
  )
  SELECT lower(sc."emailDomain") AS domini,
         (count(DISTINCT a.qui) FILTER (WHERE a.quan >= $1))::int AS hora,
         count(DISTINCT a.qui)::int AS dia
  FROM accions a LEFT JOIN "School" sc ON sc.id = a.escola
  GROUP BY 1`;

type Consulta = (sql: string, ...params: unknown[]) => Promise<unknown>;

export async function xifresDeLHora(consulta: Consulta, inici: Date): Promise<Domini[]> {
  const fi = new Date(inici.getTime() + HORA_MS);
  const files = (await consulta(CONSULTA_ACTIUS, inici, iniciDia(inici), fi)) as { domini: string | null; hora: number; dia: number }[];
  const perDomini = new Map<string, FilaActius>();
  for (const r of files) {
    const domini = r.domini && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(r.domini) ? r.domini : "altres";
    const f = perDomini.get(domini) ?? { domini, actiusHora: 0, actiusDia: 0 };
    f.actiusHora += Number(r.hora);
    f.actiusDia += Number(r.dia);
    perDomini.set(domini, f);
  }
  return construirDominis([...perDomini.values()], []);
}

/** `inici`: inici d'una hora ja tancada. No llança mai. */
export async function enviarInformeActivitat(inici: Date): Promise<string> {
  const clau = process.env.AULAIA_ACTIVITAT_CLAU;
  if (!clau || process.env.ELTAULELL_LOCAL_PREVIEW === "1") return "sense-clau";
  try {
    const prisma = db as unknown as { $queryRawUnsafe: (sql: string, ...p: unknown[]) => Promise<unknown> };
    const dominis = await xifresDeLHora((sql, ...p) => prisma.$queryRawUnsafe(sql, ...p), inici);
    if (!hiHaActivitat(dominis)) return "sense-activitat";
    const r = await fetch(URL_INFORME, {
      method: "POST",
      headers: { Authorization: `Bearer ${clau}`, "Content-Type": "application/json" },
      body: JSON.stringify({ versio: 1, app: "eltaulell", hora: inici.toISOString(), dominis }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) console.warn("Informe d'activitat rebutjat:", r.status);
    return r.ok ? "enviat" : "rebutjat";
  } catch (e) {
    console.warn("Informe d'activitat no enviat:", e instanceof Error ? e.name : "error");
    return "error";
  }
}

let engegat = false;

/** Cada 10 minuts mira les 3 darreres hores tancades. Reenviar una hora la substitueix. */
export function iniciarInformeActivitat() {
  if (engegat || !process.env.AULAIA_ACTIVITAT_CLAU) return;
  engegat = true;
  const fetes = new Set<number>();
  const tic = async () => {
    for (const hora of horesTancades(new Date(), 3)) {
      if (fetes.has(hora.getTime())) continue;
      if ((await enviarInformeActivitat(hora)) !== "error") fetes.add(hora.getTime());
    }
    for (const t of fetes) if (Date.now() - t > 6 * HORA_MS) fetes.delete(t);
  };
  setTimeout(() => void tic(), 60_000).unref?.();
  setInterval(() => void tic(), 10 * 60_000).unref?.();
}
