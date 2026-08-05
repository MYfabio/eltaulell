import assert from "node:assert/strict";

const origin = process.env.ELTAULELL_TEST_ORIGIN || "http://127.0.0.1:3300";
const suffix = Date.now().toString(36);

function cookieFrom(response, name) {
  const header = response.headers.get("set-cookie") || "";
  const match = header.match(new RegExp(`(?:^|,\\s*)${name}=([^;]+)`));
  assert.ok(match, `Expected ${name} cookie`);
  return `${name}=${match[1]}`;
}

async function json(response, expectedStatus) {
  const body = await response.json().catch(() => ({}));
  assert.equal(response.status, expectedStatus, JSON.stringify(body));
  return body;
}

const platformLogin = await fetch(`${origin}/api/auth/platform-demo`, {
  method: "POST",
  redirect: "manual",
});
assert.equal(platformLogin.status, 303);
const platformCookie = cookieFrom(platformLogin, "eltaulell_platform_demo_session");

const schoolResponse = await fetch(`${origin}/api/platform/schools`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: platformCookie },
  body: JSON.stringify({
    name: `Centre Pilot ${suffix}`,
    slug: `centre-pilot-${suffix}`,
    emailDomain: "pilot.example",
    plan: "PILOT",
    maxUsers: 100,
    maxGroups: 10,
    coordinatorName: "Coordinació Pilot",
    coordinatorEmail: `coordinacio-${suffix}@pilot.example`,
  }),
});
const school = await json(schoolResponse, 201);
assert.match(school.activationPath, /^\/activar\?token=/);

const coordinatorToken = new URL(school.activationPath, origin).searchParams.get("token");
const coordinatorActivation = await fetch(`${origin}/api/auth/activate`, {
  method: "POST",
  redirect: "manual",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    token: coordinatorToken,
    password: "Pilot-segur-2026",
    confirmation: "Pilot-segur-2026",
  }),
});
assert.equal(coordinatorActivation.status, 303);
assert.equal(coordinatorActivation.headers.get("location"), `${origin}/coordinacio`);
const coordinatorCookie = cookieFrom(coordinatorActivation, "eltaulell_session");

const groupResponse = await fetch(`${origin}/api/admin/groups`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: coordinatorCookie },
  body: JSON.stringify({
    name: "1r A",
    stage: "1r ESO",
    section: "A",
    academicYear: "2026-2027",
  }),
});
const group = await json(groupResponse, 201);

const studentResponse = await fetch(`${origin}/api/admin/users`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: coordinatorCookie },
  body: JSON.stringify({
    name: "Alumna Pilot",
    email: `alumna-${suffix}@pilot.example`,
    role: "STUDENT",
    groupId: group.group.id,
  }),
});
const student = await json(studentResponse, 201);
const studentToken = new URL(student.activationPath, origin).searchParams.get("token");

const studentActivation = await fetch(`${origin}/api/auth/activate`, {
  method: "POST",
  redirect: "manual",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    token: studentToken,
    password: "Alumna-segura-2026",
    confirmation: "Alumna-segura-2026",
  }),
});
assert.equal(studentActivation.status, 303);
assert.equal(studentActivation.headers.get("location"), `${origin}/taulell`);
cookieFrom(studentActivation, "eltaulell_session");

const studentLogin = await fetch(`${origin}/api/auth/account`, {
  method: "POST",
  redirect: "manual",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    email: `alumna-${suffix}@pilot.example`,
    password: "Alumna-segura-2026",
  }),
});
assert.equal(studentLogin.status, 303);
assert.equal(studentLogin.headers.get("location"), `${origin}/taulell`);
const studentCookie = cookieFrom(studentLogin, "eltaulell_session");

const boardResponse = await fetch(`${origin}/taulell`, {
  headers: { Cookie: studentCookie },
  redirect: "manual",
});
assert.equal(boardResponse.status, 200);
assert.match(await boardResponse.text(), /1r A/);

const forbiddenResponse = await fetch(`${origin}/api/admin/groups`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: studentCookie },
  body: JSON.stringify({
    name: "Grup prohibit",
    stage: "ESO",
    academicYear: "2026-2027",
  }),
});
assert.equal(forbiddenResponse.status, 403);

console.log("Real centre access smoke test passed");
