export type AiRiskLevel = "NONE" | "CONCERN" | "URGENT";

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ca");
}

const URGENT_PATTERNS = [
  /\b(suicid|suicidar|matar-?me|matarme|treure'm la vida|quitarme la vida)\b/,
  /\b(autolesi|fer-?me mal|hacerme dano|cortar-?me|cortarme)\b/,
  /\b(abus sexual|agressio sexual|violacio|violacion)\b/,
  /\b(em peguen|me pegan|em maltracten|me maltratan|maltractament)\b/,
  /\b(perill immediat|peligro inmediato|arma|ganivet|cuchillo)\b/,
];

const CONCERN_PATTERNS = [
  /\b(assetjament|bullying|ciberassetjament|acoso)\b/,
  /\b(ansietat|ansiedad|atac de panic|ataque de panico)\b/,
  /\b(depress|no vull viure|no quiero vivir)\b/,
  /\b(trastorn alimentari|anorexia|bulimia|no menjar|no comer)\b/,
  /\b(violencia|amenaca|amenaza|por de tornar|miedo de volver)\b/,
];

export function classifyAiRisk(message: string): AiRiskLevel {
  const text = normalizedText(message);
  if (URGENT_PATTERNS.some((pattern) => pattern.test(text))) return "URGENT";
  if (CONCERN_PATTERNS.some((pattern) => pattern.test(text))) return "CONCERN";
  return "NONE";
}

export function urgentSafetyResponse() {
  return [
    "El que expliques és important i no has de gestionar-ho sol/a.",
    "Si hi ha perill ara mateix, truca al 112 o demana a una persona adulta de confiança que ho faci.",
    "Si pots, acosta't ara a un familiar, tutor/a, orientador/a o professional sanitari i explica-li exactament què està passant.",
  ].join(" ");
}

export function socraticInstructions(riskLevel: AiRiskLevel) {
  return `Ets el Tutor IA d'El Taulell, una aplicació educativa per a alumnat.

OBJECTIU
- Ajuda l'alumne a pensar i avançar, sense fer-li la feina ni donar-li la resposta final.
- Respon sempre en la llengua de l'alumne, amb vocabulari clar i adequat a secundària.

MÈTODE SOCRÀTIC OBLIGATORI
- Comença reconeixent breument què intenta fer.
- Fes una sola pregunta concreta que activi el raonament.
- Pots donar una pista petita, un exemple anàleg o dividir la tasca en un primer pas.
- No redactis una entrega completa, no resolguis l'exercici sencer i no inventis dades, notes o terminis.
- Si et demanen directament el resultat, explica que l'ajudaràs a trobar-lo i formula el següent pas.
- Mantén la resposta per sota de 140 paraules.

PRIVACITAT I SEGURETAT
- No demanis nom complet, adreça, telèfon, contrasenyes ni altres dades personals.
- No facis diagnòstics mèdics o psicològics.
- Davant contingut preocupant, prioritza el benestar, anima a parlar amb una persona adulta de confiança i evita qualsevol instrucció perillosa.
- Nivell preventiu detectat pel sistema: ${riskLevel}.`;
}
