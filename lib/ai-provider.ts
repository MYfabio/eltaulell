import "server-only";

import { createSign } from "node:crypto";
import {
  extractVertexResponseText,
  normalizeAiProvider,
  type AiProviderName,
  vertexModelEndpoint,
} from "@/lib/ai-provider-config";

type TutorModelInput = {
  input: string;
  instructions: string;
  safetyIdentifier: string;
};

type VertexServiceAccount = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

type VertexToken = {
  accessToken: string;
  expiresAt: number;
  clientEmail: string;
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

let vertexToken: VertexToken | null = null;

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function vertexServiceAccount() {
  const raw = process.env.VERTEX_AI_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  try {
    const parsed = JSON.parse(raw) as VertexServiceAccount;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("AI_PROVIDER_NOT_CONFIGURED");
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message === "AI_PROVIDER_NOT_CONFIGURED") throw error;
    throw new Error("VERTEX_AI_CREDENTIALS_INVALID");
  }
}

async function vertexAccessToken(credentials: VertexServiceAccount) {
  const clientEmail = credentials.client_email!;
  if (
    vertexToken &&
    vertexToken.clientEmail === clientEmail &&
    vertexToken.expiresAt > Date.now() + 60_000
  ) {
    return vertexToken.accessToken;
  }

  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(credentials.private_key!, "base64url")}`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null) as {
    access_token?: string;
    expires_in?: number;
  } | null;
  if (!response.ok || !payload?.access_token) throw new Error("VERTEX_AI_AUTH_FAILED");
  vertexToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    clientEmail,
  };
  return vertexToken.accessToken;
}

async function callVertexGemini(request: TutorModelInput) {
  const credentials = vertexServiceAccount();
  const projectId = process.env.VERTEX_AI_PROJECT_ID?.trim() || credentials.project_id?.trim();
  if (!projectId) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const location = process.env.VERTEX_AI_LOCATION?.trim() || "europe-west1";
  const model = process.env.VERTEX_AI_MODEL?.trim() || "gemini-2.5-flash";
  const accessToken = await vertexAccessToken(credentials);
  const response = await fetch(vertexModelEndpoint({ projectId, location, model }), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: request.instructions }] },
      contents: [{ role: "user", parts: [{ text: request.input }] }],
      generationConfig: {
        maxOutputTokens: 350,
        temperature: 0.35,
        topP: 0.9,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  });
  const payload = await response.json().catch(() => null) as {
    error?: { status?: string };
    promptFeedback?: { blockReason?: string };
  } | null;
  if (payload?.promptFeedback?.blockReason) throw new Error("AI_SAFETY_BLOCKED");
  if (!response.ok) {
    throw new Error(payload?.error?.status ? `VERTEX_AI_${payload.error.status}` : `VERTEX_AI_HTTP_${response.status}`);
  }
  const answer = extractVertexResponseText(payload);
  if (!answer) throw new Error("VERTEX_AI_EMPTY_RESPONSE");
  return answer;
}

function extractOpenAiResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text.trim();
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text!.trim())
    .filter(Boolean)
    .join("\n");
}

async function callOpenAi(request: TutorModelInput) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
      instructions: request.instructions,
      input: request.input,
      max_output_tokens: 350,
      store: false,
      safety_identifier: request.safetyIdentifier,
    }),
    signal: AbortSignal.timeout(25_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const code = (payload as { error?: { code?: string } } | null)?.error?.code;
    throw new Error(code ? `OPENAI_${code}` : `OPENAI_HTTP_${response.status}`);
  }
  const answer = extractOpenAiResponseText(payload);
  if (!answer) throw new Error("OPENAI_EMPTY_RESPONSE");
  return answer;
}

export function getAiProviderStatus(): {
  provider: AiProviderName;
  configured: boolean;
  label: string;
  detail: string;
} {
  let provider: AiProviderName;
  try {
    provider = normalizeAiProvider(process.env.AI_PROVIDER);
  } catch {
    return {
      provider: "vertex-gemini",
      configured: false,
      label: "Proveïdor no vàlid",
      detail: "Revisa la variable AI_PROVIDER",
    };
  }
  if (provider === "openai") {
    return {
      provider,
      configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
      label: "OpenAI",
      detail: "Proveïdor alternatiu configurable",
    };
  }
  let hasCredentials = false;
  let serviceAccountProject = "";
  try {
    const serviceAccount = JSON.parse(process.env.VERTEX_AI_SERVICE_ACCOUNT_JSON || "{}") as VertexServiceAccount;
    hasCredentials = Boolean(serviceAccount.client_email && serviceAccount.private_key);
    serviceAccountProject = serviceAccount.project_id || "";
  } catch {
    hasCredentials = false;
  }
  const configured = hasCredentials && Boolean(
    process.env.VERTEX_AI_PROJECT_ID?.trim() || serviceAccountProject,
  );
  return {
    provider,
    configured,
    label: "Vertex AI Gemini",
    detail: `Regió ${process.env.VERTEX_AI_LOCATION?.trim() || "europe-west1"}`,
  };
}

export async function callTutorModel(request: TutorModelInput) {
  const provider = normalizeAiProvider(process.env.AI_PROVIDER);
  return provider === "vertex-gemini"
    ? callVertexGemini(request)
    : callOpenAi(request);
}
