import assert from "node:assert/strict";
import test from "node:test";
import { classifyAiRisk, socraticInstructions } from "../lib/ai-safety.ts";

test("the safety filter escalates immediate self-harm and abuse signals", () => {
  assert.equal(classifyAiRisk("Em vull suïcidar"), "URGENT");
  assert.equal(classifyAiRisk("Em vull fer mal ara mateix"), "URGENT");
  assert.equal(classifyAiRisk("Me pegan en casa"), "URGENT");
});

test("the safety filter marks bullying and anxiety as concerns", () => {
  assert.equal(classifyAiRisk("Estic patint bullying"), "CONCERN");
  assert.equal(classifyAiRisk("Tengo un ataque de pánico"), "CONCERN");
  assert.equal(classifyAiRisk("No entenc les fraccions"), "NONE");
});

test("the tutor prompt enforces short Socratic guidance and privacy", () => {
  const prompt = socraticInstructions("NONE");
  assert.match(prompt, /pregunta concreta/i);
  assert.match(prompt, /sense fer-li la feina/i);
  assert.match(prompt, /dades personals/i);
});
