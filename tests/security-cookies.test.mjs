import assert from "node:assert/strict";
import test from "node:test";
import {
  expireSecurityCookie,
  sessionCookieOptions,
  temporarySecurityCookieOptions,
} from "../lib/security-cookies.ts";

test("session cookies are HTTP-only, same-site and high priority", () => {
  const options = sessionCookieOptions(new Date(Date.now() + 60_000));
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal(options.priority, "high");
  assert.ok(options.maxAge > 0);
});

test("platform and temporary cookies can use stricter scopes", () => {
  assert.equal(sessionCookieOptions(new Date(Date.now() + 60_000), "strict").sameSite, "strict");
  const oauth = temporarySecurityCookieOptions(600, "/api/auth/google/callback");
  assert.equal(oauth.httpOnly, true);
  assert.equal(oauth.maxAge, 600);
  assert.equal(oauth.path, "/api/auth/google/callback");
  assert.equal(expireSecurityCookie().expires.getTime(), 0);
});
