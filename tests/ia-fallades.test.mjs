import { test } from "node:test";
import assert from "node:assert/strict";
import { calAvisar, enviarAvisIA, motiuDeExcepcio, motiuDeResposta } from "../lib/ia-fallades.ts";

test("motius de fallada d'OpenAI", () => {
  assert.equal(motiuDeResposta(429, "insufficient_quota"), "cupo-dia");
  assert.equal(motiuDeResposta(429, "rate_limit_exceeded"), "cupo-minut");
  assert.equal(motiuDeResposta(400, "model_not_found"), "model");
  assert.equal(motiuDeResposta(404), "model");
  assert.equal(motiuDeResposta(500), "servei");
  assert.equal(motiuDeExcepcio(Object.assign(new Error("x"), { name: "TimeoutError" })), "temps");
});

test("un avís per motiu i minut", () => {
  assert.equal(calAvisar("temps", 1e12), true);
  assert.equal(calAvisar("temps", 1e12 + 1000), false);
  assert.equal(calAvisar("model", 1e12 + 1000), true);
});

test("l'avís va signat, sense centre ni textos, i sense configuració no envia res", async () => {
  delete process.env.N8N_WEBHOOK_URL;
  assert.equal(await enviarAvisIA("temps", "gpt-x"), false);
  process.env.N8N_WEBHOOK_URL = "https://n8n.example.test/webhook";
  process.env.AULAIA_WEBHOOK_SECRET = "secret-de-prova";
  let rebut;
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opcions) => { rebut = { url, opcions }; return new Response("{}", { status: 200 }); };
  try {
    assert.equal(await enviarAvisIA("cupo-dia", "gpt-x"), true);
  } finally {
    globalThis.fetch = original;
  }
  const cos = JSON.parse(rebut.opcions.body);
  assert.deepEqual(cos.datos, { on: "ia", motiu: "cupo-dia", proveidor: "openai", model: "gpt-x" });
  assert.equal(cos.app, "eltaulell");
  assert.equal(cos.centre, null);
  assert.match(rebut.opcions.headers["X-Aulaia-Signature"], /^[0-9a-f]{64}$/);
});
