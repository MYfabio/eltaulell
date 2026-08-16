import assert from "node:assert/strict";
import test from "node:test";
import {
  extractVertexResponseText,
  normalizeAiProvider,
  vertexModelEndpoint,
} from "../lib/ai-provider-config.ts";

test("Vertex AI Gemini is the default and provider aliases are normalized", () => {
  assert.equal(normalizeAiProvider(), "vertex-gemini");
  assert.equal(normalizeAiProvider("gemini"), "vertex-gemini");
  assert.equal(normalizeAiProvider("vertex-ai"), "vertex-gemini");
  assert.equal(normalizeAiProvider("openai"), "openai");
  assert.throws(() => normalizeAiProvider("unknown"), /AI_PROVIDER_INVALID/);
});

test("regional Vertex AI endpoints are built without accepting unsafe segments", () => {
  assert.equal(
    vertexModelEndpoint({
      projectId: "eltaulell-production",
      location: "europe-west1",
      model: "gemini-2.5-flash",
    }),
    "https://europe-west1-aiplatform.googleapis.com/v1/projects/eltaulell-production/locations/europe-west1/publishers/google/models/gemini-2.5-flash:generateContent",
  );
  assert.throws(
    () => vertexModelEndpoint({ projectId: "bad/project", location: "global", model: "gemini" }),
    /VERTEX_AI_PROJECT_INVALID/,
  );
});

test("Gemini text is extracted from all candidate text parts", () => {
  assert.equal(
    extractVertexResponseText({
      candidates: [{ content: { parts: [{ text: "Primera pista." }, { text: "Següent pregunta?" }] } }],
    }),
    "Primera pista.\nSegüent pregunta?",
  );
  assert.equal(extractVertexResponseText({ candidates: [] }), "");
});
