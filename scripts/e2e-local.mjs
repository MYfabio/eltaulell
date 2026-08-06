import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const suppliedOrigin = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const port = 3300 + Math.floor(Math.random() * 300);
const origin = suppliedOrigin || `http://127.0.0.1:${port}`;
let server = null;
let diagnostics = "";

if (!suppliedOrigin) {
  try {
    server = spawn(process.execPath, ["scripts/local-preview.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, LOCAL_PREVIEW_PORT: String(port), NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    server.stdout.on("data", (chunk) => { diagnostics += chunk.toString(); });
    server.stderr.on("data", (chunk) => { diagnostics += chunk.toString(); });
    await new Promise((resolve, reject) => {
      server.once("spawn", resolve);
      server.once("error", reject);
    });
  } catch (error) {
    throw new Error(`The local E2E runner could not start Next.js. Set E2E_BASE_URL to an already running preview. ${error instanceof Error ? error.message : error}`);
  }
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null && server) throw new Error(`Local server exited early.\n${diagnostics}`);
    try {
      const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`E2E target did not become ready: ${origin}.\n${diagnostics}`);
}

async function timed(pathname, init) {
  const started = performance.now();
  const response = await fetch(`${origin}${pathname}`, { redirect: "manual", ...init });
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 5_000, `${pathname} exceeded the 5 s performance budget (${Math.round(elapsed)} ms)`);
  return { response, elapsed };
}

try {
  await waitForServer();
  const access = await timed("/acces");
  assert.equal(access.response.status, 200);
  assert.match(await access.response.text(), /<main[^>]*class="access-page"/);
  const privacy = await timed("/privacitat");
  assert.equal(privacy.response.status, 200);

  const demoLogin = await timed("/api/auth/demo", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: origin },
    body: new URLSearchParams({ userId: "student-marc" }),
  });
  assert.equal(demoLogin.response.status, 303);
  const cookie = demoLogin.response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "demo login must issue a session cookie");

  const board = await timed("/taulell", { headers: { Cookie: cookie } });
  assert.equal(board.response.status, 200);
  const boardHtml = await board.response.text();
  assert.match(boardHtml, /Pregunta al Taulell/);
  const groupId = boardHtml.match(/data-group-id="([^"]+)"/)?.[1] || "";
  assert.ok(groupId, "the authenticated board must expose its assigned group");

  const safety = await timed("/api/ai/tutor", {
    method: "POST",
    headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ groupId, message: "Em vull suïcidar ara mateix", sessionKey: "e2e-session-key-123456789" }),
  });
  assert.equal(safety.response.status, 200);
  assert.equal((await safety.response.json()).safety, "URGENT");

  const calendar = await timed("/api/calendar", { headers: { Cookie: cookie } });
  assert.equal(calendar.response.status, 200);
  assert.ok(Array.isArray((await calendar.response.json()).events));

  const blockedCsrf = await timed("/api/ai/tutor", {
    method: "POST",
    headers: { Cookie: cookie, Origin: "https://attacker.invalid", "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(blockedCsrf.response.status, 403);

  console.log(JSON.stringify({
    ok: true,
    target: origin,
    timingsMs: {
      access: Math.round(access.elapsed),
      privacy: Math.round(privacy.elapsed),
      login: Math.round(demoLogin.elapsed),
      board: Math.round(board.elapsed),
      safety: Math.round(safety.elapsed),
      calendar: Math.round(calendar.elapsed),
    },
  }, null, 2));
} finally {
  server?.kill("SIGTERM");
  if (server) {
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 3_000)),
    ]);
  }
}
