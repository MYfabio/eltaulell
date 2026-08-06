import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("the document language and primary landmarks are defined", () => {
  assert.match(source("app/layout.tsx"), /<html lang="ca">/);
  assert.match(source("app/page.tsx"), /<main/);
  assert.match(source("app/page.tsx"), /<nav aria-label=/);
  assert.match(source("app/components/portal-shell.tsx"), /<nav aria-label=/);
});

test("authentication fields keep explicit labels and autocomplete hints", () => {
  const access = source("app/acces/page.tsx");
  assert.match(access, /<label>[\s\S]*name="email"/);
  assert.match(access, /autoComplete="username"/);
  assert.match(access, /autoComplete="current-password"/);
  assert.match(access, /autoComplete="one-time-code"/);
});

test("motion and keyboard focus have accessible fallbacks", () => {
  const css = `${source("app/landing.css")}\n${source("app/portal.css")}\n${source("app/taulell/taulell.css")}`;
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /:focus-visible/);
});

test("privacy and terms are reachable and use one primary heading", () => {
  for (const page of ["app/privacitat/page.tsx", "app/termes/page.tsx"]) {
    const content = source(page);
    assert.equal((content.match(/<h1>/g) || []).length, 1);
    assert.match(content, /<main className="legal-page">/);
  }
});
