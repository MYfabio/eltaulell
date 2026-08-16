export type AiProviderName = "vertex-gemini" | "openai";

export function normalizeAiProvider(value?: string | null): AiProviderName {
  const normalized = value?.trim().toLowerCase() || "vertex-gemini";
  if (["vertex", "vertex-ai", "gemini", "vertex-gemini"].includes(normalized)) {
    return "vertex-gemini";
  }
  if (normalized === "openai") return "openai";
  throw new Error("AI_PROVIDER_INVALID");
}

function safeSegment(value: string, errorCode: string) {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(value)) throw new Error(errorCode);
  return value;
}

export function vertexModelEndpoint(input: {
  projectId: string;
  location: string;
  model: string;
}) {
  const projectId = safeSegment(input.projectId, "VERTEX_AI_PROJECT_INVALID");
  const location = safeSegment(input.location, "VERTEX_AI_LOCATION_INVALID");
  const model = safeSegment(input.model, "VERTEX_AI_MODEL_INVALID");
  const host = location === "global"
    ? "aiplatform.googleapis.com"
    : `${location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
}

export function extractVertexResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
  };
  return (response.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => typeof part.text === "string" ? part.text.trim() : "")
    .filter(Boolean)
    .join("\n");
}
